import { User } from './User'
import { Post } from './Post'
import { Tag } from './Tag'
import { Agent } from './Agent'
import { McpServer } from './McpServer'
import * as ComfyTool from './ComfyTool'

export const lists = {
  User,
  Post,
  Tag,
  Agent,
  McpServer,
  ...ComfyTool,
}
