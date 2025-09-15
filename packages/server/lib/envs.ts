import { DatabaseProvider } from "@keystone-6/core/types"

const env = process.env

export const SERVER_PORT = +(env.SERVER_PORT ?? 3000)
export const MCP_PORT = +(env.MCP_PORT ?? 3001)

export const DATABASE_PROVIDER: DatabaseProvider =
  (env.DATABASE_PROVIDER as DatabaseProvider) ?? "sqlite"
export const DATABASE_URL = env.DATABASE_URL ?? "file:./keystone.db"
export const SESSION_SECRET = env.SESSION_SECRET
//
export const OPENAI_API_KEY = env.OPENAI_API_KEY ?? ""

export const COMFYUI_HOST = process.env.COMFYUI_HOST || "192.168.68.105:8188"

// mcp
export const MCP_SERVER_HOST =
  process.env.MCP_SERVER_HOST || "https://mcp.fyl080801.uk"

// s3
export const S3_ENDPOINT = process.env.S3_ENDPOINT || ""
export const S3_REGION = process.env.S3_REGION || "cn-north-1"
export const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || ""
export const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || ""
export const S3_BUCKET = process.env.S3_BUCKET || "comfyui-output"
export const S3_ENABLE_PATH_STYLE = process.env.S3_ENABLE_PATH_STYLE || "1"
export const S3_PUBLIC_DOMAIN = process.env.S3_PUBLIC_DOMAIN || ""
