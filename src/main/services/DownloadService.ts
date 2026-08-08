import path from 'path'
import fs from 'fs'
import { spawn, ChildProcess, StdioOptions } from 'child_process'
import net from 'net'
import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { Db } from '../db'
import WebSocket from 'ws'
import crypto from 'crypto'

type TaskStatus = 'active' | 'waiting' | 'paused' | 'completed' | 'error'

interface TaskRegistryEntry {
  resourceId?: string
  addedAt: number
}

const PathUtils = {
  basename: (p: string): string => {
    if (!p) return ''
    const clean = p.replace(/[\\/]+$/, '')
    const segments = clean.split(/[\\/]/)
    return segments.pop() || ''
  },
  normalize: (p: string): string => {
    if (!p) return ''
    return path.normalize(p).replace(/\\/g, '/')
  },
  sanitizeFilename: (name: string): string => {
    return name
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/[\s.]+$/, '')
  }
}

export class DownloadService {
  private static ariaProcess: ChildProcess | null = null
  private static activePort = 6800
  private static wsClient: WebSocket | null = null
  private static taskRegistry: Map<string, TaskRegistryEntry> = new Map()
  private static rpcSecret = ''
  private static isShuttingDown = false
  private static syncTimer: NodeJS.Timeout | null = null
  private static guardTimer: NodeJS.Timeout | null = null
  private static engineStartTime = 0
  private static readonly PROTECTION_PERIOD_MS = 15000
  private static rpcId = 0
  private static pendingRequests: Map<number | string, { resolve: Function, reject: Function }> = new Map()
  private static restartAttempts = 0
  private static readonly MAX_RESTART_ATTEMPTS = 5
  private static completionCallbacks: Map<string, { resolve: Function; reject: Function }> = new Map()

  private static readonly CHROME_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
  private static readonly CHROME_ACCEPT_LANGUAGE = 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7'

  public static getPort(): number { return this.activePort }

  private static findAvailablePort(startPort: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = net.createServer()
      server.unref()
      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') resolve(this.findAvailablePort(startPort + 1))
        else reject(err)
      })
      server.listen(startPort, '127.0.0.1', () => {
        server.close(() => resolve(startPort))
      })
    })
  }

  private static async waitForPort(timeout = 5000): Promise<boolean> {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      try {
        await new Promise<void>((resolve, reject) => {
          const socket = new net.Socket()
          socket.setTimeout(200)
          socket.once('connect', () => {
            socket.destroy()
            resolve()
          })
          socket.once('error', () => {
            socket.destroy()
            reject()
          })
          socket.once('timeout', () => {
            socket.destroy()
            reject()
          })
          socket.connect(this.activePort, '127.0.0.1')
        })
        return true
      } catch {
        await new Promise(r => setTimeout(r, 200))
      }
    }
    return false
  }

  public static async startDaemon(): Promise<number> {
    if (this.ariaProcess && !this.ariaProcess.killed) return this.activePort

    if (this.restartAttempts >= this.MAX_RESTART_ATTEMPTS) {
      const errMsg = 'Aria2 启动失败次数过多，请检查杀毒软件拦截或文件权限'
      console.error('[DownloadService]', errMsg)
      this.broadcastError('engine_fatal', errMsg)
      throw new Error(errMsg)
    }

    this.isShuttingDown = false
    this.restartAttempts++
    
    if (!this.rpcSecret) this.rpcSecret = crypto.randomBytes(16).toString('hex')

    this.activePort = await this.findAvailablePort(6800)
    this.taskRegistry.clear()

    const platform = process.platform
    const binName = platform === 'win32' ? 'aria2c.exe' : 'aria2c'
    let ariaPath = ''
    const searchedPaths: string[] = []
    
    if (app.isPackaged) {
      const candidates = [
        path.join(process.resourcesPath, 'bin', platform, binName),
        path.join(process.resourcesPath, 'bin', binName),
        path.join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'bin', platform, binName),
      ]
      for (const c of candidates) {
        searchedPaths.push(c)
        if (fs.existsSync(c)) { ariaPath = c; break }
      }
    } else {
      const candidates = [
        path.join(process.cwd(), 'bin', binName),
        path.join(process.cwd(), 'resources', 'bin', platform, binName),
        path.join(app.getAppPath(), 'resources', 'bin', platform, binName),
      ]
      for (const c of candidates) {
        searchedPaths.push(c)
        if (fs.existsSync(c)) { ariaPath = c; break }
      }
    }

    if (!ariaPath || !fs.existsSync(ariaPath)) {
      const errMsg = `Aria2 binary not found. Searched:\n${searchedPaths.join('\n')}`
      console.error('[DownloadService]', errMsg)
      this.broadcastError('binary_missing', errMsg)
      throw new Error(errMsg)
    }

    if (!app.isPackaged) console.log(`[DownloadService] Aria2 found: ${ariaPath}`)

    const sessionPath = path.join(Db.getDataRoot(), 'aria2.session')
    const dhtPath = path.join(Db.getDataRoot(), 'dht.dat')
    
    try {
      const dataDir = path.dirname(sessionPath)
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
      // 【修复】启动前清空 session 文件，防止历史错误任务从 session 复活
      fs.writeFileSync(sessionPath, '\n')
      if (!fs.existsSync(dhtPath)) fs.writeFileSync(dhtPath, '')
    } catch (e) { 
      if (!app.isPackaged) console.warn('[DownloadService] Session check failed:', e) 
    }

    const args = [
      '--enable-rpc', 
      `--rpc-listen-port=${this.activePort}`, 
      '--rpc-listen-all=false',
      '--rpc-allow-origin-all', 
      '--max-connection-per-server=16', 
      '--split=16',
      '--min-split-size=1M', 
      '--max-concurrent-downloads=5', 
      '--continue=true',
      `--input-file=${sessionPath}`, 
      `--save-session=${sessionPath}`,
      '--save-session-interval=30', 
      `--dht-file-path=${dhtPath}`, 
      '--log-level=warn',
      '--console-log-level=warn',
      '--disable-ipv6=true', 
      '--allow-overwrite=true', 
      '--auto-file-renaming=false',
      `--rpc-secret=${this.rpcSecret}`,
      '--max-download-result=150',
      `--user-agent=${this.CHROME_USER_AGENT}`,
      '--check-certificate=false',
      '--remote-time=true', 
      '--file-allocation=none',
      '--disk-cache=64M',
      '--enable-http-keep-alive=true',
      '--http-accept-gzip=true'
    ]

    const stdioConfig: StdioOptions = app.isPackaged 
      ? ['ignore', 'ignore', 'pipe'] 
      : ['ignore', 'pipe', 'pipe']

    const childProcess = spawn(ariaPath, args, {
      stdio: stdioConfig, 
      windowsHide: true, 
      detached: false
    })
    
    this.ariaProcess = childProcess
    this.engineStartTime = Date.now()

    if (!app.isPackaged) {
      childProcess.stdout?.on('data', (data) => {
        const msg = data.toString().trim()
        if (msg) console.log(`[Aria2] ${msg}`)
      })
    }

    childProcess.stderr?.on('data', (data) => {
      const msg = data.toString().trim()
      if (!msg) return
      if (app.isPackaged) {
        if (msg.includes('error') || msg.includes('fatal') || msg.includes('Exception')) {
          console.error('[Aria2] ', msg.substring(0, 200))
        }
      } else {
        console.error(`[Aria2] ${msg}`)
      }
    })

    childProcess.on('exit', (code) => {
      if (this.isShuttingDown) {
        this.ariaProcess = null
        return
      }
      if (!app.isPackaged) console.warn(`[DownloadService] 异常退出 (Code: ${code})`)
      this.cleanupResources()
      this.ariaProcess = null
      const delay = Math.min(100 * Math.pow(2, this.restartAttempts), 5000)
      setTimeout(() => this.startDaemon().catch(() => {}), delay)
    })

    childProcess.on('error', (err) => {
      console.error('[DownloadService] 进程错误:', err)
      this.cleanupResources()
      this.ariaProcess = null
      const delay = Math.min(100 * Math.pow(2, this.restartAttempts), 5000)
      setTimeout(() => this.startDaemon().catch(() => {}), delay)
    })

    this.startProcessGuard()

    const portReady = await this.waitForPort(5000)
    if (!portReady) {
      if (!app.isPackaged) console.error('[DownloadService] Aria2 端口未就绪，强制重启')
      this.ariaProcess?.kill('SIGKILL')
      return this.activePort
    }

    this.connectWebSocket()
    return this.activePort
  }

  private static async broadcastCurrentTasks() {
    try {
      const [active, waiting, stopped] = await Promise.all([
        this.rpcCall('aria2.tellActive'),
        this.rpcCall('aria2.tellWaiting', [0, 1000]),
        this.rpcCall('aria2.tellStopped', [0, 1000])
      ]) as [any[], any[], any[]]

      const allTasks = [...active, ...waiting, ...stopped]
      
      for (const task of allTasks) {
        const gid = task.gid
        if (!gid) continue
        // 【修复】过滤 error/removed 僵尸任务，防止重启后复活到 registry
        if (task.status === 'error' || task.status === 'removed') continue
        if (!this.taskRegistry.has(gid)) {
          const creationTime = parseInt(task.creationTime) || 0
          this.taskRegistry.set(gid, {
            addedAt: creationTime ? creationTime * 1000 : Date.now()
          })
        }
      }
      
      const aria2Gids = new Set(allTasks.map(t => t.gid).filter(Boolean))
      for (const gid of Array.from(this.taskRegistry.keys())) {
        if (!aria2Gids.has(gid)) {
          this.taskRegistry.delete(gid)
        }
      }
      
      // 【修复】fullTasks 也过滤 error/removed，防止僵尸任务广播到前端
      const validTasks = allTasks.filter(task => task.status !== 'error' && task.status !== 'removed')
      const fullTasks = validTasks.map(task => {
        const gid = task.gid
        const entry = this.taskRegistry.get(gid) || { addedAt: Date.now() }
        const totalSize = parseInt(task.totalLength) || 0
        const completedSize = parseInt(task.completedLength) || 0
        const speed = parseInt(task.downloadSpeed) || 0
        const filePath = task.files?.[0]?.path ? PathUtils.normalize(task.files[0].path) : undefined
        
        return {
          gid,
          name: task.bittorrent?.info?.name || (filePath ? PathUtils.basename(filePath) : 'Unknown'),
          status: this.mapStatus(task.status),
          totalSize,
          completedSize,
          speed,
          progress: totalSize > 0 ? (completedSize / totalSize) * 100 : 0,
          timeLeft: speed > 0 ? Math.floor((totalSize - completedSize) / speed) : 999999,
          dir: task.dir || '',
          filePath: filePath || '',
          url: task.files?.[0]?.uris?.[0]?.uri || '',
          resourceId: entry.resourceId,
          addedAt: entry.addedAt,
          sourceType: entry.resourceId ? 'titan' : 'user',
          errorMessage: task.errorMessage
        }
      })
      
      this.broadcast('download:registry-init', fullTasks)
      if (!app.isPackaged) console.log(`[DownloadService] 广播 REGISTRY_INIT: ${fullTasks.length} 个任务`)
    } catch (e) {
      console.error('[DownloadService] 广播当前任务失败:', e)
    }
  }

  private static connectWebSocket() {
    if (this.wsClient?.readyState === WebSocket.OPEN) return
    const wsUrl = `ws://127.0.0.1:${this.activePort}/jsonrpc`
    
    this.wsClient = new WebSocket(wsUrl)

    this.wsClient.on('open', () => {
      this.restartAttempts = 0
      if (!app.isPackaged) console.log('[DownloadService] WebSocket 已连接')
      // 【修复】启动时清除 aria2 历史 stopped 结果，防止错误链接僵尸任务复活
      this.rpcCall('aria2.purgeDownloadResult').catch(() => {})
      this.startSyncLoop()
      
      setTimeout(() => {
        if (!app.isPackaged) console.log('[DownloadService] 延迟广播：开始同步 Aria2 任务状态...')
        this.broadcastCurrentTasks()
      }, 800)
    })

    this.wsClient.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.id !== undefined && this.pendingRequests.has(msg.id)) {
          const { resolve, reject } = this.pendingRequests.get(msg.id)!
          this.pendingRequests.delete(msg.id)
          if (msg.error) reject(new Error(msg.error.message || 'RPC Error'))
          else resolve(msg.result)
        }
        if (msg.method) this.handleNotification(msg.method, msg.params)
      } catch (e) { 
        console.error('[DownloadService] WS 消息解析失败:', e) 
      }
    })

    this.wsClient.on('error', (err) => console.error('[DownloadService] WS 错误:', err.message))
    this.wsClient.on('close', () => {
      this.stopSyncLoop()
      this.wsClient = null
    })
  }

  private static startSyncLoop() {
    if (this.syncTimer) clearInterval(this.syncTimer)
    
    this.syncTimer = setInterval(async () => {
      try {
        const [active, waiting, stopped] = await Promise.all([
          this.rpcCall('aria2.tellActive'),
          this.rpcCall('aria2.tellWaiting', [0, 1000]),
          this.rpcCall('aria2.tellStopped', [0, 1000])
        ]) as [any[], any[], any[]]

        const allTasks = [...active, ...waiting, ...stopped]
        let globalSpeed = 0
        const updateList: any[] = []

        for (const task of allTasks) {
          const gid = task.gid
          if (!gid) continue

          if (!this.taskRegistry.has(gid)) continue

          const entry = this.taskRegistry.get(gid)!
          const speed = parseInt(task.downloadSpeed) || 0
          globalSpeed += speed
          
          const totalSize = parseInt(task.totalLength) || 0
          const completedSize = parseInt(task.completedLength) || 0
          const filePath = task.files?.[0]?.path ? PathUtils.normalize(task.files[0].path) : undefined

          updateList.push({
            gid,
            name: task.bittorrent?.info?.name || (filePath ? PathUtils.basename(filePath) : 'Unknown'),
            status: this.mapStatus(task.status),
            totalSize,
            completedSize,
            speed,
            progress: totalSize > 0 ? (completedSize / totalSize) * 100 : 0,
            timeLeft: speed > 0 ? Math.floor((totalSize - completedSize) / speed) : 999999,
            dir: task.dir || '',
            filePath: filePath || '',
            url: task.files?.[0]?.uris?.[0]?.uri || '',
            resourceId: entry.resourceId,
            addedAt: entry.addedAt,
            sourceType: entry.resourceId ? 'titan' : 'user',
            errorMessage: task.errorMessage
          })
        }

        this.broadcast('download:task-update', updateList)
        this.broadcast('download:global-speed', globalSpeed)

      } catch (e) { 
        if (!app.isPackaged) console.warn('[DownloadService] 同步循环异常:', e) 
      }
    }, 1000)
  }

  private static stopSyncLoop() {
    if (this.syncTimer) { 
      clearInterval(this.syncTimer) 
      this.syncTimer = null 
    }
  }

  private static startProcessGuard() {
    if (this.guardTimer) clearInterval(this.guardTimer)
    this.guardTimer = setInterval(() => {
      if (this.isShuttingDown) return
      
      const isProcessDead = !this.ariaProcess || this.ariaProcess.killed
      
      if (isProcessDead) {
        this.cleanupResources()
        setTimeout(() => this.startDaemon().catch(() => {}), 100)
        return
      }
      
      const elapsed = Date.now() - this.engineStartTime
      if (elapsed < this.PROTECTION_PERIOD_MS) return
      
      const isWsDisconnected = !this.wsClient || this.wsClient.readyState !== WebSocket.OPEN
      if (isWsDisconnected) {
        this.ariaProcess?.kill('SIGKILL')
      }
    }, 5000)
  }

  private static extractExtFromUrl(url: string): string | undefined {
    try {
      const pathname = new URL(url).pathname
      const filename = pathname.split('/').pop() || ''
      const match = filename.match(/\.([a-zA-Z0-9]{2,5})(?:[?#]|$)/)
      return match ? match[1] : undefined
    } catch {
      return undefined
    }
  }

  public static async addUri(uri: string | string[], options: any): Promise<string> {
    if (!this.wsClient || this.wsClient.readyState !== WebSocket.OPEN) {
      throw new Error('Engine not ready')
    }

    const firstUri = Array.isArray(uri) ? uri[0] : uri
    if (firstUri.startsWith('magnet:')) {
      throw new Error('MAGNET_NOT_SUPPORTED')
    }
    
    const uris = Array.isArray(uri) ? uri : [uri]
    
    // 【修复】如果前端未传目录，自动使用底座探测的安全缓存目录
    let safeDir = PathUtils.normalize(options.dir || '')
    if (!safeDir) {
      safeDir = path.join(Db.getDataRoot(), 'TitanTemp')
    }
    if (!fs.existsSync(safeDir)) {
      try {
        fs.mkdirSync(safeDir, { recursive: true })
      } catch (e) {
        throw new Error(`DIR_NOT_FOUND:${safeDir}`)
      }
    }

    const customHeaders: string[] = Array.isArray(options.header) ? [...options.header] : []
    
    let dynamicReferer: string
    try {
      const firstUri = Array.isArray(uri) ? uri[0] : uri
      const urlObj = new URL(firstUri)
      dynamicReferer = `${urlObj.protocol}//${urlObj.host}/`
    } catch {
      dynamicReferer = 'https://www.google.com/'
    }
    
    const requiredHeaders = [
      `User-Agent: ${this.CHROME_USER_AGENT}`,
      `Accept: */*`,
      `Accept-Language: ${this.CHROME_ACCEPT_LANGUAGE}`,
      `Accept-Encoding: gzip, deflate, br`,
      `Referer: ${dynamicReferer}`,
      `Connection: keep-alive`
    ]

    requiredHeaders.forEach(required => {
      const key = required.split(':')[0].trim().toLowerCase()
      const exists = customHeaders.some((exist: string) => {
        const existKey = exist.split(':')[0].trim().toLowerCase()
        return existKey === key
      })
      if (!exists) customHeaders.push(required)
    })

    if (!app.isPackaged) {
      console.log(`[Aria2] Referer=${dynamicReferer}`)
      console.log('[Aria2] 任务 Headers:', customHeaders)
    }

    const rpcOptions: any = {
      dir: safeDir,
      header: customHeaders,
      'connect-timeout': 60,
      'timeout': 120,
      'max-tries': 5,
      'retry-wait': 3,
      'split': 16,
      'min-split-size': '1M',
      'max-connection-per-server': 16
    }

    // 【修复】文件名后缀保障：已知压缩后缀兜底 + URL 提取不到时强制补 .zip
    let outFilename = options.title
    const HAS_KNOWN_EXT = /\.(zip|7z|rar|tar\.gz|gz|exe|msi|iso)$/i
    if (outFilename && !HAS_KNOWN_EXT.test(outFilename)) {
      const ext = this.extractExtFromUrl(Array.isArray(uri) ? uri[0] : uri)
      if (ext) {
        outFilename = `${outFilename}.${ext}`
      } else {
        outFilename = `${outFilename}.zip`
      }
    }
    if (outFilename) {
      rpcOptions.out = PathUtils.sanitizeFilename(outFilename)
    }

    const gid = await this.rpcCall('aria2.addUri', [uris, rpcOptions]) as string

    this.taskRegistry.set(gid, {
      resourceId: options.resourceId || undefined,
      addedAt: Date.now()
    })
    
    return gid
  }

  public static async setSpeedLimit(bytesPerSecond: number): Promise<void> {
    if (!this.wsClient || this.wsClient.readyState !== WebSocket.OPEN) {
      throw new Error('Engine not ready')
    }
    const limit = bytesPerSecond > 0 ? String(bytesPerSecond) : '0'
    await this.rpcCall('aria2.changeGlobalOption', [{
      'max-overall-download-limit': limit
    }])
    if (!app.isPackaged) console.log(`[DownloadService] 速度限制已设置: ${bytesPerSecond} B/s`)
  }

  public static async pauseTask(gid: string): Promise<void> {
    await this.rpcCall('aria2.pause', [gid])
  }

  public static async resumeTask(gid: string): Promise<void> {
    await this.rpcCall('aria2.unpause', [gid])
  }

  public static async removeTask(gid: string): Promise<void> {
    try {
      await this.rpcCall('aria2.forceRemove', [gid])
      await this.rpcCall('aria2.removeDownloadResult', [gid])
    } catch (error: any) {
      if (error.message?.includes('not found') || error.message?.includes('Active Download not found')) {
        if (!app.isPackaged) console.log(`[DownloadService] Task ${gid} already removed`)
      } else {
        throw error
      }
    }
    this.taskRegistry.delete(gid)
  }

  public static async pauseAll(): Promise<void> {
    if (!this.wsClient || this.wsClient.readyState !== WebSocket.OPEN) return
    try {
      await this.rpcCall('aria2.pauseAll', [])
    } catch (e) {
      console.error('[DownloadService] pauseAll 失败:', e)
      throw e
    }
  }

  public static async unpauseAll(): Promise<void> {
    if (!this.wsClient || this.wsClient.readyState !== WebSocket.OPEN) return
    try {
      await this.rpcCall('aria2.unpauseAll', [])
    } catch (e) {
      console.error('[DownloadService] unpauseAll 失败:', e)
      throw e
    }
  }

  public static shutdown(): void {
    if (this.isShuttingDown) return
    this.isShuttingDown = true
    this.stopSyncLoop()
    if (this.guardTimer) { clearInterval(this.guardTimer); this.guardTimer = null }
    
    if (this.wsClient?.readyState === WebSocket.OPEN) {
      this.rpcCall('aria2.saveSession').catch(() => {})
      this.rpcCall('aria2.shutdown').catch(() => {})
    }
    
    setTimeout(() => {
      if (this.wsClient) { this.wsClient.terminate(); this.wsClient = null }
      if (this.ariaProcess && !this.ariaProcess.killed) {
        this.ariaProcess.kill('SIGKILL')
      }
      this.ariaProcess = null
      app.quit()
    }, 3000)
  }

  public static waitForCompletion(gid: string, timeout = 300000): Promise<void> {
    return new Promise((resolve, reject) => {
      this.completionCallbacks.set(gid, { resolve, reject })
      setTimeout(() => {
        if (this.completionCallbacks.has(gid)) {
          this.completionCallbacks.delete(gid)
          reject(new Error('DOWNLOAD_TIMEOUT'))
        }
      }, timeout)
    })
  }

  private static rpcCall(method: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.wsClient || this.wsClient.readyState !== WebSocket.OPEN) {
        return reject(new Error('WS not connected'))
      }
      const id = ++this.rpcId
      this.pendingRequests.set(id, { resolve, reject })
      
      const authParams = [`token:${this.rpcSecret}`, ...params]
      
      try { 
        this.wsClient!.send(JSON.stringify({ jsonrpc: '2.0', id, method, params: authParams })) 
      } catch (e) { 
        this.pendingRequests.delete(id) 
        reject(e) 
      }
      setTimeout(() => { 
        if (this.pendingRequests.has(id)) { 
          this.pendingRequests.delete(id) 
          reject(new Error('RPC Timeout')) 
        } 
      }, 5000)
    })
  }

  private static handleNotification(method: string, params: any[]) {
    const gid = params?.[0]?.gid
    if (!gid) return

    if (method === 'aria2.onDownloadComplete') {
      const entry = this.taskRegistry.get(gid)
      this.broadcast('download:task-complete', {
        gid,
        resourceId: entry?.resourceId
      })
      const cb = this.completionCallbacks.get(gid)
      if (cb) {
        cb.resolve(true)
        this.completionCallbacks.delete(gid)
      }
    } else if (method === 'aria2.onDownloadError') {
      this.broadcast('download:task-error', { 
        gid, 
        error: params?.[0]?.errorMessage,
        errorCode: params?.[0]?.errorCode 
      })
      const cb = this.completionCallbacks.get(gid)
      if (cb) {
        cb.reject(new Error(params?.[0]?.errorMessage || 'DOWNLOAD_ERROR'))
        this.completionCallbacks.delete(gid)
      }
      // 【修复】error 任务从 registry 移除，防止持续同步和重启复活
      this.taskRegistry.delete(gid)
    }
  }

  private static broadcast(channel: string, payload: any) {
    BrowserWindow.getAllWindows().forEach(win => {
      if (win.isDestroyed() || win.webContents.isDestroyed()) return
      try {
        win.webContents.send(channel, payload)
      } catch (e) {}
    })
  }

  private static broadcastError(type: string, msg: string) {
    this.broadcast('download:engine-error', { type, msg })
  }

  private static cleanupResources() {
    if (this.wsClient) { 
      this.wsClient.terminate() 
      this.wsClient = null 
    }
    this.stopSyncLoop()
  }

  private static mapStatus(ariaStatus: string): TaskStatus {
    switch (ariaStatus) {
      case 'active': return 'active'
      case 'waiting': return 'waiting'
      case 'paused': return 'paused'
      case 'complete': return 'completed'
      case 'error': return 'error'
      case 'removed': return 'error'
      default: return 'paused'
    }
  }

  public static registerIpcHandlers() {
    const handlers = [
      'download:add-task', 'download:pause-task', 'download:resume-task',
      'download:remove-task', 'download:pause-all', 'download:resume-all',
      'download:set-speed-limit', 'download:get-registry', 'download:select-directory',
      'download:get-default-dir', 'download:delete-files'
    ]
    handlers.forEach(channel => ipcMain.removeHandler(channel))

    ipcMain.handle('download:add-task', (_, uri: string, options: any) => this.addUri(uri, options))
    ipcMain.handle('download:pause-task', (_, gid: string) => this.pauseTask(gid))
    ipcMain.handle('download:resume-task', (_, gid: string) => this.resumeTask(gid))
    ipcMain.handle('download:remove-task', (_, gid: string) => this.removeTask(gid))
    ipcMain.handle('download:pause-all', () => this.pauseAll())
    ipcMain.handle('download:resume-all', () => this.unpauseAll())
    ipcMain.handle('download:set-speed-limit', (_, bytesPerSecond: number) => this.setSpeedLimit(bytesPerSecond))
    ipcMain.handle('download:get-registry', async () => {
      try {
        const [active, waiting, stopped] = await Promise.all([
          this.rpcCall('aria2.tellActive'),
          this.rpcCall('aria2.tellWaiting', [0, 1000]),
          this.rpcCall('aria2.tellStopped', [0, 1000])
        ]) as [any[], any[], any[]]
        
        const allTasks = [...active, ...waiting, ...stopped]
        return allTasks.map(task => {
          const gid = task.gid
          const entry = this.taskRegistry.get(gid) || { addedAt: Date.now() }
          const totalSize = parseInt(task.totalLength) || 0
          const completedSize = parseInt(task.completedLength) || 0
          const speed = parseInt(task.downloadSpeed) || 0
          const filePath = task.files?.[0]?.path ? PathUtils.normalize(task.files[0].path) : undefined
          
          return {
            gid,
            name: task.bittorrent?.info?.name || (filePath ? PathUtils.basename(filePath) : 'Unknown'),
            status: this.mapStatus(task.status),
            totalSize,
            completedSize,
            speed,
            progress: totalSize > 0 ? (completedSize / totalSize) * 100 : 0,
            timeLeft: speed > 0 ? Math.floor((totalSize - completedSize) / speed) : 999999,
            dir: task.dir || '',
            filePath: filePath || '',
            url: task.files?.[0]?.uris?.[0]?.uri || '',
            resourceId: entry.resourceId,
            addedAt: entry.addedAt,
            sourceType: entry.resourceId ? 'titan' : 'user',
            errorMessage: task.errorMessage
          }
        })
      } catch (e) {
        return []
      }
    })
    ipcMain.handle('download:select-directory', async () => {
      const win = BrowserWindow.getFocusedWindow()
      if (!win) return null
      const res = await dialog.showOpenDialog(win, { 
        title: '选择下载目录', 
        properties: ['openDirectory'] 
      })
      if (res.canceled || !res.filePaths || res.filePaths.length === 0) {
        return null
      }
      return res.filePaths[0]
    })
    ipcMain.handle('download:get-default-dir', () => {
      return path.join(Db.getDataRoot(), 'TitanTemp')
    })
    ipcMain.handle('download:delete-files', async (_, dir: string, filePath: string) => {
      try {
        if (!dir || !filePath) {
          return { success: false, msg: 'Invalid path: dir or filePath is empty' }
        }

        const normalizedFilePath = path.normalize(filePath)
        const normalizedDir = path.normalize(dir)

        let targetPath = path.isAbsolute(normalizedFilePath) 
          ? normalizedFilePath 
          : path.join(normalizedDir, normalizedFilePath)

        targetPath = path.resolve(targetPath)

        if (!targetPath.startsWith(normalizedDir + path.sep)) {
          return { success: false, msg: 'Path traversal blocked: target is outside download directory' }
        }

        let fsPath = targetPath
        if (process.platform === 'win32' && targetPath.length > 240 && !targetPath.startsWith('\\\\?\\')) {
        fsPath = `\\\\?\\${targetPath}`
        }

        if (fs.existsSync(fsPath)) {
          await shell.trashItem(fsPath)
          return { success: true }
        }
        return { success: false, msg: 'File not found' }
      } catch (e: any) {
        return { success: false, msg: e.message }
      }
    })
  }
}