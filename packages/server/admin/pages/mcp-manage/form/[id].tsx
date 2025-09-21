import { LeftOutlined } from '@ant-design/icons'
import { PageContainer } from '@keystone-6/core/admin-ui/components'
import { Heading } from '@keystone-ui/core'
import {
  Button,
  Form,
  Input,
  Select,
  Checkbox,
  Space,
  Card,
  message,
} from 'antd'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useComfyToolClient } from '../../../lib/comfyTool'

const { TextArea } = Input
const { Option } = Select

interface ComfyToolFormData {
  name: string
  description?: string
  workflowDefinition?: any
  endNode?: string
  isEnabled: boolean
}

export default () => {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const client = useComfyToolClient()

  useEffect(() => {
    if (params.id) {
      setIsEdit(true)
      // Load existing data for edit
      loadComfyToolData(params.id as string)
    }
  }, [params.id])

  const loadComfyToolData = async (id: string) => {
    try {
      setLoading(true)
      // TODO: Implement API call to fetch ComfyTool data
      // const response = await fetch(`/api/comfy-tools/${id}`)
      // const data = await response.json()
      // form.setFieldsValue(data)
      const { item } = await client.load(params.id)

      form.setFieldsValue(item)
    } catch (error) {
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (values: ComfyToolFormData) => {
    try {
      setLoading(true)
      const url = isEdit ? `/api/comfy-tools/${params.id}` : '/api/comfy-tools'
      const method = isEdit ? 'PUT' : 'POST'

      // TODO: Implement API call to save ComfyTool data
      // const response = await fetch(url, {
      //   method,
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(values),
      // })

      // if (response.ok) {
      message.success(isEdit ? '更新成功' : '创建成功')
      router.push('/mcp-manage')
      // } else {
      //   throw new Error('保存失败')
      // }
    } catch (error) {
      message.error('保存失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.back()
  }

  return (
    <PageContainer
      header={
        <Heading type="h3">
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={() => router.back()}
          ></Button>
          {isEdit ? '编辑 MCP 工具' : '创建 MCP 工具'}
        </Heading>
      }
    >
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            isEnabled: true,
          }}
        >
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="请输入工具名称" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <TextArea rows={4} placeholder="请输入工具描述" />
          </Form.Item>

          <Form.Item label="工作流定义 (JSON)" name="workflowDefinition">
            {/* <TextArea
              rows={8}
              placeholder='请输入工作流定义 JSON，例如：{"nodes": [], "links": []}'
            /> */}
          </Form.Item>

          <Form.Item label="结束节点" name="endNode">
            <Input placeholder="请输入结束节点名称" />
          </Form.Item>

          <Form.Item label="启用" name="isEnabled" valuePropName="checked">
            <Checkbox>启用此工具</Checkbox>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {isEdit ? '更新' : '创建'}
              </Button>
              <Button onClick={handleCancel}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </PageContainer>
  )
}
