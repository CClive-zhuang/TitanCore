import { app, BrowserWindow, screen, session, ipcMain, desktopCapturer, shell, protocol, Tray, Menu, nativeImage } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { exec } from 'child_process'
import { Db } from './db'
import { GatewayService } from './services/GatewayService'
import { initCore } from './services/core'
import axios from 'axios'

const isDev = !app.isPackaged
let win: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

if (isDev) process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

app.setPath('userData', path.join(app.getPath('appData'), 'titan-core'))

// ===== 单实例锁与唤醒原有窗口 =====
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
  process.exit(0)
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      if (!win.isVisible()) win.show()
      win.focus()
    }
  })
}

const getStateFile = () => path.join(Db.getDataRoot(), 'window-state.json')
const getWindowState = async (): Promise<Partial<Electron.Rectangle>> => fs.readFile(getStateFile(), 'utf-8').then(JSON.parse).catch(() => ({}))
const saveWindowState = (bounds: Electron.Rectangle) => fs.writeFile(getStateFile(), JSON.stringify(bounds)).catch(() => {})

// ===== 创建系统托盘 =====
function createTray() {
  const iconPath = isDev
    ? path.join(__dirname, '../../build/app.ico')
    : path.join(process.resourcesPath, 'app.asar.unpacked', 'build', 'app.ico')
  const icon = nativeImage.createFromPath(iconPath)
  
  if (icon.isEmpty()) {
    console.warn(`[Tray] Warning: Failed to load tray icon from path: ${iconPath}`)
  }
  
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('TitanCore')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开主界面',
      click: () => {
        win?.show()
        if (win?.isMinimized()) win.restore()
        win?.focus()
      }
    },
    { type: 'separator' },
    {
      label: '彻底退出',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
  
  tray.on('double-click', () => {
    if (win?.isVisible()) {
      win.hide()
    } else {
      win?.show()
      if (win?.isMinimized()) win.restore()
      win?.focus()
    }
  })
}

// ===== 架构修复：全局网络拦截注册（仅执行一次） =====
function setupAppProtocolAndNetwork() {
  const realChromeVersion = process.versions.chrome || '138.0.0.0'
  const modernUserAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${realChromeVersion} Safari/537.36`

  session.defaultSession.webRequest.onBeforeSendHeaders((details, cb) => {
    details.requestHeaders['User-Agent'] = modernUserAgent
    cb({ cancel: false, requestHeaders: details.requestHeaders })
  })

  session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
    const csp = [
      "default-src 'self' 'unsafe-inline' data: blob: http: https: ws: wss: titan-img:",
      "img-src 'self' data: blob: http: https: titan-img:",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "connect-src 'self' http: https: ws: wss:"
    ].join('; ')
    
    cb({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    })
  })
}

// ===== 架构修复：全局 IPC 路由注册（仅执行一次，彻底消灭重复绑定崩溃） =====
function registerGlobalIPC() {
  ipcMain.handle('get-desktop-audio-source', async () => (await desktopCapturer.getSources({ types: ['screen'] }))[0]?.id || '')
  
  ipcMain.on('win-min', () => win?.minimize())
  ipcMain.on('win-max', () => win?.isMaximized() ? win.unmaximize() : win?.maximize())
  ipcMain.on('win-close', () => win?.close())

  ipcMain.handle('sys:show-item-in-folder', async (_event, filePath: string) => {
    if (filePath) {
      shell.showItemInFolder(filePath)
    }
  })

  ipcMain.handle('sys:restart-steam', async () => {
    return new Promise((resolve) => {
      exec('taskkill /F /T /IM steam.exe', () => {
        setTimeout(() => {
          shell.openExternal('steam://open/main')
          resolve(true)
        }, 1500)
      })
    })
  })

  ipcMain.handle('sys:proxy-post', async (_event, { url, body }: { url: string, body: any }) => {
    try {
      const base = Db.get<any>('app_seed_config')?.serverUrl || ''
      const target = url.startsWith('http') ? url : base + url
      const { data } = await axios.post(target, body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 8000
      })
      return data
    } catch (e: any) {
      return { code: e.response?.status || 500, msg: e.response?.data?.msg || e.message || 'Network failure' }
    }
  })

  ipcMain.handle('sys:redeem-cores', async (_event, score: number, amount: number) => {
    const config = Db.get<any>('app_seed_config')
    const serverUrl = config?.serverUrl || ''
    return await GatewayService.redeemCores(score, amount, serverUrl)
  })
}

// ===== 窗口只负责创建，不负责业务路由注册 =====
async function createWindow(isFirstLaunch: boolean) {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
  const { width = 1440, height = 960, x, y } = await getWindowState()

  win = new BrowserWindow({
    width, height,
    x: (x !== undefined && x >= 0 && x + width <= sw) ? x : undefined,
    y: (y !== undefined && y >= 0 && y + height <= sh) ? y : undefined,
    minWidth: 960, minHeight: 640, frame: false, titleBarStyle: 'hidden',
    webPreferences: { preload: path.join(__dirname, '../preload/index.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  })

  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      win?.hide()
      if (win) saveWindowState(win.getBounds())
    } else {
      if (win) saveWindowState(win.getBounds())
    }
  })

  // 新增：拦截 F5 / Ctrl+R / Cmd+R 等页面刷新快捷键，防止桌面应用白屏
  win.webContents.on('before-input-event', (event, input) => {
    if (
      input.key === 'F5' ||
      ((input.control || input.meta) && input.key.toLowerCase() === 'r')
    ) {
      event.preventDefault()
    }
  })

  // 新增：拦截意外页面导航（如点击外链），防止跳转到外部页面导致白屏
  win.webContents.on('will-navigate', (event, url) => {
    const currentUrl = win?.webContents.getURL() || ''
    if (url !== currentUrl) {
      event.preventDefault()
    }
  })

  initCore(win, isFirstLaunch)

  if (isDev) {
    await win.loadURL('http://127.0.0.1:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    await win.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  win.on('closed', () => (win = null))
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'titan-img', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
])

app.whenReady().then(async () => {
  // 主进程核心服务与 IPC 一次性挂载点
  setupAppProtocolAndNetwork()
  registerGlobalIPC()

  const isFirstLaunch = Db.isFirstLaunch()

  const dbResult = Db.init()
  if (!dbResult.success) {
    console.error('[Main] DB Init Failed:', dbResult.error)
  } else if (dbResult.reset) {
    console.warn('[Main] DB Auto-Repaired:', dbResult.error)
  }

  await createWindow(isFirstLaunch)
  createTray()

  app.on('before-quit', (e) => {
    if (isQuitting) return
    e.preventDefault()
    isQuitting = true
    win?.destroy()
    import('./services/DownloadService').then(({ DownloadService }) => {
      DownloadService.shutdown()
    })
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit()
  }
})

app.on('activate', () => !BrowserWindow.getAllWindows().length && createWindow(false))