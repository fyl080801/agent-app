import { KeystoneContext } from '@keystone-6/core/types'
import { FastMCP } from 'fastmcp'
import { type TypeInfo } from '.keystone/types'
import { MCP_PORT, MCP_HOST } from '../envs'
import { createServer } from 'net'
import { execSync } from 'child_process'

const isPortAvailable = (port: number): Promise<boolean> => {
  return new Promise(resolve => {
    const server = createServer()
    server.listen(port, MCP_HOST, () => {
      // If we can listen, the port is available
      server.close(() => {
        resolve(true)
      })
    })
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false)
      } else if (err.code === 'EACCES') {
        // Permission denied, port might be privileged
        resolve(false)
      } else {
        // Other error, assume port is available
        resolve(true)
      }
    })
  })
}

const getPortProcessId = (port: number): string | null => {
  try {
    const command =
      process.platform === 'win32'
        ? `netstat -ano | findstr :${port}`
        : `lsof -ti :${port}`

    const result = execSync(command, { encoding: 'utf8' }).trim()

    if (process.platform === 'win32') {
      const lines = result.split('\n')
      for (const line of lines) {
        const parts = line.trim().split(/\s+/)
        if (parts.length >= 5 && parts[1] === 'LISTENING') {
          return parts[4]
        }
      }
      return null
    } else {
      return result || null
    }
  } catch (error) {
    return null
  }
}

const killProcess = (pid: string): boolean => {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
    } else {
      process.kill(parseInt(pid), 'SIGKILL')
    }
    return true
  } catch (error) {
    console.warn(`Failed to kill process ${pid}:`, error)
    return false
  }
}

const waitForPortAvailable = async (
  port: number,
  timeoutMs: number = 10000,
): Promise<boolean> => {
  const startTime = Date.now()
  while (Date.now() - startTime < timeoutMs) {
    if (await isPortAvailable(port).catch(() => false)) {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  return false
}

const ensurePortAvailable = async (port: number): Promise<boolean> => {
  if (await isPortAvailable(port)) {
    return true
  }

  console.log(`Port ${port} is occupied, checking for occupying process...`)

  const pid = getPortProcessId(port)
  if (pid) {
    console.log(
      `Found process ${pid} occupying port ${port}, attempting to kill...`,
    )
    if (killProcess(pid)) {
      console.log(`Successfully killed process ${pid}`)
      console.log(`Waiting for port ${port} to become available...`)
      const isAvailable = await waitForPortAvailable(port, 5000)
      if (isAvailable) {
        console.log(`Port ${port} is now available`)
        return true
      } else {
        console.warn(`Port ${port} is still not available after waiting`)
        return false
      }
    } else {
      console.warn(`Failed to kill process ${pid}`)
      return false
    }
  } else {
    console.warn(`Could not determine process occupying port ${port}`)
    return false
  }
}

type FastMcpSetup = (
  server: FastMCP,
  context: KeystoneContext<TypeInfo>,
) => void

const fastsetups: FastMcpSetup[] = []
let serverInstance: FastMCP | null = null
let isServerStarted = false

export const startFastMcp = async (
  context?: KeystoneContext<TypeInfo>,
  port?: number,
) => {
  try {
    const targetPort = Number(port || MCP_PORT)

    // console.log(`Checking if port ${targetPort} is available...`)
    // const isAvailable = await ensurePortAvailable(targetPort)

    // if (!isAvailable) {
    //   console.warn(
    //     `Warning: Port ${targetPort} may still be occupied, attempting to start server anyway...`,
    //   )
    // } else {
    //   console.log(`Port ${targetPort} is available`)
    // }

    if (isServerStarted && serverInstance) {
      try {
        console.log('mcp stoping')
        await serverInstance.stop()
      } catch (error) {
        console.warn('Failed to stop previous MCP server:', error)
      }
    }

    const server = new FastMCP({
      name: 'ComfyUI',
      version: '0.1.0',
    })

    context &&
      (await Promise.all(
        fastsetups.map(async setup => {
          await Promise.resolve(setup(server, context))
        }),
      ))

    await server.start({
      transportType: 'httpStream',
      httpStream: {
        port: targetPort,
        endpoint: '/mcp',
        host: MCP_HOST,
      },
    })

    serverInstance = server
    isServerStarted = true

    return server
  } catch (error) {
    console.error('Error starting MCP server:', error)
    throw new Error(
      `Failed to start MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

export const getFastMcp = () => {
  return serverInstance
}

export const stopFastMcp = async () => {
  try {
    await getFastMcp()?.stop()
  } catch (error) {
    console.error('Error stopping MCP server:', error)
    throw new Error(
      `Failed to stop MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

export const useFastMcp = (setup: FastMcpSetup) => {
  fastsetups.push(setup)
}
