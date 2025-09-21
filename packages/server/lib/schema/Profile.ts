import { list } from '@keystone-6/core'
import { allowAll } from '@keystone-6/core/access'
import { json, text } from '@keystone-6/core/fields'

export const GlobalProfile = list({
  access: allowAll,
  isSingleton: true,
  fields: {
    modelProvider: text(),
  },
})
