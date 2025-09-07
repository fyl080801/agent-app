// Welcome to Keystone!
//
// This file is what Keystone uses as the entry-point to your headless backend
//
// Keystone imports the default export of this file, expecting a Keystone configuration object
//   you can find out more at https://keystonejs.com/docs/apis/config

import { config } from "@keystone-6/core"

// to keep this file tidy, we define our schema in a different file
import { lists } from "./schema"

// authentication is configured separately here too, but you might move this elsewhere
// when you write your list-level access control functions, as they typically rely on session data
import { withAuth, session } from "./auth"

import { type TypeInfo } from ".keystone/types"

import express, { Request, Response } from "express"
import { openAIService } from "./lib/agent"
import { ChatCompletionMessageParam } from "openai/resources"

export default withAuth(
  config<TypeInfo>({
    db: {
      // we're using sqlite for the fastest startup experience
      //   for more information on what database might be appropriate for you
      //   see https://keystonejs.com/docs/guides/choosing-a-database#title
      provider: "sqlite",
      url: "file:./keystone.db",
      prismaClientPath: "node_modules/.prisma/client"
    },
    lists,
    session,
    server: {
      extendExpressApp(app, context) {
        // 通过context获取集合以及操作数据库
        // context.query.Post

        // SSE helper function
        function setupSSE(req: Request, res: Response) {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": "*"
          })

          // Send a keep-alive comment every 30 seconds
          const keepAlive = setInterval(() => {
            res.write(": keep-alive\n\n")
          }, 30000)

          // Cleanup on client disconnect
          req.on("close", () => {
            clearInterval(keepAlive)
          })

          return keepAlive
        }

        app.use(express.json())

        // SSE streaming chat completion endpoint
        app.post("/api/chat/stream", async (req, res) => {
          try {
            const { messages, model, temperature, state } = req.body

            if (!messages || !Array.isArray(messages)) {
              return res
                .status(400)
                .json({ error: "Messages array is required" })
            }

            // Setup SSE
            const keepAlive = setupSSE(req, res)

            // Stream the response
            await openAIService.streamChatCompletion(
              messages as ChatCompletionMessageParam[],
              model || state.model,
              temperature || state.temperature,
              (chunk) => {
                res.write(chunk)
              }
            )

            // End the stream
            clearInterval(keepAlive)
            // res.write('event: end\ndata: {"message": "Stream completed"}\n\n')
            res.end()
          } catch (error) {
            console.error("Streaming error:", error)
            res.write(
              `event: error\ndata: ${JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Internal server error"
              })}\n\n`
            )
            res.end()
          }
        })
      },
      extendHttpServer(server, context) {}
    }
  })
)
