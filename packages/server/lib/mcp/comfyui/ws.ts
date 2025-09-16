import { jsonTryParse } from '../../utils'
import { WebSocket } from 'ws'
import axios from 'axios'
import { COMFYUI_HTTP_PROTOCOL, COMFYUI_WS_PROTOCOL } from '../../envs'

// ComfyUI WebSocket implementation (simplified version of the one in generate.ts)
type ComfyuiWebsocketOptions = {
  host: string
  clientId: string
  timeout?: number
}

type ComfyuiEvents =
  | 'status'
  | 'execution_start'
  | 'execution_cached'
  | 'progress'
  | 'executing'
  | 'executed'
  | 'error'

type ComfyuiEventHandler = (event: Event & { data?: any }) => void

interface ComfyWsParams {
  prompt: { [key: string]: any }
}

interface ComfyuiExecutionResult {
  node: string
  display_node: string
  output: {
    images: Array<{
      filename: string
      subfolder: string
      type: string
    }>
  }
  prompt_id: string
}

class ComfyuiEvent extends Event {
  public data: any

  constructor(type: string, init: EventInit & { data: any }) {
    super(type, init)
    this.data = init.data
  }
}

class ComfyuiWebsocketError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message)
    this.name = 'ComfyuiWebsocketError'
  }
}

export class ComfyuiWebsocket {
  private websocket?: WebSocket | null = null
  private host: string
  private clientId: string
  private timeout: number
  private timer?: NodeJS.Timeout
  private isClosed: boolean = false

  private events: EventTarget = new EventTarget()

  private async executeGen(prompt: any): Promise<void> {
    try {
      const response = await axios.post(
        `${COMFYUI_HTTP_PROTOCOL}://${this.host}/prompt`,
        {
          client_id: this.clientId,
          prompt: prompt,
        },
        {
          timeout: 30000,
        },
      )

      if (response.status !== 200) {
        throw new ComfyuiWebsocketError(
          `ComfyUI API call failed with status ${response.status}`,
          'API_ERROR',
        )
      }

      if (!response.data?.prompt_id) {
        throw new ComfyuiWebsocketError(
          'Invalid response from ComfyUI API',
          'INVALID_RESPONSE',
        )
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ComfyuiWebsocketError(
          `ComfyUI API call failed: ${error.message}`,
          'API_CALL_FAILED',
        )
      }
      throw error
    }
  }

  constructor(options: ComfyuiWebsocketOptions) {
    const { host, clientId, timeout = 8 * 60 * 1000 } = options

    if (!host)
      throw new ComfyuiWebsocketError('Host is required', 'MISSING_HOST')
    if (!clientId)
      throw new ComfyuiWebsocketError(
        'Client ID is required',
        'MISSING_CLIENT_ID',
      )

    this.host = host
    this.timeout = timeout
    this.clientId = clientId
  }

  async open(params: ComfyWsParams): Promise<ComfyuiExecutionResult> {
    if (this.isClosed) {
      throw new ComfyuiWebsocketError(
        'WebSocket is already closed',
        'ALREADY_CLOSED',
      )
    }

    const { resolve, reject, promise } =
      Promise.withResolvers<ComfyuiExecutionResult>()

    // Validate parameters
    if (!params?.prompt) {
      reject(new ComfyuiWebsocketError('Prompt is required', 'MISSING_PROMPT'))
      return promise
    }

    try {
      this.websocket = new WebSocket(
        `${COMFYUI_WS_PROTOCOL}://${this.host}/ws?clientId=${this.clientId}`,
      )

      this.websocket.addEventListener('open', () => {
        if (this.isClosed) return

        const start = Date.now()
        this.timer = setInterval(() => {
          if (this.isClosed) {
            clearInterval(this.timer)
            return
          }

          if (Date.now() - start >= this.timeout) {
            this.close()
            reject(
              new ComfyuiWebsocketError(
                `ComfyUI timeout after ${this.timeout}ms`,
                'TIMEOUT',
              ),
            )
          }
        }, 1000)

        this.executeGen(params?.prompt).catch(reject)
      })

      this.websocket.addEventListener('message', ({ data }) => {
        if (this.isClosed) return

        const eventData = jsonTryParse(data?.toString())

        if (!eventData?.type) return

        switch (eventData.type) {
          case 'status':
          case 'execution_start':
          case 'execution_cached':
          case 'progress':
          case 'executing':
            this.events.dispatchEvent(
              new ComfyuiEvent(eventData.type, { data: eventData }),
            )
            break

          case 'executed':
            this.close()
            if (eventData.data) {
              resolve(eventData.data as ComfyuiExecutionResult)
            } else {
              reject(
                new ComfyuiWebsocketError(
                  'Invalid executed event data',
                  'INVALID_EXECUTED_DATA',
                ),
              )
            }
            break

          case 'execution_error':
          case 'error':
            this.close()
            const errorMessage =
              eventData.data?.error?.message ||
              eventData.message ||
              'Unknown ComfyUI error'
            reject(
              new ComfyuiWebsocketError(
                `ComfyUI error: ${errorMessage}`,
                'EXECUTION_ERROR',
              ),
            )
            break
        }
      })

      this.websocket.addEventListener('error', error => {
        this.close()
        reject(
          new ComfyuiWebsocketError(
            `WebSocket error: ${error.message}`,
            'WEBSOCKET_ERROR',
          ),
        )
      })

      this.websocket.addEventListener('close', () => {
        if (!this.isClosed) {
          this.close()
          reject(
            new ComfyuiWebsocketError(
              'WebSocket connection closed unexpectedly',
              'UNEXPECTED_CLOSE',
            ),
          )
        }
      })
    } catch (error) {
      this.close()
      if (error instanceof ComfyuiWebsocketError) {
        reject(error)
      } else {
        reject(
          new ComfyuiWebsocketError(
            `Failed to initialize WebSocket: ${error}`,
            'INIT_FAILED',
          ),
        )
      }
    }

    return promise
  }

  close(): void {
    this.isClosed = true
    clearInterval(this.timer)

    if (this.websocket) {
      try {
        if (
          this.websocket.readyState === WebSocket.OPEN ||
          this.websocket.readyState === WebSocket.CONNECTING
        ) {
          this.websocket.close()
        }
      } catch (error) {
        // Ignore errors during close
      }
      this.websocket = null
    }
  }

  on(event: ComfyuiEvents, handler: ComfyuiEventHandler): void {
    this.events.addEventListener(event, handler)
  }

  off(event: ComfyuiEvents, handler: ComfyuiEventHandler): void {
    this.events.removeEventListener(event, handler)
  }
}
