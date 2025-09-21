import { gql } from '@keystone-6/core/admin-ui/apollo'
import { useGraphqlClient } from './graphql'

export const useComfyToolClient = () => {
  const client = useGraphqlClient()

  const create = async (payload: any) => {
    const { data } = await client.mutate({
      mutation: gql`
        mutation ($data: ComfyToolParameterCreateInput!) {
          item: createComfyToolParameter(data: $data) {
            dataType
            defaultValue
            description
            id
            isRandom
            isRequired
            isToolParameter
            max
            maxFloat
            min
            minFloat
            name
            prop
            randomBit
          }
        }
      `,
      variables: {
        data: payload,
      },
    })

    return data
  }

  const update = () => {}

  const remove = () => {}

  return {
    create,
    update,
    remove,
  }
}
