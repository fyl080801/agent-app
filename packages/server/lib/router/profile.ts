import { useApp } from '../app'

useApp((app, context) => {
  app.get('/api/model-providers', async (req, res) => {
    const list = await context.query.ModelProvider.findMany({
      query: 'id name endpoint defaultModel',
    })

    res.json({
      data: {
        items: list,
      },
    })
  })
})
