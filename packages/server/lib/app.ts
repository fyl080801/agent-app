import { KeystoneContext, MaybePromise } from "@keystone-6/core/types"
import express from "express"
import { TypeInfo } from ".keystone/types"

type AppRouterSetup = (
  app: express.Express,
  context: KeystoneContext<TypeInfo>
) => void

const appSetups: AppRouterSetup[] = []

export const useAppRouter = (setup: AppRouterSetup) => {
  appSetups.push(setup)
}

export const extendExpressApp: (
  app: express.Express,
  context: KeystoneContext<TypeInfo>
) => MaybePromise<void> = (app, context) => {
  app.use(express.json())

  appSetups.forEach((setup) => {
    setup(app, context)
  })
}
