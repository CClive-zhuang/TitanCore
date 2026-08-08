// 文件名: src/main/core.ts
import { ipcMain, BrowserWindow, shell, dialog, app, protocol, net } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { Db } from '../db'
import { SecurityService } from './SecurityService'
import { SteamDetector } from './SteamDetector'
import { EngineService } from './EngineService'
import { SyncManager } from './SyncManager'
import { TitanProtocol, ProtocolConfig } from './TitanProtocol'
import { ResourceService } from './ResourceService'
import { SearchService } from './SearchService'
import { LibraryService } from './LibraryService'
import { GatewayService } from './GatewayService'
import { titanFetch } from '../TitanNet'
import { CoverPackService } from './CoverPackService'
import { DownloadService } from './DownloadService'
import { UpdaterService } from './UpdaterService'
import { HeartbeatService } from './HeartbeatService'
import { loadSecrets } from './config'

const secrets = loadSecrets()
const TITAN_SALT = secrets.TITAN_SALT || ''
const DEFAULT_NODES: Record<string, string> = secrets.DEFAULT_NODES || {}

let activeNodeUrls: Record<string, string> | null = null
let currentConnectedNode: string | null = null
let mainWindowRef: BrowserWindow | null = null
let serverUrl: string = ''

const safeSend = (channel: string, data: any) => {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send(channel, data)
  }
}

const decodeKey = (key: string) => key?.startsWith('TITAN-') ? Array.from(Buffer.from(key.slice(6).split('').reverse().join(''), 'base64').toString('binary')).map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ TITAN_SALT.charCodeAt(i % TITAN_SALT.length))).join('') : ''

export const getNodeUrl = (nodeId: string) => decodeKey((activeNodeUrls?.[nodeId] || DEFAULT_NODES[nodeId]) ?? '')

export const setNodeUrls = (urls: Record<string, string>) => {
  activeNodeUrls = { ...urls }
  Db.set('titan_nodes', { selectedNode: Db.get<any>('titan_nodes')?.selectedNode || 'node1', nodes: activeNodeUrls })
}

const pushStatus = (status: any) => safeSend('auth:status', status)

async function doConnect(nodeId: string) {
  const url = getNodeUrl(nodeId)
  if (!url) return { success: false }
  try {
    const res = await titanFetch(`${url}?t=${Date.now()}`)
    if (!res.ok) return { success: false }
    const seed = await res.json()
    if (!seed || typeof seed !== 'object') return { success: false }

    seed.nodes && setNodeUrls(seed.nodes)
    if (seed.api_base || seed.endpoints) {
      const old = Db.get<any>('app_seed_config') || {}
      const newConfig = {
        ...old,
        serverUrl: seed.api_base || old.serverUrl,
        endpoints: seed.endpoints || old.endpoints,
        shopUrl: seed.shop_url || seed.shop || old.shopUrl,
        stUrl: seed.st || old.stUrl
      }
      Db.set('app_seed_config', newConfig)
      serverUrl = newConfig.serverUrl || serverUrl
    }
    currentConnectedNode = nodeId
    return { success: true, seed }
  } catch (e) {
    console.error('[Core] 节点接驳异常:', e)
    return { success: false }
  }
}

export const autoConnect = async () => {
  const saved = Db.get<{ selectedNode: string; nodes?: Record<string, string> }>('titan_nodes')
  activeNodeUrls = saved?.nodes || null
  const targetNode = saved?.selectedNode || 'node1'

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await doConnect(targetNode)
    if (res.success) {
      Db.set('titan_nodes', { selectedNode: targetNode, nodes: activeNodeUrls || {} })
      pushStatus({ isConnected: true, selectedNode: targetNode, error: null, seed: res.seed })
      await autoLogin()
      return
    }
    if (attempt < 3) await new Promise(r => setTimeout(r, 800))
  }
  pushStatus({ isConnected: false, selectedNode: targetNode, error: `ERR_NODE_FAIL:${targetNode}` })
}

async function requestBase64<T>(endpoint: string, body: object): Promise<{ data: T | null; err?: string }> {
  if (!serverUrl) return { data: null, err: 'ERR_SERVER_REQUIRED' }
  try {
    const res = await titanFetch(`${serverUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      if (res.status === 401) return { data: null, err: 'ERR_INVALID_CREDENTIALS' }
      if (res.status === 409) return { data: null, err: 'ERR_IDENTITY_OCCUPIED' }
      if (res.status === 429) return { data: null, err: 'ERR_TOO_MANY_REQUESTS' }
      if (res.status >= 500) return { data: null, err: 'ERR_SERVER_MAINTENANCE' }
      return { data: null, err: `ERR_REQUEST_ERROR:${res.status}` }
    }

    const json = await res.json() as { data?: { data?: string } | string }
    const base64Payload = typeof json.data === 'object' ? json.data?.data : json.data
    if (!base64Payload || typeof base64Payload !== 'string') return { data: null, err: 'ERR_SERVER_RESPONSE_ERROR' }

    const decoded = SecurityService.decryptPayload<T>(base64Payload)
    return { data: decoded, err: decoded ? undefined : 'ERR_DECRYPT_FAIL' }
  } catch (e: any) {
    return { data: null, err: 'ERR_NETWORK_ERROR' }
  }
}

async function requestBootstrap(): Promise<any | null> {
  const token = Db.getEncrypted<any>('auth_ticket')?.token
  if (!serverUrl || !token) return null
  try {
    const res = await titanFetch(`${serverUrl}/titan/bootstrap.php?t=${Date.now()}`, {
      headers: { 'X-Titan-Token': token }
    })
    if (!res.ok) return null
    const json = await res.json() as { data?: { data?: string } | string }
    const hexPayload = typeof json.data === 'object' ? json.data?.data : json.data
    if (!hexPayload) return null
    const decrypted = SecurityService.decryptNetworkPayload<any>(hexPayload)
    return decrypted?.data ?? null
  } catch (e) {
    console.error('[Core] Bootstrap 异常:', e)
    return null
  }
}

async function postLoginSync(userId: number, username: string): Promise<{ success: boolean; msg?: string }> {
  const p = await requestBootstrap()
  if (!p) return { success: false, msg: 'ERR_BOOTSTRAP_FAIL' }

  const up = p.user_profile
  const quota = p.quota_info
  if (up) {
    const profile = {
      id: up.id, username: up.username, email: up.email || '', avatarUrl: up.avatar || '', hbits: up.hbits || 0, groupIds: [], mainGroup: up.level_label || 'Free', vipLevel: up.level_id || 0,
      dailyQuota: { used: quota?.used || 0, limit: quota?.limit || 0, remaining: quota?.remaining || 0, extraRemaining: quota?.extra_remaining || quota?.extraRemaining || 0 },
      isVip: (up.level_id || 0) > 0, vipExpireDate: up.expire_date || ((up.level_id || 0) > 0 ? 'ACTIVE' : null), cores: (up.level_id || 0) > 1 ? 4 : 1
    }
    Db.set(`user.${up.id}.profile`, profile)
  }
  if (p.endpoints) Db.set('endpoints', p.endpoints)
  if (p.sidebar) Db.set('sidebar', p.sidebar)
  if (p.app_config) Db.set('app_settings', p.app_config)
  if (quota) Db.set('quota_info', quota)

  safeSend('auth:bootstrap', { endpoints: p.endpoints, sidebar: p.sidebar, appConfig: p.app_config, userProfile: p.user_profile, quotaInfo: quota })
  safeSend('auth:login-success', { userId, username })
  return { success: true }
}

const issueTicket = async (data: any, identifier: string, expire: number): Promise<{ success: boolean; msg: string }> => {
  const saved = Db.setEncrypted('auth_ticket', { token: data.access_token, refresh_token: data.refresh_token, userId: data.user_id, username: data.username || identifier, expires_in: expire, session_key: data.session_key || '' })
  if (!saved) return { success: false, msg: 'ERR_TICKET_STORE_FAIL' }

  SecurityService.initializeNetworkSecurity(data.session_key || '')
  const syncRes = await postLoginSync(data.user_id, data.username || identifier)

  if (!syncRes.success) {
    Db.setEncrypted('auth_ticket', null)
    SecurityService.initializeNetworkSecurity('')
    return { success: false, msg: syncRes.msg || 'ERR_SYNC_FAIL' }
  }
  setTimeout(() => {
    safeSend('app:trigger-update-check', {})
  }, 4000)
  return { success: true, msg: 'SUCCESS_AUTH' }
}

async function handleLogin(identification: string, password: string) {
  const result = await requestBase64<any>('/titan/titan_auth.php', { action: 'login', identification, password, device_id: 'titan_desktop_v15' })
  if (result.err) return { success: false, msg: result.err }
  const data = result.data
  return data?.access_token ? await issueTicket(data, identification, 7200) : { success: false, msg: 'ERR_INVALID_CREDENTIALS' }
}

async function handleRegister(username: string, email: string, password: string) {
  const result = await requestBase64<any>('/titan/titan_register.php', { username, email, password, device_id: 'titan_desktop_v15' })
  if (result.err) return { success: false, msg: result.err }
  const data = result.data
  return data?.access_token ? await issueTicket(data, username, 3600) : { success: false, msg: 'ERR_REGISTER_REJECTED' }
}

async function handleRefresh() {
  const t = Db.getEncrypted<any>('auth_ticket')
  if (!t?.refresh_token) return { success: false, msg: 'ERR_TICKET_LOST' }
  const result = await requestBase64<any>('/titan/titan_auth.php', { action: 'refresh', refresh_token: t.refresh_token, device_id: 'titan_desktop_v15' })
  if (result.err) return { success: false, msg: result.err }
  const data = result.data
  if (!data?.access_token) return { success: false, msg: 'ERR_TICKET_EXPIRED' }

  Db.setEncrypted('auth_ticket', { ...t, token: data.access_token, refresh_token: data.refresh_token, expires_in: data.expires_in || 7200, session_key: data.session_key || t.session_key || '' })
  data.session_key && SecurityService.initializeNetworkSecurity(data.session_key)
  return { success: true, msg: 'SUCCESS_REFRESH' }
}

export async function autoLogin() {
  if (!serverUrl) {
    const seed = Db.get<any>('app_seed_config')
    if (seed?.serverUrl) serverUrl = seed.serverUrl
  }
  if (!serverUrl) return

  const ticket = Db.getEncrypted<any>('auth_ticket')
  if (!ticket?.token) {
    safeSend('auth:ready-guest', null)
    return
  }

  const res = await handleRefresh()
  if (!res.success) {
    safeSend('auth:session-invalid', { message: res.msg })
    pushStatus({ isConnected: true, selectedNode: currentConnectedNode, error: res.msg || 'ERR_SESSION_INVALID' })
    return
  }

  const syncRes = await postLoginSync(ticket.userId, ticket.username)
  if (!syncRes.success) {
    safeSend('auth:session-invalid', { message: syncRes.msg || 'ERR_SYNC_FAIL' })
    pushStatus({ isConnected: true, selectedNode: currentConnectedNode, error: syncRes.msg || 'ERR_SYNC_FAIL' })
  } else {
    const freshTicket = Db.getEncrypted<any>('auth_ticket')
    if (freshTicket?.token && serverUrl) {
      HeartbeatService.start(freshTicket.token, serverUrl)
    }
    setTimeout(() => {
      safeSend('app:trigger-update-check', {})
    }, 4000)
  }
}

async function handleRedeem(card: string, contact: string): Promise<{ success: boolean; msg: string }> {
  const ticket = Db.getEncrypted<any>('auth_ticket')
  if (!ticket?.token) return { success: false, msg: 'ERR_LOGIN_REQUIRED' }
  if (!serverUrl) return { success: false, msg: 'ERR_SERVER_REQUIRED' }

  try {
    const res = await titanFetch(`${serverUrl}/titan/nuke.php`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Titan-Token': ticket.token }, body: JSON.stringify({ card, contact }) })
    const json = await res.json() as { code?: number; msg?: string; data?: any }
    if (json.code !== 200) return { success: false, msg: json.msg || 'ERR_REDEEM_FAIL' }

    const hexPayload = json.data?.data
    if (!hexPayload || typeof hexPayload !== 'string') return { success: false, msg: 'ERR_SERVER_RESPONSE_ERROR' }

    const decrypted = SecurityService.decryptNetworkPayload<any>(hexPayload)
    if (!decrypted) return { success: false, msg: 'ERR_DECRYPT_FAIL' }

    const expireDate = decrypted.data?.expire_date || 'PERMANENT'
    await postLoginSync(ticket.userId, ticket.username)
    return { success: true, msg: `激活成功！有效期至：${expireDate}` }
  } catch (e: any) {
    return { success: false, msg: 'ERR_NETWORK_ERROR' }
  }
}

async function forgotApi(body: object): Promise<any> {
  if (!serverUrl) return { ok: false, msg: 'ERR_OFFLINE_MODE' }
  try {
    const res = await titanFetch(`${serverUrl}/titan/reset_api.php`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Titan-Token': 'titan666' }, body: JSON.stringify(body) })
    return await res.json()
  } catch (e) {
    return { ok: false, msg: 'ERR_NETWORK_ERROR' }
  }
}

async function fetchSecureLinkDirect(resourceId: string, sUrl: string): Promise<{ success: boolean; mirrors?: any[]; msg?: string }> {
  const token = Db.getEncrypted<any>('auth_ticket')?.token
  if (!sUrl || !token) return { success: false, msg: 'ERR_OFFLINE_OR_UNAUTHORIZED' }

  try {
    const res = await titanFetch(`${sUrl}/titan/titan_gateway.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Titan-Token': token },
      body: JSON.stringify({ action: 'fetch_secure_link', resource_id: resourceId })
    })

    if (res.status === 429) return { success: false, msg: 'QUOTA_EXHAUSTED' }
    if (!res.ok) return { success: false, msg: `ERR_REQUEST:${res.status}` }

    const json = await res.json() as { code?: number; msg?: string; data?: { data?: string } | string }
    if (json.code !== 200) return { success: false, msg: json.msg || 'errors.deployNoManifest' }

    const hexPayload = typeof json.data === 'object' ? json.data?.data : json.data
    if (!hexPayload) return { success: false, msg: 'ERR_SERVER_RESPONSE' }

    const decrypted = SecurityService.decryptNetworkPayload<any>(hexPayload)
    if (!decrypted || !decrypted.data) return { success: false, msg: 'ERR_DECRYPT_FAIL' }

    const actualData = decrypted.quota_limit !== undefined ? decrypted : (decrypted.data || decrypted)
    if (actualData.quota_limit !== undefined) {
      GatewayService.pushQuotaUpdate(actualData.quota_limit, actualData.quota_remaining, actualData.extra_remaining || 0)
    }

    const mirrors = Array.isArray(decrypted.data) 
      ? decrypted.data 
      : (decrypted.data.data || decrypted.data.mirrors || [])

    return { success: true, mirrors }
  } catch (e: any) {
    return { success: false, msg: 'ERR_NETWORK_ERROR' }
  }
}

export function initCore(mainWindow: BrowserWindow, _ignoredFirstLaunch = false) {
  mainWindowRef = mainWindow
  serverUrl = Db.get<any>('app_seed_config')?.serverUrl || ''

  DownloadService.registerIpcHandlers()
  DownloadService.startDaemon().catch(e => console.error('[Core] 下载引擎启动失败:', e))
  UpdaterService.registerIpcHandlers()

  protocol.handle('titan-img', (request) => {
    try {
      const url = new URL(request.url)
      if (url.hostname !== 'cover') return new Response(null, { status: 400 })
      const id = decodeURIComponent(url.pathname.replace(/^\//, ''))
      if (!/^[a-zA-Z0-9_-]+$/.test(id)) return new Response('Forbidden', { status: 403 })

      const coversDir = path.join(Db.getDataRoot(), 'cache', 'covers')
      const exts = ['.webp', '.jpg', '.png']
      for (const ext of exts) {
        const filePath = path.join(coversDir, `${id}${ext}`)
        if (fs.existsSync(filePath)) return net.fetch(pathToFileURL(filePath).href)
      }
      return new Response('Not Found', { status: 404 })
    } catch (e) {
      return new Response('Server Error', { status: 500 })
    }
  })

  ipcMain.removeHandler('sys:check-local-cover')
  ipcMain.handle('sys:check-local-cover', async (_e, id: string) => {
    if (!id) return false
    try {
      const coversDir = path.join(Db.getDataRoot(), 'cache', 'covers')
      const exts = ['.webp', '.jpg', '.png']
      for (const ext of exts) {
        if (fs.existsSync(path.join(coversDir, `${id}${ext}`))) return true
      }
    } catch (e) {}
    return false
  })

  ipcMain.removeHandler('sys:client-ready')
  ipcMain.handle('sys:client-ready', async () => {
    await autoConnect().catch(() => {});
    let isFirstLaunch = false;
    try {
      const dbHealth = Db.query<{c: number}>('SELECT count(id) as c FROM titan_resources');
      isFirstLaunch = !dbHealth || dbHealth.length === 0 || dbHealth[0].c === 0;
    } catch (e) {
      isFirstLaunch = true; 
    }
    SteamDetector.detect().catch(() => {});
    if (serverUrl) {
      EngineService.initEngineConfig().catch(() => {});
      const coverPacksUrl = `${serverUrl}/titan/cover_packs.json`;
      CoverPackService.syncPacks(coverPacksUrl).catch(() => {});
    }
    if (isFirstLaunch) {
        SyncManager.startSync({ force: true }).catch(() => {});
    } else {
        SyncManager.startSync().catch(() => {});
    }
    return { isFirstLaunch };
  })

  ipcMain.removeHandler('sys:get-config')
  ipcMain.handle('sys:get-config', async (_e, key: string) => Db.get(key))

  ipcMain.removeHandler('sys:set-config')
  ipcMain.handle('sys:set-config', async (_e, key: string, value: any) => Db.set(key, value))

  ipcMain.removeHandler('sys:sync-start')
  ipcMain.handle('sys:sync-start', async (_e, options) => {
    try {
      SyncManager.startSync(options).catch(() => {});
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  })

  ipcMain.removeHandler('engine:check')
  ipcMain.handle('engine:check', async (_e, engine: 'ost' | 'st') => await EngineService.check(engine))

  ipcMain.removeHandler('engine:switch')
  ipcMain.handle('engine:switch', async (_e, engine: 'ost' | 'st') => await EngineService.switchEngine(engine))

  ipcMain.removeHandler('engine:silent-check')
  ipcMain.handle('engine:silent-check', async (_e, engine: 'ost' | 'st') => await EngineService.silentCheckUpdate(engine))

  ipcMain.removeHandler('steam:detect')
  ipcMain.handle('steam:detect', async () => await SteamDetector.detect())

  ipcMain.removeHandler('steam:select-folder')
  ipcMain.handle('steam:select-folder', async () => {
    if (!mainWindowRef) return { canceled: true }
    const res = await dialog.showOpenDialog(mainWindowRef, { title: '请指派 Steam 核心环境 (必须包含 steam.exe)', properties: ['openDirectory'] })
    if (res.canceled || res.filePaths.length === 0) return { canceled: true }

    const dir = res.filePaths[0]
    const isValid = await SteamDetector.validatePath(dir)
    if (!isValid) return { success: false, msg: 'ERR_STEAM_VALIDATE_FAIL' }

    SteamDetector.setManualPath(dir)
    return { success: true, path: dir, source: 'manual' }
  })

  ipcMain.removeHandler('auth:connect')
  ipcMain.handle('auth:connect', async (_e, id: string) => {
    currentConnectedNode !== id && (currentConnectedNode = null)
    const res = await doConnect(id)
    if (res.success) {
      Db.set('titan_nodes', { selectedNode: id, nodes: activeNodeUrls || {} })
      serverUrl = Db.get<any>('app_seed_config')?.serverUrl || serverUrl
      await autoLogin()
    }
    pushStatus({ isConnected: res.success, selectedNode: id, error: res.success ? null : `ERR_NODE_FAIL:${id}`, seed: res.seed })
    return res
  })

  ipcMain.removeHandler('auth:disconnect')
  ipcMain.handle('auth:disconnect', async () => {
    currentConnectedNode = null
    pushStatus({ isConnected: false, selectedNode: null, error: null })
    return { success: true }
  })

  ipcMain.removeHandler('auth:register')
  ipcMain.handle('auth:register', async (_e, u: string, m: string, p: string) => await handleRegister(u, m, p))

  ipcMain.removeHandler('auth:login')
  ipcMain.handle('auth:login', async (_e, i: string, p: string) => await handleLogin(i, p))

  ipcMain.removeHandler('auth:logout')
  ipcMain.handle('auth:logout', async () => {
    HeartbeatService.stop()
    Db.setEncrypted('auth_ticket', null)
    Db.set('user_profile', null)
    SecurityService.initializeNetworkSecurity('')
    safeSend('auth:logout-success', { mode: 'hard' })
    return { success: true }
  })

  ipcMain.removeHandler('auth:refresh')
  ipcMain.handle('auth:refresh', async () => await handleRefresh())

  ipcMain.removeHandler('auth:redeem')
  ipcMain.handle('auth:redeem', async (_e, card: string, contact: string) => await handleRedeem(card, contact))

  ipcMain.removeHandler('auth:forgot-search')
  ipcMain.handle('auth:forgot-search', async (_e, u: string, m: string) => {
    const res = await forgotApi({ act: 'search', kw: u, email: m })
    return res?.ok && res?.id ? { ok: true, id: res.id, username: res.username } : { ok: false, msg: res?.err || 'ERR_ACCOUNT_NOT_FOUND' }
  })

  ipcMain.removeHandler('auth:forgot-reset')
  ipcMain.handle('auth:forgot-reset', async (_e, uid: number, pass: string, email: string) => await forgotApi({ act: 'reset', uid, pass, email }))

  ipcMain.removeHandler('sys:open-external')
  ipcMain.handle('sys:open-external', async (_e, url: string) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      await shell.openExternal(url)
      return { success: true }
    }
    return { success: false, msg: 'ERR_INVALID_URL' }
  })

  ipcMain.removeHandler('sys:get-discovery-list')
  ipcMain.handle('sys:get-discovery-list', async (_e, tabId: string) => ResourceService.getDiscoveryList(tabId))

  ipcMain.removeHandler('sys:get-collection-children')
  ipcMain.handle('sys:get-collection-children', async (_e, collectionId: string) => ResourceService.getCollectionChildren(collectionId))

  ipcMain.removeHandler('sys:global-search')
  ipcMain.handle('sys:global-search', async (_e, keyword: string) => {
    const res = await SearchService.globalSearch(keyword)
    if (res.quota) safeSend('auth:update-quota', res.quota)
    return res
  })

  ipcMain.removeHandler('sys:toggle-library')
  ipcMain.handle('sys:toggle-library', async (_e, resourceId: string, extraData?: any) => {
    const res = LibraryService.toggleLibrary(resourceId, extraData)
    if (res.success) {
      safeSend('titan:library-updated', { action: res.status, resourceId })
    }
    return res
  })

  ipcMain.removeHandler('sys:batch-deploy-meta')
  ipcMain.handle('sys:batch-deploy-meta', async (_e, appIds: string[]) => {
    const sUrl = Db.get<any>('app_seed_config')?.serverUrl || serverUrl
    const token = Db.getEncrypted<any>('auth_ticket')?.token
    if (!sUrl || !token) return { success: false, msg: 'ERR_OFFLINE_OR_UNAUTHORIZED' }

    try {
      const res = await titanFetch(`${sUrl}/titan/titan_gateway.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Titan-Token': token },
        body: JSON.stringify({ action: 'batch_deploy_meta', app_ids: appIds })
      })

      if (!res.ok) return { success: false, msg: `ERR_REQUEST:${res.status}` }

      const json = await res.json() as { code?: number; msg?: string; data?: { data?: string } | string }
      if (json.code !== 200) return { success: false, msg: json.msg || 'ERR_GATEWAY_REJECTED' }

      const hexPayload = typeof json.data === 'object' ? json.data?.data : json.data
      if (!hexPayload) return { success: false, msg: 'ERR_SERVER_RESPONSE' }

      const decrypted = SecurityService.decryptNetworkPayload<any>(hexPayload)
      if (!decrypted) return { success: false, msg: 'ERR_DECRYPT_FAIL' }

      return { success: true, data: decrypted?.data?.results || [] }
    } catch (e: any) {
      return { success: false, msg: 'ERR_NETWORK_ERROR' }
    }
  })

  ipcMain.removeHandler('titan:deploy-game')
  ipcMain.handle('titan:deploy-game', async (_e, appId: string) => {
    const detectRes = await SteamDetector.detect()
    if (!detectRes?.path) return { success: false, msg: 'ERR_DEPLOY_NO_STEAM' }

    const sUrl = Db.get<any>('app_seed_config')?.serverUrl || serverUrl

    let realSteamAppId = appId
    let requestResourceId = appId.startsWith('steam_gate_') ? appId : `steam_gate_${appId}`

    const localResRow = Db.query<any>('SELECT id, meta_json FROM titan_resources WHERE id = ?', [appId])[0]

    if (localResRow) {
      requestResourceId = localResRow.id
      try {
        const meta = JSON.parse(localResRow.meta_json || '{}')
        realSteamAppId = (meta.target_id || meta.steam_appid || appId).toString()
      } catch (e) {
        console.error('[Core] 解析内置资源 meta_json 失败:', e)
      }
    } else {
      realSteamAppId = appId.replace(/^steam_gate_/, '')
    }

    const secureLinkRes = await fetchSecureLinkDirect(requestResourceId, sUrl)
    if (!secureLinkRes?.success || !secureLinkRes.mirrors || secureLinkRes.mirrors.length === 0) {
      return { success: false, msg: secureLinkRes?.msg || 'errors.deployNoManifest' }
    }

    const engine = Db.get<string>('unlock_engine') || 'ost'
    const engineConfig = Db.get<any>(`engine_config_${engine}`)
    if (!engineConfig) return { success: false, msg: 'ERR_DEPLOY_NO_ENGINE' }

    const protocolConfig: ProtocolConfig = {
      app_id: realSteamAppId,
      tool_url: engineConfig.tool_url,
      tool_mirrors: engineConfig.mirrors || [],
      manifest_url: secureLinkRes.mirrors[0]?.url || secureLinkRes.mirrors[0],
      manifest_mirrors: secureLinkRes.mirrors.map((m: any) => m.url || m).filter(Boolean),
      target_dlls: engineConfig.target_dlls || [],
      fast_mode: true
    }
    return await TitanProtocol.deploy(detectRes.path, protocolConfig, engine as 'ost' | 'st')
  })

  ipcMain.removeHandler('titan:uninstall-game')
  ipcMain.handle('titan:uninstall-game', async (_e, steamPath: string, appId: string, engine: 'ost' | 'st') => await TitanProtocol.uninstall(steamPath, appId, undefined, engine))

  ipcMain.removeHandler('titan:force-restore')
  ipcMain.handle('titan:force-restore', async (_e, steamPath: string) => await TitanProtocol.forceRestore(steamPath))

  ipcMain.removeHandler('sys:fetch-secure-link')
  ipcMain.handle('sys:fetch-secure-link', async (_e, resourceId: string) => {
    const sUrl = Db.get<any>('app_seed_config')?.serverUrl || serverUrl
    return await fetchSecureLinkDirect(resourceId, sUrl)
  })

  ipcMain.removeHandler('sys:push-cloud-library')
  ipcMain.handle('sys:push-cloud-library', async (_e, resourceIds: string[]) => {
    return LibraryService.pushCloudLibrary(resourceIds)
  })

  ipcMain.removeHandler('sys:pull-cloud-library')
  ipcMain.handle('sys:pull-cloud-library', async (_e) => {
    return LibraryService.pullCloudLibrary()
  })

  ipcMain.removeHandler('sys:get-user-library')
  ipcMain.handle('sys:get-user-library', async () => {
    return LibraryService.getLibrary()
  })

  ipcMain.removeHandler('sys:remove-user-library')
  ipcMain.handle('sys:remove-user-library', async (_e, resourceId: string) => {
    const res = LibraryService.removeGame(resourceId)
    if (res) {
      safeSend('titan:library-updated', { action: 'removed', resourceId })
    }
    return res
  })

  ipcMain.removeHandler('sys:open-local-folder')
  ipcMain.handle('sys:open-local-folder', async (_e, folderPath: string) => {
    if (folderPath && fs.existsSync(folderPath)) {
      try {
        const err = await shell.openPath(folderPath)
        if (err) return { success: false, error: err }
        return { success: true }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
    return { success: false, error: 'ERR_DIR_NOT_EXISTS' }
  })

  ipcMain.removeHandler('titan:launch-game')
  ipcMain.handle('titan:launch-game', async (_e, appId: string) => {
    if (!/^\d+$/.test(appId)) return { success: false, msg: 'ERR_INVALID_APPID' }
    try {
      await shell.openExternal(`steam://run/${appId}//-onlinefix`)
      return { success: true, msg: 'LAUNCH_OK' }
    } catch {
      return { success: false, msg: 'Steam 启动失败：未检测到 Steam 客户端或协议未注册。' }
    }
  })

  ipcMain.removeHandler('titan:run-diagnostics')
  ipcMain.handle('titan:run-diagnostics', async () => {
    const detectRes = await SteamDetector.detect();
    const steamPath = detectRes?.path;
    if (!steamPath) return { success: false, msg: 'ERR_STEAM_MISSING', data: [] };

    const engine = Db.get<string>('unlock_engine') || 'ost';
    const probeResult = EngineService.getManifestProbeResult();
    const results = await TitanProtocol.runDiagnostics(steamPath, engine as 'ost' | 'st', probeResult);
    return { success: true, data: results };
  });

  ipcMain.removeHandler('sys:push-telemetry')
  ipcMain.handle('sys:push-telemetry', async (_e, events: any[]) => {
    HeartbeatService.pushEvents(events)
    return { success: true }
  })

  ipcMain.removeHandler('sys:set-manifest-node')
  ipcMain.handle('sys:set-manifest-node', async (_e, node: string) => {
    const detectRes = await SteamDetector.detect();
    const steamPath = detectRes?.path;
    if (!steamPath) return { success: false, msg: 'ERR_STEAM_MISSING' };
    return await EngineService.setManifestNode(node, steamPath);
  });

  ipcMain.removeHandler('sys:get-manifest-node')
  ipcMain.handle('sys:get-manifest-node', async () => {
    const detectRes = await SteamDetector.detect();
    const steamPath = detectRes?.path;
    if (!steamPath) return { success: false, msg: 'ERR_STEAM_MISSING', selectedNode: 'auto', url: '', statuses: {} };

    const savedMode = Db.get<string>('manifest_node_mode');
    const toml = TitanProtocol.readToml(steamPath);
    const url = toml?.manifest?.url || '';
    const validNodes = ['opensteamtool', 'wudrm', 'steamrun'];

    let selectedNode: string;
    if (savedMode === 'auto') {
      selectedNode = 'auto';
    } else if (savedMode && validNodes.includes(savedMode)) {
      selectedNode = savedMode;
    } else {
      const isManual = url && validNodes.includes(url);
      selectedNode = isManual ? url : 'auto';
    }

    const statuses = EngineService.getManifestNodeStatuses();
    return { 
      success: true, 
      selectedNode,
      url,
      statuses
    };
  });

  ipcMain.removeHandler('sys:import-lua-folder')
  ipcMain.handle('sys:import-lua-folder', async () => {
    if (!mainWindowRef) return { success: false, msg: 'ERR_WINDOW_MISSING' }

    const { filePaths } = await dialog.showOpenDialog(mainWindowRef, {
      title: '选择包含 AppID.lua 清单的文件夹',
      properties: ['openDirectory']
    })
    if (filePaths.length === 0) return { success: false, msg: 'CANCELLED' }

    const dir = filePaths[0]
    let files: string[] = []
    try {
      files = fs.readdirSync(dir).filter(f => f.endsWith('.lua'))
    } catch (e) {
      return { success: false, msg: 'ERR_READ_DIR' }
    }

    const appIds = files
      .map(f => f.replace(/\.lua$/, ''))
      .filter(id => /^\d+$/.test(id))

    if (appIds.length === 0) {
      return { success: false, msg: 'ERR_NO_VALID_LUA' }
    }

    const existingLib = LibraryService.getLibrary()
    const existingIds = new Set(existingLib.map((i: any) => i.resource_id))
    const toImport = appIds.filter(id => !existingIds.has(`steam_gate_${id}`))
    const skipped = appIds.length - toImport.length

    if (toImport.length === 0) {
      return { success: true, imported: 0, skipped, failed: 0 }
    }

    const sUrl = Db.get<any>('app_seed_config')?.serverUrl || serverUrl
    const token = Db.getEncrypted<any>('auth_ticket')?.token
    const metaMap: Record<string, { title?: string; cover?: string }> = {}

    if (sUrl && token) {
      const BATCH_SIZE = 50
      for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
        const batch = toImport.slice(i, i + BATCH_SIZE)
        try {
          const res = await titanFetch(`${sUrl}/titan/titan_gateway.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Titan-Token': token },
            body: JSON.stringify({ action: 'batch_deploy_meta', app_ids: batch })
          })
          if (res.ok) {
            const json = await res.json() as { code?: number; data?: { data?: string } | string }
            if (json.code === 200) {
              const hexPayload = typeof json.data === 'object' ? json.data?.data : json.data
              if (hexPayload) {
                const decrypted = SecurityService.decryptNetworkPayload<any>(hexPayload)
                const results = decrypted?.data?.results || []
                for (const item of results) {
                  if (item.app_id && item.success !== false) {
                    metaMap[item.app_id] = {
                      title: item.title || `AppID: ${item.app_id}`,
                      cover: item.cover || ''
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn('[Core] 批量元数据获取失败:', e)
        }
      }
    }

    const importedIds: string[] = []
    let failed = 0
    for (const appId of toImport) {
      const meta = metaMap[appId] || { title: `AppID: ${appId}`, cover: '' }
      const res = LibraryService.toggleLibrary(`steam_gate_${appId}`, {
        title: meta.title,
        type: 'titan_protocol',
        cover: meta.cover
      })
      if (res.success) {
        importedIds.push(`steam_gate_${appId}`)
      } else {
        failed++
      }
    }

    if (importedIds.length > 0) {
      LibraryService.pushCloudLibrary(importedIds).catch(() => {})
      safeSend('titan:library-updated', { action: 'added', resourceIds: importedIds })
    }

    return { success: true, imported: importedIds.length, skipped, failed }
  })

  ipcMain.removeHandler('sys:toggle-auto-update')
  ipcMain.handle('sys:toggle-auto-update', async (_e, resourceId: string, autoUpdate: boolean) => {
    const uid = Db.getEncrypted<any>('auth_ticket')?.userId;
    if (!uid) return { success: false, msg: 'ERR_LOGIN_REQUIRED' };

    const dbRes = LibraryService.toggleAutoUpdate(resourceId, autoUpdate);
    if (!dbRes.success) return dbRes;

    const detectRes = await SteamDetector.detect();
    if (detectRes?.path) {
      const engine = Db.get<string>('unlock_engine') || 'ost';
      const appId = resourceId.replace(/^steam_gate_/, '');
      if (/^\d+$/.test(appId)) {
        TitanProtocol.toggleLuaAutoUpdate(detectRes.path, appId, autoUpdate, engine as 'ost' | 'st');
      }
    }

    safeSend('titan:library-updated', { action: 'updated', resourceId });

    return { success: true };
  });
}