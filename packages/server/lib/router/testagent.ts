import { getModelProvider } from '../service/profile'
import { setup } from '../utils/core'
import { sse } from '../utils/http'
// import { streamText, tool } from 'ai'
// import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
// import { OpenAI } from 'openai'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { MultiServerMCPClient } from '@langchain/mcp-adapters'
import { BaseCallbackHandler } from '@langchain/core/callbacks/base'
import { AgentAction, AgentFinish } from '@langchain/core/agents'
import { ChainValues } from '@langchain/core/utils/types'
import { Serialized } from '@langchain/core/load/serializable'
import { CallbackManager } from '@langchain/core/callbacks/manager'

// import { experimental_createMCPClient as createMCPClient } from 'ai'
// import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

setup(app => {
  app.post('/api/chat/toolagent', sse(), async (req, res) => {
    const { messages, model, temperature } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' })
    }

    const provider = await getModelProvider()
    console.log(provider.defaultModel)
    // const openai = createOpenAICompatible({
    //   baseURL: provider.baseURL,
    //   supportsStructuredOutputs: true,
    //   apiKey: provider.apiKey,
    //   name: 'gpustack',
    // })

    // const chatModel = openai(model || provider.defaultModel)

    // const url = new URL('http://127.0.0.1:8000/mcp')
    // const mcpClient = await createMCPClient({
    //   transport: new StreamableHTTPClientTransport(url),
    // })

    // const tools = await mcpClient.tools()

    // const systemPrompt = `你是一个非常有帮助的助手，使用工具辅助解决问题
    //     <tools>
    //   ${Object.entries(tools)
    //     .map(([key, value]) => {
    //       return JSON.stringify({ name: key, ...value })
    //     })
    //     .join('\n\n')}
    //     </tools>
    //     `
    // console.log(systemPrompt)
    // console.log(tools)
    // const { textStream, toolCalls, dynamicToolCalls } = streamText({
    //   model: chatModel,
    //   prompt: [
    //     {
    //       role: 'system',
    //       content: systemPrompt,
    //     },
    //     ...messages,
    //   ],
    //   temperature,
    //   tools,
    // })
    // console.log(await toolCalls)
    // console.log(await dynamicToolCalls)

    // for (const call of await toolCalls) {
    //   const re = tools[call.toolName].execute(call.input, {
    //     toolCallId: call.toolCallId,
    //     messages: [],
    //   })

    //   console.log(re)
    // }

    // for await (const chunk of textStream) {
    //   res.write(chunk)
    // }

    const client = new MultiServerMCPClient({
      comfyui: {
        url: 'http://127.0.0.1:8000/mcp',
        transport: 'http',
      },
    })

    const tools = await client.getTools()

    const agent = createReactAgent({
      llm: new ChatOpenAI({
        configuration: { baseURL: provider.baseURL, apiKey: provider.apiKey },
        model: model || provider.defaultModel,
        temperature,
        reasoning: { effort: 'high' },
        supportsStrictToolCalling: true,
        streaming: true,
      }),
      tools,
      prompt: '你是一个非常有帮助的助手，使用工具辅助解决问题',
    })

    agent.withListeners({
      onStart: () => {},
      onEnd: () => {},
    })

    // manager.addHandler({
    //   handleToolStart(
    //     tool,
    //     input,
    //     runId,
    //     parentRunId,
    //     tags,
    //     metadata,
    //     runName,
    //   ) {
    //     console.log('~~~~~~~', tool.name)

    //     console.log(runName)

    //     return Promise.resolve()
    //   },
    // })

    const response = await agent.invoke(
      {
        messages,
      },
      {
        streamMode: 'custom',
        // callbacks: manager,
        // callbacks: new Callback(),
      },
    )

    console.log(response)

    // for await (const chunk of stream) {
    //   res.write(JSON.stringify(chunk))
    // }

    res.end()
  })
})
