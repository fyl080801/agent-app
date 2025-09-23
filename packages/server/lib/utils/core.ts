import { RequestHandler } from 'express'
import { Context, initCurrentInstance } from './context'
import { getContext } from '@keystone-6/core/context'
import keystone from '../../keystone'
import PrismaModels from '.prisma/client'
import express from 'express'
import { KeystoneContext } from '@keystone-6/core/types'
import { type TypeInfo } from '.keystone/types'
import http from 'http'

export const JsonAuth: RequestHandler = async (req, res, next) => {
  const context = useContext()

  const payload = await context.withRequest(req)

  if (payload?.session) {
    return next()
  }

  return res.status(403).json({ error: 'no access' })
}

// export const useApp = (init?: Express) => {
//   const context = initCurrentInstance()

//   context.setups = context.setups || []

//   if (!init) {
//     return {
//       setup(fn) {
//         context.setups.push(fn)
//       },
//     }
//   }

//   // 权限
//   // init.use((req, res, next) => {
//   //   if (req['user']) {
//   //     return next()
//   //   }

//   //   return res.status(403).json({ error: 'no access' })
//   // })

//   init.use(json())
//   init.use(text())
//   init.use(raw())
//   init.use(urlencoded({ extended: true }))

//   context.app = init

//   context.setups.forEach(fn => {
//     fn(context.app)
//   })
// }

const setups: Array<
  (app: express.Express, context: KeystoneContext<TypeInfo>) => void
> = []

const postSetups: Array<
  (
    server: http.Server<
      typeof http.IncomingMessage,
      typeof http.ServerResponse
    >,
  ) => void
> = []

export const useInstance = (init?: Context): Context | undefined => {
  const instance = initCurrentInstance()

  if (init?.app) {
    instance.app = init.app
  }

  if (init?.context) {
    instance.context = init.context
  }

  return instance
}

export const useContext = () => {
  return useInstance()?.context || getContext(keystone, PrismaModels)
}

export const useApp = () => {
  return useInstance()?.app
}

export const setup = (
  setup: (app: express.Express, context: KeystoneContext<TypeInfo>) => void,
) => {
  setups.push(setup)
}

export const executeSetup = (
  app: express.Express,
  context: KeystoneContext<TypeInfo>,
) => {
  setups.forEach(setup => {
    const post = setup(app, context)

    if (typeof post === 'function') {
      postSetups.push(post)
    }
  })
}

export const executePostSetup = (
  server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>,
) => {
  postSetups.forEach(setup => {
    setup(server)
  })
}
