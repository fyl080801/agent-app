import { setup } from '../utils/core'

setup((app, context) => {
  app?.get('/api/model-providers', async (req, res) => {
    const list = await (
      await context.withRequest(req, res)
    )?.query.ModelProvider.findMany({
      query: 'id name endpoint defaultModel',
    })

    res.json({
      data: {
        items: list,
      },
    })
  })
})
