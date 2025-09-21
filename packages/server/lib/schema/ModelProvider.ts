import { list } from '@keystone-6/core'
import { allowAll } from '@keystone-6/core/access'
import { password, relationship, text } from '@keystone-6/core/fields'

export const ModelProvider = list({
  access: allowAll,
  fields: {
    name: text({
      label: '名称',
      validation: { isRequired: true },
    }),
    endpoint: text({ label: '服务地址', validation: { isRequired: true } }),
    apiKey: text({ label: '密钥' }),
    defaultModel: text({ label: '默认模型' }),
  },
})
