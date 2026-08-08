// 文件名: src/stores/feedbackStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './authStore'
import { t } from '../i18n'

export const useFeedbackStore = defineStore('feedback', () => {
  const authStore = useAuthStore()
  
  const logs = ref<any[]>([])
  const threads = ref<Record<number, any[]>>({})
  const hasUnread = ref(false)
  
  let isPolling = false
  let pollTimer: ReturnType<typeof setTimeout> | null = null

  async function loadLocal() {
    try {
      const saved = await window.electron.invoke('sys:get-config', 'titan_feedback_history_v16_pro')
      // 修复：db.get 已自动解析为对象；防御旧版坏数据（非数组则丢弃）
      if (Array.isArray(saved)) logs.value = saved
    } catch (e) {
      console.warn('[FeedbackStore] 历史记录读取失败:', e)
    }
  }

  async function saveLocal() {
    await window.electron.invoke('sys:set-config', 'titan_feedback_history_v16_pro', JSON.parse(JSON.stringify(logs.value)))
  }

  function markRead() {
    hasUnread.value = false
  }

  async function clearAll() {
    logs.value = []
    threads.value = {}
    await saveLocal()
  }

  async function submitRoot(payload: any) {
    const res = await window.electron.invoke('sys:proxy-post', { url: '/titan/feedback_submit.php', body: payload })
    if (res?.code === 429) throw new Error(res.msg || t('feedback.errorRateLimit'))
    if (res?.code === 200 || res?.status === 200 || res?.success) {
      const newId = Number(res?.data?.id || res?.id || res?.data)
      if (!newId || isNaN(newId)) throw new Error(t('feedback.errorInvalidId'))
      
      logs.value.unshift({
        ...payload,
        id: newId,
        created_at: Date.now(),
        status: 0,
        awaiting_reply: true,
        known_admin_count: 0
      })
      await saveLocal()
      return newId
    }
    throw new Error(res?.msg || t('feedback.errorServer'))
  }

  async function submitAppend(rootId: number, payload: any) {
    const res = await window.electron.invoke('sys:proxy-post', { url: '/titan/feedback_submit.php', body: payload })
    if (res?.code === 429) throw new Error(res.msg || t('feedback.errorRateLimit'))
    if (res?.code === 200 || res?.status === 200 || res?.success) {
      const log = logs.value.find(l => l.id === rootId)
      if (log) {
        log.awaiting_reply = true
        await saveLocal()
      }
      await fetchThread(rootId)
      return true
    }
    throw new Error(res?.msg || t('feedback.errorAppend'))
  }

  async function fetchThread(rootId: number) {
    if (!rootId) return []
    try {
      const res = await window.electron.invoke('sys:proxy-post', { url: '/titan/feedback_thread.php', body: { parent_id: rootId } })
      const rawList = Array.isArray(res?.data) ? res.data : []
      
      const subList = rawList.filter((m: any) => Number(m.id) !== rootId).map((m: any) => ({
         id: Number(m.id),
         content: String(m.content || ''),
         created_at: typeof m.created_at === 'number' ? (m.created_at > 1e10 ? m.created_at : m.created_at * 1000) : Date.parse(m.created_at) || Date.now(),
         sender_type: (m.sender_type === 'admin' || m.sender_type === 'hajimi') ? 'admin' : 'user'
      })).sort((a: any, b: any) => a.created_at - b.created_at)

      threads.value[rootId] = subList

      const log = logs.value.find(l => l.id === rootId)
      if (log) {
        const adminMsgs = subList.filter((m: any) => m.sender_type === 'admin')
        const knownCount = log.known_admin_count || 0
        
        const rootNode = rawList.find((m: any) => Number(m.id) === rootId)
        let rootReplyFired = false
        if (rootNode && rootNode.reply_content && rootNode.reply_content !== log.reply) {
           log.reply = rootNode.reply_content
           rootReplyFired = true
        }

        if (adminMsgs.length > knownCount || rootReplyFired) {
           log.known_admin_count = adminMsgs.length
           log.awaiting_reply = false
           hasUnread.value = true
           await saveLocal()
           window.dispatchEvent(new CustomEvent('feedback:new-reply', { detail: rootId }))
        }
      }
      return subList
    } catch (e) {
      return []
    }
  }

  function startPolling() {
    if (isPolling) return
    isPolling = true

    const tick = async () => {
      if (!isPolling) return
      if (!authStore.isConnected) {
        pollTimer = setTimeout(tick, 60000)
        return
      }
      
      const ids = logs.value.map(l => l.id)
      if (ids.length > 0) {
         try {
            const res = await window.electron.invoke('sys:proxy-post', { url: '/titan/check_feedback.php', body: { ids } })
            if (res?.data && Array.isArray(res.data)) {
               res.data.forEach((update: any) => {
                  const tLog = logs.value.find(l => l.id === update.id)
                  if (tLog && tLog.reply !== update.reply) {
                     tLog.reply = update.reply
                     tLog.status = update.status
                     hasUnread.value = true
                     window.dispatchEvent(new CustomEvent('feedback:new-reply', { detail: update.id }))
                  }
               })
               // 修复：循环结束后统一保存，避免并发写并确保 await
               await saveLocal()
            }
         } catch(e) {}
      }

      for (const log of logs.value) {
        if (log.awaiting_reply) {
           await fetchThread(log.id)
        }
      }

      const hasAwaiting = logs.value.some((l: any) => l.awaiting_reply)
      pollTimer = setTimeout(tick, hasAwaiting ? 15000 : 60000)
    }

    pollTimer = setTimeout(tick, 5000)
  }

  function stopPolling() {
    isPolling = false
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  return { logs, threads, hasUnread, loadLocal, saveLocal, clearAll, submitRoot, submitAppend, fetchThread, startPolling, stopPolling, markRead }
})