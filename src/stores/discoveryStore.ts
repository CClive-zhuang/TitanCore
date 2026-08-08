// 文件名: src/stores/discoveryStore.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { t } from '../i18n'

export const useDiscoveryStore = defineStore('discovery', () => {
  const activeTab = ref<string>('titan_protocol')
  const isFetching = ref(false)
  const rawList = ref<any[]>([])

  const syncPhase = ref<'syncing' | 'ready' | 'error'>('syncing')
  const lastSyncAt = ref<number>(0)

  const displayList = computed(() => {
    return rawList.value.map(item => {
      const tagArray = item.tags ? item.tags.split(',').filter(Boolean) : []
      let meta: any = {}
      if (item.meta) {
        meta = item.meta
      } else if (item.meta_json) {
        try { meta = JSON.parse(item.meta_json) } catch {}
      }
      return {
        id: item.id,
        type: item.type,
        meta,
        basic: {
          title: item.title || t('discovery.unknownTitle'),
          tags: tagArray.length > 0 ? tagArray : [item.type.toUpperCase()],
          rating: item.rating || 0,
          cover: item.cover || '',
          desc: item.desc || meta.desc || ''
        }
      }
    })
  })

  const systemStatus = computed(() => {
    if (syncPhase.value === 'error') return 'offline'
    if (syncPhase.value === 'syncing') return 'syncing'
    return 'ready'
  })

  const fetchResources = async (isForceOverride = false) => {
    if (activeTab.value === 'nexus_gate') {
      rawList.value = []
      return
    }

    if (isFetching.value && !isForceOverride) return
    isFetching.value = true

    try {
      const res = await window.electron.invoke('sys:get-discovery-list', activeTab.value)
      rawList.value = res || []
    } catch (err) {
      console.error('[DiscoveryStore] Failed to read resource matrix:', err)
      rawList.value = []
    } finally {
      isFetching.value = false
    }
  }

  const setSyncPhase = (phase: 'syncing' | 'ready' | 'error') => {
    syncPhase.value = phase
    if (phase === 'ready') lastSyncAt.value = Date.now()
  }

  const setTab = (tabId: string) => {
    if (isFetching.value || activeTab.value === tabId) return
    activeTab.value = tabId
    fetchResources()
  }

  const init = async () => {
    if (activeTab.value !== 'nexus_gate' && !isFetching.value) {
      await fetchResources()
    }
  }

  return {
    activeTab,
    isFetching,
    rawList,
    displayList,
    syncPhase,
    lastSyncAt,
    systemStatus,
    fetchResources,
    setSyncPhase,
    setTab,
    init
  }
})