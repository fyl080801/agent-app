import { setup } from '../utils/core'
import { sse } from '../utils/http'
import { getModelProvider } from '../service/profile'
import OpenAI from 'openai'
import { OpenAIService } from '../agents'
import { ChatCompletionMessageParam } from 'openai/resources'
import { getMcpTool, getMcpToolObject, mcpcall } from '../utils/mcp'
import {
  convertToModelMessages,
  experimental_createMCPClient,
  generateText,
  streamText,
} from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

setup(app => {
  // app.post('/api/chat/toolcall', sse(), async (req, res) => {
  //   const { messages, model, temperature } = req.body

  //   if (!messages || !Array.isArray(messages)) {
  //     return res.status(400).json({ error: 'Messages array is required' })
  //   }

  //   const provider = await getModelProvider()

  //   const tools = await getMcpTool()

  //   const openAIService = new OpenAIService(
  //     new OpenAI({
  //       baseURL: provider.baseURL,
  //       apiKey: provider.apiKey,
  //     }),
  //   )

  //   // Execute tool call
  //   const response = await openAIService.streamChatCompletion({
  //     messages: messages as ChatCompletionMessageParam[],

  //     model: model || provider.defaultModel,
  //     temperature,
  //   })

  //   // Send the response
  //   res.write(JSON.stringify(response))
  //   res.end()
  // })

  app.post('/api/chat/aitoolcall', sse(), async (req, res) => {
    const { messages, model, temperature } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' })
    }

    const provider = await getModelProvider()
    const openai = createOpenAICompatible({
      baseURL: provider.baseURL,
      apiKey: provider.apiKey,
      name: provider.name,
      supportsStructuredOutputs: true,
    })
  
    // 模型能力影响是否可以toolcall
    const httpTransport = new StreamableHTTPClientTransport(
      new URL('http://127.0.0.1:8000/mcp'),
    )
    const client = await experimental_createMCPClient({
      transport: httpTransport,
    })
    const tools = await client.tools()

    const result = streamText({
      model: openai(model || provider.defaultModel),
      // prompt: {},
      messages,
      tools,
      toolChoice: 'auto',
    })

    for await (const chunk of result.fullStream) {
      console.log(chunk)
      res.write(JSON.stringify(chunk) + '\n\n')
    }

    res.end()
  })

  app.get('/api/mcp/gettools', sse(), async (req, res) => {
    await mcpcall()
    res.status(200)
  })
})
