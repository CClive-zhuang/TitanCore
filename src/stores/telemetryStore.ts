// 文件名: src/stores/telemetryStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTelemetryStore = defineStore('telemetry', () => {
  const eventBuffer = ref<any[]>([])
  let flushTimer: ReturnType<typeof setTimeout> | null = null

  function trackSearch(keyword: string, resultCount: number) {
    if (!keyword || keyword.trim().length === 0) return
    push({
      type: 'search',
      keyword: keyword.trim().substring(0, 50),
      result_count: resultCount,
      timestamp: Date.now()
    })
  }

  function enterPage(pageId: string) {
    push({
      type: 'page_view',
      page_id: pageId,
      entry_time: Date.now()
    })
  }

  function exitPage(pageId: string, durationMs: number) {
    if (durationMs < 1000) return
    push({
      type: 'page_view',
      page_id: pageId,
      duration_ms: durationMs,
      exit_time: Date.now()
    })
  }

  function push(event: any) {
    eventBuffer.value.push(event)
    if (eventBuffer.value.length > 100) {
      eventBuffer.value = eventBuffer.value.slice(-100)
    }
    scheduleFlush()
  }

  function scheduleFlush() {
    if (flushTimer) return
    flushTimer = setTimeout(() => {
      flushTimer = null
      if (eventBuffer.value.length === 0) return
      const batch = [...eventBuffer.value]
      eventBuffer.value = []
      
      // 深拷贝脱敏：Vue 响应式对象经 IPC structuredClone 会抛异常，必须先洗成纯 JS 对象
      let clonedBatch: any[]
      try {
        clonedBatch = JSON.parse(JSON.stringify(batch))
      } catch (e) {
        console.warn('[TelemetryStore] 事件序列化失败，丢弃批次:', e)
        return
      }
      
      window.electron.invoke('sys:push-telemetry', clonedBatch).catch(() => {
        // 失败回滚：旧数据放前，新数据放后，超长截断尾部（丢新保旧）
        eventBuffer.value = [...batch, ...eventBuffer.value]
        if (eventBuffer.value.length > 100) {
          eventBuffer.value = eventBuffer.value.slice(0, 100)
        }
      })
    }, 3000)
  }

  return {
    trackSearch,
    enterPage,
    exitPage
  }
})