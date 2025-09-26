import { getModelProvider } from '../service/profile'
import { setup } from '../utils/core'
import { sse } from '../utils/http'
import { OpenAI } from 'openai'
import { getFastMcp } from '../mcp/server'
import { ChatCompletionMessageParam } from 'openai/resources'
import { Client } from '@modelcontextprotocol/sdk/client'

interface ReactAgentState {
  step: number
  maxSteps: number
  thought: string
  action: string | null
  actionInput: any
  observation: string | null
  finalAnswer: string | null
  isComplete: boolean
}

interface ToolCall {
  name: string
  parameters: any
}

setup(app => {
  app.post('/api/chat/reactagent', sse(), async (req, res) => {
    const { messages, model, temperature, maxSteps = 10 } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' })
    }

    const provider = await getModelProvider()
    const openai = new OpenAI({
      baseURL: provider.baseURL,
      apiKey: provider.apiKey,
    })

    const mcpClient = new Client({
      name: '',
      websiteUrl: '',
      version: '',
    })

    const { tools } = await mcpClient.listTools()

    // const mcpServer = getFastMcp()
    // // For now, hardcode available tools based on ComfyUI setup
    // // In a real implementation, you might want to query the MCP server for available tools
    // const availableTools: string[] = mcpServer
    //   ? [
    //       'comfyui_health_check',
    //       // Add other dynamically registered ComfyUI tools here
    //       // These would be retrieved from the database or MCP server
    //     ]
    //   : []

    // Initialize agent state
    const state: ReactAgentState = {
      step: 0,
      maxSteps,
      thought: '',
      action: null,
      actionInput: null,
      observation: null,
      finalAnswer: null,
      isComplete: false,
    }

    try {
      // Build system prompt for ReAct pattern
      const systemPrompt = `你是一个有用的AI助手，能够通过思考-行动-观察的循环来解决问题。

可用工具:
${availableTools.map(tool => `- ${tool}`).join('\n')}

请遵循以下格式:

思考: 我需要分析这个问题...
行动: 工具名称
行动输入: {"参数名": "参数值"}
观察: [工具执行结果]

重复思考-行动-观察循环，直到能够给出最终答案。

最终答案: [你的最终回答]

重要规则:
1. 每次只执行一个行动
2. 必须等待观察结果后再进行下一步思考
3. 当你有足够信息回答问题时，给出最终答案
4. 最多执行 ${maxSteps} 步`

      const conversationMessages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...messages,
      ]

      while (!state.isComplete && state.step < state.maxSteps) {
        state.step++

        // Stream thinking step
        await streamMessage(res, `\n**第 ${state.step} 步:**\n\n`)

        // Get LLM response for current step
        const response = await getLLMResponse(
          openai,
          conversationMessages,
          model,
          temperature,
        )

        // Parse response to extract thought, action, and action input
        const parsed = parseReactResponse(response)

        state.thought = parsed.thought
        state.action = parsed.action
        state.actionInput = parsed.actionInput

        // Stream thought
        if (state.thought) {
          await streamMessage(res, `**思考:** ${state.thought}\n\n`)
        }

        // Check if we have a final answer
        if (parsed.finalAnswer) {
          state.finalAnswer = parsed.finalAnswer
          state.isComplete = true
          await streamMessage(res, `**最终答案:** ${state.finalAnswer}\n\n`)
          break
        }

        // Execute action if present
        if (state.action && state.actionInput) {
          await streamMessage(res, `**行动:** ${state.action}\n\n`)
          await streamMessage(
            res,
            `**行动输入:** ${JSON.stringify(state.actionInput, null, 2)}\n\n`,
          )

          try {
            // Execute MCP tool
            const toolResult = await executeToolCall(mcpServer, {
              name: state.action,
              parameters: state.actionInput,
            })

            state.observation = formatToolResult(toolResult)
            await streamMessage(res, `**观察:** ${state.observation}\n\n`)

            // Add observation to conversation
            conversationMessages.push({
              role: 'assistant',
              content: `思考: ${state.thought}\n行动: ${state.action}\n行动输入: ${JSON.stringify(state.actionInput)}\n观察: ${state.observation}`,
            } as ChatCompletionMessageParam)
          } catch (error) {
            const errorMessage = `工具执行失败: ${error instanceof Error ? error.message : '未知错误'}`
            state.observation = errorMessage
            await streamMessage(res, `**观察:** ${errorMessage}\n\n`)

            // Add error observation to conversation
            conversationMessages.push({
              role: 'assistant',
              content: `思考: ${state.thought}\n行动: ${state.action}\n行动输入: ${JSON.stringify(state.actionInput)}\n观察: ${errorMessage}`,
            } as ChatCompletionMessageParam)
          }
        } else if (!parsed.finalAnswer) {
          // If no action and no final answer, something went wrong
          await streamMessage(
            res,
            `**注意:** 未能解析出有效的行动或最终答案\n\n`,
          )
          conversationMessages.push({
            role: 'assistant',
            content: `思考: ${state.thought}`,
          } as ChatCompletionMessageParam)
        }
      }

      // If we exceeded max steps without completion
      if (!state.isComplete) {
        await streamMessage(
          res,
          `\n**达到最大步数限制 (${state.maxSteps})，强制结束**\n\n`,
        )

        // Try to get a final answer
        const finalMessages: ChatCompletionMessageParam[] = [
          ...conversationMessages,
          {
            role: 'user',
            content: '请基于以上信息给出最终答案:',
          } as ChatCompletionMessageParam,
        ]

        const finalResponse = await getLLMResponse(
          openai,
          finalMessages,
          model,
          temperature,
        )
        await streamMessage(res, `**最终答案:** ${finalResponse}\n\n`)
      }
    } catch (error) {
      console.error('ReactAgent error:', error)
      await streamMessage(
        res,
        `\n**错误:** ${error instanceof Error ? error.message : '未知错误'}\n\n`,
      )
    }

    res.end()
  })
})

// Helper function to stream message chunks
async function streamMessage(res: any, content: string) {
  const chunk = {
    choices: [
      {
        delta: {
          content: content,
        },
      },
    ],
  }
  res.write(JSON.stringify(chunk))
}

// Helper function to get LLM response
async function getLLMResponse(
  openai: OpenAI,
  messages: ChatCompletionMessageParam[],
  model: string,
  temperature?: number,
): Promise<string> {
  const response = await openai.chat.completions.create({
    messages,
    model: model || 'gpt-4',
    temperature: temperature || 0.1,
    max_tokens: 1000,
  })

  return response.choices[0]?.message?.content || ''
}

// Helper function to parse ReAct response
function parseReactResponse(response: string) {
  const result = {
    thought: '',
    action: null as string | null,
    actionInput: null as any,
    finalAnswer: null as string | null,
  }

  // Extract thought
  const thoughtMatch = response.match(/思考:\s*(.*?)(?=\n|$)/s)
  if (thoughtMatch) {
    result.thought = thoughtMatch[1].trim()
  }

  // Extract final answer
  const finalAnswerMatch = response.match(/最终答案:\s*(.*?)$/s)
  if (finalAnswerMatch) {
    result.finalAnswer = finalAnswerMatch[1].trim()
    return result
  }

  // Extract action
  const actionMatch = response.match(/行动:\s*(.*?)(?=\n|$)/s)
  if (actionMatch) {
    result.action = actionMatch[1].trim()
  }

  // Extract action input
  const actionInputMatch = response.match(/行动输入:\s*({.*?})/s)
  if (actionInputMatch) {
    try {
      result.actionInput = JSON.parse(actionInputMatch[1])
    } catch (e) {
      console.warn('Failed to parse action input JSON:', actionInputMatch[1])
      result.actionInput = actionInputMatch[1]
    }
  }

  return result
}

// Helper function to execute tool call
async function executeToolCall(
  mcpServer: any,
  toolCall: ToolCall,
): Promise<any> {
  if (!mcpServer) {
    throw new Error('MCP服务器未可用')
  }

  try {
    // Use the MCP server's request method to call tools
    const result = await mcpServer.request({
      method: 'tools/call',
      params: {
        name: toolCall.name,
        arguments: toolCall.parameters,
      },
    })

    return result
  } catch (error) {
    // If the above doesn't work, try direct tool execution
    // This is a fallback for different MCP server implementations
    throw new Error(
      `工具调用失败: ${error instanceof Error ? error.message : '未知错误'}`,
    )
  }
}

// Helper function to format tool result
function formatToolResult(result: any): string {
  if (!result) return '工具返回空结果'

  if (typeof result === 'string') return result

  if (result.content) {
    if (Array.isArray(result.content)) {
      return result.content
        .map((item: any) => {
          if (item.type === 'text') return item.text
          if (item.type === 'resource')
            return `资源: ${item.resource?.uri || item.resource?.text || '未知资源'}`
          return JSON.stringify(item)
        })
        .join('\n')
    }
    return JSON.stringify(result.content)
  }

  return JSON.stringify(result, null, 2)
}
