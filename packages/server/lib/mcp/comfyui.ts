import { useFastMcp } from "./server"
import z from "zod"
// import { randomUUID } from "crypto"
// import prompt from "./prompt"
import { jsonTryParse } from "../utils"
import { WebSocket } from "ws"
import { COMFYUI_HOST } from "../envs"

// ComfyUI WebSocket implementation (simplified version of the one in generate.ts)
type ComfyuiWebsocketOptions = {
  host: string
  clientId: string
  timeout?: number
}

type ComfyuiEvents =
  | "status"
  | "execution_start"
  | "execution_cached"
  | "progress"
  | "executing"
  | "executed"
  | "error"

type ComfyuiEventHandler = (event: Event & { data?: any }) => void

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
  constructor(message: string, public code?: string) {
    super(message)
    this.name = "ComfyuiWebsocketError"
  }
}

class ComfyuiWebsocket {
  private websocket?: WebSocket | null = null
  private host: string
  private clientId: string
  private timeout: number
  private timer?: NodeJS.Timeout
  private isClosed: boolean = false

  private events: EventTarget = new EventTarget()

  private async executeGen(prompt: string): Promise<void> {
    try {
      const response = await fetch(`http://${this.host}/prompt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_id: this.clientId,
          prompt
        })
      })

      if (!response.ok) {
        throw new ComfyuiWebsocketError(
          `ComfyUI API call failed with status ${response.status}`,
          "API_ERROR"
        )
      }

      const data = await response.json()
      if (!data?.prompt_id) {
        throw new ComfyuiWebsocketError(
          "Invalid response from ComfyUI API",
          "INVALID_RESPONSE"
        )
      }
    } catch (error) {
      throw new ComfyuiWebsocketError(
        `ComfyUI API call failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "API_CALL_FAILED"
      )
    }
  }

  constructor(options: ComfyuiWebsocketOptions) {
    const { host, clientId, timeout = 8 * 60 * 1000 } = options

    if (!host)
      throw new ComfyuiWebsocketError("Host is required", "MISSING_HOST")
    if (!clientId)
      throw new ComfyuiWebsocketError(
        "Client ID is required",
        "MISSING_CLIENT_ID"
      )

    this.host = host
    this.timeout = timeout
    this.clientId = clientId
  }

  async open(params: any): Promise<ComfyuiExecutionResult> {
    if (this.isClosed) {
      throw new ComfyuiWebsocketError(
        "WebSocket is already closed",
        "ALREADY_CLOSED"
      )
    }

    const { resolve, reject, promise } =
      Promise.withResolvers<ComfyuiExecutionResult>()

    // Validate parameters
    if (!params?.prompt) {
      reject(new ComfyuiWebsocketError("Prompt is required", "MISSING_PROMPT"))
      return promise
    }

    try {
      this.websocket = new WebSocket(
        `ws://${this.host}/ws?clientId=${this.clientId}`
      )

      this.websocket.addEventListener("open", () => {
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
                "TIMEOUT"
              )
            )
          }
        }, 1000)

        this.executeGen(params).catch(reject)
      })

      this.websocket.addEventListener("message", ({ data }) => {
        if (this.isClosed) return

        const eventData = jsonTryParse(data?.toString())

        if (!eventData?.type) return

        switch (eventData.type) {
          case "status":
          case "execution_start":
          case "execution_cached":
          case "progress":
          case "executing":
            this.events.dispatchEvent(
              new ComfyuiEvent(eventData.type, { data: eventData })
            )
            break

          case "executed":
            this.close()
            if (eventData.data) {
              resolve(eventData.data as ComfyuiExecutionResult)
            } else {
              reject(
                new ComfyuiWebsocketError(
                  "Invalid executed event data",
                  "INVALID_EXECUTED_DATA"
                )
              )
            }
            break

          case "execution_error":
          case "error":
            this.close()
            const errorMessage =
              eventData.data?.error?.message ||
              eventData.message ||
              "Unknown ComfyUI error"
            reject(
              new ComfyuiWebsocketError(
                `ComfyUI error: ${errorMessage}`,
                "EXECUTION_ERROR"
              )
            )
            break
        }
      })

      this.websocket.addEventListener("error", (error) => {
        this.close()
        reject(
          new ComfyuiWebsocketError(
            `WebSocket error: ${error.message}`,
            "WEBSOCKET_ERROR"
          )
        )
      })

      this.websocket.addEventListener("close", () => {
        if (!this.isClosed) {
          this.close()
          reject(
            new ComfyuiWebsocketError(
              "WebSocket connection closed unexpectedly",
              "UNEXPECTED_CLOSE"
            )
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
            "INIT_FAILED"
          )
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

// Register ComfyUI tools with FastMCP
useFastMcp(async (server, context) => {
  const tools = await context.query.ComfyTool.findMany({
    where: {
      isEnabled: { equals: true }
    },
    query:
      "id name description workflowParameters { name description prop isRequired min max defaultValue } workflowDefinition"
  })

  tools.forEach((tool) => {
    const parameters = tool.workflowParameters?.reduce(
      (
        target: any,
        item: { [key: string]: any; dataType: "number" | "string" }
      ) => {
        target[item.name] = z[item.dataType]()

        target[item.name].describe(item.description)

        if (!item.isRequired) {
          target[item.name].optional()
        }

        if (![null, undefined].includes(item.min)) {
          target[item.name].min(item.min)
        }

        if (![null, undefined].includes(item.max)) {
          target[item.name].max(item.max)
        }

        return target
      },
      {}
    )

    server.addTool({
      name: tool.name,
      description: tool.description,
      parameters: z.object(parameters),
      execute: async (params, ctx) => {
        return {
          content: []
        }
      }
    })
  })

  // // Image generation tool - using the existing prompt system
  // server.addTool({
  //   name: "comfyui_generate_image",
  //   description: "Generate images using ComfyUI with prompt parameters",
  //   parameters: z.object({
  //     prompt: z
  //       .string()
  //       .min(1)
  //       .describe("Positive prompt for image generation"),
  //     negative_prompt: z
  //       .string()
  //       .optional()
  //       .describe("Negative prompt to exclude elements"),
  //     width: z
  //       .number()
  //       .min(1)
  //       .max(1024)
  //       .optional()
  //       .describe("Image width (max 1024)"),
  //     height: z
  //       .number()
  //       .min(1)
  //       .max(1024)
  //       .optional()
  //       .describe("Image height (max 1024)"),
  //     steps: z.number().min(1).max(100).optional().describe("Sampling steps"),
  //     cfg_scale: z
  //       .number()
  //       .min(1)
  //       .max(30)
  //       .optional()
  //       .describe("Classifier-free guidance scale")
  //   }),
  //   execute: async (params, context) => {
  //     if (!COMFYUI_HOST) {
  //       throw new Error("COMFYUI_HOST environment variable is required")
  //     }

  //     const clientId = randomUUID()
  //     const ws = new ComfyuiWebsocket({
  //       host: COMFYUI_HOST,
  //       clientId,
  //       timeout: 10 * 60 * 1000 // 10 minute timeout
  //     })

  //     context.log.info(`Generating image with prompt: "${params.prompt}"`, {
  //       width: params.width,
  //       height: params.height,
  //       steps: params.steps,
  //       cfg_scale: params.cfg_scale
  //     })

  //     // Progress tracking
  //     let lastProgressReport = 0
  //     const progressHandler = ({ data }: Event & { data?: any }) => {
  //       try {
  //         const progressData = data?.data
  //         if (
  //           progressData?.value !== undefined &&
  //           progressData?.max !== undefined
  //         ) {
  //           const currentProgress = progressData.value
  //           const totalProgress = progressData.max

  //           // Throttle progress updates to avoid spam
  //           if (currentProgress > lastProgressReport) {
  //             context.reportProgress({
  //               progress: currentProgress,
  //               total: totalProgress
  //             })
  //             lastProgressReport = currentProgress
  //           }
  //         }
  //       } catch (error) {
  //         context.log.error(`Progress update error: ${error}`)
  //       }
  //     }

  //     ws.on("progress", progressHandler)

  //     try {
  //       const result = await ws.open(params)

  //       if (!result?.output?.images?.length) {
  //         throw new Error("No images returned from ComfyUI")
  //       }

  //       context.log.info(`Generated ${result.output.images.length} image(s)`)

  //       const resources = []
  //       for (const [index, image] of result.output.images.entries()) {
  //         try {
  //           context.reportProgress({
  //             progress: index + 1,
  //             total: result.output.images.length
  //           })

  //           const imageUrl = `http://${COMFYUI_HOST}/view?filename=${encodeURIComponent(
  //             image.filename
  //           )}&subfolder=${encodeURIComponent(
  //             image.subfolder || ""
  //           )}&type=${encodeURIComponent(image.type || "output")}`

  //           resources.push({
  //             filename: image.filename,
  //             url: imageUrl,
  //             subfolder: image.subfolder,
  //             type: image.type
  //           })
  //         } catch (error) {
  //           context.log.error(`Error processing image ${index + 1}: ${error}`)
  //           // Continue with other images if one fails
  //         }
  //       }

  //       if (resources.length === 0) {
  //         throw new Error("Failed to process any images")
  //       }

  //       context.log.info(`Successfully processed ${resources.length} image(s)`)

  //       return {
  //         content: resources.map((item) => ({
  //           type: "text",
  //           text: `Generated image: ${item.filename}\nURL: ${item.url}`
  //         }))
  //       }
  //     } finally {
  //       ws.close()
  //     }
  //   }
  // })

  // Health check tool
  server.addTool({
    name: "comfyui_health_check",
    description: "Check if ComfyUI service is available",
    parameters: z.object({}),
    execute: async (params, context) => {
      try {
        if (!COMFYUI_HOST) {
          return {
            content: [
              {
                type: "text",
                text: "COMFYUI_HOST environment variable is not configured"
              }
            ]
          }
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        try {
          const response = await fetch(`http://${COMFYUI_HOST}/system_stats`, {
            signal: controller.signal
          })

          clearTimeout(timeoutId)

          if (response.ok) {
            return {
              content: [
                {
                  type: "text",
                  text: "ComfyUI service is available and running"
                }
              ]
            }
          } else {
            return {
              content: [
                {
                  type: "text",
                  text: `ComfyUI service is not available: ${response.statusText}`
                }
              ]
            }
          }
        } catch (error) {
          clearTimeout(timeoutId)
          throw error
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `ComfyUI service is not reachable: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            }
          ]
        }
      }
    }
  })
})

export {}
