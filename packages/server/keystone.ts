import 'dotenv/config'
import { config } from '@keystone-6/core'
import { type TypeInfo } from '.keystone/types'
import { withAuth, session, lists, db, executePostSetup } from './lib'
import { executeSetup, useInstance } from './lib'

export default withAuth(
  config<TypeInfo>({
    db: {
      ...db,
      prismaClientPath: '.prisma/client',
    },
    lists,
    session,
    server: {
      extendExpressApp: (app, context) => {
        useInstance({ app })
        useInstance({ context })
        executeSetup(app, context)
      },
      extendHttpServer: server => {
        executePostSetup(server)
      },
    },
  }),
)
