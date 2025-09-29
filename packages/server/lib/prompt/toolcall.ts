// 因为对于toolcall来说依赖模型能力，为了让模型有统一处理，一律使用prompt控制toolcall输出
// 直接抄cherry-studio的作业吧

/**
工具定义可加到 ## Tool Use Examples 下，但agent本身传了tools貌似可以不加

## Tool Use Available Tools
Above example were using notional tools that might not exist for you. You only have access to these tools:
{{ AVAILABLE_TOOLS }}

 */

export const DEFAULT_TOOL_PROMPT = `
In this environment you have access to a set of tools you can use to answer the user's question. \\
You can use one tool per message, and will receive the result of that tool use in the user's response. You use tools step-by-step to accomplish a given task, with each tool use informed by the result of the previous tool use.

## Tool Use Formatting

Tool use is formatted using XML-style tags. The tool name is enclosed in opening and closing tags, and each parameter is similarly enclosed within its own set of tags. Here's the structure:
<tool_use>
  <name>{tool_name}</name>
  <arguments>{json_arguments}</arguments>
</tool_use>

The tool name should be the exact name of the tool you are using, and the arguments should be a JSON object containing the parameters required by that tool. For example:
<tool_use>
  <name>python_interpreter</name>
  <arguments>{"code": "5 + 3 + 1294.678"}</arguments>
</tool_use>

The user will respond with the result of the tool use, which should be formatted as follows:
<tool_use_result>
  <name>{tool_name}</name>
  <result>{result}</result>
</tool_use_result>

The result should be a string, which can represent a file or any other output type. You can use this result as input for the next action.
For example, if the result of the tool use is an image file, you can use it in the next action like this:
<tool_use>
  <name>image_transformer</name>
  <arguments>{"image": "image_1.jpg"}</arguments>
</tool_use>

Always adhere to this format for the tool use to ensure proper parsing and execution.

## Tool Use Examples
{{ TOOL_USE_EXAMPLES }}


## Tool Use Rules
Here are the rules you should always follow to solve your task:
1. Always use the right arguments for the tools. Never use variable names as the action arguments, use the value instead.
2. Call a tool only when needed: do not call the search agent if you do not need information, try to solve the task yourself.
3. If no tool call is needed, just answer the question directly.
4. Never re-do a tool call that you previously did with the exact same parameters.
5. For tool use, MAKE SURE use XML tag format as shown in the examples above. Do not use any other format.

# User Instructions
{{ USER_SYSTEM_PROMPT }}

Now Begin! If you solve the task correctly, you will receive a reward of $1,000,000.
`

export const DEFAULT_TOOL_USE_EXAMPLES = `
Here are a few examples using notional tools:
---
User: Generate an image of the oldest person in this document.

A: I can use the document_qa tool to find out who the oldest person is in the document.
<tool_use>
  <name>document_qa</name>
  <arguments>{"document": "document.pdf", "question": "Who is the oldest person mentioned?"}</arguments>
</tool_use>

User: <tool_use_result>
  <name>document_qa</name>
  <result>John Doe, a 55 year old lumberjack living in Newfoundland.</result>
</tool_use_result>

A: I can use the image_generator tool to create a portrait of John Doe.
<tool_use>
  <name>image_generator</name>
  <arguments>{"prompt": "A portrait of John Doe, a 55-year-old man living in Canada."}</arguments>
</tool_use>

User: <tool_use_result>
  <name>image_generator</name>
  <result>image.png</result>
</tool_use_result>

A: the image is generated as image.png

---
User: "What is the result of the following operation: 5 + 3 + 1294.678?"

A: I can use the python_interpreter tool to calculate the result of the operation.
<tool_use>
  <name>python_interpreter</name>
  <arguments>{"code": "5 + 3 + 1294.678"}</arguments>
</tool_use>

User: <tool_use_result>
  <name>python_interpreter</name>
  <result>1302.678</result>
</tool_use_result>

A: The result of the operation is 1302.678.

---
User: "Which city has the highest population , Guangzhou or Shanghai?"

A: I can use the search tool to find the population of Guangzhou.
<tool_use>
  <name>search</name>
  <arguments>{"query": "Population Guangzhou"}</arguments>
</tool_use>

User: <tool_use_result>
  <name>search</name>
  <result>Guangzhou has a population of 15 million inhabitants as of 2021.</result>
</tool_use_result>

A: I can use the search tool to find the population of Shanghai.
<tool_use>
  <name>search</name>
  <arguments>{"query": "Population Shanghai"}</arguments>
</tool_use>

User: <tool_use_result>
  <name>search</name>
  <result>26 million (2019)</result>
</tool_use_result>
Assistant: The population of Shanghai is 26 million, while Guangzhou has a population of 15 million. Therefore, Shanghai has the highest population.`

export const parsePromptTemplate = (
  prompt: string,
  dictionaries: { [key: string]: string } = {},
) => {
  if (!Object.keys(dictionaries).length) return prompt

  return Object.entries(dictionaries).reduce((target, [key, value]) => {
    return target
      .replaceAll(`{{${key}}}`, value)
      .replaceAll(`{{ ${key} }}`, value)
  }, prompt)
}

export const parseToolsTemplage = (tools: Record<string, any> = {}) => {
  return `
<tools> 
  ${Object.entries(tools)
    .map(([key, values]) => {
      return `
  <tool> 
    <name>${key}</name> 
    <description>${values.description}</description> 
    <arguments>${JSON.stringify(values.inputSchema)}</arguments> 
  </tool>`
    })
    .join('\n\n')} 
</tools>`
}

interface TooCallTemplateParams {
  prompt?: string
  tools: Record<string, any> // { [key: string]: any }
}

export const parseToolCallAgentTemplate = ({
  prompt = '',
  tools,
}: TooCallTemplateParams): string => {
  return parsePromptTemplate(DEFAULT_TOOL_PROMPT, {
    TOOL_USE_EXAMPLES: DEFAULT_TOOL_USE_EXAMPLES,
    AVAILABLE_TOOLS: parseToolsTemplage(tools),
    USER_SYSTEM_PROMPT: prompt,
  })
}

// XML解析相关的类型定义
interface XmlNode {
  tagName: string
  content: string
  children: XmlNode[]
  attributes: Record<string, string>
  startIndex: number
  endIndex: number
}

interface XmlParseResult {
  success: boolean
  data?: any
  error?: string
  validationErrors?: string[]
}

interface XmlTag {
  name: string
  startIndex: number
  endIndex: number
  isClosing: boolean
  isSelfClosing: boolean
  attributes: Record<string, string>
}

/**
 * 高级XML解析器类 - 支持层级提取、递归序列化和完整验证
 */
class AdvancedXmlParser {
  private text: string
  private position: number
  private validationErrors: string[]

  constructor(xmlText: string) {
    this.text = xmlText.trim()
    this.position = 0
    this.validationErrors = []
  }

  /**
   * 解析XML文本为层级结构
   */
  parse(): XmlParseResult {
    try {
      this.position = 0
      this.validationErrors = []

      const rootNode = this.parseNode()

      if (!rootNode) {
        return {
          success: false,
          error: '无法解析XML根节点',
          validationErrors: this.validationErrors,
        }
      }

      // 递归序列化为对象
      const serializedData = this.serializeNode(rootNode)

      return {
        success: true,
        data: serializedData,
        validationErrors:
          this.validationErrors.length > 0 ? this.validationErrors : undefined,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知解析错误',
        validationErrors: this.validationErrors,
      }
    }
  }

  /**
   * 解析单个XML节点（递归处理）
   */
  private parseNode(): XmlNode | null {
    this.skipWhitespace()

    if (this.position >= this.text.length) {
      return null
    }

    // 查找开始标签
    const startTag = this.parseTag()
    if (!startTag || startTag.isClosing) {
      return null
    }

    const node: XmlNode = {
      tagName: startTag.name,
      content: '',
      children: [],
      attributes: startTag.attributes,
      startIndex: startTag.startIndex,
      endIndex: -1,
    }

    // 如果是自闭合标签
    if (startTag.isSelfClosing) {
      node.endIndex = startTag.endIndex
      return node
    }

    const contentStart = this.position

    // 解析子节点和内容
    while (this.position < this.text.length) {
      this.skipWhitespace()

      if (this.position >= this.text.length) {
        this.validationErrors.push(`标签 ${startTag.name} 未正确关闭`)
        break
      }

      // 检查是否是结束标签
      if (this.text[this.position] === '<') {
        const tagStart = this.position
        const tag = this.parseTag()

        if (tag && tag.isClosing && tag.name === startTag.name) {
          // 找到匹配的结束标签
          node.endIndex = tag.endIndex

          // 提取内容（排除子节点）
          const contentEnd = tagStart
          node.content = this.extractTextContent(
            contentStart,
            contentEnd,
            node.children,
          )

          return node
        } else if (tag && !tag.isClosing) {
          // 回退位置，解析子节点
          this.position = tagStart
          const childNode = this.parseNode()
          if (childNode) {
            node.children.push(childNode)
          }
        } else {
          // 无效标签，跳过
          this.position++
        }
      } else {
        this.position++
      }
    }

    // 如果到达这里，说明没有找到结束标签
    this.validationErrors.push(`标签 ${startTag.name} 缺少结束标签`)
    return node
  }

  /**
   * 解析XML标签
   */
  private parseTag(): XmlTag | null {
    if (this.text[this.position] !== '<') {
      return null
    }

    const startIndex = this.position
    this.position++ // 跳过 '<'

    // 检查是否是结束标签
    const isClosing = this.text[this.position] === '/'
    if (isClosing) {
      this.position++ // 跳过 '/'
    }

    // 解析标签名
    const nameStart = this.position
    while (
      this.position < this.text.length &&
      /[a-zA-Z0-9_-]/.test(this.text[this.position])
    ) {
      this.position++
    }

    if (this.position === nameStart) {
      return null // 无效标签名
    }

    const tagName = this.text.substring(nameStart, this.position)
    const attributes: Record<string, string> = {}

    // 解析属性（如果不是结束标签）
    if (!isClosing) {
      this.parseAttributes(attributes)
    }

    // 跳过空白字符
    this.skipWhitespace()

    // 检查自闭合标签
    const isSelfClosing = !isClosing && this.text[this.position] === '/'
    if (isSelfClosing) {
      this.position++ // 跳过 '/'
    }

    // 查找标签结束
    if (this.text[this.position] !== '>') {
      return null // 无效标签
    }

    this.position++ // 跳过 '>'
    const endIndex = this.position

    return {
      name: tagName,
      startIndex,
      endIndex,
      isClosing,
      isSelfClosing,
      attributes,
    }
  }

  /**
   * 解析标签属性
   */
  private parseAttributes(attributes: Record<string, string>): void {
    while (this.position < this.text.length) {
      this.skipWhitespace()

      if (
        this.position >= this.text.length ||
        this.text[this.position] === '>' ||
        this.text[this.position] === '/'
      ) {
        break
      }

      // 解析属性名
      const nameStart = this.position
      while (
        this.position < this.text.length &&
        /[a-zA-Z0-9_-]/.test(this.text[this.position])
      ) {
        this.position++
      }

      if (this.position === nameStart) {
        break
      }

      const attrName = this.text.substring(nameStart, this.position)

      this.skipWhitespace()

      if (this.text[this.position] !== '=') {
        attributes[attrName] = ''
        continue
      }

      this.position++ // 跳过 '='
      this.skipWhitespace()

      // 解析属性值
      let attrValue = ''
      const quote = this.text[this.position]
      if (quote === '"' || quote === "'") {
        this.position++ // 跳过开始引号
        const valueStart = this.position

        while (
          this.position < this.text.length &&
          this.text[this.position] !== quote
        ) {
          this.position++
        }

        attrValue = this.text.substring(valueStart, this.position)

        if (this.position < this.text.length) {
          this.position++ // 跳过结束引号
        }
      }

      attributes[attrName] = attrValue
    }
  }

  /**
   * 提取文本内容（排除子节点）
   */
  private extractTextContent(
    start: number,
    end: number,
    children: XmlNode[],
  ): string {
    let content = this.text.substring(start, end)

    // 移除子节点的内容
    children.forEach(child => {
      const childText = this.text.substring(child.startIndex, child.endIndex)
      content = content.replace(childText, '')
    })

    return content.trim()
  }

  /**
   * 递归序列化节点为对象
   */
  private serializeNode(node: XmlNode): any {
    const result: any = {}

    // 添加属性
    if (Object.keys(node.attributes).length > 0) {
      result['@attributes'] = node.attributes
    }

    // 处理子节点
    if (node.children.length > 0) {
      node.children.forEach(child => {
        const childData = this.serializeNode(child)

        if (result[child.tagName]) {
          // 如果已存在同名节点，转换为数组
          if (!Array.isArray(result[child.tagName])) {
            result[child.tagName] = [result[child.tagName]]
          }
          result[child.tagName].push(childData)
        } else {
          result[child.tagName] = childData
        }
      })
    }

    // 处理文本内容
    if (node.content) {
      // 尝试解析为JSON
      const trimmedContent = node.content.trim()
      if (trimmedContent) {
        if (Object.keys(result).length === 0) {
          // 如果没有子节点和属性，直接返回内容
          try {
            return JSON.parse(trimmedContent)
          } catch {
            return trimmedContent
          }
        } else {
          // 有子节点或属性时，添加文本内容
          try {
            result['#text'] = JSON.parse(trimmedContent)
          } catch {
            result['#text'] = trimmedContent
          }
        }
      }
    }

    return Object.keys(result).length === 0 ? null : result
  }

  /**
   * 跳过空白字符
   */
  private skipWhitespace(): void {
    while (
      this.position < this.text.length &&
      /\s/.test(this.text[this.position])
    ) {
      this.position++
    }
  }

  /**
   * 验证XML标签的完整性
   */
  validateXmlStructure(rootTagName?: string): boolean {
    const parser = new AdvancedXmlParser(this.text)
    const result = parser.parse()

    if (!result.success) {
      this.validationErrors.push(...(result.validationErrors || []))
      return false
    }

    if (rootTagName && result.data && typeof result.data === 'object') {
      const keys = Object.keys(result.data)
      if (keys.length !== 1 || keys[0] !== rootTagName) {
        this.validationErrors.push(
          `期望根标签为 ${rootTagName}，实际为 ${keys.join(', ')}`,
        )
        return false
      }
    }

    return true
  }
}

/**
 * 改进的XML解析函数 - 支持层级提取和递归序列化
 * @param xmlText XML文本
 * @param rootTagName 期望的根标签名（可选）
 * @returns 解析结果
 */
export function parseXmlToObject(
  xmlText: string,
  rootTagName?: string,
): XmlParseResult {
  const parser = new AdvancedXmlParser(xmlText)

  // 验证XML结构
  if (rootTagName && !parser.validateXmlStructure(rootTagName)) {
    return {
      success: false,
      error: 'XML结构验证失败',
      validationErrors: parser['validationErrors'],
    }
  }

  return parser.parse()
}

/**
 * 解析XML格式的tool_use字符串为对象（保持向后兼容）
 * @param xmlText XML文本，格式为 <tool_use><name>...</name><arguments>...</arguments></tool_use>
 * @returns 解析后的对象 { name: string, arguments: object }
 */
export function parseToolUseXml(
  xmlText: string,
): { name: string; arguments: any } | null {
  const result = parseXmlToObject(xmlText, 'tool_use')

  if (!result.success || !result.data) {
    console.error('XML解析失败:', result.error, result.validationErrors)
    return null
  }

  try {
    const toolUseData = result.data.tool_use || result.data

    if (!toolUseData.name || !toolUseData.arguments) {
      console.error('tool_use XML缺少必要字段: name 或 arguments')
      return null
    }

    return {
      name:
        typeof toolUseData.name === 'string'
          ? toolUseData.name
          : String(toolUseData.name),
      arguments: toolUseData.arguments,
    }
  } catch (error) {
    console.error('处理tool_use数据失败:', error)
    return null
  }
}

// 导出类型定义供外部使用
export type { XmlNode, XmlParseResult, XmlTag }
