import { setup, useApp, useContext } from '../utils/core'

setup(() => {
  const app = useApp()
  const context = useContext()

  app?.get('/api/model-providers', async (req, res) => {
    const list = await context?.query.ModelProvider.findMany({
      query: 'id name endpoint defaultModel',
    })

    res.json({
      data: {
        items: list,
      },
    })
  })
})
