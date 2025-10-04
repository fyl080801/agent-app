import { convertToModelMessages, stepCountIs, streamText, ToolSet } from 'ai'
import { pick } from 'lodash-es'
// import { parseToolCallAgentTemplate } from '../prompt'

export interface ToolCallAgentConfig {
  model: any
  temperature: number
  tools: ToolSet
  onChunk: (chunk: any) => void
}

export class ToolCallAgent {
  private config: ToolCallAgentConfig
  private innerMessages: any[] = []

  constructor(config: ToolCallAgentConfig) {
    this.config = config
  }

  async execute(messages: any[]): Promise<any> {
    const { resolve, reject, promise } = Promise.withResolvers()

    this.innerMessages = [...messages]

    const streamChat = (params: any = {}) => {
      const { response } = streamText({
        model: this.config.model,
        temperature: this.config.temperature,
        // system: parseToolCallAgentTemplate({ tools: this.config.tools }),
        messages: this.innerMessages,
        tools: this.config.tools,
        ...params,
        stopWhen: [stepCountIs(1)],
        onChunk: event => {
          console.log(event.chunk)
          this.config.onChunk(event.chunk)

          if (event.chunk.type === 'tool-result') {
            this.innerMessages.push(
              ...convertToModelMessages([
                {
                  role: 'assistant',
                  parts: [
                    {
                      ...pick(
                        event.chunk,
                        'input',
                        'output',
                        'toolCallId',
                        'toolName',
                        'type',
                        'preliminary',
                        'providerExecuted',
                      ),
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
            // 不stop就递归执行
            streamChat()
            return
          }

          // 再判断一下文本里有没有prompt定义的toolcall，如果如有就调toolcall并推送一下

          resolve(event.response)
        },
      })

      response.then(() => {
        // 可以在这里处理响应结果
      })
    }

    streamChat()

    return promise
  }
}
