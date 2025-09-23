import { KeystoneContext } from '@keystone-6/core/types'
import express from 'express'
// import http from 'http'
import { type TypeInfo } from '.keystone/types'

export interface Context extends Record<string, any> {
  app?: express.Express
  context?: KeystoneContext<TypeInfo>
  // server?: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>
}

let currentInstance: Context

export const setCurrentInstance = (instance: Context) => {
  currentInstance = instance
}

export const getCurrentContext = (): Context => {
  return currentInstance
}

// export const releaseCurrentContext = () => {
//   currentInstance = null
// }

export const initCurrentInstance = (): Context => {
  let context = getCurrentContext()

  if (!context) {
    context = {}

    setCurrentInstance(context)
  }

  return context
}
