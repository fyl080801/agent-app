// import { createProxyMiddleware } from "http-proxy-middleware"
import { useApp } from '../app'
import { startFastMcp } from '../mcp'
// import { MCP_PORT } from "../envs"

useApp((app, context) => {
  // app.all(
  //   "/mcp",
  //   createProxyMiddleware({
  //     target: `http://localhost:${MCP_PORT}/mcp`, // 转发到内部mcp
  //     ws: true,
  //     changeOrigin: true,
  //     ignorePath: true
  //   })
  // )

  app.put('/api/mcp/restart', async (req, res) => {
    await startFastMcp(context)
    res.send({})
  })
})
