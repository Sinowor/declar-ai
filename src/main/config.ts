import * as path from 'path'
import { app } from 'electron'
import { readFileSync, existsSync } from 'fs'
import { config as loadDotenv } from 'dotenv'

export function loadEnv() {
  // Try multiple locations: app root, userData, cwd
  const candidates = [
    path.join(app.getAppPath(), '.env'),
    path.join(app.getPath('userData'), '.env'),
    path.join(process.cwd(), '.env'),
  ]

  for (const envPath of candidates) {
    if (existsSync(envPath)) {
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
