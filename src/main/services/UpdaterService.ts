// 文件名: src/main/services/UpdaterService.ts
import { app, ipcMain, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import { titanFetch } from '../TitanNet'
import { Db } from '../db'
import { DownloadService } from './DownloadService'
import { resolve7zExePath } from '../utils/resolve7z'

export class UpdaterService {
  private static isUpdating = false
  private static updateState: { ready: boolean; error: string | null } = { ready: false, error: null }

  static registerIpcHandlers() {
    ipcMain.removeHandler('app:check-update')
    ipcMain.handle('app:check-update', async () => {
      const serverUrl = Db.get<any>('app_seed_config')?.serverUrl
      if (!serverUrl) return { hasUpdate: false }

      try {
        const res = await titanFetch(`${serverUrl}/titan/update_check.php?action=check`)
        const json = await res.json()
        const currentVersion = app.getVersion()

        return {
          hasUpdate: json.latest_version !== currentVersion,
          latestVersion: json.latest_version,
          currentVersion,
          mainUrls: json.main_urls,
          updaterUrls: json.updater_urls,
          mainSize: json.main_size,
          updaterSize: json.updater_size
        }
      } catch (e: any) {
        return { hasUpdate: false, error: e.message }
      }
    })

    ipcMain.removeHandler('app:get-version')
    ipcMain.handle('app:get-version', () => app.getVersion())

    ipcMain.removeHandler('app:start-update')
    ipcMain.handle('app:start-update', async () => {
      if (this.isUpdating) return { success: false, msg: 'UPDATE_IN_PROGRESS' }
      this.isUpdating = true

      const serverUrl = Db.get<any>('app_seed_config')?.serverUrl
      if (!serverUrl) {
        this.isUpdating = false
        return { success: false, msg: 'ERR_SERVER_REQUIRED' }
      }

      let updateInfo: any
      try {
        const res = await titanFetch(`${serverUrl}/titan/update_check.php?action=check`)
        updateInfo = await res.json()
      } catch (e: any) {
        this.isUpdating = false
        return { success: false, msg: 'ERR_FETCH_UPDATE_INFO' }
      }

      this.backgroundUpdateProcess(updateInfo).catch(async (e) => {
        console.error('[UpdaterService] Background update failed:', e)
        this.updateState = { ready: false, error: e.message || 'DOWNLOAD_FAILED' }
        const win = BrowserWindow.getAllWindows()[0]
        if (win && !win.isDestroyed()) {
          win.webContents.send('app:update-error', e.message || 'DOWNLOAD_FAILED')
        }
      })

      return { success: true, msg: 'UPDATE_STARTED' }
    })

    ipcMain.removeHandler('app:execute-update')
    ipcMain.handle('app:execute-update', async () => {
      const installDir = path.dirname(app.getPath('exe'))
      const toolsDir = path.join(app.getPath('userData'), 'tools')
      const updaterExe = path.join(toolsDir, 'TitanUpdater.exe')
      const tmpDir = path.join(app.getPath('userData'), 'update')
      const extractDir = path.join(tmpDir, 'extracted')

      spawn(updaterExe, [
        '--pid', String(process.pid),
        '--source', extractDir,
        '--target', installDir
      ], {
        detached: true,
        windowsHide: true,
        stdio: 'ignore'
      }).unref()

      setTimeout(() => app.quit(), 500)
      return { success: true }
    })

    ipcMain.removeHandler('app:get-update-state')
    ipcMain.handle('app:get-update-state', () => this.updateState)
  }

  private static async backgroundUpdateProcess(updateInfo: any) {
    const installDir = path.dirname(app.getPath('exe'))
    const toolsDir = path.join(app.getPath('userData'), 'tools')
    const tmpDir = path.join(app.getPath('userData'), 'update')
    const extractDir = path.join(tmpDir, 'extracted')
    const updaterExe = path.join(toolsDir, 'TitanUpdater.exe')
    const gidsToRemove: string[] = []

    try {
      if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true })
      fs.mkdirSync(extractDir, { recursive: true })
      if (!fs.existsSync(toolsDir)) fs.mkdirSync(toolsDir, { recursive: true })

      const needUpdater = !fs.existsSync(updaterExe)

      const mainUrls = updateInfo.main_urls || []
      if (mainUrls.length === 0) throw new Error('ERR_NO_AVAILABLE_MIRROR')

      let updaterUrls: string[] = []
      if (needUpdater) {
        updaterUrls = updateInfo.updater_urls || []
        if (updaterUrls.length === 0) throw new Error('ERR_NO_AVAILABLE_UPDATER_MIRROR')
      }

      const downloadTasks: Promise<void>[] = []

      if (needUpdater && updaterUrls.length > 0) {
        const updaterGid = await DownloadService.addUri(updaterUrls, {
          dir: tmpDir,
          title: 'updater.zip',
          resourceId: 'updater'
        })
        gidsToRemove.push(updaterGid)
        downloadTasks.push(
          DownloadService.waitForCompletion(updaterGid, 180000).then(async () => {
            await new Promise(resolve => setTimeout(resolve, 800))
            await this.extractZip(path.join(tmpDir, 'updater.zip'), toolsDir)
          })
        )
      }

      const mainGid = await DownloadService.addUri(mainUrls, {
        dir: tmpDir,
        title: 'titancore.zip',
        resourceId: 'titancore'
      })
      gidsToRemove.push(mainGid)
      downloadTasks.push(
        DownloadService.waitForCompletion(mainGid, 1800000).then(async () => {
          await new Promise(resolve => setTimeout(resolve, 800))
          await this.extractZip(path.join(tmpDir, 'titancore.zip'), extractDir)
        })
      )

      await Promise.all(downloadTasks)

      this.updateState = { ready: true, error: null }

      const win = BrowserWindow.getAllWindows()[0]
      if (win && !win.isDestroyed()) {
        win.webContents.send('app:update-ready')
      }

    } catch (e: any) {
      this.updateState = { ready: false, error: e.message || 'DOWNLOAD_FAILED' }
      throw e
    } finally {
      for (const gid of gidsToRemove) {
        await DownloadService.removeTask(gid).catch(() => {})
      }
      this.isUpdating = false
    }
  }

  private static extractZip(zipPath: string, destDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const exePath = resolve7zExePath()
      const proc = spawn(exePath, ['x', zipPath, `-o${destDir}`, '-y', '-bsp0', '-bso0'], {
        windowsHide: true
      })
      proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`解压失败，退出代码: ${code}`)))
      proc.on('error', reject)
    })
  }

  private static copyDirRecursive(src: string, dest: string) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
    const entries = fs.readdirSync(src, { withFileTypes: true })
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)
      if (entry.isDirectory()) {
        this.copyDirRecursive(srcPath, destPath)
      } else {
        fs.copyFileSync(srcPath, destPath)
      }
    }
  }
}