import express from 'express'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { experimental_createMCPClient } from 'ai'

export const getMcpClient = async (
  req: express.Request,
  res: express.Response,
) => {
  // 模型能力影响是否可以toolcall
  const httpTransport = new StreamableHTTPClientTransport(
    new URL('http://127.0.0.1:8000/mcp'),
  )
  const client = await experimental_createMCPClient({
    transport: httpTransport,
  })

  res.on('close', () => {
    client.close()
  })

  return client
}

export const getMcpTools = async (
  req: express.Request,
  res: express.Response,
) => {
  const client = await getMcpClient(req, res)

  return await client.tools()
}
