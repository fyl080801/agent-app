import { config } from "@keystone-6/core"
import { type TypeInfo } from ".keystone/types"
import {
  withAuth,
  session,
  lists,
  extendExpressApp,
  extendHttpServer,
  db
} from "./lib"

export default withAuth(
  config<TypeInfo>({
    db: {
      ...db,
      prismaClientPath: "node_modules/.prisma/client"
    },
    lists,
    session,
    server: {
      extendExpressApp,
      extendHttpServer
    }
  })
)
