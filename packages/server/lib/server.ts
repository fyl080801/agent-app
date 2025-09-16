import { Server } from 'http'
import { type TypeInfo } from '.keystone/types'
import { KeystoneContext, MaybePromise } from '@keystone-6/core/types'
import { startFastMcp } from './mcp'

export const extendHttpServer: (
  server: Server,
  context: KeystoneContext<TypeInfo>,
) => MaybePromise<void> = (server, context) => {
  startFastMcp(context)
}
