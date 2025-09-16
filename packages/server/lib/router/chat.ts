import { Request, Response } from 'express'
import { ChatCompletionMessageParam } from 'openai/resources'
import { useAppRouter } from '../app'
import { openAIService } from '../agents'

useAppRouter((app, context) => {
  // SSE helper function
  function setupSSE(req: Request, res: Response) {
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

    return keepAlive
  }

  // SSE streaming chat completion endpoint
  app.post('/api/chat/stream', async (req, res) => {
    try {
      const { messages, model, temperature, state } = req.body

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required' })
      }

      // Setup SSE
      const keepAlive = setupSSE(req, res)

      // Stream the response
      await openAIService.streamChatCompletion(
        messages as ChatCompletionMessageParam[],
        model || state.model,
        temperature || state.temperature,
        chunk => {
          res.write(chunk)
        },
      )

      // End the stream
      clearInterval(keepAlive)
      // res.write('event: end\ndata: {"message": "Stream completed"}\n\n')
      res.end()
    } catch (error) {
      console.error('Streaming error:', error)
      res.write(
        `event: error\ndata: ${JSON.stringify({
          error:
            error instanceof Error ? error.message : 'Internal server error',
        })}\n\n`,
      )
      res.end()
    }
  })
})
