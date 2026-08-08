import { defineStore } from 'pinia'
import { t } from '../i18n'
import { ref, computed } from 'vue'

export type TaskStatus = 'active' | 'waiting' | 'paused' | 'completed' | 'error'

export interface DownloadTask {
  gid: string
  name: string
  status: TaskStatus
  totalSize: number
  completedSize: number
  speed: number
  progress: number
  timeLeft: number
  dir: string
  filePath: string
  url: string
  resourceId?: string
  addedAt: number
  sourceType: 'titan' | 'user'
  errorMessage?: string
}

interface LinkCacheEntry {
  mirrors: any[]
  ts: number
}

export const useTransmissionStore = defineStore('transmission', () => {
  const tasks = ref<DownloadTask[]>([])
  const globalSpeed = ref(0)
  const speedLimit = ref(0)
  const linkCache = new Map<string, LinkCacheEntry>()
  let isInitialized = false
  let unsubscribers: (() => void)[] = []

  // 核心修复：把默认路径上升为全局响应式状态，终结硬编码
  const defaultDownloadDir = ref('')

  const activeCount = computed(() => tasks.value.filter(t => t.status === 'active' || t.status === 'waiting').length)
  const completedCount = computed(() => tasks.value.filter(t => t.status === 'completed').length)

  function initListeners() {
    if (!window.electron?.on) return
    if (isInitialized) return
    isInitialized = true

    unsubscribers.push(
      window.electron.on('download:registry-init', (list: DownloadTask[]) => {
        tasks.value = list
      })
    )

    unsubscribers.push(
      window.electron.on('download:task-update', (updateList: DownloadTask[]) => {
        for (const update of updateList) {
          const idx = tasks.value.findIndex(t => t.gid === update.gid)
          if (idx >= 0) {
            tasks.value[idx] = { ...tasks.value[idx], ...update }
          } else {
            tasks.value.push(update)
          }
        }
        const validGids = new Set(updateList.map(u => u.gid))
        tasks.value = tasks.value.filter(t => validGids.has(t.gid))
      })
    )

    unsubscribers.push(
      window.electron.on('download:global-speed', (speed: number) => {
        globalSpeed.value = speed
      })
    )

    unsubscribers.push(
      window.electron.on('download:task-complete', (data: { gid: string; resourceId?: string }) => {
        const task = tasks.value.find(t => t.gid === data.gid)
        if (task) task.status = 'completed'
      })
    )

    unsubscribers.push(
      window.electron.on('download:task-error', (data: { gid: string; error?: string }) => {
        const task = tasks.value.find(t => t.gid === data.gid)
        if (task) {
          task.status = 'error'
          task.errorMessage = data.error || t('transmissions.errorDefault')
        }
      })
    )
  }

  function cleanupListeners() {
    unsubscribers.forEach(unsub => { try { unsub() } catch {} })
    unsubscribers = []
    isInitialized = false
  }

  function setLinkCache(resourceId: string, mirrors: any[]) {
    linkCache.set(resourceId, { mirrors, ts: Date.now() })
  }

  function getLinkCache(resourceId: string): any[] | null {
    const entry = linkCache.get(resourceId)
    if (!entry) return null
    const TWO_HOURS = 2 * 60 * 60 * 1000
    if (Date.now() - entry.ts > TWO_HOURS) {
      linkCache.delete(resourceId)
      return null
    }
    return entry.mirrors
  }

  async function addTask(url: string, dir: string, resourceId?: string, title?: string) {
    // 如果外部没有传有效目录，强行退化到仓库的真理默认目录
    const targetDir = dir || defaultDownloadDir.value
    return await window.electron.invoke('download:add-task', url, { dir: targetDir, resourceId, title })
  }

  async function addTasks(urls: string[], dir: string) {
    const gids: string[] = []
    const targetDir = dir || defaultDownloadDir.value
    for (const url of urls) {
      const gid = await addTask(url, targetDir)
      gids.push(gid)
    }
    return gids
  }

  async function toggleTask(gid: string, currentStatus: TaskStatus) {
    if (currentStatus === 'active' || currentStatus === 'waiting') {
      await window.electron.invoke('download:pause-task', gid)
    } else {
      await window.electron.invoke('download:resume-task', gid)
    }
  }

  async function removeTask(gid: string) {
    await window.electron.invoke('download:remove-task', gid)
    tasks.value = tasks.value.filter(t => t.gid !== gid)
  }

  async function destroyTask(gid: string) {
    const task = tasks.value.find(t => t.gid === gid)
    if (!task) return

    // 先删文件，再删任务；文件删除失败抛错让调用方提示用户
    if (task.dir && task.filePath) {
      try {
        await window.electron.invoke('download:delete-files', task.dir, task.filePath)
      } catch (e: any) {
        throw new Error(t('transmissions.errorDestroyFiles', { msg: e.message || 'unknown' }))
      }
    }

    await window.electron.invoke('download:remove-task', gid)
    tasks.value = tasks.value.filter(t => t.gid !== gid)
  }

  async function pauseAll() {
    await window.electron.invoke('download:pause-all')
  }

  async function unpauseAll() {
    await window.electron.invoke('download:resume-all')
  }

  async function setSpeedLimit(bytesPerSecond: number) {
    speedLimit.value = bytesPerSecond
    await window.electron.invoke('download:set-speed-limit', bytesPerSecond)
  }

async function selectDirectory(): Promise<string | null> {
  const res = await window.electron.invoke('download:select-directory')
  
  if (typeof res === 'string' && res.length > 0) {
    defaultDownloadDir.value = res
    return res
  }
  
  // 兼容旧版对象格式（防御性编程）
  if (res && typeof res === 'object' && !res.canceled && res.filePaths?.length > 0) {
    const path = res.filePaths[0]
    defaultDownloadDir.value = path
    return path
  }
  
  return null
}

  return {
    tasks,
    globalSpeed,
    speedLimit,
    defaultDownloadDir,
    activeCount,
    completedCount,
    initListeners,
    cleanupListeners,
    addTask,
    addTasks,
    toggleTask,
    removeTask,
    pauseAll,
    unpauseAll,
    setSpeedLimit,
    selectDirectory,
    setLinkCache,
    getLinkCache,
    destroyTask
  }
})