import { gql, useQuery } from '@keystone-6/core/admin-ui/apollo'
import { useGraphqlClient } from '../lib/graphql'

export const useProfileClient = () => {
  const client = useGraphqlClient()

  const load = async () => {
    const { data } = await client.query({
      query: gql`
        query GlobalProfile {
          item: globalProfile {
            id
            modelProvider
          }
        }
      `,
      fetchPolicy: 'no-cache',
    })

    return data
  }

  const update = async (payload: any) => {
    if (payload.id) {
      const { data } = await client.mutate({
        mutation: gql`
          mutation Mutation($data: GlobalProfileUpdateInput!) {
            updateGlobalProfile(data: $data) {
              modelProvider
            }
          }
        `,
        variables: {
          where: {
            id: payload.id,
          },
          data: { ...payload, id: undefined },
        },
      })

      return data
    } else {
      const { data } = await client.mutate({
        mutation: gql`
          mutation Mutation($data: GlobalProfileCreateInput!) {
            createGlobalProfile(data: $data) {
              id
              modelProvider
            }
          }
        `,
        variables: {
          data: payload,
        },
      })

      return data
    }
  }

  return {
    load,
    update,
  }
}
