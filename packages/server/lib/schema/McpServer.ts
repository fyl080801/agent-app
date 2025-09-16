import { list } from '@keystone-6/core'
import { allowAll } from '@keystone-6/core/access'
import {
  text,
  relationship,
  integer,
  checkbox,
  timestamp,
} from '@keystone-6/core/fields'

export const McpServer = list({
  // WARNING
  //   for this starter project, anyone can create, query, update and delete anything
  //   if you want to prevent random people on the internet from accessing your data,
  //   you can find out more at https://keystonejs.com/docs/guides/auth-and-access-control
  access: allowAll,

  // this is the fields for our McpServer list
  fields: {
    name: text({ validation: { isRequired: true } }),
    command: text({ validation: { isRequired: true } }),
    description: text(),
    isEnabled: checkbox({ defaultValue: true }),
    timeout: integer({ defaultValue: 30000 }),
    maxRetries: integer({ defaultValue: 3 }),
    lastHeartbeat: timestamp(),
    createdAt: timestamp({ defaultValue: { kind: 'now' } }),
    updatedAt: timestamp({ defaultValue: { kind: 'now' } }),
  },
})
