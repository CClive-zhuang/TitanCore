// 文件名: src/main/TitanNet.ts
export const titanFetch = async (url: string, options: RequestInit & { timeout?: number } = {}) => {
  const { timeout = 8000, ...restOptions } = options
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, {
      ...restOptions,
      signal: controller.signal,
      headers: { 
        ...restOptions.headers, 
        'User-Agent': 'TitanCore/15.0'
      }
    })
    return res
  } finally {
    clearTimeout(timeoutId)
  }
}