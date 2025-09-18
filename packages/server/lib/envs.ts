import { DatabaseProvider } from '@keystone-6/core/types'

const env = process.env

export const SERVER_PORT = +(env.SERVER_PORT ?? 3000)
export const MCP_PORT = +(env.MCP_PORT ?? 9000)
export const MCP_HOST = env.MCP_HOST ?? '0.0.0.0'

export const DATABASE_PROVIDER: DatabaseProvider =
  (env.DATABASE_PROVIDER as DatabaseProvider) ?? 'postgresql'
export const DATABASE_URL = env.DATABASE_URL ?? 'file:./keystone.db'
export const SESSION_SECRET = env.SESSION_SECRET
//
export const OPENAI_API_KEY = env.OPENAI_API_KEY ?? ''

export const COMFYUI_HOST = env.COMFYUI_HOST || '192.168.68.105:8188'
export const COMFYUI_HTTP_PROTOCOL = env.COMFYUI_HTTP_PROTOCOL || 'http'
export const COMFYUI_WS_PROTOCOL = env.COMFYUI_WS_PROTOCOL || 'ws'

// mcp
// export const MCP_SERVER_HOST = env.MCP_SERVER_HOST || "https://mcp.fyl080801.uk"

// s3
export const S3_ENABLE = env.S3_ENABLE === 'true'
export const S3_ENDPOINT = env.S3_ENDPOINT || ''
export const S3_REGION = env.S3_REGION || 'cn-north-1'
export const S3_ACCESS_KEY_ID = env.S3_ACCESS_KEY_ID || ''
export const S3_SECRET_ACCESS_KEY = env.S3_SECRET_ACCESS_KEY || ''
export const S3_BUCKET = env.S3_BUCKET || 'comfyui-output'
export const S3_ENABLE_PATH_STYLE = env.S3_ENABLE_PATH_STYLE || '1'
export const S3_PUBLIC_DOMAIN = env.S3_PUBLIC_DOMAIN || ''
