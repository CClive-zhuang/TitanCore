import fs from 'fs';
import path from 'path';
import { app, BrowserWindow } from 'electron';
import axios from 'axios';
import { exec, spawn } from 'child_process';
import util from 'util';
import { Db } from '../db';
import { resolve7zExePath } from '../utils/resolve7z';

export interface ProtocolConfig {
    app_id: string;
    tool_url?: string;
    tool_mirrors?: string[];
    manifest_url?: string;
    manifest_mirrors?: string[];
    target_dlls?: string[];
    fast_mode?: boolean;
}

export interface ProtocolResult {
    success: boolean;
    msg: string;
    path?: string;
}

export interface DiagnosticItem {
    name: string;
    ok: boolean;
    message: string;
}

export class TitanProtocol {
    
    private static get TEMP_ROOT() { 
        return path.join(Db.getDataRoot(), 'TitanTemp'); 
    }
    
    private static readonly PLUGIN_DIR_NAME_ST = 'stplug-in';
    private static readonly PLUGIN_DIR_NAME_OST = 'lua';
    
    private static deploymentLocks: Map<string, number> = new Map();
    private static readonly LOCK_TTL_MS = 90000;
    private static readonly GLOBAL_LOCK_KEY = 'GLOBAL_REPAIR';

    // ================= [ 云存档 DLL 缓存 ] =================

    private static get CLOUD_REDIRECT_CACHE_DIR(): string {
        return path.join(Db.getDataRoot(), 'TitanCache', 'ost');
    }

    static hasCloudRedirectCache(): boolean {
        return fs.existsSync(path.join(this.CLOUD_REDIRECT_CACHE_DIR, 'cloud_redirect.dll'));
    }

    static installCloudRedirectDll(steamPath: string): boolean {
        const cachePath = path.join(this.CLOUD_REDIRECT_CACHE_DIR, 'cloud_redirect.dll');
        if (!fs.existsSync(cachePath)) return false;
        const destPath = path.join(steamPath, 'cloud_redirect.dll');
        fs.copyFileSync(cachePath, destPath);
        return true;
    }

    static uninstallCloudRedirectDll(steamPath: string): void {
        const destPath = path.join(steamPath, 'cloud_redirect.dll');
        if (fs.existsSync(destPath)) {
            try { fs.unlinkSync(destPath); } catch(e) {}
        }
    }

    private static cacheCloudRedirectDll(sourceDir: string): boolean {
        const sourcePath = this.findDllInDir(sourceDir, 'cloud_redirect.dll');
        if (!sourcePath) return false;
        
        const cacheDir = this.CLOUD_REDIRECT_CACHE_DIR;
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
        
        const cachePath = path.join(cacheDir, 'cloud_redirect.dll');
        fs.copyFileSync(sourcePath, cachePath);
        console.log('[TitanProtocol] cloud_redirect.dll 已缓存');
        return true;
    }

    // ================= [ TOML 极简工具 ] =================
    
    private static getTomlPath(steamPath: string): string {
        return path.join(steamPath, 'opensteamtool.toml');
    }

    static readToml(steamPath: string): Record<string, any> {
        const tomlPath = this.getTomlPath(steamPath)
        const defaultData = { 
            manifest: { url: '' }
        }
        
        if (!fs.existsSync(tomlPath)) {
            try {
                fs.writeFileSync(tomlPath, this.stringifyToml(defaultData), 'utf-8')
            } catch (e) {
                console.error('[TitanProtocol] toml 创建失败:', e)
            }
            return { ...defaultData }
        }
        
        try {
            const content = fs.readFileSync(tomlPath, 'utf-8')
            return this.parseToml(content)
        } catch (e) {
            return { ...defaultData }
        }
    }

    static writeToml(steamPath: string, patch: Record<string, any>): void {
        const tomlPath = this.getTomlPath(steamPath)
        const existing = this.readToml(steamPath)
        
        for (const [section, values] of Object.entries(patch)) {
            if (values && typeof values === 'object') {
                if (section === 'manifest') {
                    existing[section] = { url: values.url || '' };
                } else {
                    existing[section] = { ...(existing[section] || {}), ...values }
                }
            }
        }
        
        try {
            fs.writeFileSync(tomlPath, this.stringifyToml(existing), 'utf-8')
        } catch (e) {
            console.error('[TitanProtocol] toml 写入失败:', e)
        }
    }

    private static parseToml(content: string): Record<string, any> {
        const result: Record<string, any> = {};
        let currentSection = '';
        for (const rawLine of content.split(/\r?\n/)) {
            const line = rawLine.trim();
            if (!line || line.startsWith('#')) continue;
            if (line.startsWith('[') && line.endsWith(']')) {
                currentSection = line.slice(1, -1).trim();
                result[currentSection] = result[currentSection] || {};
            } else if (currentSection) {
                const eq = line.indexOf('=');
                if (eq > 0) {
                    const key = line.slice(0, eq).trim();
                    let value = line.slice(eq + 1).trim();
                    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    if (value === 'true') value = true as any;
                    else if (value === 'false') value = false as any;
                    else if (!isNaN(Number(value)) && value !== '') value = Number(value) as any;
                    result[currentSection][key] = value;
                }
            }
        }
        return result;
    }

    private static stringifyToml(data: Record<string, any>): string {
        const lines: string[] = [];
        for (const [section, values] of Object.entries(data)) {
            if (!values || typeof values !== 'object') continue;
            lines.push(`[${section}]`);
            for (const [key, value] of Object.entries(values)) {
                if (value === true) lines.push(`${key} = true`);
                else if (value === false) lines.push(`${key} = false`);
                else if (typeof value === 'number') lines.push(`${key} = ${value}`);
                else lines.push(`${key} = "${value}"`);
            }
            lines.push('');
        }
        return lines.join('\n');
    }

    // ================= [ 诊断 ] =================

    static async runDiagnostics(steamPath: string, engine: 'ost' | 'st', manifestProbeResult?: { url: string } | null): Promise<DiagnosticItem[]> {
        const results: DiagnosticItem[] = []
        
        // 1. DLL 完整性
        const dlls = engine === 'ost' 
            ? ['dwmapi.dll', 'OpenSteamTool.dll']
            : ['xinput1_4.dll', 'dwmapi.dll']
        const missingDlls = dlls.filter(d => !fs.existsSync(path.join(steamPath, d)))
        results.push({
            name: engine === 'ost' ? 'OST DLL 完整性' : 'ST DLL 完整性',
            ok: missingDlls.length === 0,
            message: missingDlls.length === 0 
                ? '核心组件正常' 
                : '核心组件缺失，请尝试任意部署一款游戏以自动修复。'
        })
        
        // 2. Lua 目录检测
        const pluginDirName = engine === 'ost' ? this.PLUGIN_DIR_NAME_OST : this.PLUGIN_DIR_NAME_ST
        const pluginDir = path.join(steamPath, 'config', pluginDirName)
        const luaOk = fs.existsSync(pluginDir)
        results.push({
            name: 'Lua 目录检测',
            ok: luaOk,
            message: luaOk 
                ? '配置目录正常' 
                : '配置目录异常，请尝试任意部署一款游戏以自动修复。'
        })
        
        // 3. Pattern 目录检测（仅 OST）
        if (engine === 'ost') {
            let patternOk = false
            try {
                const steamclientDir = path.join(steamPath, 'opensteamtool', 'pattern', 'steamclient')
                const steamuiDir = path.join(steamPath, 'opensteamtool', 'pattern', 'steamui')
                patternOk = fs.existsSync(steamclientDir) && fs.existsSync(steamuiDir)
                    && fs.readdirSync(steamclientDir).some(f => f.endsWith('.toml'))
                    && fs.readdirSync(steamuiDir).some(f => f.endsWith('.toml'))
            } catch {}
            results.push({
                name: 'Pattern 目录检测',
                ok: patternOk,
                message: patternOk 
                    ? '核心配置目录正常' 
                    : 'Steam 客户端已更新，当前工具尚未适配。请等待推送更新，或回退 Steam 版本。'
            })
        }
        
        // 4. 清单 URL 连通性（仅 OST）
        if (engine === 'ost') {
            const urlOk = manifestProbeResult?.url != null
            results.push({
                name: '清单 URL 连通性',
                ok: urlOk,
                message: urlOk 
                    ? '清单节点连接正常' 
                    : '所有清单节点无法连接，请检查网络或联系客服。'
            })
        }
        
        // 5. 游戏配置缺失
        const luaDir = path.join(steamPath, 'config', pluginDirName)
        let hasLua = false
        if (fs.existsSync(luaDir)) {
            try {
                hasLua = fs.readdirSync(luaDir).some(f => f.endsWith('.lua'))
            } catch {}
        }
        results.push({
            name: '游戏配置检测',
            ok: hasLua,
            message: hasLua 
                ? '游戏配置已就绪' 
                : '当前游戏配置未就绪，请尝试部署游戏。'
        })
        
        // 核心收敛文案
        const allOk = results.every(r => r.ok)
        if (!allOk) {
            results.push({
                name: '修复建议',
                ok: false,
                message: '请尝试任意部署一款游戏，并重启 Steam 客户端。'
            })
        }
        
        return results
    }

    // ================= [ Lua 自动更新开关 ] =================

    static toggleLuaAutoUpdate(steamPath: string, appId: string, enabled: boolean, engine: 'ost' | 'st' = 'ost'): boolean {
        const pluginDirName = engine === 'ost' ? this.PLUGIN_DIR_NAME_OST : this.PLUGIN_DIR_NAME_ST;
        const luaPath = path.join(steamPath, 'config', pluginDirName, `${appId}.lua`);
        
        if (!fs.existsSync(luaPath)) {
            console.warn(`[TitanProtocol] Lua 文件不存在，跳过切换: ${luaPath}`);
            return false;
        }
        
        try {
            const content = fs.readFileSync(luaPath, 'utf-8');
            const lines = content.split(/\r?\n/);
            
            const processedLines = lines.map(line => {
                if (line.includes('setManifestid')) {
                    const isCommented = line.trim().startsWith('--');
                    if (enabled) {
                        // 开启更新：确保被注释
                        if (!isCommented) return '-- ' + line;
                    } else {
                        // 关闭更新：取消注释
                        if (isCommented) return line.replace(/^(\s*)--\s*/, '$1');
                    }
                }
                return line;
            });
            
            fs.writeFileSync(luaPath, processedLines.join('\n'), 'utf-8');
            console.log(`[TitanProtocol] 自动更新已${enabled ? '开启' : '关闭'}: ${appId}.lua`);
            return true;
        } catch (e) {
            console.error('[TitanProtocol] 切换 Lua 自动更新失败:', e);
            return false;
        }
    }

    // ================= [ 现有方法保留 ] =================

    private static translateError(e: any): string {
        const msg = String(e?.message || e || '').toLowerCase();
        
        if (msg.includes('enoent') || msg.includes('no such file') || msg.includes('未找到')) {
            return '本地底层组件缺失。请检查游戏引擎核心文件是否存在，或尝试修复客户端。';
        }
        if (msg.includes('network') || msg.includes('timeout') || msg.includes('断开')) {
            return '所有下载节点连接异常。请查看本地网络状态，或更换节点重试。';
        }
        if (msg.includes('eacces') || msg.includes('eperm') || msg.includes('access denied')) {
            return '目录权限不足导致部署失败。请关闭本软件后，右键图标选择"以管理员身份运行"。';
        }
        if (msg.includes('ebusy') || msg.includes('locked')) {
            return '文件被底层占用或杀毒软件拦截。请临时关闭杀软后重试。';
        }
        return msg + ' (请重启软件或联系核心节点)';
    }

    private static async killSteam(): Promise<void> {
        try {
            this.broadcast(null, '正在强制结束 Steam 客户端以解除文件锁定...', 'clean');
            const execAsync = util.promisify(exec);
            
            await execAsync('taskkill /F /IM steam.exe /T');
            await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (e) {
        }
    }
	
    static releaseLock(key: string): void {
        if (this.deploymentLocks.has(key)) {
            const lockAge = Date.now() - (this.deploymentLocks.get(key) || 0);
            console.log(`[TitanProtocol] 强制释放锁: ${key} (已持有: ${lockAge}ms)`);
            this.deploymentLocks.delete(key);
        }
    }

    static async forceRestore(steamPath: string): Promise<ProtocolResult> {
        try {
            this.broadcast(10, '正在定位 Steam 核心区域...', 'init');
            
            await this.killSteam();
            
            const targetFiles = [
                'xinput1_4.dll', 'xinput1_4.dll.bak',
                'dwmapi.dll', 'dwmapi.dll.bak',
                'OpenSteamTool.dll', 'OpenSteamTool.dll.bak',
                'cloud_redirect.dll', 'cloud_redirect.dll.bak',
                'cloud_redirect.log'
            ];
            
            let deletedFiles = 0;
            for (const file of targetFiles) {
                const filePath = path.join(steamPath, file);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    deletedFiles++;
                }
            }
            this.broadcast(40, `已销毁 ${deletedFiles} 个劫持组件与日志`, 'clean');

            const thirdPartyDirs = [this.PLUGIN_DIR_NAME_ST, this.PLUGIN_DIR_NAME_OST, 'opensteamtool', 'cloud_redirect', 'localcloud'];
            for (const dirName of thirdPartyDirs) {
                const tpDir = path.join(steamPath, 'config', dirName);
                const rootTpDir = path.join(steamPath, dirName);
                if (fs.existsSync(tpDir)) fs.rmSync(tpDir, { recursive: true, force: true });
                if (fs.existsSync(rootTpDir)) fs.rmSync(rootTpDir, { recursive: true, force: true });
            }
            this.broadcast(70, '已连根拔除所有外源矩阵污染', 'clean');

            this.broadcast(100, 'Steam 环境已恢复原生态纯净', 'done');
            return { success: true, msg: 'FORCE_RESTORE_OK' };

        } catch (e: any) {
            this.broadcast(0, `强制清洗失败: ${this.translateError(e)}`, 'error');
            return { success: false, msg: this.translateError(e) };
        }
    }

    static async uninstall(steamPath: string, appId: string, targetId?: string | number, engine: 'ost' | 'st' = 'ost'): Promise<ProtocolResult> {
        try {
            this.broadcast(10, `正在定位并卸载 AppID: ${appId} ...`, 'init');

            const pluginDirName = engine === 'ost' ? this.PLUGIN_DIR_NAME_OST : this.PLUGIN_DIR_NAME_ST;
            const pluginDir = path.join(steamPath, 'config', pluginDirName);
            const depotDir = path.join(steamPath, 'depotcache');
            
            const luaPath = path.join(pluginDir, `${appId}.lua`);
            if (fs.existsSync(luaPath)) {
                fs.unlinkSync(luaPath);
                this.broadcast(40, `已销毁神经突触脚本: ${appId}.lua`, 'clean');
            }

            let manifestRemoved = 0;
            if (fs.existsSync(depotDir)) {
                const files = fs.readdirSync(depotDir);
                for (const file of files) {
                    const matchPattern = targetId ? (file.startsWith(String(targetId)) || file.startsWith(appId)) : file.startsWith(appId);
                    if (matchPattern && file.includes('manifest')) {
                        fs.unlinkSync(path.join(depotDir, file));
                        manifestRemoved++;
                    }
                }
            }
            
            this.broadcast(70, `已清理 ${manifestRemoved} 个动态清单`, 'clean');
            this.broadcast(100, '卸载完成', 'done');
            return { success: true, msg: 'UNINSTALL_OK' };

        } catch (e: any) {
            this.broadcast(0, `卸载失败: ${this.translateError(e)}`, 'error');
            return { success: false, msg: this.translateError(e) };
        }
    }

    static async deployEngineOnly(steamPath: string, config: ProtocolConfig, engine: 'ost' | 'st' = 'ost'): Promise<ProtocolResult> {
        const taskDir = path.join(this.TEMP_ROOT, `deploy_engine_${engine}_${Date.now()}`);
        
        try {
            this.broadcast(10, `正在接管 Steam 底层引擎切换任务...`, 'init');
            if (!fs.existsSync(taskDir)) fs.mkdirSync(taskDir, { recursive: true });

            const effectiveTargetDlls = (config.target_dlls || []).filter(d => d.toLowerCase() !== 'cloud_redirect.dll');

            const toolMirrors = config.tool_mirrors && config.tool_mirrors.length > 0 ? config.tool_mirrors : (config.tool_url ? [config.tool_url] : []);

            if (toolMirrors.length === 0) throw new Error('网关未下发引擎核心工具节点');

            const toolZipPath = path.join(taskDir, 'tool.zip');
            
            await this.downloadWithMirrors(toolMirrors, toolZipPath, `引擎核心 (${engine.toUpperCase()})`);

            this.broadcast(40, '正在解压并配置引擎运行时...', 'extract');
            await this.extractArchive(toolZipPath, taskDir);

            // 无论云存档是否开启，都缓存 CR.DLL（自愈：引擎更新 = DLL 更新）
            this.cacheCloudRedirectDll(taskDir);

            // 如果云存档已开启，同步更新 Steam 目录里的 CR.DLL
            const toml = this.readToml(steamPath);
            if (toml?.cloud?.enabled === true) {
                this.installCloudRedirectDll(steamPath);
            }

            await this.killSteam();

            this.migrateEngineData(steamPath, engine);

            this.broadcast(70, '正在将新底层组件植入 Steam 根目录...', 'install');
            await this.installDLL(taskDir, steamPath, effectiveTargetDlls);
            
            // 全量同步 opensteamtool 目录到 Steam 根目录
            await this.installOpenSteamToolDir(taskDir, steamPath);

            this.cleanupSync(taskDir);
            this.broadcast(100, `引擎 [${engine.toUpperCase()}] 已全面接管环境。`, 'done');
            return { success: true, msg: 'DEPLOY_ENGINE_OK', path: steamPath };

        } catch (e: any) {
            this.cleanupSync(taskDir);
            this.broadcast(0, `引擎部署阻断: ${this.translateError(e)}`, 'error');
            return { success: false, msg: this.translateError(e) };
        }
    }

    private static migrateEngineData(steamPath: string, targetEngine: 'ost' | 'st') {
        const oldPluginDirName = targetEngine === 'ost' ? this.PLUGIN_DIR_NAME_ST : this.PLUGIN_DIR_NAME_OST;
        const newPluginDirName = targetEngine === 'ost' ? this.PLUGIN_DIR_NAME_OST : this.PLUGIN_DIR_NAME_ST;

        const oldDir = path.join(steamPath, 'config', oldPluginDirName);
        const newDir = path.join(steamPath, 'config', newPluginDirName);

        this.broadcast(50, '执行数据迁移与旧组件环境清理...', 'clean');

        if (fs.existsSync(oldDir)) {
            if (!fs.existsSync(newDir)) fs.mkdirSync(newDir, { recursive: true });

            const files = fs.readdirSync(oldDir);
            let movedCount = 0;
            for (const file of files) {
                if (file.endsWith('.lua')) {
                    fs.copyFileSync(path.join(oldDir, file), path.join(newDir, file));
                    movedCount++;
                }
            }
            this.broadcast(55, `已无损迁移 ${movedCount} 个历史游戏神经突触矩阵`, 'clean');

            try {
                fs.rmSync(oldDir, { recursive: true, force: true });
            } catch (e) {
                console.warn(`[TitanProtocol] 旧配置目录删除失败，跳过`);
            }
        }

        const stDlls = ['xinput1_4.dll', 'dwmapi.dll'];
        const ostDlls = ['OpenSteamTool.dll', 'cloud_redirect.dll'];
        const dllsToClean = targetEngine === 'ost' ? stDlls : ostDlls;

        for (const dll of dllsToClean) {
            const dllPath = path.join(steamPath, dll);
            const bakPath = dllPath + '.bak';
            if (fs.existsSync(dllPath)) try { fs.unlinkSync(dllPath); } catch(e) {}
            if (fs.existsSync(bakPath)) try { fs.unlinkSync(bakPath); } catch(e) {}
        }
    }

    static async deploy(steamPath: string, config: ProtocolConfig, engine: 'ost' | 'st' = 'ost'): Promise<ProtocolResult> {
        this.cleanExpiredLocks();
        
        const lockKey = this.deploymentLocks.has(config.app_id) ? config.app_id : this.GLOBAL_LOCK_KEY;
        if (this.deploymentLocks.has(lockKey)) {
            if (Date.now() - this.deploymentLocks.get(lockKey)! < this.LOCK_TTL_MS) {
                return { success: false, msg: `DEPLOY_BUSY: Task or Global Repair running.` };
            }
            this.deploymentLocks.delete(lockKey);
        }

        this.deploymentLocks.set(config.app_id, Date.now());

        const taskDir = path.join(this.TEMP_ROOT, `deploy_${config.app_id}_${Date.now()}`);
        
        try {
            if (!fs.existsSync(taskDir)) fs.mkdirSync(taskDir, { recursive: true });
            
            const pluginDirName = engine === 'ost' ? this.PLUGIN_DIR_NAME_OST : this.PLUGIN_DIR_NAME_ST;

            const effectiveTargetDlls = (config.target_dlls || []).filter(d => d.toLowerCase() !== 'cloud_redirect.dll');

            const toolMirrors = config.tool_mirrors && config.tool_mirrors.length > 0 ? config.tool_mirrors : (config.tool_url ? [config.tool_url] : []);
            let manifestMirrors = config.manifest_mirrors && config.manifest_mirrors.length > 0 ? config.manifest_mirrors : (config.manifest_url ? [config.manifest_url] : []);

            let skipEnvironmentSetup = false;
            
            if (config.fast_mode) {
                this.broadcast(5, '正在检测本地引擎环境完整性...', 'check');
                if (this.checkEnvironment(steamPath, effectiveTargetDlls, pluginDirName)) {
                    skipEnvironmentSetup = true;
                    this.broadcast(10, '环境绿灯，启动极速部署通道...', 'check');
                }
            }

            if (!skipEnvironmentSetup) {
                if (toolMirrors.length === 0) throw new Error('网关未下发引擎核心工具节点');
                const toolZipPath = path.join(taskDir, 'tool.zip');
                
                await this.downloadWithMirrors(toolMirrors, toolZipPath, '核心组件包');

                this.broadcast(40, '正在配置运行时组件...', 'extract');
                await this.extractArchive(toolZipPath, taskDir);

                // 缓存 CR.DLL（引擎自愈：zip 里有新版就覆盖缓存）
                this.cacheCloudRedirectDll(taskDir);

                // 如果云存档已开启，同步更新 Steam 目录
                const toml = this.readToml(steamPath);
                if (toml?.cloud?.enabled === true) {
                    this.installCloudRedirectDll(steamPath);
                }

                this.broadcast(60, '正在验证 I/O 接口完整性...', 'install');
                await this.installDLL(taskDir, steamPath, effectiveTargetDlls);
                
                // 全量同步 opensteamtool 目录到 Steam 根目录
                await this.installOpenSteamToolDir(taskDir, steamPath);
            }

            if (manifestMirrors.length > 0) {
                const manifestZipPath = path.join(taskDir, 'manifest.zip');
                const manifestDir = path.join(taskDir, 'manifest_extract');
                
                await this.downloadWithMirrors(manifestMirrors, manifestZipPath, '清单协议矩阵');
                
                this.broadcast(75, '正在解析动态清单矩阵并重构挂载脚本...', 'extract');
                await this.extractArchive(manifestZipPath, manifestDir);

                // 构建关闭自动更新的 AppID 集合
                const disabledAutoUpdateAppIds = new Set<string>();
                try {
                    const uid = Db.getEncrypted<any>('auth_ticket')?.userId;
                    if (uid) {
                        const libRows = Db.getUserLibrary(String(uid));
                        for (const row of libRows) {
                            if (row.type === 'titan_protocol' || String(row.resource_id).startsWith('steam_gate_')) {
                                try {
                                    const meta = JSON.parse(row.meta_json || '{}');
                                    if (meta.autoUpdate === false) {
                                        const appId = String(row.resource_id).replace(/^steam_gate_/, '');
                                        if (/^\d+$/.test(appId)) disabledAutoUpdateAppIds.add(appId);
                                    }
                                } catch {}
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[TitanProtocol] 读取自动更新配置失败:', e);
                }

                await this.distributeResources(manifestDir, steamPath, pluginDirName, disabledAutoUpdateAppIds);
            } else {
                this.broadcast(80, '警告: 仅部署引擎环境，未检测到业务游戏清单。', 'init');
            }

            this.cleanupSync(taskDir);
            this.broadcast(100, '协议部署挂载成功。', 'done');
            return { success: true, msg: 'DEPLOY_OK', path: steamPath };

        } catch (e: any) {
            this.cleanupSync(taskDir);
            this.broadcast(0, `部署阻断: ${this.translateError(e)}`, 'error');
            return { success: false, msg: this.translateError(e) };
        } finally {
            this.deploymentLocks.delete(config.app_id);
        }
    }

    private static cleanExpiredLocks(): void {
        const now = Date.now();
        for (const [appId, lockTime] of this.deploymentLocks.entries()) {
            if (now - lockTime > this.LOCK_TTL_MS) this.deploymentLocks.delete(appId);
        }
    }

    private static checkEnvironment(steamPath: string, targetDlls: string[], pluginDirName: string): boolean {
        if (!fs.existsSync(path.join(steamPath, 'config', pluginDirName))) return false;
        if (!targetDlls || targetDlls.length === 0) return false;
        for (const dll of targetDlls) {
            if (!fs.existsSync(path.join(steamPath, dll))) return false;
        }
        return true;
    }

    // ================= [ opensteamtool 目录全量同步 ] =================

    private static async installOpenSteamToolDir(sourceDir: string, steamPath: string): Promise<void> {
        let sourceOstDir = path.join(sourceDir, 'opensteamtool');
        
        // 兼容 zip 内多套一层文件夹的情况（如 ost/opensteamtool）
        if (!fs.existsSync(sourceOstDir)) {
            sourceOstDir = this.findDirInDir(sourceDir, 'opensteamtool');
        }
        
        if (!sourceOstDir || !fs.existsSync(sourceOstDir)) {
            console.log('[TitanProtocol] 引擎包内未包含 opensteamtool 目录，跳过同步（兼容旧版包）');
            return;
        }

        const targetOstDir = path.join(steamPath, 'opensteamtool');
        
        try {
            if (!fs.existsSync(targetOstDir)) {
                fs.mkdirSync(targetOstDir, { recursive: true });
            }

            const walkAndCopy = (src: string, dest: string) => {
                const entries = fs.readdirSync(src, { withFileTypes: true });
                for (const entry of entries) {
                    const srcPath = path.join(src, entry.name);
                    const destPath = path.join(dest, entry.name);
                    if (entry.isDirectory()) {
                        if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
                        walkAndCopy(srcPath, destPath);
                    } else {
                        fs.copyFileSync(srcPath, destPath);
                    }
                }
            };

            walkAndCopy(sourceOstDir, targetOstDir);
            console.log('[TitanProtocol] opensteamtool 目录已全量同步至 Steam 根目录');
        } catch (e: any) {
            console.warn('[TitanProtocol] opensteamtool 目录同步失败（非阻断）:', e.message);
        }
    }

    private static findDirInDir(dir: string, targetName: string): string | null {
        if (!fs.existsSync(dir)) return null;
        for (const file of fs.readdirSync(dir)) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                if (file.toLowerCase() === targetName.toLowerCase()) {
                    return fullPath;
                }
                const found = this.findDirInDir(fullPath, targetName);
                if (found) return found;
            }
        }
        return null;
    }

    // ================= [ 7z 解压：生产环境安全调用 ] =================

    private static extractArchive(src: string, dest: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const exePath = resolve7zExePath();
            const proc = spawn(exePath, ['x', src, `-o${dest}`, '-y', '-bsp0', '-bso0'], {
                windowsHide: true
            });
            proc.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`解压失败，退出代码: ${code}`));
            });
            proc.on('error', (err) => reject(new Error(`解压损坏: ${err.message}`)));
        });
    }

    private static async downloadWithMirrors(mirrors: string[], dest: string, label: string): Promise<void> {
        if (mirrors.length === 0) throw new Error(`无可用节点，拉取 ${label} 失败。`);

        let candidateUrls = mirrors;

        if (mirrors.length > 1) {
            this.broadcast(null, `多链路测活: 正在寻址最快可用节点...`, 'download');
            
            const probePromises = mirrors.map((url, idx) =>
                axios({
                    url,
                    method: 'GET',
                    responseType: 'stream',
                    timeout: 3000,
                    headers: { 'User-Agent': 'TitanCore/15.0/Nexus' }
                }).then(res => {
                    res.data.destroy();
                    return { idx, url, ok: true };
                }).catch(() => {
                    return { idx, url, ok: false };
                })
            );

            const probeResults = await Promise.all(probePromises);
            const sorted = probeResults
                .filter(r => r.ok)
                .sort((a, b) => a.idx - b.idx);

            if (sorted.length > 0) {
                candidateUrls = sorted.map(r => r.url);
            }
        }

        let lastError = '';
        for (let i = 0; i < candidateUrls.length; i++) {
            const url = candidateUrls[i];
            try {
                const nodeName = candidateUrls.length > 1 ? `节点 ${i + 1}` : '主节点';
                this.broadcast(null, `建立链路: [${nodeName}] 正在全速拉取 ${label}...`, 'download');
                await this.downloadStream(url, dest);
                return;
            } catch (err: any) {
                lastError = err.message || '未知网络异常';
                if (i < candidateUrls.length - 1) {
                    this.broadcast(null, `[警告] 当前节点阻断，无缝切换备用链路...`, 'download');
                    if (fs.existsSync(dest)) fs.unlinkSync(dest);
                }
            }
        }

        throw new Error(`所有链路均已断开，拉取 ${label} 失败。(${lastError})`);
    }

    private static async downloadStream(url: string, dest: string): Promise<void> {
        const response = await axios({
            url, method: 'GET', responseType: 'stream', timeout: 15000,
            headers: { 'User-Agent': 'TitanCore/15.0/Nexus' }
        });

        const writer = fs.createWriteStream(dest);
        return new Promise((resolve, reject) => {
            let errorObj: Error | null = null;

            response.data.pipe(writer);

            const handleError = (err: any) => {
                if (!errorObj) {
                    errorObj = err;
                    writer.destroy();
                }
            };

            writer.on('error', handleError);
            response.data.on('error', handleError);

            writer.on('close', () => {
                if (errorObj) reject(errorObj);
                else resolve();
            });
        });
    }

    private static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private static async retryFileOpAsync<T>(op: () => T): Promise<T> {
        let lastErr: any;
        for (let i = 0; i < 3; i++) {
            try {
                return op();
            } catch (e: any) {
                lastErr = e;
                const msg = String(e?.message || e?.code || '').toLowerCase();
                if (i < 2 && (msg.includes('ebusy') || msg.includes('eperm') || msg.includes('locked'))) {
                    await this.delay(150);
                    continue;
                }
                throw e;
            }
        }
        throw lastErr;
    }

    private static async distributeResources(sourceDir: string, steamRoot: string, pluginDirName: string, disabledAutoUpdateAppIds: Set<string> = new Set()) {
        const pluginDir = path.join(steamRoot, 'config', pluginDirName);
        const depotDir = path.join(steamRoot, 'depotcache');

        if (!fs.existsSync(pluginDir)) fs.mkdirSync(pluginDir, { recursive: true });
        if (!fs.existsSync(depotDir)) fs.mkdirSync(depotDir, { recursive: true });

        const walk = async (dir: string) => {
            if (!fs.existsSync(dir)) return;
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                if (fs.statSync(filePath).isDirectory()) {
                    await walk(filePath);
                } else {
                    if (file.endsWith('.lua')) {
                        const content = fs.readFileSync(filePath, 'utf-8');
                        const lines = content.split(/\r?\n/);
                        const fileAppId = file.replace(/\.lua$/, '');
                        const shouldDisable = disabledAutoUpdateAppIds.has(fileAppId);
                        
                        const processedLines = lines.map(line => {
                            if (line.includes('setManifestid')) {
                                const isCommented = line.trim().startsWith('--');
                                if (shouldDisable) {
                                    // 关闭更新：取消注释，恢复原始格式
                                    if (isCommented) {
                                        return line.replace(/^(\s*)--\s*/, '$1');
                                    }
                                } else {
                                    // 开启更新：添加注释
                                    if (!isCommented) {
                                        return '-- ' + line;
                                    }
                                }
                            }
                            return line;
                        });
                        await this.retryFileOpAsync(() => {
                            fs.writeFileSync(path.join(pluginDir, file), processedLines.join('\n'), 'utf-8');
                        });
                    } else if (file.includes('_manifest') || file.endsWith('.manifest')) {
                        await this.retryFileOpAsync(() => {
                            fs.copyFileSync(filePath, path.join(depotDir, file));
                        });
                    }
                }
            }
        };
        await walk(sourceDir);
    }

    private static async installDLL(sourceDir: string, steamPath: string, targetDlls: string[]) {
        for (const dllName of targetDlls) {
            const sourceDllPath = this.findDllInDir(sourceDir, dllName);
            const targetDll = path.join(steamPath, dllName);

            if (sourceDllPath) {
                await this.retryFileOpAsync(() => {
                    if (fs.existsSync(targetDll) && !fs.existsSync(targetDll + '.bak')) {
                        fs.copyFileSync(targetDll, targetDll + '.bak');
                    }
                    fs.copyFileSync(sourceDllPath, targetDll);
                });
            }
        }
    }

    private static findDllInDir(dir: string, dllName: string): string | null {
        if (!fs.existsSync(dir)) return null;
        for (const file of fs.readdirSync(dir)) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                const found = this.findDllInDir(fullPath, dllName);
                if (found) return found;
            } else if (file.toLowerCase() === dllName.toLowerCase()) {
                return fullPath;
            }
        }
        return null;
    }

    private static cleanupSync(dir: string) {
        if (fs.existsSync(dir)) {
            try { 
                fs.rmSync(dir, { recursive: true, force: true }); 
            } catch (e: any) {
                console.warn(`[TitanProtocol] 临时目录残留清理失败: ${e.message}，已忽略`);
            }
        }
    }

    private static broadcast(progress: number | null, msg: string, step: string) {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
            win.webContents.send('titan:protocol-log', { step, progress: progress ?? -1, msg });
        }
    }
}