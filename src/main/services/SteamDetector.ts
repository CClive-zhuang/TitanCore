// 文件名: src/main/services/SteamDetector.ts
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { access, constants } from 'node:fs/promises';
import path from 'node:path';
import { Db } from '../db'; // 🛡️ 引入本地持久化基座

const run = (file: string, args: string[], timeout = 3000): Promise<string> =>
  new Promise((resolve, reject) => {
    execFile(file, args, { encoding: 'utf-8', timeout }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });

export class SteamDetector {
  private static _p: string | null = null;
  private static _src = 'none';
  private static _t = 0;
  private static readonly TTL = 600_000; // 10 分钟缓存防击穿

  static get lastDetectedPath(): string | null {
    return this._p && Date.now() - this._t < this.TTL && this.#exists(this._p) ? this._p : null;
  }

  static get lastDetectSource(): string {
    return this._src;
  }

  // 🛡️ 暴露给 core IPC 调用的验证接口
  static async validatePath(dir: string): Promise<boolean> {
    return await this.#check(dir);
  }

  // 🛡️ 手动干预路径的直接落盘
  static setManualPath(dir: string): boolean {
    if (this.#exists(dir)) {
      Db.set('steam_install_path', dir);
      this._p = dir;
      this._src = 'manual';
      this._t = Date.now();
      return true;
    }
    return false;
  }

  static async detect(): Promise<{ path: string | null; source: string }> {
    if (this.lastDetectedPath) return { path: this._p, source: this._src };
    
    const save = (p: string, s: string) => { this._p = p; this._src = s; this._t = Date.now(); return { path: p, source: s }; };

    // 0. 最高优先级：读取 kv_store 锁定的手动路径
    const manualPath = Db.get<string>('steam_install_path');
    if (manualPath && await this.#check(manualPath)) {
      return save(manualPath, 'manual');
    }

    // 1. 协议注册表探针
    try {
      const p = await this.#fromProtocol();
      if (p && (await this.#check(p))) return save(p, 'registry_protocol');
    } catch { /* 静默降级 */ }

    // 2. Valve 路径探针
    try {
      const p = await this.#fromValve();
      if (p && (await this.#check(p))) return save(p, 'registry_valve');
    } catch { /* 静默降级 */ }

    // 3. TC 同盘符锚点探针
    try {
      const p = await this.#fromAnchor();
      if (p) return save(p, 'portable_anchor');
    } catch { /* 静默降级 */ }

    this._p = null;
    this._src = 'none';
    return { path: null, source: 'none' };
  }

  static async #fromProtocol(): Promise<string | null> {
    const out = await run(
      'reg.exe',
      ['query', 'HKEY_CLASSES_ROOT\\steam\\shell\\open\\command', '/ve'],
      2000
    );

    const quoted = out.match(/"([a-zA-Z]:\\[^"]+\.exe)"/i);
    if (quoted) return path.win32.dirname(quoted[1]);

    const bare = out.match(/([a-zA-Z]:\\[^\r\n]+?\.exe)/i);
    if (bare) return path.win32.dirname(bare[1]);

    return null;
  }

  static async #fromValve(): Promise<string | null> {
    const out = await run(
      'reg.exe',
      ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'],
      2000
    );
    const m = out.match(/SteamPath\s+REG_SZ\s+(.+)/i);
    if (!m) return null;
    return path.win32.normalize(m[1].trim().replace(/^"|"$/g, ''));
  }

  static async #fromAnchor(): Promise<string | null> {
    const tcDir = path.dirname(process.execPath);
    const tcDrive = path.parse(process.execPath).root;

    const candidates = [
      path.join(tcDrive, 'Steam'),
      path.join(tcDir, '..', 'Steam'),
    ];

    const seen = new Set<string>();
    for (const p of candidates) {
      const norm = path.win32.normalize(p);
      if (seen.has(norm)) continue;
      seen.add(norm);
      if (await this.#check(norm)) return norm;
    }
    return null;
  }

  static async #check(dir: string): Promise<boolean> {
    if (!dir) return false;
    try {
      await access(path.join(dir, 'steam.exe'), constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  static #exists(dir: string): boolean {
    if (!dir) return false;
    return existsSync(path.join(dir, 'steam.exe'));
  }
}