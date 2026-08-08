// 文件名: src/main/services/HeartbeatService.ts
import { BrowserWindow } from 'electron'
import axios from 'axios'
import { app } from 'electron'
import * as os from 'os'

export class HeartbeatService {
  private static timer: NodeJS.Timeout | null = null
  private static active = false
  private static token = ''
  private static serverUrl = ''
  private static nonce = ''
  private static consecutiveErrors = 0
  private static pendingEvents: any[] = []
  private static deviceInfoSent = false

  static start(token: string, serverUrl: string) {
    this.stop()
    this.active = true
    this.token = token
    this.serverUrl = serverUrl.replace(/\/+$/, '')
    this.consecutiveErrors = 0
    this.pendingEvents = []
    this.deviceInfoSent = false
    this.tick()
  }

  static stop() {
    this.active = false
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.token = ''
    this.nonce = ''
    this.pendingEvents = []
  }

  static pushEvents(events: any[]) {
    if (!events || events.length === 0) return
    this.pendingEvents.push(...events)
    if (this.pendingEvents.length > 200) {
      this.pendingEvents = this.pendingEvents.slice(-200)
    }
  }
  
    private static async getHardwareSpecs(): Promise<{ cpu: string; cpuCores: number; gpu: string; ram: string; osVersion: string }> {
    const cpus = os.cpus()
    // 清洗 CPU 型号：去掉 (R)/(TM)/CPU @ x.xGHz 等噪音
    const rawCpuModel = cpus.length > 0 ? cpus[0].model.trim() : 'Unknown CPU'
    const cpuModel = rawCpuModel
      .replace(/\(R\)/gi, '')
      .replace(/\(TM\)/gi, '')
      .replace(/CPU @ [\d.]+GHz/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
    const cpuCores = cpus.length
    // RAM 标注为 Total，避免误解为可用内存
    const totalMemoryGB = Math.round(os.totalmem() / (1024 * 1024 * 1024))
    let gpuModel = 'Unknown GPU'
    try {
      const gpuInfo = await app.getGPUInfo('basic') as any
      if (gpuInfo?.gpuDevice?.length > 0) {
        const activeDevice = gpuInfo.gpuDevice.find((d: any) => d.active) || gpuInfo.gpuDevice[0]
        const rawGpuString = activeDevice?.deviceString || 'Unknown GPU'
        // 清洗 GPU 型号：提取纯型号，去掉 ANGLE/D3D/ShaderModel 等中间层信息
        const gpuMatch = rawGpuString.match(/NVIDIA\s+([\w\s]+?)(?:\s+Direct3D|\s+D3D|$)/i) ||
                         rawGpuString.match(/AMD\s+([\w\s]+?)(?:\s+Direct3D|\s+D3D|$)/i) ||
                         rawGpuString.match(/Intel\s+([\w\s]+?)(?:\s+\(|$)/i)
        gpuModel = gpuMatch ? gpuMatch[0].replace(/Direct3D.*/i, '').replace(/D3D.*/i, '').trim() : rawGpuString
      }
    } catch (e) {
      console.warn('[Heartbeat] GPU info failed:', e)
    }
    // 补充 OS 版本
    const osVersion = os.release()
    return { cpu: cpuModel, cpuCores, gpu: gpuModel, ram: `${totalMemoryGB} GB (Total)`, osVersion }
  }

  private static async tick() {
    if (!this.active || !this.token || !this.serverUrl) return

    const url = `${this.serverUrl}/titan/heartbeat.php`
    const actionData: any = {}

    // 首次心跳上报真实硬件信息（主进程原生 API，零风险）
    if (!this.deviceInfoSent) {
      try {
        const hw = await this.getHardwareSpecs()
        actionData.device_info = {
          cpu: hw.cpu,
          cpuCores: hw.cpuCores,
          gpu: hw.gpu,
          ram: hw.ram,
          osVersion: hw.osVersion
        }
        this.deviceInfoSent = true
      } catch (e) {
        console.warn('[Heartbeat] HW info failed:', e)
      }
    }

    // 附加前端埋点事件
    if (this.pendingEvents.length > 0) {
      actionData.telemetry_events = [...this.pendingEvents]
      this.pendingEvents = []
    }

    const payload = {
      nonce: this.nonce,
      current_view: 'discovery',
      action_data: actionData
    }

    try {
      const res = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Titan-Token': this.token
        },
        timeout: 15000
      })

      const json = res.data
      if (json.code === 200 && json.data) {
        const decoded = Buffer.from(json.data.data || json.data, 'base64').toString('utf-8')
        const data = JSON.parse(decoded)

        this.nonce = data.next_challenge?.nonce || ''
        this.consecutiveErrors = 0

        // 可选：通知前端心跳成功（用于扩展）
        const win = BrowserWindow.getAllWindows()[0]
        if (win && !win.isDestroyed()) {
          win.webContents.send('sys:heartbeat-success', {
            earned: data.earned,
            hbits: data.hbits,
            status: data.status
          })
        }

        const delay = (data.next_challenge?.wait_seconds || 60) * 1000
        this.timer = setTimeout(() => this.tick(), delay)
        return
      }

      throw new Error('Invalid heartbeat response')
    } catch (e: any) {
      this.consecutiveErrors++
      console.warn('[Heartbeat] Failed:', e.message)
      const delay = this.consecutiveErrors > 5 ? 30000 : 5000
      this.timer = setTimeout(() => this.tick(), delay)
    }
  }
}