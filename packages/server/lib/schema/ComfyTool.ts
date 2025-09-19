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
      ],
      defaultValue: 'string',
    }),
    prop: text(),
    isRequired: checkbox({ defaultValue: false }),
    min: integer(),
    max: integer(),
    defaultValue: text({}),
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
