// 文件名: src/main/services/CoverPackService.ts
import fs from 'node:fs';
import path from 'node:path';
import axios from 'axios';
import { app } from 'electron';
import { Db } from '../db';
import { spawn } from 'child_process';
import { resolve7zExePath } from '../utils/resolve7z';

export class CoverPackService {
    private static coversDir: string;
    private static isSyncing = false;
    private static readonly DOWNLOAD_CONCURRENCY = 3;
    private static readonly PACK_TIMEOUT = 30000;
    private static readonly MAX_RETRIES = 2;

    public static init() {
        this.coversDir = path.join(Db.getDataRoot(), 'cache', 'covers');
        if (!fs.existsSync(this.coversDir)) fs.mkdirSync(this.coversDir, { recursive: true });
    }

    public static async syncPacks(listUrl: string) {
        if (!this.coversDir) this.init();
        if (this.isSyncing) return;
        this.isSyncing = true;

        try {
            const finalUrl = listUrl.includes('?') ? `${listUrl}&t=${Date.now()}` : `${listUrl}?t=${Date.now()}`;
            const res = await axios.get(finalUrl, { timeout: 10000, headers: { 'User-Agent': 'TitanCore/15.0' } });
            
            let packsRaw = res.data;
            if (typeof packsRaw === 'string') {
                try { packsRaw = JSON.parse(packsRaw); } catch (e) { throw new Error('ERR_JSON_PARSE_FAIL'); }
            }
            if (packsRaw && typeof packsRaw === 'object' && Array.isArray((packsRaw as any).data)) {
                packsRaw = (packsRaw as any).data;
            }

            if (!Array.isArray(packsRaw)) throw new Error('ERR_INVALID_PACK_FORMAT');

            const packs: { id: number, url: string }[] = packsRaw;
            const history = Db.get<number[]>('downloaded_cover_packs') || [];
            
            const newPacks = packs.filter(p => !history.includes(p.id)).sort((a, b) => a.id - b.id);
            if (newPacks.length === 0) return;

            const successIds: number[] = [];

            const processPack = async (pack: { id: number, url: string }): Promise<boolean> => {
                const tempFile = path.join(
                    Db.getDataRoot(), 
                    'cache', 
                    `pack_${pack.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.zip`
                );
                
                let retries = this.MAX_RETRIES;
                while (retries >= 0) {
                    try {
                        await this.downloadPack(pack, tempFile);
                        await this.extractPack(tempFile);
                        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                        
                        const currentHistory = Db.get<number[]>('downloaded_cover_packs') || [];
                        if (!currentHistory.includes(pack.id)) {
                            Db.set('downloaded_cover_packs', [...currentHistory, pack.id]);
                        }
                        
                        return true;
                    } catch (e: any) {
                        if (fs.existsSync(tempFile)) try { fs.unlinkSync(tempFile); } catch {}
                        
                        if (retries === 0) {
                            console.error(`[CoverPackService] Pack ${pack.id} 最终失败:`, e.message);
                            return false;
                        }
                        retries--;
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
                return false;
            };

            const worker = async (workerId: number) => {
                for (let i = workerId; i < newPacks.length; i += this.DOWNLOAD_CONCURRENCY) {
                    if (await processPack(newPacks[i])) {
                        successIds.push(newPacks[i].id);
                    }
                }
            };

            const workers: Promise<void>[] = [];
            for (let i = 0; i < this.DOWNLOAD_CONCURRENCY; i++) {
                workers.push(worker(i));
            }
            await Promise.all(workers);

            if (successIds.length > 0) {
                const currentHistory = Db.get<number[]>('downloaded_cover_packs') || [];
                const updatedHistory = Array.from(new Set([...currentHistory, ...successIds]));
                Db.set('downloaded_cover_packs', updatedHistory);
                this.cleanupLRU();
            }
        } catch (e: any) {
            console.error('[CoverPackService] syncPacks error:', e.message);
        } finally {
            this.isSyncing = false;
        }
    }

    private static async downloadPack(pack: { id: number, url: string }, tempFile: string): Promise<void> {
        const response = await axios({ 
            url: pack.url, 
            method: 'GET', 
            responseType: 'stream', 
            timeout: this.PACK_TIMEOUT, 
            headers: { 'User-Agent': 'TitanCore/15.0' } 
        });
        const writer = fs.createWriteStream(tempFile);
        response.data.pipe(writer);
        
        return new Promise<void>((resolve, reject) => {
            writer.on('close', () => { resolve(); });
            writer.on('error', (err) => { writer.destroy(); reject(err); });
            response.data.on('error', (err: any) => { writer.destroy(); reject(err); });
        });
    }

    private static async extractPack(tempFile: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const exePath = resolve7zExePath();
            const proc = spawn(exePath, ['x', tempFile, `-o${this.coversDir}`, '-aoa', '-y', '-bsp0', '-bso0'], {
                windowsHide: true
            });
            proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`解压失败，退出代码: ${code}`)));
            proc.on('error', (err) => reject(new Error(`解压进程启动失败: ${err.message}`)));
        });
    }

    private static async cleanupLRU(): Promise<void> {
        try {
            const files = await fs.promises.readdir(this.coversDir);
            const coverFiles = files.filter(f => f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp'));
            if (coverFiles.length <= 1000) return;

            const fileStats = await Promise.all(
                coverFiles.map(async (f) => {
                    const filePath = path.join(this.coversDir, f);
                    try {
                        const stat = await fs.promises.stat(filePath);
                        return { path: filePath, mtime: stat.mtimeMs };
                    } catch {
                        return { path: filePath, mtime: 0 };
                    }
                })
            );

            fileStats.sort((a, b) => b.mtime - a.mtime);
            const toDelete = fileStats.slice(1000);
            for (const file of toDelete) {
                fs.promises.unlink(file.path).catch(() => {});
            }
        } catch (e) {}
    }
}