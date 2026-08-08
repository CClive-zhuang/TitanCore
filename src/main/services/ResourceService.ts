// 文件名: src/main/services/ResourceService.ts
import { Db } from '../db'

export class ResourceService {
  /**
   * 获取发现页（主瀑布流）数据
   * 职责：实现 UX 选项 A 逻辑，公域严格屏蔽 hide_in_main = 1 的子游戏资源
   */
  static getDiscoveryList(tabId: string): any[] {
    try {
      let sql = `SELECT * FROM titan_resources WHERE status = 'active' AND (hide_in_main IS NULL OR hide_in_main = 0)`
      const params: any[] = []

      if (tabId === 'titan_protocol') {
        sql += ` AND type = 'titan_protocol'`
      } else if (tabId !== 'all' && tabId !== 'nexus_gate') {
        sql += ` AND type = ?`
        params.push(tabId)
      }
      
      sql += ` ORDER BY updated_at DESC LIMIT 300`
      return Db.query(sql, params)
    } catch (e) {
      console.error('[ResourceService] getDiscoveryList Error:', e)
      return []
    }
  }

  /**
   * 精准捞出合集子游戏
   * 【Fix】从反向 LIKE 查询改为正向 IN 查询，适配旧项目数据格式
   * 逻辑：先读合集自身的 meta_json，提取 collection_ids 数组，再用 IN 精准捞出子资源
   * 特性：天然支持同一个子资源被多个合集包含；保持 collection_ids 声明的顺序
   */
  static getCollectionChildren(collectionId: string): any[] {
    try {
      if (!collectionId) return []

      // 步骤1：读取合集自身的 meta_json，提取 collection_ids 数组
      const collectionRows = Db.query<any>(
        `SELECT meta_json FROM titan_resources WHERE id = ? AND type = 'collection' AND status = 'active'`,
        [collectionId]
      )
      if (!collectionRows || collectionRows.length === 0) return []

      let meta: any = {}
      try {
        meta = JSON.parse(collectionRows[0].meta_json || '{}')
      } catch {
        return []
      }

      const childIds: string[] = meta.collection_ids || []
      if (!Array.isArray(childIds) || childIds.length === 0) return []

      // 步骤2：用 IN 查询精准捞出子资源（无视 hide_in_main，但过滤已删除资源）
      const placeholders = childIds.map(() => '?').join(',')
      const sql = `SELECT * FROM titan_resources WHERE id IN (${placeholders}) AND status = 'active'`
      const rows = Db.query<any>(sql, childIds)

      // 步骤3：按 collection_ids 声明的顺序重新排序返回
      const rowMap = new Map<string, any>()
      for (const row of rows) {
        rowMap.set(row.id, row)
      }

      const ordered: any[] = []
      for (const id of childIds) {
        const row = rowMap.get(id)
        if (row) ordered.push(row)
      }

      return ordered
    } catch (e) {
      console.error('[ResourceService] getCollectionChildren Error:', e)
      return []
    }
  }
}