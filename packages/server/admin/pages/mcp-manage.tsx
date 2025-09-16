import { PageContainer } from '@keystone-6/core/admin-ui/components'
import { Heading } from '@keystone-ui/core'
import { useState, useEffect } from 'react'
import {
  Button,
  Table,
  Modal,
  Form,
  Input,
  Switch,
  Select,
  Space,
  message,
  Typography,
} from 'antd'
import { api } from '../lib/api'
import styles from './mcp-manage.module.scss'
import { gql, useApolloClient } from '@keystone-6/core/admin-ui/apollo'

const { TextArea } = Input
const { Option } = Select
const { Title } = Typography

interface ComfyToolParameter {
  id?: string
  name: string
  description: string
  dataType: 'string' | 'number'
  prop: string
  isRequired: boolean
  min?: number
  max?: number
  defaultValue?: string
}

interface ComfyTool {
  id: string
  name: string
  description: string
  workflowDefinition: string
  workflowParameters: ComfyToolParameter[]
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

export default () => {
  const [tools, setTools] = useState<ComfyTool[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingTool, setEditingTool] = useState<ComfyTool | null>(null)
  const [form] = Form.useForm()
  const [parameterForm] = Form.useForm()

  const client = useApolloClient()

  const loadTools = async () => {
    setLoading(true)
    try {
      const query = 'ComfyTool'
      const name = 'comfyTools'
      const { data } = await client.query<{ comfyTools: ComfyTool[] }>({
        query: gql`
          query ${query}($take: Int, $skip: Int) {
            ${name}(take: $take, skip: $skip) {
              id
              name
              description
              isEnabled
              createdAt
            }
          }
        `,
        variables: {
          take: 10,
          skip: 0,
        },
      })
      setTools(data.comfyTools)
    } catch (error) {
      console.log(error)
      message.error('加载工具列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTools()
  }, [])

  const onRestart = () => {
    api.put('/mcp/restart')
    message.success('服务重启中...')
  }

  const handleCreate = () => {
    setEditingTool(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (tool: ComfyTool) => {
    setEditingTool(tool)
    form.setFieldsValue({
      name: tool.name,
      description: tool.description,
      workflowDefinition: tool.workflowDefinition,
      isEnabled: tool.isEnabled,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个工具吗？',
      onOk: async () => {
        try {
          await api.delete(`/comfy-tools/${id}`)
          message.success('删除成功')
          loadTools()
        } catch (error) {
          message.error('删除失败')
        }
      },
    })
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingTool) {
        await api.put(`/comfy-tools/${editingTool.id}`, values)
        message.success('更新成功')
      } else {
        await api.post('/comfy-tools', values)
        message.success('创建成功')
      }
      setModalVisible(false)
      loadTools()
    } catch (error) {
      message.error(editingTool ? '更新失败' : '创建失败')
    }
  }

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '启用状态',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      render: (enabled: boolean) => <Switch checked={enabled} disabled />,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (record: ComfyTool) => (
        <Space size="middle">
          <Button type="link" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" danger onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <PageContainer header={<Heading type="h3">ComfyMCP管理</Heading>}>
      <div className={styles.container}>
        <div className="mb-[16px]">
          <Space>
            <Button type="primary" onClick={handleCreate}>
              创建新工具
            </Button>
            <Button onClick={onRestart}>重启服务</Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={tools}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />

        <Modal
          title={editingTool ? '编辑工具' : '创建工具'}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width={800}
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              name="name"
              label="名称"
              rules={[{ required: true, message: '请输入工具名称' }]}
            >
              <Input />
            </Form.Item>

            <Form.Item name="description" label="描述">
              <TextArea rows={3} />
            </Form.Item>

            <Form.Item
              name="workflowDefinition"
              label="工作流定义"
              rules={[{ required: true, message: '请输入工作流定义' }]}
            >
              <TextArea rows={6} />
            </Form.Item>

            <Form.Item
              name="isEnabled"
              label="启用状态"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  {editingTool ? '更新' : '创建'}
                </Button>
                <Button onClick={() => setModalVisible(false)}>取消</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </PageContainer>
  )
}
