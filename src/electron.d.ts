// 文件名: electron.d.ts
interface Window {
  electron: {
    window: {
      min: () => void
      max: () => void
      close: () => void
    }
    sys: {
      getDesktopAudioSource: () => Promise<any>
      openExternal: (url: string) => Promise<{ success: boolean; msg?: string }>
      openLocalFolder: (folderPath: string) => Promise<{ success: boolean; error?: string }>
      getUserLibrary: () => Promise<any[]>
      removeUserLibrary: (resourceId: string) => Promise<boolean>
      setManifestNode: (node: string) => Promise<any>
      getManifestNode: () => Promise<any>
      runDiagnostics: () => Promise<any>
      launchGame: (appId: string) => Promise<any>
      proxyPost: (url: string, body: any) => Promise<any>
      checkUpdate: () => Promise<any>
      getVersion: () => Promise<string>
      startUpdate: () => Promise<any>
      redeemCores: (score: number, amount: number) => Promise<any>
    }
    invoke: (channel: string, ...args: any[]) => Promise<any>
    on: (channel: string, func: (...args: any[]) => void) => () => void
    telemetry: {
      trackEvent: (event: string, data: any) => void
    }
  }
}