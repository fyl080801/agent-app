// import { Strapi } from '@strapi/strapi';
import { Express, RequestHandler } from 'express'
import type { KeystoneContext } from '@keystone-6/core/types'
import { initCurrentContext } from './context'
import { json, text, raw, urlencoded } from 'body-parser'
import { config } from '@keystone-6/core'
import { withAuth } from '../auth'
import { type TypeInfo } from '.keystone/types'
import { db } from '../db'
import { lists } from '../schema'

// export const useStrapi = (init?: Strapi) => {
//   const context = initCurrentContext();

//   if (!init) {
//     return context.strapi;
//   }

//   context.strapi = init;

//   return init;
// };

export const JsonAuth: RequestHandler = async (req, res, next) => {
  const context = await useAppContext()

  const { session } = await context.withRequest(req)

  if (session) {
    return next()
  }

  return res.status(403).json({ error: 'no access' })
}

// export const useApp = (init?: Express) => {
//   const context = initCurrentContext()

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

export const useAppContext = async (
  init?: KeystoneContext<TypeInfo>,
): Promise<KeystoneContext<TypeInfo>> => {
  const context = initCurrentContext()

  if (!init) {
    if (context.application) {
      return context.application
    } else {
      return new Promise(resolve => {
        withAuth(
          config({
            db: {
              ...db,
              prismaClientPath: '.prisma/client',
            },
            lists,
            server: {
              extendExpressApp(app, context) {
                resolve(context)
              },
            },
          }),
        )
      })
    }
  }

  context.application = init

  return init
}
