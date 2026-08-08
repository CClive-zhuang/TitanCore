// 文件名: src/stores/searchStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useTelemetryStore } from './telemetryStore'

export const useSearchStore = defineStore('search', () => {
  const isSearching = ref(false)
  const isWarping = ref(false)
  const hasSearched = ref(false)
  const searchResults = ref<any[]>([])

  const currentError = ref<'NONE' | 'KEYWORD_INVALID' | 'RESOURCE_NOT_FOUND' | 'NETWORK_ERROR' | 'QUOTA_EXHAUSTED'>('NONE')

  const radarRules = ref({ red: [] as string[], yellow: [] as string[] })
  const lastKeyword = ref('')
  const autoOpenItem = ref<any>(null) 

  const cachedLinks = ref<{
    protocol: Record<string, { data: any[], expires: number }>;
    direct: Record<string, { data: any[], expires: number }>;
  }>({ protocol: {}, direct: {} })

  const initRadar = async () => {
    try {
      const rules = await window.electron.invoke('sys:get-config', 'radar_denuvo_rules')
      if (rules && rules.red) radarRules.value = rules
    } catch (e) { console.error('[SearchStore] 无法加载雷达规则', e) }
  }

  const clearErrorState = () => {
      currentError.value = 'NONE'
  }

  const clearSearch = () => {
    hasSearched.value = false
    isWarping.value = false
    searchResults.value = []
    clearErrorState()
    lastKeyword.value = ''
    autoOpenItem.value = null
    cachedLinks.value = { protocol: {}, direct: {} }
  }

  const setCachedLinks = (id: string, type: string, links: any[]) => {
    const isProtocol = type === 'titan_protocol'
    const category = isProtocol ? 'protocol' : 'direct'

    let ttlMinutes = 10
    if (isProtocol) ttlMinutes = 5
    else if (['tool', 'patch'].includes(type)) ttlMinutes = 15

    cachedLinks.value[category][id] = {
        data: links,
        expires: Date.now() + (ttlMinutes * 60 * 1000)
    }
  }

  const getCachedLinks = (id: string, type: string): any[] | null => {
    const now = Date.now()
    const category = type === 'titan_protocol' ? 'protocol' : 'direct'
    const cache = cachedLinks.value[category][id]

    if (!cache) return null
    if (now < cache.expires) {
      return cache.data
    }

    delete cachedLinks.value[category][id]
    return null
  }

  const doSearch = async (keyword: string) => {
    if (!keyword.trim()) return

    isWarping.value = true
    isSearching.value = true
    hasSearched.value = true
    searchResults.value = []
    clearErrorState()
    lastKeyword.value = keyword.trim()
    autoOpenItem.value = null

    try {
      const result = await window.electron.invoke('sys:global-search', keyword.trim())

      if (result.success && result.data && result.data.length > 0) {
        const telemetryStore = useTelemetryStore()
        telemetryStore.trackSearch(keyword.trim(), result.data.length)

        searchResults.value = result.data.map((item: any) => ({
          ...item,
          meta: item.meta || item.meta_json || {}
        }))

        if (result.data.length === 1) {
            autoOpenItem.value = searchResults.value[0]
        } 
        else if (/^\d+$/.test(keyword.trim()) && String(result.data[0].id) === keyword.trim()) {
            autoOpenItem.value = searchResults.value[0]
        }

      } else {
        currentError.value = (result.error as any) || 'RESOURCE_NOT_FOUND'
      }
    } catch (e) {
      console.error('[SearchStore] 搜索异常:', e)
      currentError.value = 'NETWORK_ERROR'
    } finally {
      isSearching.value = false
      setTimeout(() => {
        isWarping.value = false
      }, 150)
    }
  }

  const checkRadarStatus = (appId: string) => {
    if (radarRules.value.red.includes(appId)) return 'red'
    if (radarRules.value.yellow.includes(appId)) return 'yellow'
    return 'safe'
  }

  return { 
      isSearching, isWarping, hasSearched, searchResults, currentError, 
      lastKeyword, autoOpenItem, cachedLinks,
      doSearch, initRadar, checkRadarStatus, clearSearch, clearErrorState, setCachedLinks, getCachedLinks 
  }
})