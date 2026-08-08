// 文件名: src/stores/authStore.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

let _titanUnsubscribers: (() => void)[] = []

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    _titanUnsubscribers.forEach(unsub => { try { unsub() } catch {} })
    _titanUnsubscribers = []
  })
}

export const useAuthStore = defineStore('auth', () => {
  const isConnected = ref(false)
  const selectedNode = ref('node1')
  const isProcessing = ref(false)
  const connectionError = ref<string | null>(null)
  const user = ref<any>(null)
  const isVaultAuthorized = ref(false)
  const endpoints = ref<Record<string, string>>({})
  const sidebar = ref<any[]>([])
  const appConfig = ref<any>(null)
  const dailyQuota = ref({ used: 0, limit: 0, remaining: 0, extraRemaining: 0 })
  
  const nodeList = [
    { id: 'node1', label: 'auth.NODE_1' },
    { id: 'node2', label: 'auth.NODE_2' },
    { id: 'node3', label: 'auth.NODE_3' }
  ]

  const isVip = computed(() => user.value?.isVip ?? false)
  const isLoggedIn = computed(() => !!user.value)

  if (window.electron?.on && _titanUnsubscribers.length === 0) {
    _titanUnsubscribers.push(
      window.electron.on('auth:status', (d: any) => {
        isConnected.value = d?.isConnected ?? false
        if (d?.selectedNode) selectedNode.value = d.selectedNode
        connectionError.value = d?.error || null
        isProcessing.value = false
      })
    )

    _titanUnsubscribers.push(window.electron.on('auth:login-success', () => { isProcessing.value = false }))
    
    const resetState = () => {
        user.value = null
        endpoints.value = {}
        sidebar.value = []
        appConfig.value = null
        dailyQuota.value = { used: 0, limit: 0, remaining: 0, extraRemaining: 0 }
        isVaultAuthorized.value = false
        isProcessing.value = false
    }

    _titanUnsubscribers.push(window.electron.on('auth:session-invalid', resetState))
    _titanUnsubscribers.push(window.electron.on('auth:ready-guest', () => { isProcessing.value = false }))
    _titanUnsubscribers.push(window.electron.on('auth:logout-success', resetState))

    _titanUnsubscribers.push(
      window.electron.on('auth:update-quota', (q: any) => {
        if (q) {
          dailyQuota.value.limit = q.limit ?? dailyQuota.value.limit
          dailyQuota.value.used = q.current ?? q.used ?? dailyQuota.value.used
          dailyQuota.value.remaining = q.remaining ?? (q.limit - (q.current || q.used) || 0)
          dailyQuota.value.extraRemaining = q.extraRemaining ?? q.extra_remaining ?? dailyQuota.value.extraRemaining
        }
      })
    )

    _titanUnsubscribers.push(
      window.electron.on('auth:bootstrap', (d: any) => {
        if (d?.endpoints) endpoints.value = d.endpoints
        if (d?.sidebar) sidebar.value = d.sidebar
        if (d?.appConfig) appConfig.value = d.appConfig
        if (d?.userProfile) {
          const up = d.userProfile
          const q = d.quotaInfo || up.dailyQuota || {}
          user.value = {
            id: up.id,
            username: up.username,
            email: up.email || '',
            avatarUrl: up.avatarUrl || up.avatar || '',
            hbits: up.hbits || 0,
            groupIds: up.groupIds || [],
            mainGroup: up.mainGroup || up.level_label || 'Free',
            vipLevel: up.vipLevel || up.level_id || 0,
            isVip: up.isVip ?? (up.vipLevel || up.level_id || 0) > 0,
            vipExpireDate: up.vipExpireDate || up.expire_date || null,
            cores: up.cores || ((up.vipLevel || up.level_id || 0) > 1 ? 4 : 1)
          }
          dailyQuota.value = {
            used: q.used || 0,
            limit: q.limit || 0,
            remaining: q.remaining || 0,
            extraRemaining: q.extra_remaining || q.extraRemaining || 0
          }
        }
      })
    )
  }

  const connect = async (id: string) => {
    if (isProcessing.value) return
    isProcessing.value = true
    connectionError.value = null
    try { await window.electron.invoke('auth:connect', id) } 
    catch (e: any) { connectionError.value = e.message || 'ERR_NODE_CONNECT_FAIL'; isProcessing.value = false }
  }

  const disconnect = async () => {
    if (isProcessing.value) return
    isProcessing.value = true
    try { await window.electron.invoke('auth:disconnect') } 
    catch { isProcessing.value = false }
  }

  const login = async (id: string, pass: string) => {
    if (isProcessing.value) return 'ERR_AUTH_PROCESSING'
    isProcessing.value = true
    try {
      const r = await window.electron.invoke('auth:login', id, pass)
      if (!r?.success) return r?.msg || 'ERR_LOGIN_FAILED'
      return null
    } catch (e: any) { return e.message || 'ERR_NETWORK_ERROR' } 
    finally { isProcessing.value = false }
  }

  const register = async (username: string, email: string, password: string) => {
    if (isProcessing.value) return 'ERR_AUTH_PROCESSING'
    isProcessing.value = true
    try {
      const r = await window.electron.invoke('auth:register', username, email, password)
      if (!r?.success) return r?.msg || 'ERR_REGISTER_FAILED'
      return null
    } catch (e: any) { return e.message || 'ERR_NETWORK_ERROR' } 
    finally { isProcessing.value = false }
  }

  const logout = async () => {
    if (isProcessing.value) return
    isProcessing.value = true
    try { await window.electron.invoke('auth:logout') } 
    catch { isProcessing.value = false }
  }

  const forgotSearch = async (u: string, e: string) => {
    if (isProcessing.value) return { ok: false, msg: 'ERR_AUTH_PROCESSING' }
    isProcessing.value = true
    try { return await window.electron.invoke('auth:forgot-search', u, e) } 
    catch (err: any) { return { ok: false, msg: err.message || 'ERR_NETWORK_ERROR' } } 
    finally { isProcessing.value = false }
  }

  const forgotReset = async (uid: number, p: string, e: string) => {
    if (isProcessing.value) return { ok: false, msg: 'ERR_AUTH_PROCESSING' }
    isProcessing.value = true
    try { return await window.electron.invoke('auth:forgot-reset', uid, p, e) } 
    catch (err: any) { return { ok: false, msg: err.message || 'ERR_NETWORK_ERROR' } } 
    finally { isProcessing.value = false }
  }

  const redeem = async (card: string, contact: string) => {
    if (isProcessing.value) return { success: false, msg: 'ERR_AUTH_PROCESSING' }
    isProcessing.value = true
    try { return await window.electron.invoke('auth:redeem', card, contact) } 
    catch (e: any) { return { success: false, msg: e.message || 'ERR_REDEEM_EXCEPTION' } } 
    finally { isProcessing.value = false }
  }

  const openShop = async () => {
    const shopUrl = appConfig.value?.shopUrl || appConfig.value?.shop_url
    if (!shopUrl) return { success: false, msg: 'ERR_SHOP_NOT_CONFIGURED' }
    try {
      await window.electron.sys.openExternal(shopUrl)
      return { success: true }
    } catch { return { success: false, msg: 'ERR_CANNOT_OPEN_BROWSER' } }
  }

  return { isConnected, selectedNode, isProcessing, connectionError, nodeList, user, isVip, isLoggedIn, isVaultAuthorized, endpoints, sidebar, appConfig, dailyQuota, connect, disconnect, login, register, logout, forgotSearch, forgotReset, redeem, openShop }
})