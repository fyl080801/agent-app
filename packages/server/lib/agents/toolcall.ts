import { convertToModelMessages, stepCountIs, streamText, ToolSet } from 'ai'
import { pick } from 'lodash-es'

/**
 * Configuration for the ToolCallAgent.
 */
export interface ToolCallAgentConfig {
  model: any // TODO: Replace with proper model type from 'ai' library
  temperature: number
  tools: ToolSet
  onChunk: (chunk: any) => void // TODO: Define chunk type
}

/**
 * Represents a chunk from the AI stream.
 */
interface StreamChunk {
  type: string
  input?: any
  output?: any
  toolCallId?: string
  toolName?: string
  preliminary?: boolean
  providerExecuted?: boolean
}

/**
 * Agent responsible for handling tool calls in AI conversations.
 * Streams responses, executes tools, and manages conversation state.
 */
export class ToolCallAgent {
  private config: ToolCallAgentConfig
  private innerMessages: any[] = []

  constructor(config: ToolCallAgentConfig) {
    this.config = config
  }

  /**
   * Executes the tool call agent with the given messages.
   * @param messages - The initial messages to start the conversation.
   * @returns A promise that resolves with the final response.
   */
  async execute(messages: any[]): Promise<any> {
    const { resolve, reject, promise } = Promise.withResolvers()

    this.innerMessages = [...messages]

    // Use a loop instead of recursion to prevent stack overflow
    let continueStreaming = true
    let iterationCount = 0
    const maxIterations = 10 // Prevent infinite loops

    while (continueStreaming && iterationCount < maxIterations) {
      iterationCount++
      continueStreaming = false

      const { response } = streamText({
        model: this.config.model,
        temperature: this.config.temperature,
        messages: this.innerMessages,
        tools: this.config.tools,
        stopWhen: [stepCountIs(1)],
        onChunk: event => {
          console.log('Chunk received:', event.chunk)
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
          console.error('Streaming error:', event.error)
          reject(event.error as Error)
        },
        onFinish: event => {
          if (event.finishReason === 'error') {
            console.error('Finish reason: error')
            return
          }

          if (event.finishReason !== 'stop') {
            // Continue streaming if not stopped
            continueStreaming = true
            return
          }

          // Check for tool calls in the response text (placeholder for future implementation)
          // TODO: Implement logic to parse tool calls from response text

          resolve(event.response)
        },
      })

      // Wait for the response to complete before potentially continuing
      await response
    }

    if (iterationCount >= maxIterations) {
      reject(new Error('Maximum streaming iterations reached'))
    }

    return promise
  }
}
