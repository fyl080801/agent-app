import { useApolloClient } from '@keystone-6/core/admin-ui/apollo'

export const useGraphqlClient = () => {
  const client = useApolloClient()

  return client
}

export interface QueryParams {
  pageSize: number
  current: number
  [key: string]: any
}
