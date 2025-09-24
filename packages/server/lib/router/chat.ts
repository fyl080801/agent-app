import { Request, Response } from 'express'
import { ChatCompletionMessageParam } from 'openai/resources'
import { OpenAIService } from '../agents'
import OpenAI from 'openai/index.js'
import { getModelProvider } from '../service/profile'
import { setup } from '../utils/core'
import { openai } from '@llamaindex/openai'

setup(app => {
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

    // Cleanup on response error
    res.on('error', () => {
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

      const provider = await getModelProvider()

      const llm = openai({
        baseURL: provider.baseURL,
        apiKey: provider.apiKey,
        model: model || state.model || provider.defaultModel,
        temperature: temperature || state.temperature,
      })

      const openAIService = new OpenAIService(
        new OpenAI({
          baseURL: provider.baseURL,
          apiKey: provider.apiKey,
        }),
      )

      // Stream the response
      await openAIService.streamChatCompletion(
        messages as ChatCompletionMessageParam[],
        model || state.model || provider.defaultModel,
        temperature || state.temperature,
        chunk => {
          res.write(chunk)
        },
      )

      // const { stream } = await llm.exec({
      //   messages,
      //   stream: true,
      // })

      // for await (const chunk of stream) {
      //   res.write(JSON.stringify(chunk))
      // }

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
