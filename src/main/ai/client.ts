import OpenAI from 'openai'

let client: OpenAI | null = null

export function getAIClient(): OpenAI {
  if (client) return client

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not configured. Please set it in .env file.')
  }

  client = new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  })

  return client
}

export function getModel(): string {
  return process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro'
}
