import * as path from 'path'
import * as fs from 'fs'
import { app } from 'electron'
import { config as loadDotenv } from 'dotenv'

// ═══ .env loading ═══
export function loadEnv() {
  const candidates = [
    path.join(app.getAppPath(), '.env'),
    path.join(app.getPath('userData'), '.env'),
    path.join(process.cwd(), '.env'),
  ]
  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      try {
        loadDotenv({ path: envPath })
        if (process.env.NODE_ENV === 'development') {
          console.log(`[config] .env loaded from: ${envPath}`)
        }
        return
      } catch (err: any) {
        console.warn(`[config] Failed to load .env from ${envPath}:`, err.message)
      }
    }
  }
  console.warn('[config] No .env file found. AI features will not work until DEEPSEEK_API_KEY is set.')
}

// ═══ App Config ═══
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json')

interface AppConfig {
  storageRoot?: string  // custom storage root, default is ~/Documents/DeclarAI
}

let config: AppConfig = {}

export function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
    }
  } catch (err: any) {
    console.warn('[config] Failed to load config:', err.message)
    config = {}
  }
  return config
}

export function saveConfig(updates: Partial<AppConfig>): AppConfig {
  config = { ...config, ...updates }
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
  } catch (err: any) {
    console.error('[config] Failed to save config:', err.message)
  }
  return config
}

export function getConfig(): AppConfig {
  return config
}

export function getStorageRoot(): string {
  return config.storageRoot || path.join(app.getPath('documents'), 'DeclarAI')
}
