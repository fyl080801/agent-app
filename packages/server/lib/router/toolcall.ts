import { setup } from '../utils/core'
import { sse } from '../utils/http'
import { getModelProvider } from '../service/profile'
import { experimental_createMCPClient, stepCountIs, streamText, tool } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createOpenAI } from '@ai-sdk/openai'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import z from 'zod'
import { random } from 'lodash-es'
import z4 from 'zod/v4'
import {
  DEFAULT_TOOL_PROMPT,
  DEFAULT_TOOL_USE_EXAMPLES,
  parsePromptTemplate,
} from '../prompt'

setup(app => {
  app.post('/api/chat/aitoolcall', sse(), async (req, res) => {
    const { messages, model, temperature = 0.7 } = req.body

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
    // const openai = createOpenAI({
    //   baseURL: provider.baseURL,
    //   apiKey: provider.apiKey,
    //   name: provider.name,
    // })
    // 模型能力影响是否可以toolcall
    const httpTransport = new StreamableHTTPClientTransport(
      new URL('http://127.0.0.1:8000/mcp'),
    )
    const client = await experimental_createMCPClient({
      transport: httpTransport,
    })

    try {
      const tools = await client.tools()

      const results = []
      const reasoning = []
      const chatModel = openai(model || provider.defaultModel)
      const prompt = parsePromptTemplate(DEFAULT_TOOL_PROMPT, {
        TOOL_USE_EXAMPLES: DEFAULT_TOOL_USE_EXAMPLES,
        AVAILABLE_TOOLS: `<tools> 
          ${Object.entries(tools).map(([key, values]) => `<tool> 
            <name>${key}</name> 
            <description>${values.description}</description> <arguments>${JSON.stringify(values.inputSchema)}</arguments> 
          </tool>`)} 
        </tools>`,
        USER_SYSTEM_PROMPT: '',
      })
      const result = streamText({
        model: chatModel,
        system: prompt,
        temperature,
        messages: [
          // {
          //   role: 'system',
          //   content: `

          //         `,
          // },
          ...messages,
        ],
        toolChoice: 'required',
        tools,
        // tools: {
        //   random: tool({
        //     description: '生成随机数',
        //     inputSchema: z4.object({
        //       a: z4.string(),
        //     }),
        //     execute({}) {
        //       return random(false)
        //     },
        //   }),
        // },
      })

      for await (const chunk of result.toUIMessageStream({})) {
        console.log(chunk)
        if (chunk.type === 'reasoning-delta') {
          reasoning.push((chunk as any).delta)
        }
        if (chunk.type === 'text-delta') {
          results.push((chunk as any).delta)
        }
        res.write(JSON.stringify(chunk) + '\n\n')
      }

      // console.log(await result.toolCalls)
      console.log(reasoning.join(''))
      console.log(results.join(''))

      res.end()
    } finally {
      client.close()
    }
  })
})
