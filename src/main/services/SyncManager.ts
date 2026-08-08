// 文件名: src/main/services/SyncManager.ts
import fs from 'node:fs';
import path from 'node:path';
import { BrowserWindow, app } from 'electron';
import { Db } from '../db';
import { CoverPackService } from './CoverPackService';
import type { BackendResourceItem } from '../../types';
import { EventEmitter } from 'events';
import * as crypto from 'node:crypto';
import { titanFetch } from '../TitanNet';

export class SyncManager {
    private static isSyncing = false;
    private static lastSyncTime = 0;
    private static eventEmitter = new EventEmitter();
    private static readonly CLIENT_SECRET = 'TitanV15_KimiFinal_2025';

    public static get isSyncingState(): boolean {
        return this.isSyncing;
    }

    static initialize(): void {
        console.log('[SyncManager] 硬核原子性分页同步引擎初始化就绪');
    }

    static on(event: string, listener: (...args: unknown[]) => void): () => void {
        this.eventEmitter.on(event, listener);
        return () => this.eventEmitter.off(event, listener);
    }

    private static safeSend(win: BrowserWindow, channel: string, data?: unknown): void {
        if (win.isDestroyed() || win.webContents.isDestroyed()) return;
        try { win.webContents.send(channel, data); } catch (e) {}
    }

    private static emit(event: string, data?: unknown): void {
        this.eventEmitter.emit(event, data);
        const wins = BrowserWindow.getAllWindows();
        wins.forEach(win => { this.safeSend(win, `titan:${event}`, data); });
    }

    private static emitLifecycleSyncComplete(): void {
        const wins = BrowserWindow.getAllWindows();
        wins.forEach(win => {
            this.safeSend(win, 'lifecycle:sync-complete', { timestamp: Date.now(), revision: Db.get<number>('local_revision') || 0 });
        });
    }

    static generatePingSync(): string {
        const timestamp = Math.floor(Date.now() / 1000);
        const random = Math.floor(100000 + Math.random() * 900000).toString();
        const hmac = crypto.createHmac('sha256', this.CLIENT_SECRET).update(`${timestamp}:${random}`).digest('hex');
        return `${timestamp}:${random}:${hmac.substring(0, 8)}`;
    }

    private static getCoversDir(): string { return path.join(app.getPath('userData'), 'cache', 'covers'); }

    private static async deleteCoverFile(resourceId: string): Promise<void> {
        const coverPath = path.join(this.getCoversDir(), `${resourceId}.webp`);
        fs.promises.unlink(coverPath).catch(() => {});
    }

    private static async clearAllCovers(): Promise<void> {
        const coversDir = this.getCoversDir();
        try {
            const files = await fs.promises.readdir(coversDir);
            const coverFiles = files.filter(f => f.endsWith('.webp') || f.endsWith('.jpg') || f.endsWith('.png'));
            for (const file of coverFiles) {
                fs.promises.unlink(path.join(coversDir, file)).catch(() => {});
            }
        } catch (e) {}
    }

    private static triggerCoverSync(serverUrl: string): void {
        try {
            const coverEndpoints = Db.get<Record<string, string>>('endpoints') || {};
            const coverPacksPath = coverEndpoints['cover_packs'] || '/titan/cover_packs.json';
            const coverPacksUrl = coverPacksPath.startsWith('http') ? coverPacksPath : `${serverUrl}${coverPacksPath}`;
            CoverPackService.syncPacks(coverPacksUrl).catch(() => {});
        } catch (e) {}
    }

    /**
     * 边缘配置同步：雷达规则与搜索意图字典
     * 数据量极小（<10KB），独立线程，失败静默不影响主业务
     */
    static async syncRadarRules(): Promise<void> {
        try {
            const serverUrl = Db.get<any>('app_seed_config')?.serverUrl || Db.get<any>('app_settings')?.serverUrl || '';
            if (!serverUrl) return;

            const res = await titanFetch(`${serverUrl}/titan/titan_radar.php?t=${Date.now()}`, { timeout: 10000 });
            if (res.ok) {
                const json = await res.json();
                // 解包 sendJson 封装，只存真实雷达数据
                const payload = json.data || json;
                if (payload) {
                    Db.set('radar_denuvo_rules', payload);
                    if (payload.search_intent_dict) {
                        Db.set('search_intent_dict', payload.search_intent_dict);
                    }
                }
            }
        } catch (e) {
            console.warn('[SyncManager] 雷达规则同步失败:', e);
        }
    }

    static async startSync(options?: { force?: boolean }): Promise<void> {
        const serverUrl = Db.get<any>('app_seed_config')?.serverUrl || Db.get<string>('server_url');
        
        // 🟢 并行拉取边缘配置（雷达规则 + 意图字典），数据量极小，失败静默，不阻塞主同步
        if (serverUrl) {
            this.syncRadarRules().catch(() => {});
        }
        
        try {
            const dbHealth = Db.query<{c: number}>('SELECT count(id) as c FROM titan_resources');
            if (!dbHealth || dbHealth.length === 0 || (dbHealth[0] && dbHealth[0].c === 0)) {
                Db.set('local_revision', 0);
            }
        } catch (e) {}
        
        // 🟢 [修复 Version 退化]：恢复无条件版本检查，确保服务端表结构升级必被感知！
        if (serverUrl) {
            try {
                const versionUrl = `${serverUrl}/titan/update_check.php?action=check_main&t=${Date.now()}`;
                const versionRes = await titanFetch(versionUrl, { method: 'GET', timeout: 10000 });
                if (versionRes.ok) {
                    const versionData = await versionRes.json();
                    if (versionData && versionData.success) {
                        const serverVersion = versionData.resource_version || 1;
                        const localVersion = Db.get<number>('resource_version') || 0;
                        
                        if (serverVersion !== localVersion) {
                            Db.run('DELETE FROM titan_resources');
                            this.clearAllCovers();
                            Db.set('local_revision', 0);
                            Db.set('downloaded_cover_packs', []);
                            Db.set('resource_version', serverVersion);
                        }
                    }
                }
            } catch (e) {}
        }
        
        if (!serverUrl) {
            console.warn('[SyncManager] Missing Server URL, sync aborted.');
            this.emit('sync:complete', { upsert: 0, delete: 0, unchanged: true });
            this.emit('titan:library-updated', { upsert: 0, delete: 0, unchanged: true });
            this.emitLifecycleSyncComplete();
            return;
        }
        
        if (this.isSyncing) return;
        this.isSyncing = true;
        this.lastSyncTime = Date.now();

        try {
            const endpoints = Db.get<Record<string, string>>('endpoints') || {};
            const endpoint = endpoints['data'] || '/titan/data.php';
            const fullUrl = endpoint.startsWith('http') ? endpoint : `${serverUrl}${endpoint}`;
            
            let currentRev = options?.force ? 0 : (Db.get<number>('local_revision') || 0);
            
            let hasMore = false;
            let totalUpsert = 0;
            let totalDelete = 0;
            const allChangedIds: string[] = [];
            const allBatchRows: any[] = [];
            const allDeletedIds: string[] = [];

            // 🟢 [修复 BUG 1 & BUG 2]：增设原子性中断标记与熔断上限
            let syncAborted = false;
            let pageCount = 0;
            const MAX_PAGES = 30; // 熔断上限：30页 / 15000条数据

            do {
                pageCount++;
                if (pageCount > MAX_PAGES) {
                    console.error('[SyncManager] 触发熔断保险丝！分页拉取超过最大限制 (MAX_PAGES = 30)，强行中止！');
                    syncAborted = true;
                    break;
                }

                const headers: Record<string, string> = { 
                    'X-Titan-Revision': currentRev.toString(),
                    'X-Titan-Ping': this.generatePingSync(),
                    'User-Agent': 'TitanCore/15.0',
                    'Accept': 'application/json'
                };

                const tokenObj = Db.getEncrypted<any>('auth_ticket');
                if (tokenObj?.token) headers['X-Titan-Token'] = tokenObj.token;

                const response = await titanFetch(`${fullUrl}?_t=${Date.now()}`, {
                    method: 'GET',
                    headers,
                    timeout: 15000
                });
                
                if (response.status === 401 || response.status === 403) {
                    this.emit('auth:session-invalid', { message: 'Session expired' });
                    syncAborted = true; // 发生异常，原子性中止
                    break;
                }
                
                if (response.status === 304) {
                    hasMore = false;
                    break;
                }
                
                if (!response.ok) {
                    console.warn(`[SyncManager] 分页拉取网络失败 (${response.status})，中止全量事务`);
                    syncAborted = true;
                    break;
                }

                const apiResponse = await response.json() as any;
                if (!apiResponse || apiResponse.code !== 200 || !apiResponse.data?.data) {
                    syncAborted = true;
                    break;
                }

                const base64String = apiResponse.data.data;
                let payloadData: BackendResourceItem[] = [];
                let nextRevision = currentRev;

                try {
                    const decodedStr = Buffer.from(base64String, 'base64').toString('utf-8');
                    const decodedPayload = JSON.parse(decodedStr);
                    if (Array.isArray(decodedPayload.data)) {
                        payloadData = decodedPayload.data;
                        nextRevision = decodedPayload.revision || currentRev;
                        hasMore = !!decodedPayload.has_more;
                        
                        // 防御指针死锁
                        if (hasMore && nextRevision <= currentRev) {
                            console.warn('[SyncManager] 警告：后端指针未前进，强制结束分页拉取');
                            hasMore = false;
                        }
                    } else {
                        hasMore = false;
                    }
                } catch (e) {
                    console.error('[SyncManager] Base64 解码异常，中止同步');
                    syncAborted = true;
                    break;
                }

                if (payloadData.length === 0) {
                    hasMore = false;
                    break;
                }

                for (const item of payloadData as any[]) {
                    if (item.status === 'deleted') {
                        allDeletedIds.push(item.id);
                        allChangedIds.push(item.id);
                        continue;
                    }

                    allBatchRows.push({
                        id: item.id, type: item.type, title: item.title, cover: item.cover,
                        tags: item.tags || '', rating: item.rating || 0, meta_json: item.meta_json,
                        policy_vip: item.policy_vip || 0, policy_price: item.policy_price || 0,
                        policy_start: item.policy_start || 0, policy_end: item.policy_end || 0,
                        time_action: item.time_action || item.policy_mode || 'hide',
                        updated_at: item.updated_at, status: 'active', desc: item.desc || '',
                        collection_ids: item.collection_ids || '[]',
                        hide_in_main: item.hide_in_main || 0
                    });
                    allChangedIds.push(item.id);
                }

                currentRev = nextRevision;

            } while (hasMore);

            // 🟢 [BUG 1 最终防御]：只要分页过程中发生任何网络中断、Token报错、熔断触发，
            // 绝对跳过底层写入和 Revision 更新，保证数据库要么 100% 完整，要么保持旧态不被污染！
            if (syncAborted) {
                console.warn('[SyncManager] 事务已被中止，未写入任何残缺数据，本地时序保持原状。');
                this.emit('sync:complete', { upsert: 0, delete: 0, unchanged: true });
                this.emit('titan:library-updated', { upsert: 0, delete: 0, unchanged: true });
                this.emitLifecycleSyncComplete();
                return;
            }

            // --- 以下为完全成功后的物理写入 ---
            if (allDeletedIds.length > 0) {
                for (const id of allDeletedIds) {
                    Db.deleteResource(id);
                    this.deleteCoverFile(id);
                    totalDelete++;
                }
            }

            if (allBatchRows.length > 0) {
                if (Db.upsertResourcesBatch(allBatchRows)) {
                    totalUpsert += allBatchRows.length;
                }
            }

            Db.checkpoint();
            Db.set('local_revision', currentRev);
            this.triggerCoverSync(serverUrl);
            
            const wins = BrowserWindow.getAllWindows();
            wins.forEach(win => {
                this.safeSend(win, 'titan:library-updated', { upsert: totalUpsert, delete: totalDelete, changedIds: allChangedIds, revision: currentRev, forceReload: true });
            });

            this.emit('sync:complete', { upsert: totalUpsert, delete: totalDelete, changedIds: allChangedIds, revision: currentRev });
            this.emitLifecycleSyncComplete();

        } catch (e: any) {
            console.error('[SyncManager] Sync critical error:', e.message);
            this.emit('sync:complete', { upsert: 0, delete: 0, unchanged: true });
            this.emit('titan:library-updated', { upsert: 0, delete: 0, unchanged: true });
            this.emitLifecycleSyncComplete();
        } finally {
            this.isSyncing = false;
        }
    }
}