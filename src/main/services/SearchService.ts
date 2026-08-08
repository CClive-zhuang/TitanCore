// 文件名: src/main/services/SearchService.ts
import { Db } from '../db'
import { SecurityService } from './SecurityService'
import { titanFetch } from '../TitanNet'

export class SearchService {
  static async globalSearch(keyword: string): Promise<{ success: boolean; data?: any[]; quota?: any; error?: string; msg?: string }> {
    if (!keyword) return { success: false, error: 'KEYWORD_EMPTY' }
    
    const rawKeyword = keyword.trim()
    let cleanText = rawKeyword.trim()

    if (cleanText.length === 0) {
    return { success: false, error: 'KEYWORD_INVALID', msg: '搜索关键字无效' }
    }

    let gatewayResults: any[] = []
    let quotaInfo: any = null
    let gatewayError = ''
    let backendMsg = ''

    const serverUrl = Db.get<any>('app_seed_config')?.serverUrl || Db.get<any>('app_settings')?.serverUrl || ''
    const tokenObj = Db.getEncrypted<any>('auth_ticket')
    const token = tokenObj?.token || ''

    if (serverUrl && token) {
      try {
        const res = await titanFetch(`${serverUrl}/titan/titan_gateway.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Titan-Token': token },
          body: JSON.stringify({ action: 'search', keyword: cleanText })
        })

        if (res.status === 429) {
          gatewayError = 'QUOTA_EXHAUSTED'
        } else if (!res.ok) {
          gatewayError = `GATEWAY_REJECTED_${res.status}`
        } else {
          const json = await res.json()
          if (json.code && json.code !== 200 && json.code !== 0) {
            gatewayError = json.msg || 'RESOURCE_NOT_FOUND'
            backendMsg = json.msg || ''
          } else {
            const hexPayload = typeof json.data === 'object' ? json.data?.data : json.data
            let decrypted = SecurityService.decryptNetworkPayload<any>(hexPayload)
            if (typeof decrypted === 'string') {
              try { decrypted = JSON.parse(decrypted) } catch (e) {}
            }
            if (decrypted) {
              const actualData = decrypted.data || decrypted
              gatewayResults = actualData.results || []
              quotaInfo = actualData.quota_info || null
            }
          }
        }
      } catch (e: any) {
        gatewayError = 'NETWORK_ERROR'
        backendMsg = e.message || '网络请求异常'
      }
    } else {
      gatewayError = 'NETWORK_ERROR'
      backendMsg = '未配置网关节点或未登录'
    }

    if (['QUOTA_EXHAUSTED', 'UNAUTHORIZED', 'NETWORK_ERROR'].includes(gatewayError)) {
      return { success: false, error: gatewayError, msg: backendMsg }
    }

    let localResults: any[] = []
    try {
      let tokens: string[] = []
      if (cleanText.length > 3 && !/^\d+$/.test(cleanText)) {
         tokens.push(cleanText.substring(0, 3))
         tokens.push(cleanText.substring(3))
      } else {
         tokens.push(cleanText)
      }

      let sql = `SELECT * FROM titan_resources WHERE status = 'active' AND type IN ('game', 'titan_protocol', 'tool', 'patch', 'collection', 'wallpaper')`
      let params: any[] = []
      let orConditions: string[] = []

      if (tokens.length > 0) {
          const titleSql = tokens.map(() => `title LIKE ?`).join(' AND ')
          orConditions.push(`(${titleSql})`)
          tokens.forEach(t => params.push(`%${Db.escapeLikeString(t)}%`))
      }

      const resolvedAppId = gatewayResults.length > 0 ? String(gatewayResults[0].app_id) : ''
      if (resolvedAppId) {
          orConditions.push(`tags LIKE ?`)
          params.push(`%${Db.escapeLikeString(resolvedAppId)}%`)
          orConditions.push(`id LIKE ?`)
          params.push(`%${Db.escapeLikeString(resolvedAppId)}%`)
      }

      if (orConditions.length > 0) {
          sql += ` AND (${orConditions.join(' OR ')})`
          localResults = Db.query(sql, params)
      }
    } catch (e) { }

    let aggregated: any[] = []
    
    for (const gRes of gatewayResults) {
      aggregated.push({
          id: 'steam_gate_' + String(gRes.app_id),
          app_id: String(gRes.app_id),
          title: gRes.name,
          type: 'titan_protocol',
          cover: gRes.cover_url,  // ← 修复：GRes → gRes
          tags: `GATEWAY,${gRes.source}`,
          _isCloud: true,
          rating: gRes.rating || 9.9
      })
    }
    
    for (const local of localResults) {
      // 修复：去重只认 ID，不再用标题比较。同一款游戏的不同类型资源标题相同是正常情况。
      const isDuplicate = aggregated.some(a => String(a.id) === String(local.id))
      if (!isDuplicate) aggregated.push(local)
    }

    let currentIntent = 'game'
    const intentDict = Db.get<any>('search_intent_dict') || {}
    if (intentDict.patch && intentDict.patch.some((w: string) => rawKeyword.includes(w))) currentIntent = 'patch'
    if (intentDict.tool && intentDict.tool.some((w: string) => rawKeyword.includes(w))) currentIntent = 'tool'

    aggregated.sort((a, b) => {
      const weight: Record<string, number> = { 'titan_protocol': 4, 'game': 3, 'collection': 3, 'patch': 2, 'tool': 1, 'wallpaper': 1 }
      if (currentIntent === 'patch') { weight['patch'] = 10; weight['tool'] = 9 }
      if (currentIntent === 'tool') { weight['tool'] = 10; weight['patch'] = 9 }
      return (weight[b.type] || 0) - (weight[a.type] || 0)
    })

    if (aggregated.length === 0) return { success: false, error: gatewayError || 'RESOURCE_NOT_FOUND', msg: backendMsg }
    return { success: true, data: aggregated, quota: quotaInfo }
  }
}