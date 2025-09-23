import { startFastMcp } from './mcp'
import { setup, useApp, useContext } from './utils/core'
import express from 'express'

// mcp server
setup(() => {
  const context = useContext()

  startFastMcp(context)
})

// express
setup(() => {
  const app = useApp()

  app?.use(express.json())
  app?.use(express.text())
  app?.use(express.urlencoded())
})
