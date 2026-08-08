import { contextBridge, ipcRenderer } from 'electron'

const ALLOWED_INVOKE_PREFIXES = ['auth:', 'sys:', 'steam:', 'engine:', 'titan:', 'download:', 'app:']
const ALLOWED_INVOKE_CHANNELS = ['get-desktop-audio-source']
const ALLOWED_SEND_CHANNELS = ['win-min', 'win-max', 'win-close']
const ALLOWED_ON_PREFIXES = ['auth:', 'sys:', 'titan:', 'lifecycle:', 'download:', 'app:']

const isAllowedInvoke = (channel: string) => 
  ALLOWED_INVOKE_PREFIXES.some(p => channel.startsWith(p)) || 
  ALLOWED_INVOKE_CHANNELS.includes(channel) ||
  ALLOWED_SEND_CHANNELS.includes(channel)

const isAllowedOn = (channel: string) => 
  ALLOWED_ON_PREFIXES.some(p => channel.startsWith(p))

contextBridge.exposeInMainWorld('electron', {
  window: {
    min: () => ipcRenderer.send('win-min'),
    max: () => ipcRenderer.send('win-max'),
    close: () => ipcRenderer.send('win-close')
  },
  sys: {
    getDesktopAudioSource: () => ipcRenderer.invoke('get-desktop-audio-source'),
    openExternal: (url: string) => ipcRenderer.invoke('sys:open-external', url),
    openLocalFolder: (folderPath: string) => ipcRenderer.invoke('sys:open-local-folder', folderPath),
    showItemInFolder: (filePath: string) => ipcRenderer.invoke('sys:show-item-in-folder', filePath),
    getUserLibrary: () => ipcRenderer.invoke('sys:get-user-library'),
    removeUserLibrary: (resourceId: string) => ipcRenderer.invoke('sys:remove-user-library', resourceId),
    setManifestNode: (node: string) => ipcRenderer.invoke('sys:set-manifest-node', node),
    getManifestNode: () => ipcRenderer.invoke('sys:get-manifest-node'),
    runDiagnostics: () => ipcRenderer.invoke('titan:run-diagnostics'),
    launchGame: (appId: string) => ipcRenderer.invoke('titan:launch-game', appId),
    proxyPost: (url: string, body: any) => ipcRenderer.invoke('sys:proxy-post', { url, body }),
    checkUpdate: () => ipcRenderer.invoke('app:check-update'),
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    startUpdate: () => ipcRenderer.invoke('app:start-update'),
    pushTelemetry: (events: any[]) => ipcRenderer.invoke('sys:push-telemetry', events),
    toggleAutoUpdate: (resourceId: string, autoUpdate: boolean) => ipcRenderer.invoke('sys:toggle-auto-update', resourceId, autoUpdate)
  },
  invoke: (channel: string, ...args: any[]) => {
    if (!isAllowedInvoke(channel)) {
      throw new Error(`[Security] IPC invoke channel '${channel}' is not in the whitelist. ` +
        `Allowed prefixes: ${ALLOWED_INVOKE_PREFIXES.join(', ')}, ` +
        `Allowed channels: ${ALLOWED_INVOKE_CHANNELS.join(', ')}, ${ALLOWED_SEND_CHANNELS.join(', ')}`)
    }
    return ipcRenderer.invoke(channel, ...args)
  },
  on: (channel: string, func: (...args: any[]) => void) => {
    if (!isAllowedOn(channel)) {
      throw new Error(`[Security] IPC on channel '${channel}' is not in the whitelist. ` +
        `Allowed prefixes: ${ALLOWED_ON_PREFIXES.join(', ')}`)
    }
    const subscription = (_event: any, ...args: any[]) => func(...args)
    ipcRenderer.on(channel, subscription)
    return () => ipcRenderer.removeListener(channel, subscription)
  },
  telemetry: {
    trackEvent: (event: string, data: any) => console.log('[Telemetry]', event, data)
  }
})