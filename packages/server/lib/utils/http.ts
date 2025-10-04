import { NextFunction, Request, Response } from 'express'

export function setupSSE(req: Request, res: Response) {
  // if (!req.accepts('text/event-stream')) return

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  })

  // Send a keep-alive comment every 30 seconds
  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n')
  }, 30000)

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(keepAlive)
  })

  // Cleanup on response error
  res.on('error', () => {
    clearInterval(keepAlive)
  })

  return keepAlive
}

export const sse =
  () => async (req: Request, res: Response, next: NextFunction) => {
    const keepAlive = setupSSE(req, res)

    await Promise.resolve(next())

    res.on('finish', () => {
      clearInterval(keepAlive)
    })
  }
