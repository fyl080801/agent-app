import OpenAI from 'openai'
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources'
import {
  EventSchemas,
  EventType,
  RunStartedEvent,
  TextMessageStartEvent,
  RunFinishedEvent,
  TextMessageContentEvent,
} from '@ag-ui/core'
import { EventEncoder } from '@ag-ui/encoder'
import { OPENAI_API_KEY } from '../envs'

// Initialize OpenAI client
// const openai = new OpenAI({
//   baseURL: 'http://127.0.0.1:1234/v1',
//   apiKey: OPENAI_API_KEY, // Make sure to set your API key in environment variables
// })

/**
 * OpenAI Service for making API requests
 */
class OpenAIService {
  private client: OpenAI

  constructor(client: OpenAI) {
    this.client = client
  }

  /**
   * Send a chat completion request to OpenAI
   * @param messages - Array of messages for the conversation
   * @param model - The model to use (default: gpt-4-turbo)
   * @param temperature - Sampling temperature (default: 0.7)
   * @returns Promise resolving to the AI response
   */
  async chatCompletion(
    messages: ChatCompletionMessageParam[],
    model: string = 'gpt-4-turbo',
    temperature: number = 0.7,
  ): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: 1000,
      })

      // Debug log to see the actual response structure
      console.log('API Response:', JSON.stringify(response, null, 2))

      const content = response.choices?.[0]?.message?.content
      if (!content) {
        throw new Error('No content received from OpenAI API')
      }

      return content
    } catch (error) {
      console.error('OpenAI API Error:', error)
      throw new Error(
        `Failed to get response from OpenAI: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    }
  }

  /**
   * Generate text using OpenAI completions API
   * @param prompt - The prompt to generate text from
   * @param model - The model to use (default: gpt-4-turbo)
   * @param maxTokens - Maximum number of tokens to generate (default: 1000)
   * @returns Promise resolving to the generated text
   */
  async generateText(
    prompt: string,
    model: string = 'gpt-4-turbo',
    maxTokens: number = 1000,
  ): Promise<string> {
    try {
      const response = await this.client.completions.create({
        model,
        prompt,
        max_tokens: maxTokens,
        temperature: 0.7,
      })

      const text = response.choices[0]?.text
      if (!text) {
        throw new Error('No text received from OpenAI API')
      }

      return text
    } catch (error) {
      console.error('OpenAI API Error:', error)
      throw new Error(
        `Failed to generate text from OpenAI: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    }
  }

  /**
   * Generate a random message ID
   * @returns A random message ID string
   */
  private generateRandomMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Stream chat completion response from OpenAI
   * @param messages - Array of messages for the conversation
   * @param model - The model to use (default: gpt-4-turbo)
   * @param temperature - Sampling temperature (default: 0.7)
   * @param onChunk - Callback function to handle each chunk of the response
   * @returns Promise resolving to the complete response content
   */
  async streamChatCompletion(params: {
    messages: ChatCompletionMessageParam[]
    model: string
    temperature?: number
    tools?: Array<ChatCompletionTool>
    onChunk?: (chunk: string) => void
  }): Promise<string> {
    try {
      const { messages, model, temperature = 0.7, tools = [], onChunk } = params

      const stream = await this.client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: 1000,
        stream: true,
        tools,
        tool_choice: 'auto',
      })

      let fullContent = ''
      const messageId = this.generateRandomMessageId()

      // must be from request
      const threadId = this.generateRandomMessageId()
      const runId = this.generateRandomMessageId()

      const encoder = new EventEncoder({})

      const onSubscribe = onChunk || ((chunk: string) => {})

      onSubscribe(
        encoder.encode(
          EventSchemas.parse({
            type: EventType.RUN_STARTED,
            threadId,
            runId,
          } as RunStartedEvent),
        ),
      )

      onSubscribe(
        encoder.encode(
          EventSchemas.parse({
            type: EventType.TEXT_MESSAGE_START,
            messageId: messageId,
            role: 'assistant',
          } as TextMessageStartEvent),
        ),
      )

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        fullContent += content

        // Call the onChunk callback if provided
        content &&
          onSubscribe(
            encoder.encode(
              EventSchemas.parse({
                type: EventType.TEXT_MESSAGE_CONTENT,
                messageId: messageId,
                delta: content,
              } as TextMessageContentEvent),
            ),
          )
      }

      onSubscribe(
        encoder.encode(
          EventSchemas.parse({
            type: EventType.TEXT_MESSAGE_END,
            messageId: messageId,
          }),
        ),
      )

      onSubscribe(
        encoder.encode(
          EventSchemas.parse({
            type: EventType.RUN_FINISHED,
            threadId,
            runId,
          } as RunFinishedEvent),
        ),
      )

      return fullContent
    } catch (error) {
      console.error('OpenAI Streaming API Error:', error)
      throw new Error(
        `Failed to stream response from OpenAI: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    }
  }

  /**
   * Stream text generation response from OpenAI
   * @param prompt - The prompt to generate text from
   * @param model - The model to use (default: gpt-4-turbo)
   * @param maxTokens - Maximum number of tokens to generate (default: 1000)
   * @param onChunk - Callback function to handle each chunk of the response
   * @returns Promise resolving to the complete generated text
   */
  async streamTextGeneration(
    prompt: string,
    model: string = 'gpt-4-turbo',
    maxTokens: number = 1000,
    onChunk?: (chunk: string) => void,
  ): Promise<string> {
    try {
      const stream = await this.client.completions.create({
        model,
        prompt,
        max_tokens: maxTokens,
        temperature: 0.7,
        stream: true,
      })

      let fullText = ''

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.text || ''
        fullText += text

        // Call the onChunk callback if provided
        if (onChunk) {
          onChunk(text)
        }
      }

      return fullText
    } catch (error) {
      console.error('OpenAI Streaming API Error:', error)
      throw new Error(
        `Failed to stream text generation from OpenAI: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    }
  }

  /**
   * Execute a tool call with OpenAI
   * @param messages - Array of messages for the conversation
   * @param tools - Array of tools available for the model to call
   * @param model - The model to use (default: gpt-4-turbo)
   * @param temperature - Sampling temperature (default: 0.7)
   * @returns Promise resolving to the AI response with tool calls
   */
  async toolCall(
    messages: ChatCompletionMessageParam[],
    tools: OpenAI.Chat.Completions.ChatCompletionTool[],
    model: string = 'gpt-4-turbo',
    temperature: number = 0.7,
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    try {
      const response = await this.client.chat.completions.create({
        model,
        messages,
        temperature,
        tools,
        tool_choice: 'auto', // Let the model decide which tool to use
      })

      return response
    } catch (error) {
      console.error('OpenAI Tool Call Error:', error)
      throw new Error(
        `Failed to execute tool call with OpenAI: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    }
  }

  /**
   * Stream a tool call response from OpenAI
   * @param messages - Array of messages for the conversation
   * @param tools - Array of tools available for the model to call
   * @param model - The model to use (default: gpt-4-turbo)
   * @param temperature - Sampling temperature (default: 0.7)
   * @param onChunk - Callback function to handle each chunk of the response
   * @returns Promise resolving to the complete response content
   */
  async streamToolCall(
    messages: ChatCompletionMessageParam[],
    tools: OpenAI.Chat.Completions.ChatCompletionTool[],
    model: string = 'gpt-4-turbo',
    temperature: number = 0.7,
    onChunk?: (chunk: string) => void,
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages,
        temperature,
        tools,
        tool_choice: 'auto', // Let the model decide which tool to use
        stream: true,
      })

      let fullContent = ''
      const messageId = this.generateRandomMessageId()

      // must be from request
      const threadId = this.generateRandomMessageId()
      const runId = this.generateRandomMessageId()

      const encoder = new EventEncoder({})

      const onSubscribe = onChunk || ((chunk: string) => {})

      onSubscribe(
        encoder.encode(
          EventSchemas.parse({
            type: EventType.RUN_STARTED,
            threadId,
            runId,
          } as RunStartedEvent),
        ),
      )

      onSubscribe(
        encoder.encode(
          EventSchemas.parse({
            type: EventType.TEXT_MESSAGE_START,
            messageId: messageId,
            role: 'assistant',
          } as TextMessageStartEvent),
        ),
      )

      // We'll collect the full response to return it
      let fullResponse: OpenAI.Chat.Completions.ChatCompletion | null = null

      for await (const chunk of stream) {
        // If this is a streaming chunk, collect content
        if ('choices' in chunk) {
          const content = chunk.choices[0]?.delta?.content || ''
          fullContent += content

          // Call the onChunk callback if provided
          content &&
            onSubscribe(
              encoder.encode(
                EventSchemas.parse({
                  type: EventType.TEXT_MESSAGE_CONTENT,
                  messageId: messageId,
                  delta: content,
                } as TextMessageContentEvent),
              ),
            )

          // Store the last chunk to build our final response
          if (!fullResponse) {
            fullResponse = {
              id: chunk.id,
              choices: [],
              created: chunk.created,
              model: chunk.model,
              object: 'chat.completion',
            } as OpenAI.Chat.Completions.ChatCompletion
          }

          // Merge choices
          chunk.choices.forEach((choice, index) => {
            if (!fullResponse!.choices[index]) {
              fullResponse!.choices[index] = {
                index: choice.index,
                message: {
                  role: 'assistant',
                  content: '',
                },
              } as OpenAI.Chat.Completions.ChatCompletion.Choice
            }
            if (choice.delta?.content) {
              fullResponse!.choices[index].message.content =
                (fullResponse!.choices[index].message.content || '') +
                choice.delta.content
            }
          })
        }
      }

      onSubscribe(
        encoder.encode(
          EventSchemas.parse({
            type: EventType.TEXT_MESSAGE_END,
            messageId: messageId,
          }),
        ),
      )

      onSubscribe(
        encoder.encode(
          EventSchemas.parse({
            type: EventType.RUN_FINISHED,
            threadId,
            runId,
          } as RunFinishedEvent),
        ),
      )

      // Return the complete response
      return fullResponse || ({} as OpenAI.Chat.Completions.ChatCompletion)
    } catch (error) {
      console.error('OpenAI Streaming Tool Call Error:', error)
      throw new Error(
        `Failed to stream tool call response from OpenAI: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    }
  }
}

// Export the service
export default OpenAIService

export { OpenAIService }
