// import { createProxyMiddleware } from "http-proxy-middleware"
import { startFastMcp } from '../mcp'
import { setup, useApp, useContext } from '../utils/core'
// import { MCP_PORT } from "../envs"

setup(() => {
  const app = useApp()
  const context = useContext()

  // app.all(
  //   "/mcp",
  //   createProxyMiddleware({
  //     target: `http://localhost:${MCP_PORT}/mcp`, // 转发到内部mcp
  //     ws: true,
  //     changeOrigin: true,
  //     ignorePath: true
  //   })
  // )

  app?.put('/api/mcp/restart', async (req, res) => {
    await startFastMcp(context)
    res.send({})
  })
})
