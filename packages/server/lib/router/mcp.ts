import { createProxyMiddleware } from "http-proxy-middleware"
import { useAppRouter } from "../app"
import { startFastMcp } from "../mcp"

useAppRouter((app, context) => {
  app.all(
    "/mcp",
    createProxyMiddleware({
      target: "http://localhost:3001/mcp", // 转发到内部mcp
      ws: true,
      changeOrigin: true,
      ignorePath: true
    })
  )

  app.put("/api/mcp/restart", async (req, res) => {
    await startFastMcp(context)
    res.send({})
  })
})
