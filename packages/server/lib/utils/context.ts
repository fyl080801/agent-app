import { KeystoneContext } from '@keystone-6/core/types'
import { Express } from 'express'
import { type TypeInfo } from '.keystone/types'

export interface Context extends Record<string, any> {
  app?: Express
  application?: KeystoneContext<TypeInfo>
  //   cache?: {
  //     get: (key: string) => any
  //     set: (key: string, value: any, timeout?: number) => void
  //     clear: (key: string) => void
  //   }
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

export const initCurrentContext = (): Context => {
  let context = getCurrentContext()

  if (!context) {
    context = {}

    setCurrentInstance(context)
  }

  return context
}
