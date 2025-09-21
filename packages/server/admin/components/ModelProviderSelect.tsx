import { Select } from 'antd'
import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export interface ModelProvider {
  id: string
  name: string
}

export interface ModelProviderSelectProps {
  value?: string
  onChange?: (value: string) => void
  className?: string
}

export const ModelProviderSelect = ({
  value,
  onChange,
  className,
}: ModelProviderSelectProps) => {
  const [selectedProvider, setSelectedProvider] = useState<string>(value || '')
  const [loading, setLoading] = useState(true)
  const [modelProviders, setModelProviders] = useState<ModelProvider[]>([])

  const load = async () => {
    try {
      setLoading(true)
      const result = await api.get('/model-providers')
      setModelProviders(result.data.items)
    } catch (error) {
      console.error('Failed to load model providers:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    setSelectedProvider(value || '')
  }, [value])

  const handleChange = (newValue: string) => {
    setSelectedProvider(newValue)
    if (onChange) {
      onChange(newValue)
    }
  }

  return (
    <div className={className}>
      <Select
        value={selectedProvider}
        onChange={handleChange}
        loading={loading}
        options={[
          ...modelProviders.map(provider => ({
            value: provider.id,
            label: provider.name,
          })),
        ]}
      />
    </div>
  )
}
