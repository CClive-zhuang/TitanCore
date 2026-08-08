// 文件名: src/main/EngineService.ts
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { Db } from '../db'
import { SecurityService } from './SecurityService'
import { SteamDetector } from './SteamDetector'
import { TitanProtocol } from './TitanProtocol'
import { titanFetch } from '../TitanNet'

export class EngineService {

  private static manifestProbeResult: { url: string; node: string } | null = null;
  private static manifestNodeStatuses: Record<string, boolean> = {};

  static getManifestProbeResult(): { url: string; node: string } | null {
    return this.manifestProbeResult;
  }

  static getManifestNodeStatuses(): Record<string, boolean> {
    if (Object.keys(this.manifestNodeStatuses).length === 0) {
      const fromDb = Db.get<Record<string, boolean>>('manifest_node_statuses');
      if (fromDb) return { ...fromDb };
    }
    return { ...this.manifestNodeStatuses };
  }

  static async check(engine: 'ost' | 'st'): Promise<{ ready: boolean; version: number; path: string | null }> {
    const config = Db.get<any>(`engine_config_${engine}`)
    const currentEngine = Db.get<string>('unlock_engine') || 'ost'
    const isReady = (config?.engine_status === 'ready') && (currentEngine === engine)
    return { ready: isReady, version: config?.version || 0, path: null }
  }

  private static getUpdateCheckUrl(serverUrl: string, engine: string): string {
    return `${serverUrl}/titan/update_check.php?action=get_engine_config&engine=${engine}`
  }

  private static saveEngineConfig(engine: 'ost' | 'st', remoteVersion: number, remoteConfig: any, toolMirrors?: string[]): void {
    const mirrors = toolMirrors || remoteConfig.mirrors || (remoteConfig.tool_url ? [remoteConfig.tool_url] : []);
    Db.set(`engine_config_${engine}`, {
      version: remoteVersion,
      engine_status: remoteConfig.engine_status || 'ready',
      tool_url: remoteConfig.tool_url,
      mirrors: mirrors,
      target_dlls: remoteConfig.target_dlls,
      plugin_dir: remoteConfig.plugin_dir,
      updated_at: Date.now()
    });
  }

private static getManifestNodeMap(): Record<string, string> {
  const fromDb = Db.get<Record<string, string>>('manifest_node_map');
  if (fromDb && Object.keys(fromDb).length >= 3) return fromDb;

  const { loadSecrets } = require('../config');
  const secrets = loadSecrets();
  if (secrets.MANIFEST_NODES && Object.keys(secrets.MANIFEST_NODES).length > 0) {
    return secrets.MANIFEST_NODES;
  }

  return {
    opensteamtool: '',
    wudrm: '',
    steamrun: ''
  };
}

  static async initEngineConfig(): Promise<void> {
    const serverUrl = Db.get<any>('app_seed_config')?.serverUrl
    if (!serverUrl) {
      console.warn('[EngineService] Server URL not ready, skipping engine config init')
      return
    }

    for (const engine of ['ost', 'st'] as const) {
      try {
        const res = await titanFetch(this.getUpdateCheckUrl(serverUrl, engine), {
          method: 'GET',
          headers: { 'User-Agent': 'TitanCore/15.0' }
        })

        if (!res.ok) continue
        const remoteConfig = await res.json()
        if (!remoteConfig || !remoteConfig.success) continue

        const remoteVersion = remoteConfig.engine_version || 0
        const localConfig = Db.get<any>(`engine_config_${engine}`)

        if (!localConfig) {
          this.saveEngineConfig(engine, remoteVersion, remoteConfig)
          console.log(`[EngineService] Engine ${engine} config initialized v${remoteVersion}`)
        } else {
          const mirrors = remoteConfig.mirrors || (remoteConfig.tool_url ? [remoteConfig.tool_url] : []);
          Db.set(`engine_config_${engine}`, {
            version: localConfig.version || 0,
            engine_status: remoteConfig.engine_status || 'ready',
            tool_url: remoteConfig.tool_url,
            mirrors: mirrors,
            target_dlls: remoteConfig.target_dlls,
            plugin_dir: remoteConfig.plugin_dir,
            updated_at: Date.now()
          })
          console.log(`[EngineService] Engine ${engine} status synced, deployed v${localConfig.version || 0}`)
        }

        if (remoteConfig.manifest_nodes && typeof remoteConfig.manifest_nodes === 'object') {
          Db.set('manifest_node_map', remoteConfig.manifest_nodes);
          console.log('[EngineService] manifest_nodes updated from remote');
        }

      } catch (e: any) {
        console.warn(`[EngineService] Init engine ${engine} config failed:`, e.message)
      }
    }

    await this.probeManifestNodes();
  }

  private static async probeManifestNodes(): Promise<void> {
    const nodeMap = this.getManifestNodeMap();
    const nodeNames = ['opensteamtool', 'wudrm', 'steamrun'] as const;
    const TEST_GID = '123456789012345';
    
    this.manifestNodeStatuses = {};
    this.manifestProbeResult = null;

    let steamPath: string | null = null;
    try {
      const detectRes = await SteamDetector.detect();
      steamPath = detectRes?.path || null;
    } catch {}

    const results = await Promise.allSettled(
      nodeNames.map(async (name) => {
        const probeUrl = `${nodeMap[name]}/${TEST_GID}`;
        const isConnected = await this.probeNode(probeUrl, 5000);
        return { name, isConnected };
      })
    );

    results.forEach((res) => {
      if (res.status === 'fulfilled') {
        this.manifestNodeStatuses[res.value.name] = res.value.isConnected;
      }
    });

    for (const name of nodeNames) {
      const hit = results.find(
        (r) => r.status === 'fulfilled' && r.value.name === name && r.value.isConnected
      );
      if (hit) {
        this.manifestProbeResult = { url: nodeMap[name], node: name };
        if (steamPath) {
          try {
            TitanProtocol.writeToml(steamPath, { manifest: { url: name } });
          } catch (e) {
            console.warn('[EngineService] 回写 toml manifest 失败:', e);
          }
        }
        break;
      }
    }

    Db.set('manifest_probe_cache', this.manifestProbeResult);
    Db.set('manifest_node_statuses', this.manifestNodeStatuses);

    if (!this.manifestProbeResult) {
      console.warn('[EngineService] 所有 manifest 节点无法连接');
    }
  }

  private static async probeNode(url: string, timeoutMs: number): Promise<boolean> {
    try {
      const res = await Promise.race([
        titanFetch(url),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
        )
      ]) as Response;
      return res.status > 0 && res.status < 600;
    } catch (e) {
      return false;
    }
  }

  static async setManifestNode(node: string, steamPath: string): Promise<{ success: boolean; msg: string }> {
    if (node === 'auto') {
      Db.set('manifest_node_mode', 'auto');
      await this.probeManifestNodes();
      return { success: true, msg: '已切换至自动模式' };
    }

    const validNodes = ['opensteamtool', 'wudrm', 'steamrun'];
    if (!validNodes.includes(node)) {
      return { success: false, msg: 'ERR_INVALID_NODE' };
    }

    const nodeMap = this.getManifestNodeMap();
    const url = nodeMap[node];
    
    Db.set('manifest_node_mode', node);
    
    this.manifestProbeResult = { url, node };
    this.manifestNodeStatuses[node] = true;
    Db.set('manifest_probe_cache', this.manifestProbeResult);
    Db.set('manifest_node_statuses', this.manifestNodeStatuses);
    
    TitanProtocol.writeToml(steamPath, { manifest: { url: node } });
    return { success: true, msg: `已手动切换至 ${node}` };
  }

  static async toggleCloudSave(steamPath: string, enable: boolean): Promise<{ success: boolean; msg: string }> {
    try {
      TitanProtocol.writeToml(steamPath, { 
        cloud: { enabled: enable, library: 'cloud_redirect.dll' } 
      });
      
      if (enable) {
        const installed = TitanProtocol.installCloudRedirectDll(steamPath);
        if (!installed) {
          return { success: false, msg: '云存档组件缺失，请更新引擎后重试' };
        }
      } else {
        TitanProtocol.uninstallCloudRedirectDll(steamPath);
      }
      
      return { 
        success: true, 
        msg: enable ? '云存档已开启，重启 Steam 后生效' : '云存档已关闭' 
      };
    } catch (e) {
      console.warn('[EngineService] 切换云存档配置失败:', e);
      return { success: false, msg: 'ERR_CLOUD_SAVE_TOGGLE_FAIL' };
    }
  }

  static async switchEngine(engine: 'ost' | 'st'): Promise<{ success: boolean; msg: string; cached?: boolean }> {
    const serverUrl = Db.get<any>('app_seed_config')?.serverUrl
    if (!serverUrl) return { success: false, msg: 'ERR_SERVER_REQUIRED' }

    try {
      const res = await titanFetch(this.getUpdateCheckUrl(serverUrl, engine), {
        method: 'GET',
        headers: { 'User-Agent': 'TitanCore/15.0' }
      })

      if (!res.ok) {
        return { success: false, msg: 'ERR_GATEWAY_EXCEPTION' }
      }

      const remoteConfig = await res.json()
      if (!remoteConfig || !remoteConfig.success) {
        return { success: false, msg: 'ERR_GATEWAY_EXCEPTION' }
      }

      const remoteVersion = remoteConfig.engine_version || 0
      const localState = await this.check(engine)

      if (localState.ready && localState.version >= remoteVersion) {
        return { success: true, msg: 'SUCCESS_ENGINE_CACHED', cached: true }
      }

      const detectRes: any = await SteamDetector.detect()
      const steamPath = detectRes?.path
      if (!steamPath || typeof steamPath !== 'string') {
        return { success: false, msg: 'ERR_STEAM_MISSING' }
      }

      const toolMirrors = remoteConfig.mirrors || (remoteConfig.tool_url ? [remoteConfig.tool_url] : [])
      
      const fallbackDlls = engine === 'ost' 
        ? ['dwmapi.dll', 'OpenSteamTool.dll'] 
        : ['xinput1_4.dll', 'dwmapi.dll'];
      
      const protocolConfig = {
        app_id: 'SYSTEM_ENGINE',
        tool_url: remoteConfig.tool_url,
        tool_mirrors: toolMirrors,
        target_dlls: remoteConfig.target_dlls || fallbackDlls,
        fast_mode: false
      }

      const deployRes = await TitanProtocol.deployEngineOnly(steamPath, protocolConfig, engine)
      if (!deployRes.success) {
        return { success: false, msg: deployRes.msg || 'ERR_ENGINE_DEPLOY_FAIL' }
      }

      this.saveEngineConfig(engine, remoteVersion, remoteConfig, toolMirrors)
      Db.set('unlock_engine', engine)

      return { success: true, msg: `SUCCESS_ENGINE_DEPLOYED:${engine}:${remoteVersion}` }
    } catch (e: any) {
      return { success: false, msg: 'ERR_NETWORK_ERROR' }
    }
  }

  static async silentCheckUpdate(engine: 'ost' | 'st'): Promise<{ hasUpdate: boolean; version?: number; engine?: string; msg?: string }> {
    try {
      const serverUrl = Db.get<any>('app_seed_config')?.serverUrl
      if (!serverUrl) return { hasUpdate: false }

      const res = await titanFetch(this.getUpdateCheckUrl(serverUrl, engine), {
        method: 'GET',
        headers: { 'User-Agent': 'TitanCore/15.0' }
      })

      if (!res.ok) return { hasUpdate: false }
      const remoteConfig = await res.json()
      if (!remoteConfig || !remoteConfig.success) return { hasUpdate: false }

      const remoteVersion = remoteConfig.engine_version || 0
      const localState = await this.check(engine)

      if (remoteVersion > localState.version) {
        return { hasUpdate: true, version: remoteVersion, engine }
      }

      return { hasUpdate: false }
    } catch (e: any) {
      console.warn(`[EngineService] Silent check failed:`, e.message)
      return { hasUpdate: false, msg: e.message }
    }
  }
}