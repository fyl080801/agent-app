import { MCPClient } from 'mcp-client'

// Create a new MCP client instance
const client = new MCPClient({
  name: 'ComfyUI',
  version: '0.1.0',
})

// Connect to an MCP server using Streaming HTTP
async function connectAndInteract() {
  try {
    await client.connect({
      type: 'httpStream',
      url: 'http://127.0.0.1:8000/mcp', // Replace with your server URL
    })
    console.log('Connected to MCP server.')

    // List available tools
    const tools = await client.getAllTools()
    console.log(
      'Available tools:',
      tools.map(tool => tool.name),
    )

    // Call a specific tool
    const result = await client.callTool({
      name: 'add', // Replace with the name of a tool exposed by your server
      arguments: { a: 5, b: 3 },
    })
    console.log("Tool 'add' result:", result)

    // Read a resource
    const resource = await client.getResource({
      uri: 'file:///data/config.json',
    })
    console.log('Resource content:', resource.content)

    // Disconnect (optional, depending on your application lifecycle)
    // await client.disconnect();
  } catch (error) {
    console.error('MCP client error:', error)
  }
}

export const getMcpTool = async () => {
  try {
    await client.connect({
      type: 'httpStream',
      url: 'http://127.0.0.1:8000/mcp', // Replace with your server URL
    })

    const tools = await client.getAllTools()

    return tools
  } catch (e) {
    console.log(e)
    return []
  } finally {
    await client.close()
  }
}

export const getMcpToolObject = async () => {
  const tools = await getMcpTool()

  return tools.reduce((target, item) => {
    target[item.name] = item
    return target
  }, {} as any)
}

export const mcpcall = async () => {
  try {
    await client.connect({
      type: 'httpStream',
      url: 'http://127.0.0.1:8000/mcp', // Replace with your server URL
    })

    const tools = await client.getAllTools()

    console.log(tools)
  } catch (e) {
    console.log(e)
  } finally {
    await client.close()
  }
}
