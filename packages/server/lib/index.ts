import { config } from '@keystone-6/core'
import { type TypeInfo } from '.keystone/types'
import { withAuth, session } from './auth'
import { db } from './db'
import { executePostSetup, executeSetup, useInstance } from './utils/core'
import { lists } from './schema'

// server要放前面，express的注册行为只有先use的中间件才能在后续添加router的时候生效
import './server'
import './router'

export const keystone = withAuth(
  config<TypeInfo>({
    db: {
      ...db,
      prismaClientPath: '.prisma/client',
    },
    lists,
    session,
    server: {
      extendExpressApp: (app, context) => {
        // app.use(express.json())
        // app.use(express.text())
        // app.use(
        //   express.urlencoded({
        //     extended: true,
        //   }),
        // )

        useInstance({ app, context })
        executeSetup(app, context)
      },
      extendHttpServer: server => {
        executePostSetup(server)
      },
    },
  }),
)

export default keystone
