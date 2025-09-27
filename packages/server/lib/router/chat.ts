import { ChatCompletionMessageParam } from 'openai/resources'
import { OpenAIService } from '../agents'
import OpenAI from 'openai/index.js'
import { getModelProvider } from '../service/profile'
import { setup } from '../utils/core'
import { setupSSE } from '../utils/http'

setup(app => {
  // SSE streaming chat completion endpoint
  app.post('/api/chat/stream', async (req, res) => {
    const { messages, model, temperature, state } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' })
    }

    // Setup SSE
    const keepAlive = setupSSE(req, res)

    const provider = await getModelProvider()

    // const llm = openai({
    //   baseURL: provider.baseURL,
    //   apiKey: provider.apiKey,
    //   model: model || state.model || provider.defaultModel,
    //   temperature: temperature || state.temperature,
    // })

    const openAIService = new OpenAIService(
      new OpenAI({
        baseURL: provider.baseURL,
        apiKey: provider.apiKey,
      }),
    )

    // Stream the response
    await openAIService.streamChatCompletion({
      messages: messages as ChatCompletionMessageParam[],
      model: model || state?.model || provider.defaultModel,
      temperature: temperature || state?.temperature,
      onChunk: chunk => {
        res.write(chunk)
      },
    })

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
  })
})
