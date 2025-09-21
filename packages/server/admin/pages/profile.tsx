import { useEffect, useState } from 'react'
import { PageContainer } from '@keystone-6/core/admin-ui/components'
import { Button, Card, Form, message, Space } from 'antd'
import { ModelProviderSelect } from '../components'
import { useProfileClient } from '../api/profile'

interface FormValues {
  defaultProvider: string
}

export default () => {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const { load, update } = useProfileClient()
  const [id, setId] = useState()

  const loadConfig = async () => {
    const result = await load()
    form.setFieldsValue(result.item)
    setId(result?.item?.id)
  }
  useEffect(() => {
    loadConfig()
  }, [])

  // 保存配置
  const saveConfig = async (values: FormValues) => {
    try {
      setSaving(true)
      await update({ ...values, id })
      message.success('保存成功')
    } catch (error: any) {
      console.error('保存失败:', error)
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContainer header={<h3>系统配置</h3>}>
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={saveConfig}
          className="w-full"
        >
          <Form.Item
            name="modelProvider"
            label="默认模型配置"
            rules={[{ required: true, message: '请选择默认模型提供商' }]}
          >
            <ModelProviderSelect className="w-[300px]" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={saving}>
                保存配置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </PageContainer>
  )
}
