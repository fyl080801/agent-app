import {
  DatabaseProvider,
  IdFieldConfig,
  KeystoneContext
} from "@keystone-6/core/types"
import { TypeInfo } from ".keystone/types"
import { DATABASE_PROVIDER, DATABASE_URL } from "./envs"

type DbType = {
  provider: DatabaseProvider
  url: string
  shadowDatabaseUrl?: string
  onConnect?: (args: KeystoneContext<TypeInfo>) => Promise<void>
  idField?: IdFieldConfig
  prismaClientPath?: string
  prismaSchemaPath?: string

  extendPrismaSchema?: (schema: string) => string
  extendPrismaClient?: (client: any) => any
}

export const db: DbType = {
  provider: DATABASE_PROVIDER,
  url: DATABASE_URL
}
