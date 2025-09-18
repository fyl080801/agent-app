import {
  DatabaseProvider,
  IdFieldConfig,
  KeystoneContext,
} from '@keystone-6/core/types'
import { TypeInfo } from '.keystone/types'
import { DB_PROVIDER, DB_URL } from './envs'

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
  provider: DB_PROVIDER,
  url: DB_URL,
}
