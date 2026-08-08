// 文件名: src/main/db.ts
// 【P1】三级探针 + 完整底座 + 单表结构（动态分表已移除）

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { SecurityService } from './services/SecurityService'

type SqlParam = string | number | null | Buffer | bigint

export class Db {
  private static db: Database.Database | null = null
  private static dbPath: string = ''
  private static isReady = false

  // ================= [ 探针 ] =================

  static init(): { success: boolean; reset?: boolean; error?: string } {
    if (this.isReady) return { success: true }

    const existing = this.findExistingDb()
    if (existing) {
      this.dbPath = existing
      return this.openDb()
    }

    const root = this.probeDataRoot()
    if (!root) return { success: false, error: 'No available data directory' }

    this.dbPath = root
    try { fs.mkdirSync(path.dirname(root), { recursive: true }) } catch (e: any) {
      return { success: false, error: 'Failed to create directory: ' + e.message }
    }

    return this.openDb()
  }

  static isFirstLaunch(): boolean {
    return !this.findExistingDb()
  }

  private static findExistingDb(): string | null {
    const candidates = [
      path.join(app.getPath('appData'), 'titan-core', 'titan_core_v15.db'),
      path.join(path.dirname(app.getPath('exe')), 'data', 'titan_core_v15.db'),
      path.join(app.getPath('temp'), 'titan-core', 'titan_core_v15.db')
    ]
    for (const p of candidates) if (fs.existsSync(p)) return p
    return null
  }

  private static probeDataRoot(): string | null {
    const candidates = [
      path.join(app.getPath('appData'), 'titan-core'),
      path.join(path.dirname(app.getPath('exe')), 'data'),
      path.join(app.getPath('temp'), 'titan-core')
    ]
    for (const dir of candidates) {
      try {
        fs.mkdirSync(dir, { recursive: true })
        const probe = path.join(dir, '.probe')
        fs.writeFileSync(probe, '1')
        fs.unlinkSync(probe)
        return path.join(dir, 'titan_core_v15.db')
      } catch {}
    }
    return null
  }

  private static openDb(): { success: boolean; reset?: boolean; error?: string } {
    try {
      this.db = new Database(this.dbPath, { fileMustExist: false })
      this.db.pragma('journal_mode = WAL')
      this.db.pragma('synchronous = NORMAL')
      this.db.pragma('temp_store = MEMORY')
      this.db.pragma('busy_timeout = 10000')

      this.initSchema()

      try {
        const wal = `${this.dbPath}-wal`, shm = `${this.dbPath}-shm`
        if (fs.existsSync(wal) && fs.statSync(wal).size > 0) {
          this.db.pragma('wal_checkpoint(RESTART)')
          this.db.pragma('wal_checkpoint(TRUNCATE)')
        }
        if (fs.existsSync(shm)) fs.unlinkSync(shm)
      } catch {}

      this.isReady = true
      return { success: true }

    } catch (error: unknown) {
      const e = error as Error & { code?: string }
      const isCorrupt = e.code === 'SQLITE_CORRUPT' || e.message.includes('malformed') || e.message.includes('not a database')

      if (isCorrupt) {
        this.close()
        const backup = `${this.dbPath}.corrupt.${Date.now()}`
        try {
          if (fs.existsSync(this.dbPath)) fs.renameSync(this.dbPath, backup)
          ;[`${this.dbPath}-wal`, `${this.dbPath}-shm`].forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f) })
        } catch {}
        const retry = this.openDb()
        return retry.success ? { success: true, reset: true, error: `Data repaired, backup: ${backup}` } : { success: false, error: 'Repair failed' }
      }
      return { success: false, error: e.message }
    }
  }

  // ================= [ 建表 ] =================

  private static initSchema() {
    if (!this.db) throw new Error('db not ready')

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY, value TEXT NOT NULL,
        is_encrypted INTEGER DEFAULT 0, updated_at INTEGER
      )
    `)

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS titan_resources (
        id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT,
        policy_vip INTEGER DEFAULT 0, policy_price INTEGER DEFAULT 0,
        policy_start INTEGER DEFAULT 0, policy_end INTEGER DEFAULT 0,
        tags TEXT, cover TEXT, rating REAL, meta_json TEXT,
        updated_at INTEGER, status TEXT DEFAULT 'active',
        time_action TEXT DEFAULT 'hide', desc TEXT,
        collection_ids TEXT DEFAULT '[]', hide_in_main INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_tr_updated ON titan_resources(updated_at);
      CREATE INDEX IF NOT EXISTS idx_tr_policy ON titan_resources(policy_vip, policy_price);
    `)

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_library (
        uid TEXT NOT NULL, resource_id TEXT NOT NULL,
        local_path TEXT, is_installed INTEGER DEFAULT 0,
        added_at INTEGER, last_played_at INTEGER,
        title TEXT, type TEXT, cover TEXT, meta_json TEXT,
        PRIMARY KEY (uid, resource_id)
      );
      CREATE INDEX IF NOT EXISTS idx_ul_uid ON user_library(uid);
    `)

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS titan_daily_usage (
        user_id TEXT NOT NULL, date TEXT NOT NULL,
        count INTEGER DEFAULT 0, updated_at INTEGER,
        PRIMARY KEY (user_id, date)
      );
    `)

    this.migrateColumns()
  }

  private static migrateColumns() {
    if (!this.db) return
    const addCol = (table: string, col: string, type: string) => {
      try {
        const cols = this.db!.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
        if (!cols.map(c => c.name).includes(col)) {
          this.db!.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`)
          console.log(`[DB] Migrated: ${table}.${col}`)
        }
      } catch (e) { console.error(`[DB] Migration failed ${table}.${col}:`, e) }
    }
    addCol('user_library', 'title', 'TEXT')
    addCol('user_library', 'type', 'TEXT')
    addCol('user_library', 'cover', 'TEXT')
    addCol('user_library', 'meta_json', 'TEXT')
    addCol('titan_resources', 'desc', 'TEXT')
    addCol('titan_resources', 'collection_ids', "TEXT DEFAULT '[]'")
    addCol('titan_resources', 'hide_in_main', 'INTEGER DEFAULT 0')
  }

  // ================= [ 生命周期 ] =================

  static checkpoint() {
    if (!this.db) return
    try { this.db.pragma('wal_checkpoint(TRUNCATE)') } catch {}
  }

  static close() {
    if (this.db?.open) {
      try { this.checkpoint(); this.db.close() } catch {}
    }
    this.isReady = false
    this.db = null
  }

  // ================= [ 底层查询 ] =================

  private static getOne<T>(sql: string, params: SqlParam[] = []): T | undefined {
    return this.db?.prepare(sql).get(...params) as T | undefined
  }

  private static getAll<T>(sql: string, params: SqlParam[] = []): T[] {
    return (this.db?.prepare(sql).all(...params) as T[]) || []
  }

  public static run(sql: string, params: SqlParam[] = []): Database.RunResult {
    if (!this.db) throw new Error('db not ready')
    return this.db.prepare(sql).run(...params)
  }

  static query<T = any>(sql: string, params: unknown[] = []): T[] {
    if (!this.db) return []
    try { return this.db.prepare(sql).all(...params as SqlParam[]) as T[] }
    catch (e) { console.error('[DB] query fail:', e); return [] }
  }

  // ================= [ KV 配置 ] =================

  static get<T>(key: string): T | null {
    if (!this.db) return null
    try {
      const row = this.getOne<{ value: string; is_encrypted: number }>('SELECT value, is_encrypted FROM kv_store WHERE key = ?', [key])
      if (!row) return null
      const raw = row.is_encrypted ? SecurityService.decryptSensitiveData(row.value) : row.value
      if (!raw) return null
      try { return JSON.parse(raw) } catch { return raw as unknown as T }
    } catch { return null }
  }

  static getEncrypted<T>(key: string): T | null {
    if (!this.db) return null
    try {
      const row = this.getOne<{ value: string }>('SELECT value FROM kv_store WHERE key = ? AND is_encrypted = 1', [key])
      if (!row) return null
      const raw = SecurityService.decryptSensitiveData(row.value)
      if (!raw) return null
      try { return JSON.parse(raw) } catch { return raw as unknown as T }
    } catch { return null }
  }

  static set(key: string, value: unknown, encrypt = false): boolean {
    if (!this.db) return false
    try {
      if (value === null) {
        this.run('DELETE FROM kv_store WHERE key = ?', [key])
        return true
      }
      const str = typeof value === 'string' ? value : JSON.stringify(value)
      const final = encrypt ? SecurityService.encryptSensitiveData(str) : str
      if (!final) return false
      this.run(
        `INSERT INTO kv_store (key, value, is_encrypted, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, is_encrypted = excluded.is_encrypted, updated_at = excluded.updated_at`,
        [key, final, encrypt ? 1 : 0, Date.now()]
      )
      return true
    } catch { return false }
  }

  static setEncrypted(key: string, value: unknown): boolean {
    return this.set(key, value, true)
  }

  private static parseVal<T>(raw: string, isEncrypted: number): T | null {
    const val = isEncrypted ? SecurityService.decryptSensitiveData(raw) : raw
    if (!val) return null
    try { return JSON.parse(val) } catch { return val as unknown as T }
  }

  static getConfig<T>(key: string): T | null { return this.get<T>(key) }
  static setConfig(key: string, value: unknown): boolean { return this.set(key, value) }
  static getEncryptedConfig<T>(key: string): T | null { return this.getEncrypted<T>(key) }
  static setEncryptedConfig(key: string, value: unknown): boolean { return this.setEncrypted(key, value) }

  // ================= [ 资源库 ] =================

  static upsertResource(row: any): boolean {
    if (!this.db) return false
    try {
      this.db.prepare(`
        INSERT INTO titan_resources (
          id, type, title, policy_vip, policy_price, policy_start, policy_end,
          tags, cover, rating, meta_json, updated_at, status, time_action, desc,
          collection_ids, hide_in_main
        ) VALUES (
          @id, @type, @title, @policy_vip, @policy_price, @policy_start, @policy_end,
          @tags, @cover, @rating, @meta_json, @updated_at, @status, @time_action, @desc,
          @collection_ids, @hide_in_main
        )
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title, policy_vip = excluded.policy_vip,
          policy_price = excluded.policy_price, policy_start = excluded.policy_start,
          policy_end = excluded.policy_end, tags = excluded.tags,
          cover = excluded.cover, rating = excluded.rating,
          meta_json = excluded.meta_json, updated_at = excluded.updated_at,
          status = excluded.status, time_action = excluded.time_action,
          desc = excluded.desc, collection_ids = excluded.collection_ids,
          hide_in_main = excluded.hide_in_main
      `).run(row)
      return true
    } catch (e) { console.error('[DB] upsertResource fail:', e); return false }
  }

  static upsertResourcesBatch(rows: any[]): boolean {
    if (!this.db || rows.length === 0) return false
    const insert = this.db.prepare(`
      INSERT INTO titan_resources (
        id, type, title, policy_vip, policy_price, policy_start, policy_end,
        tags, cover, rating, meta_json, updated_at, status, time_action, desc,
        collection_ids, hide_in_main
      ) VALUES (
        @id, @type, @title, @policy_vip, @policy_price, @policy_start, @policy_end,
        @tags, @cover, @rating, @meta_json, @updated_at, @status, @time_action, @desc,
        @collection_ids, @hide_in_main
      )
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title, policy_vip = excluded.policy_vip,
        policy_price = excluded.policy_price, policy_start = excluded.policy_start,
        policy_end = excluded.policy_end, tags = excluded.tags,
        cover = excluded.cover, rating = excluded.rating,
        meta_json = excluded.meta_json, updated_at = excluded.updated_at,
        status = excluded.status, time_action = excluded.time_action,
        desc = excluded.desc, collection_ids = excluded.collection_ids,
        hide_in_main = excluded.hide_in_main
    `)
    const tx = this.db.transaction((items: typeof rows) => { for (const i of items) insert.run(i) })
    try { tx(rows); return true } catch (e) { console.error('[DB] batch fail:', e); return false }
  }

  static deleteResource(id: string) {
    if (!this.db) return
    try { this.run('DELETE FROM titan_resources WHERE id = ?', [id]) } catch {}
  }

  // ================= [ 用户库单表 ] =================

  static upsertUserLibrary(row: any): boolean {
    if (!this.db || !row.uid) return false
    try {
      this.db.prepare(`
        INSERT INTO user_library (
          uid, resource_id, local_path, added_at,
          title, type, cover, meta_json
        ) VALUES (
          @uid, @resource_id, @local_path, @added_at,
          @title, @type, @cover, @meta_json
        )
        ON CONFLICT(uid, resource_id) DO UPDATE SET
          local_path = excluded.local_path, added_at = excluded.added_at,
          title = excluded.title, type = excluded.type,
          cover = excluded.cover, meta_json = excluded.meta_json
      `).run(row)
      return true
    } catch (e) { console.error('[DB] upsertUserLibrary fail:', e); return false }
  }

  static deleteUserLibrary(uid: string, resourceId: string): boolean {
    if (!this.db || !uid) return false
    try {
      return this.run('DELETE FROM user_library WHERE uid = ? AND resource_id = ?', [uid, resourceId]).changes > 0
    } catch (e) { console.error('[DB] deleteUserLibrary fail:', e); return false }
  }

  static getUserLibrary(uid: string): any[] {
    if (!this.db || !uid) return []
    try {
      const rows = this.getAll<any>(`
        SELECT ul.*
        FROM user_library ul
        WHERE ul.uid = ?
        ORDER BY ul.added_at DESC
      `, [uid])
      return rows.map(r => {
        let meta: any = {}
        if (r.meta_json) try { meta = JSON.parse(r.meta_json) } catch {}
        if (!meta._uid) meta._uid = uid
        return { ...r, meta }
      })
    } catch (e) { console.error('[DB] getUserLibrary fail:', e); return [] }
  }

  static escapeLikeString(input: string): string {
    return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
  }

  static getDataRoot(): string {
    return this.dbPath ? path.dirname(this.dbPath) : path.join(app.getPath('appData'), 'titan-core');
  }
}