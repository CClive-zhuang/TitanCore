// 文件名: src/stores/libraryStore.ts
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { t } from '../i18n'

export interface LibraryItem {
  id: string
  title: string
  type: 'titan_protocol' | 'game' | 'tool' | 'patch'
  cover: string
  addTime: number
  meta?: any
  path?: string
  desc?: string
  installed?: boolean
  isDownloading?: boolean
  steamId?: string
}

/**
 * 读侧唯一入口：从归一 id 提取启动 AppID。
 * 写闸门保证协议资源 id 必为 steam_gate_<纯数字>，此处只允许读取，不允许再发明新解析规则。
 */
export const appIdOf = (item: { id: string }): string => {
  const m = item.id.match(/(\d+)$/)
  return m?.[1] ?? ''
}

const inferType = (id: string, rawType: string): LibraryItem['type'] => {
  if (rawType === 'titan_protocol') return 'titan_protocol'
  if (rawType === 'patch') return 'patch'
  if (rawType === 'tool') return 'tool'
  if (rawType === 'game') return 'game'
  if (id.startsWith('steam_gate_') || id.startsWith('titan_protocol_')) return 'titan_protocol'
  if (id.startsWith('tool_')) return 'tool'
  if (id.startsWith('game_')) return 'game'
  return 'game'
}

export const useLibraryStore = defineStore('library', () => {
  const items = ref<LibraryItem[]>([])

  const load = async () => {
    try {
      const rows = await window.electron.sys.getUserLibrary()
      if (Array.isArray(rows)) {
        items.value = rows.map(r => ({
          id: r.resource_id,
          title: r.title || t('library.unknownAsset'),
          type: inferType(r.resource_id, r.type),
          cover: r.cover || '',
          addTime: r.added_at || Date.now(),
          meta: r.meta,
          path: r.local_path || '',
          desc: r.meta?.desc || ''
        }))
      } else {
        items.value = []
      }
    } catch (e) {
      console.error('[LibraryStore] 加载失败:', e)
      items.value = []
    }
  }

  const pushCloud = async () => {
    try {
      const resourceIds = items.value.map(i => i.id)
      await window.electron.invoke('sys:push-cloud-library', resourceIds)
    } catch (e) {
      console.warn('[LibraryStore] 云端推送失败:', e)
    }
  }

  const pullCloud = async () => {
    try {
      const res = await window.electron.invoke('sys:pull-cloud-library')
      if (res?.success && Array.isArray(res.data)) {
        for (const meta of res.data) {
          const id = meta.id as string
          const localIds = new Set(items.value.map(i => i.id))
          if (!localIds.has(id)) {
            await window.electron.invoke('sys:toggle-library', id, {
              title: meta.title || '',
              type: meta.type || '',
              cover: meta.cover || '',
              desc: meta.desc || ''
            })
          }
        }
        await load()
        const currentIdSet = new Set(items.value.map(i => i.id))
        const cloudIds = res.data.map((m: any) => m.id)
        const hasExtraLocal = cloudIds.some((id: string) => !currentIdSet.has(id)) === false && items.value.length > cloudIds.length
        if (hasExtraLocal) {
          await pushCloud()
        }
      }
    } catch (e) {
      console.warn('[LibraryStore] 云端拉取失败:', e)
    }
  }

  const toggleItem = async (resourceId: string, extraData?: { title?: string; type?: string; cover?: string; desc?: string }) => {
    try {
      const res = await window.electron.invoke('sys:toggle-library', resourceId, extraData)
      if (res?.success === false) throw new Error(res.msg || t('errors.toggleRejected'))
      await load()
      await pushCloud()
    } catch (e) {
      console.error('[LibraryStore] toggleItem 失败:', e)
      throw e
    }
  }

  const removeItem = async (resourceId: string) => {
    try {
      await window.electron.sys.removeUserLibrary(resourceId)
      await load()
      await pushCloud()
    } catch (e) {
      console.error('[LibraryStore] removeItem 失败:', e)
      throw e
    }
  }

  const batchDeploy = async (
    appIds: string[],
    options: {
      onProgress?: (results: Array<{appId: string; displayName: string; success: boolean; reason?: string}>) => void
      isCancelled?: () => boolean
    } = {}
  ): Promise<Array<{appId: string; displayName: string; success: boolean; reason?: string}>> => {
    const results: Array<{appId: string; displayName: string; success: boolean; reason?: string}> = []

    let metaMap: Record<string, { title?: string; cover?: string; desc?: string; success?: boolean; error?: string }> = {}
    try {
      const metaRes = await window.electron.invoke('sys:batch-deploy-meta', appIds)
      if (metaRes?.success && Array.isArray(metaRes.data)) {
        for (const item of metaRes.data) {
          if (item.app_id) {
            metaMap[String(item.app_id)] = { 
              title: item.title, 
              cover: item.cover,
              desc: item.desc,
              success: item.success !== false,
              error: item.error
            }
          }
        }
      }
    } catch (e) {
      console.warn('[LibraryStore] 批量获取元数据降级，将采用默认标识:', e)
    }

    for (let i = 0; i < appIds.length; i++) {
      const appId = appIds[i]
      if (options.isCancelled?.()) break

      const meta = metaMap[appId] || {}
      const displayName = meta.title || `AppID ${appId}`

      if (meta.success === false) {
        const isQuota = meta.error === 'QUOTA_EXHAUSTED'
        const reason = isQuota ? t('library.batch.reasonQuotaExhausted') : t('library.batch.reasonResourceNotFound')
        results.push({ appId, displayName, success: false, reason })
        if (isQuota) {
          for (const remainingId of appIds.slice(i + 1)) {
            const remMeta = metaMap[remainingId] || {}
            results.push({ appId: remainingId, displayName: remMeta.title || `AppID ${remainingId}`, success: false, reason: t('library.batch.reasonQuotaExhausted') })
          }
          break
        }
        options.onProgress?.(results)
        continue
      }

      try {
        await window.electron.invoke('sys:toggle-library', `steam_gate_${appId}`, {
          title: displayName,
          type: 'titan_protocol',
          cover: meta.cover || '',
          desc: meta.desc || ''
        })

        const res = await window.electron.invoke('titan:deploy-game', appId)
        if (res?.success) {
          results.push({ appId, displayName, success: true })
        } else {
          const err = res?.msg || t('library.batch.reasonDeployFailed')
          const isQuota = err.includes('QUOTA') || err.includes('额度') || err.includes('配额')
          if (isQuota) {
            results.push({ appId, displayName, success: false, reason: t('library.batch.reasonQuotaExhausted') })
            for (const remainingId of appIds.slice(i + 1)) {
              const remMeta = metaMap[remainingId] || {}
              results.push({ appId: remainingId, displayName: remMeta.title || `AppID ${remainingId}`, success: false, reason: t('library.batch.reasonQuotaExhausted') })
            }
            break
          } else {
            results.push({ appId, displayName, success: false, reason: err })
          }
        }
      } catch (e: any) {
        results.push({ appId, displayName, success: false, reason: e.message })
      }

      options.onProgress?.(results)
    }

    await load()
    await pushCloud()
    return results
  }

  const redeployAll = async (
    protocols: Array<{id: string; title: string}>,
    options: {
      onProgress?: (results: Array<{appId: string; displayName: string; success: boolean; reason?: string}>) => void
      isCancelled?: () => boolean
    } = {}
  ): Promise<Array<{appId: string; displayName: string; success: boolean; reason?: string}>> => {
    const results: Array<{appId: string; displayName: string; success: boolean; reason?: string}> = []

    for (let i = 0; i < protocols.length; i++) {
      const item = protocols[i]
      if (options.isCancelled?.()) break

      const appId = appIdOf(item)
      const displayName = item.title && item.title.length > 26 ? item.title.slice(0, 26) + '...' : (item.title || `AppID ${appId}`)

      try {
        const res = await window.electron.invoke('titan:deploy-game', appId)
        if (res?.success) {
          results.push({ appId, displayName, success: true })
        } else {
          const err = res?.msg || t('library.batch.reasonDeployFailed')
          const isQuota = err.includes('QUOTA') || err.includes('额度') || err.includes('配额')
          if (isQuota) {
            results.push({ appId, displayName, success: false, reason: t('library.batch.reasonQuotaExhausted') })
            for (const remainingItem of protocols.slice(i + 1)) {
              const remainingAppId = appIdOf(remainingItem)
              const remainingDn = remainingItem.title && remainingItem.title.length > 26 ? remainingItem.title.slice(0, 26) + '...' : (remainingItem.title || `AppID ${remainingAppId}`)
              results.push({ appId: remainingAppId, displayName: remainingDn, success: false, reason: t('library.batch.reasonQuotaExhausted') })
            }
            break
          } else {
            results.push({ appId, displayName, success: false, reason: err })
          }
        }
      } catch (e: any) {
        results.push({ appId, displayName, success: false, reason: e.message })
      }

      options.onProgress?.(results)
    }

    await load()
    await pushCloud()
    return results
  }

  const toggleAutoUpdate = async (resourceId: string, autoUpdate: boolean) => {
    try {
      const res = await window.electron.sys.toggleAutoUpdate(resourceId, autoUpdate);
      if (!res?.success) throw new Error(res?.msg || '切换失败');
      await load();
    } catch (e) {
      console.error('[LibraryStore] toggleAutoUpdate 失败:', e);
      throw e;
    }
  }

  const addItem = (item: LibraryItem) => {
    const exists = items.value.find(i => i.id === item.id)
    if (!exists) items.value.unshift(item)
  }

  const updateItem = (id: string, partial: Partial<LibraryItem>) => {
    const idx = items.value.findIndex(i => i.id === id)
    if (idx >= 0) items.value[idx] = { ...items.value[idx], ...partial }
  }

  const getItemById = (id: string) => items.value.find(i => i.id === id)

  const reset = () => { items.value = [] }

  return {
    items,
    addItem,
    updateItem,
    getItemById,
    reset,
    load,
    pushCloud,
    pullCloud,
    toggleItem,
    removeItem,
    batchDeploy,
    redeployAll,
    toggleAutoUpdate
  }
})