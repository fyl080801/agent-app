import { ChatCompletionMessageParam } from 'openai/resources'
import { OpenAIService, ToolCallAgent } from '../agents'
import OpenAI from 'openai/index.js'
import { getModelProvider } from '../service/profile'
import { setup } from '../utils/core'
import { sse } from '../utils/http'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { getMcpTools } from '../mcp/http'
import { EventEncoder } from '@ag-ui/encoder'
import { EventSchemas, EventType, RunStartedEvent } from '@ag-ui/core'

setup(app => {
  app.post('/api/chat/stream', sse(), async (req, res) => {
    const { messages, model, temperature, state } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' })
    }

    const provider = await getModelProvider()

    const openAIService = new OpenAIService(
      new OpenAI({
        baseURL: provider.baseURL,
        apiKey: provider.apiKey,
      }),
    )

    await openAIService.streamChatCompletion({
      messages: messages as ChatCompletionMessageParam[],
      model: model || state?.model || provider.defaultModel,
      temperature: temperature || state?.temperature,
      onChunk: chunk => {
        res.write(chunk)
      },
    })

    res.end()
  })

  // app.post('/api/chat/completion', sse(), async (req, res) => {
  //   const { messages, model, temperature = 0.7 } = req.body

  //   if (!messages || !Array.isArray(messages)) {
  //     return res.status(400).json({ error: 'Messages array is required' })
  //   }

  //   const provider = await getModelProvider()

  //   const openaiCompatible = createOpenAICompatible({
  //     baseURL: provider.baseURL,
  //     apiKey: provider.apiKey,
  //     name: provider.name,
  //     supportsStructuredOutputs: true,
  //   })

  //   // 模型能力影响是否可以toolcall
  //   const tools = await getMcpTools(req, res)

  //   const agent = new ToolCallAgent({
  //     model: openaiCompatible(model || provider.defaultModel),
  //     temperature,
  //     tools,
  //     onChunk: chunk => {
  //       res.write('data: ' + JSON.stringify(chunk) + '\n\n')
  //     },
  //   })

  //   await agent.execute(messages)

  //   res.end()
  // })
})
