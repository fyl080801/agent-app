import { useContext } from '../utils/core'

const { DEFAULT_BASE_URL, DEFAULT_API_KEY, DEFAULT_MODEL } = process.env

export const getModelProvider = async () => {
  const context = useContext()

  const defaultProvider = {
    name: 'default',
    baseURL: DEFAULT_BASE_URL,
    apiKey: DEFAULT_API_KEY,
    defaultModel: DEFAULT_MODEL,
  }

  const profile = await context?.query.GlobalProfile.findOne({
    query: 'modelProvider',
    where: {
      id: '1',
    },
  })

  if (!profile) {
    return defaultProvider
  }

  const provider = await context?.query.ModelProvider.findOne({
    query: 'name endpoint apiKey defaultModel',
    where: {
      id: profile.modelProvider,
    },
  })

  if (!provider) {
    return defaultProvider
  }

  return {
    name: provider.name,
    baseURL: provider.endpoint,
    apiKey: provider.apiKey,
    defaultModel: provider.defaultModel,
  }
}
