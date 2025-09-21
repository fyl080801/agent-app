import 'dotenv/config'
import { config } from '@keystone-6/core'
import { type TypeInfo } from '.keystone/types'
import {
  withAuth,
  session,
  lists,
  extendExpressApp,
  extendHttpServer,
  db,
} from './lib'
import { useAppContext } from './lib/utils/core'

export default withAuth(
  config<TypeInfo>({
    db: {
      ...db,
      prismaClientPath: '.prisma/client',
    },
    lists,
    session,
    server: {
      extendExpressApp: async (app, context) => {
        await useAppContext(context)
        extendExpressApp(app, context)
      },
      extendHttpServer,
    },
  }),
)
