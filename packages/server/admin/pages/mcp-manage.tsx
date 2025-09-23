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
  Divider,
  Card,
} from 'antd'
import { ReloadOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { api } from '../lib/api'
import styles from './mcp-manage.module.scss'
import { useComfyToolClient } from '../lib/comfyTool'
import { useRouter } from 'next/navigation'

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
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })
  // const client = useComfyToolClient()
  const router = useRouter()

  const loadTools = async (current = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const data = await api.get('/ComfyTool', {
        params: {
          current,
          pageSize,
        },
      })

      setTools(data.items)
      setPagination({
        current,
        pageSize,
        total: data.total,
      })
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

  const handleRefresh = () => {
    loadTools()
    message.success('刷新成功')
  }

  const handleCreate = () => {
    // history.pushState({}, '', '/mcp-manage//form')
    router.push('/mcp-manage/form')
  }

  const handleEdit = (tool: ComfyTool) => {
    setEditingTool(tool)
    form.setFieldsValue({
      name: tool.name,
      description: tool.description,
      workflowDefinition: tool.workflowDefinition,
      isEnabled: tool.isEnabled,
      workflowParameters: tool.workflowParameters || [],
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
      // 处理工作流参数
      const workflowParameters = values.workflowParameters || []

      if (editingTool) {
        await api.put(`/comfy-tools/${editingTool.id}`, {
          ...values,
          workflowParameters: workflowParameters.map(
            (param: ComfyToolParameter) => ({
              name: param.name,
              description: param.description,
              dataType: param.dataType,
              prop: param.prop,
              isRequired: param.isRequired,
              min: param.min,
              max: param.max,
              defaultValue: param.defaultValue,
            }),
          ),
        })
        message.success('更新成功')
      } else {
        await api.post('/comfy-tools', {
          ...values,
          workflowParameters: workflowParameters.map(
            (param: ComfyToolParameter) => ({
              name: param.name,
              description: param.description,
              dataType: param.dataType,
              prop: param.prop,
              isRequired: param.isRequired,
              min: param.min,
              max: param.max,
              defaultValue: param.defaultValue,
            }),
          ),
        })
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
      <Card>
        <div className="mb-[16px] flex justify-between items-center">
          <Space>
            <Button type="primary" onClick={handleCreate}>
              创建新工具
            </Button>
            <Button onClick={onRestart}>重启服务</Button>
          </Space>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}></Button>
        </div>

        <Table
          columns={columns}
          dataSource={tools}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showQuickJumper: true,
            showTotal: total => `共 ${total} 条记录`,
          }}
          onChange={pagination => {
            loadTools(pagination.current, pagination.pageSize)
          }}
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

            <Divider orientation="left">参数配置</Divider>
            <Form.List name="workflowParameters">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space
                      key={key}
                      style={{ display: 'flex', marginBottom: 8 }}
                      align="baseline"
                    >
                      <Form.Item
                        {...restField}
                        name={[name, 'name']}
                        rules={[{ required: true, message: '参数名称必填' }]}
                      >
                        <Input placeholder="参数名称" />
                      </Form.Item>
                      <Form.Item {...restField} name={[name, 'description']}>
                        <Input placeholder="参数描述" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'dataType']}
                        rules={[{ required: true, message: '数据类型必选' }]}
                      >
                        <Select style={{ width: 120 }} placeholder="数据类型">
                          <Option value="string">字符串</Option>
                          <Option value="number">数字</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'prop']}
                        rules={[{ required: true, message: '属性名必填' }]}
                      >
                        <Input placeholder="属性名" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'isRequired']}
                        valuePropName="checked"
                      >
                        <Switch
                          checkedChildren="必填"
                          unCheckedChildren="可选"
                        />
                      </Form.Item>
                      <Form.Item {...restField} name={[name, 'min']}>
                        <Input placeholder="最小值" type="number" />
                      </Form.Item>
                      <Form.Item {...restField} name={[name, 'max']}>
                        <Input placeholder="最大值" type="number" />
                      </Form.Item>
                      <Form.Item {...restField} name={[name, 'defaultValue']}>
                        <Input placeholder="默认值" />
                      </Form.Item>
                      <Button type="link" danger onClick={() => remove(name)}>
                        <DeleteOutlined />
                      </Button>
                    </Space>
                  ))}
                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                    >
                      添加参数
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>

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
      </Card>
    </PageContainer>
  )
}
