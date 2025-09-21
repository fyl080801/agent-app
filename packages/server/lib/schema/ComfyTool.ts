import { list } from '@keystone-6/core'
import { allowAll } from '@keystone-6/core/access'
import {
  text,
  relationship,
  integer,
  checkbox,
  timestamp,
  select,
  json,
  float,
} from '@keystone-6/core/fields'

export const ComfyToolParameter = list({
  access: allowAll,
  ui: {
    isHidden: true,
  },
  fields: {
    name: text({ validation: { isRequired: true } }),
    description: text({
      ui: { displayMode: 'textarea' },
    }),
    dataType: select({
      label: '类型',
      validation: { isRequired: true },
      options: [
        {
          label: '字符串',
          value: 'string',
        },
        {
          label: '数字',
          value: 'number',
        },
        {
          label: '浮点数',
          value: 'float',
        },
      ],
      defaultValue: 'string',
    }),
    prop: text({ label: '属性' }),
    isRequired: checkbox({ defaultValue: false }),
    isToolParameter: checkbox({ label: '作为工具参数', defaultValue: true }),
    min: integer(),
    max: integer(),
    minFloat: float(),
    maxFloat: float(),
    isRandom: checkbox({ label: '随机数字' }),
    randomBit: select({
      label: '随机数位',
      options: [
        { value: '4', label: '4' },
        { value: '8', label: '8' },
        { value: '16', label: '16' },
        { value: '32', label: '32' },
        { value: '64', label: '64' },
      ],
      defaultValue: '64',
    }),
    defaultValue: text({
      label: '默认值',
    }),
    comfyTool: relationship({
      ref: 'ComfyTool.workflowParameters',
      many: false,
    }),
  },
})

export const ComfyTool = list({
  access: allowAll,

  fields: {
    name: text({
      validation: { isRequired: true },
      isIndexed: 'unique',
      label: '名称',
    }),
    description: text({
      label: '描述',
      ui: { displayMode: 'textarea' },
    }),
    workflowDefinition: json({
      label: '工作流定义',
      ui: {},
      // validation: { isRequired: true },
    }),
    workflowParameters: relationship({
      ref: 'ComfyToolParameter.comfyTool',
      many: true,
      label: '参数',
      ui: {
        displayMode: 'cards',
        cardFields: ['name', 'description', 'dataType', 'prop', 'isRequired'],
        inlineCreate: {
          fields: [
            'name',
            'description',
            'dataType',
            'prop',
            'isRequired',
            'min',
            'max',
            'defaultValue',
          ],
        },
        inlineEdit: {
          fields: [
            'name',
            'description',
            'dataType',
            'prop',
            'isRequired',
            'min',
            'max',
            'defaultValue',
          ],
        },
        linkToItem: true,
        inlineConnect: true,
      },
    }),
    endNode: text({
      label: '结束节点',
      ui: {},
      db: { isNullable: true },
      validation: {},
    }),
    isEnabled: checkbox({ defaultValue: true, label: '启用' }),
    createdAt: timestamp({ defaultValue: { kind: 'now' } }),
    updatedAt: timestamp({ defaultValue: { kind: 'now' } }),
  },
  ui: {
    listView: {
      initialColumns: [
        'name',
        'description',
        'isEnabled',
        'createdAt',
        'updatedAt',
      ],
    },
  },
})
