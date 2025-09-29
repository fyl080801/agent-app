import { setup } from '../utils/core'
import { sse } from '../utils/http'
import { getModelProvider } from '../service/profile'
import { convertToModelMessages, stepCountIs, streamText } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { parseToolCallAgentTemplate } from '../prompt'
import { getMcpTools } from '../mcp/http'

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

    // 模型能力影响是否可以toolcall
    const tools = await getMcpTools(req, res)

    const executeAgent = async (messages: any[]) => {
      const { resolve, reject, promise } = Promise.withResolvers()

      const innerMessages = [...messages]

      const streamChat = (params: any = {}) => {
        const { response } = streamText({
          model: openai(model || provider.defaultModel),
          system: parseToolCallAgentTemplate({ tools }),
          temperature,
          messages: innerMessages,
          tools,
          ...params,
          stopWhen: [
            stepCountIs(1),
            // ({ steps }) => {
            //   const lastStep = steps[steps?.length - 1]

            //   return !lastStep.toolResults.length
            // },
          ],
          onChunk: event => {
            console.log(event.chunk)

            res.write('data: ' + JSON.stringify(event.chunk) + '\n\n')

            if (event.chunk.type === 'tool-result') {
              const {
                input,
                output,
                toolCallId,
                type,
                preliminary,
                providerExecuted,
              } = event.chunk

              innerMessages.push(
                ...convertToModelMessages([
                  {
                    role: 'assistant',
                    parts: [
                      {
                        input,
                        output,
                        toolCallId,
                        type,
                        preliminary,
                        providerExecuted,
                        state: 'output-available',
                      },
                    ],
                  },
                ]),
              )
            }
          },
          onError: event => {
            reject(event.error)
          },
          onFinish: event => {
            if (event.finishReason === 'error') return

            if (event.finishReason !== 'stop') {
              // 再判断一下文本里有没有prompt定义的toolcall，如果如有就调toolcall并推送一下

              streamChat()
              return
            }

            resolve(event.response)
          },
        })

        response.then(() => {})
      }

      streamChat()

      return promise
    }

    await executeAgent(messages)

    res.end()
  })
})
