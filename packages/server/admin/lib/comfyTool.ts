import { gql } from '@keystone-6/core/admin-ui/apollo'
import { QueryParams, useGraphqlClient } from './graphql'

export const useComfyToolClient = () => {
  const client = useGraphqlClient()

  const list = async (params: QueryParams) => {
    const { pageSize, current } = params

    const { data } = await client.query({
      query: gql`
        query ($where: ComfyToolWhereInput, $take: Int!, $skip: Int!) {
          items: comfyTools(take: $take, skip: $skip, where: $where) {
            createdAt
            description
            endNode
            id
            isEnabled
            name
            updatedAt
          }
          total: comfyToolsCount(where: $where)
        }
      `,
      variables: {
        take: pageSize,
        skip: (current - 1) * pageSize,
      },
    })

    return data
  }

  const load = async (id: string) => {
    const { data } = await client.query({
      query: gql`
        query ExampleQuery($where: ComfyToolWhereUniqueInput!) {
          item: comfyTool(where: $where) {
            description
            endNode
            id
            isEnabled
            name
            createdAt
            updatedAt
            workflowDefinition
            workflowParameters {
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
        }
      `,
      variables: {
        where: {
          id,
        },
      },
    })

    return data
  }

  const create = async (payload: any) => {
    const { data } = await client.mutate({
      mutation: gql`
        mutation ($data: ComfyToolCreateInput!) {
          item: createComfyTool(data: $data) {
            description
            endNode
            isEnabled
            name
            workflowDefinition
            workflowParameters {
              id
            }
          }
        }
      `,
      variables: {
        data: payload,
      },
    })

    //   {
    //     "data": {
    //   "description": null,
    //   "endNode": null,
    //   "isEnabled": null,
    //   "name": null,
    //   "workflowDefinition": null,
    //   "workflowParameters": {
    //     "connect": [
    //       {
    //         "id": null
    //       }
    //     ]
    //   }
    // }
    //   }

    return data
  }

  const update = async () => {}

  const remove = async () => {}

  return {
    list,
    load,
    create,
    update,
    remove,
  }
}

// create
// client.mutate({
//   mutation: gql`
//     mutation ($data: ComfyToolCreateInput!) {
//       item: createComfyTool(data: $data) {
//         id
//         label: name
//         __typename
//       }
//     }
//   `,
//   variables: {
//     data: {},
//   },
// })

// delete
// client.mutate({
//   mutation: gql`
//     mutation ($where: [ComfyToolWhereUniqueInput!]!) {
//       deleteComfyTools(where: $where) {
//         id
//         name
//         __typename
//       }
//     }
//   `,
//   variables: {
//     where: [{ id: '' }],
//   },
// })

// update
// client.mutate({
//   mutation: gql`
//     mutation ($data: ComfyToolUpdateInput!, $id: ID!) {
//       item: updateComfyTool(where: { id: $id }, data: $data) {
//         id
//         name
//         description
//         workflowDefinition
//         workflowParameters {
//           id
//           label: name
//           __typename
//         }
//         isEnabled
//         createdAt
//         updatedAt
//         __typename
//       }
//     }
//   `,
//   variables: {
//     id: '',
//     data: {},
//   },
// })
