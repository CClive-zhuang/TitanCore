import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

export interface TitanSecrets {
  TITAN_SALT?: string
  DEFAULT_NODES?: Record<string, string>
  MANIFEST_NODES?: Record<string, string>
}

let cachedSecrets: TitanSecrets | null = null

export function loadSecrets(): TitanSecrets {
  if (cachedSecrets) return cachedSecrets

  const candidates = [
    path.join(path.dirname(app.getPath('exe')), 'config', 'secrets.json'),
    path.join(app.getPath('userData'), 'config', 'secrets.json'),
    path.join(process.cwd(), 'config', 'secrets.json'),
  ]

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        cachedSecrets = JSON.parse(fs.readFileSync(p, 'utf-8')) as TitanSecrets
        return cachedSecrets
      }
    } catch (e) {
      console.warn(`[Config] Failed to load secrets from ${p}:`, e)
    }
  }

  return {}
}

export function getSecret<K extends keyof TitanSecrets>(key: K): TitanSecrets[K] {
  return loadSecrets()[key]
}