import { useFastMcp } from '../server'
import z from 'zod'
import { randomUUID } from 'crypto'
import { COMFYUI_HOST, COMFYUI_HTTP_PROTOCOL, S3_ENABLE } from '../../envs'
import { ComfyuiWebsocket } from './ws'
import _ from 'lodash-es'
import { uploadToS3 } from './s3'
import axios from 'axios'
import { convertInputProp, getInputValue } from './helpers'

// Register ComfyUI tools with FastMCP
useFastMcp(async (server, context) => {
  const tools = await context.query.ComfyTool.findMany({
    where: {
      isEnabled: { equals: true },
    },
    query:
      'id name description workflowParameters { name description dataType prop isRequired min max defaultValue } workflowDefinition endNode',
  })

  tools.forEach(tool => {
    const {
      workflowParameters,
      workflowDefinition,
      name: toolName,
      description: toolDescription,
      endNode,
    } = tool

    const parameters = workflowParameters?.reduce(
      (
        target: any,
        item: { [key: string]: any; dataType: 'number' | 'string' },
      ) => {
        target[item.name] = z[item.dataType]().describe(item.description)

        if (!item.isRequired) {
          target[item.name].optional()
        }

        if (item.dataType === 'number') {
          if (![null, undefined].includes(item.min)) {
            target[item.name].min(+item.min)
          }
          if (![null, undefined].includes(item.max)) {
            target[item.name].max(+item.max)
          }
        }

        return target
      },
      {},
    )

    server.addTool({
      name: toolName,
      description: toolDescription,
      parameters: z.object(parameters),
      execute: async (params, ctx) => {
        if (!COMFYUI_HOST) {
          throw new Error('COMFYUI_HOST environment variable is required')
        }

        const clientId = randomUUID()
        const ws = new ComfyuiWebsocket({
          host: COMFYUI_HOST,
          clientId,
          timeout: 10 * 60 * 1000, // 10 minute timeout
        })

        ctx.log.info(`Generating image with prompt: "${params.prompt}"`, {
          //   width: params.width,
          //   height: params.height,
          //   steps: params.steps,
          //   cfg_scale: params.cfg_scale
        })

        // Progress tracking
        let lastProgressReport = 0

        const progressHandler = ({ data }: Event & { data?: any }) => {
          try {
            const progressData = data?.data
            if (
              progressData?.value !== undefined &&
              progressData?.max !== undefined
            ) {
              const currentProgress = progressData.value
              const totalProgress = progressData.max
              // Throttle progress updates to avoid spam
              if (currentProgress > lastProgressReport) {
                ctx.reportProgress({
                  progress: currentProgress,
                  total: totalProgress,
                })
                lastProgressReport = currentProgress
              }
            }
          } catch (error) {
            ctx.log.error(`Progress update error: ${error}`)
          }
        }

        ws.on('progress', progressHandler)

        try {
          workflowParameters.forEach((p: any) => {
            _.set(
              workflowDefinition,
              convertInputProp(p.prop),
              getInputValue(params, p),
            )
          })

          const result = await ws.open({
            prompt: workflowDefinition,
            end: endNode,
          })

          if (!result?.output?.images?.length) {
            throw new Error('No images returned from ComfyUI')
          }

          ctx.log.info(`Generated ${result.output.images.length} image(s)`)

          const resources: string[] = (
            await Promise.allSettled(
              result.output.images.entries().map(async ([index, image]) => {
                try {
                  ctx.reportProgress({
                    progress: index + 1,
                    total: result.output.images.length,
                  })

                  const imageUrl = `${COMFYUI_HTTP_PROTOCOL}://${COMFYUI_HOST}/view?filename=${encodeURIComponent(
                    image.filename,
                  )}&subfolder=${encodeURIComponent(
                    image.subfolder || '',
                  )}&type=${encodeURIComponent(image.type || 'output')}`

                  if (S3_ENABLE) {
                    const imageResponse = await axios.get(imageUrl, {
                      responseType: 'arraybuffer',
                      timeout: 30000, // 30 second timeout
                    })

                    if (imageResponse.status !== 200) {
                      throw new Error(
                        `Failed to download image: ${imageResponse.status}`,
                      )
                    }

                    const s3Url = await uploadToS3(
                      image.filename,
                      imageResponse.data,
                    )

                    return s3Url
                  } else {
                    return imageUrl
                  }
                } catch (error) {
                  ctx.log.error(`Error processing image ${index + 1}: ${error}`)
                  return null
                }
              }),
            )
          )
            .map(item => {
              if (item.status !== 'fulfilled' || !item.value) return null

              return item.value
            })
            .filter<string>(item => item !== null)

          await Promise.allSettled(
            resources.map(async img => {
              if (!img) return

              await ctx.streamContent({
                type: 'resource',
                resource: {
                  uri: img,
                  mimeType: 'image/png',
                },
              })
            }),
          )

          if (resources.length === 0) {
            throw new Error('Failed to process any images')
          }

          ctx.log.info(`Successfully processed ${resources.length} image(s)`)

          return {
            content: resources.map(item => ({
              type: 'resource',
              resource: {
                text: 'Generated image',
                uri: item,
              },
            })),
          }
        } catch (err: any) {
          ctx.log.error(err.message)
          throw err
        } finally {
          ws.close()
        }
      },
    })
  })

  // Health check tool
  server.addTool({
    name: 'comfyui_health_check',
    description: 'Check if ComfyUI service is available',
    // parameters: z.object({}),
    execute: async () => {
      try {
        if (!COMFYUI_HOST) {
          return {
            content: [
              {
                type: 'text',
                text: 'COMFYUI_HOST environment variable is not configured',
              },
            ],
          }
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        try {
          const response = await fetch(
            `${COMFYUI_HTTP_PROTOCOL}://${COMFYUI_HOST}/system_stats`,
            {
              signal: controller.signal,
            },
          )

          clearTimeout(timeoutId)

          if (response.ok) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'ComfyUI service is available and running',
                },
              ],
            }
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `ComfyUI service is not available: ${response.statusText}`,
                },
              ],
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
              type: 'text',
              text: `ComfyUI service is not reachable: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
            },
          ],
        }
      }
    },
  })
})
