import { get } from 'lodash-es'
import { setup, useApp, useContext } from './core'

export interface RestfulOptions {
  query?: string
  where?: { [key: string]: any }
}

export const restful = (model: string, options: RestfulOptions) => {
  const { query, where } = options

  setup((app, context) => {
    app.get(`/api/${model}`, async (req, res) => {
      const { current = 0, pageSize = 10 } = req.query

      const request = await context.withRequest(req, res)

      const itemsQuery = get(request.query, model).findMany({
        query,
        where,
        take: +pageSize,
        skip: (+current - 1) * +pageSize,
      })

      const totalQuery = get(request.query, model).count({
        where,
      })

      const [items, total] = await Promise.all([itemsQuery, totalQuery])

      res.json({
        items,
        total,
      })
    })

    app.get(`/api/${model}/:id`, async (req, res) => {
      const { id } = req.params

      const request = await context.withRequest(req, res)

      const finded = await get(request.query, model).findOne({
        query,
        where: {
          id,
        },
      })

      res.json({
        item: finded,
      })
    })

    app.post(`/api/${model}`, async (req, res) => {
      const data = req.body

      const request = await context.withRequest(req, res)

      const created = await get(request.query, model).createOne({
        query,
        data: {
          ...data,
          //   createdAt: new Date().valueOf(),
          //   updatedAt: new Date().valueOf(),
        },
      })

      res.json({
        item: created,
      })
    })

    app.put(`/api/${model}/:id`, async (req, res) => {
      const data = req.body
      const { id } = req.params

      const request = await context.withRequest(req, res)

      const updated = await get(request.query, model).updateOne({
        query,
        data: {
          ...data,
          updatedAt: new Date().valueOf(),
        },
        where: {
          id,
        },
      })

      res.json({
        item: updated,
      })
    })

    app.delete(`/api/${model}/:id`, async (req, res) => {
      const { id } = req.params

      const request = await context.withRequest(req, res)

      const deleted = await get(request.query, model).deleteOne({
        query,
        where: {
          id,
        },
      })

      res.json({
        item: deleted,
      })
    })
  })
}
