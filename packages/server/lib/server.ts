import { startFastMcp } from './mcp'
import { setup } from './utils/core'
import express from 'express'

// mcp server
setup((app, context) => {
  return () => startFastMcp(context)
})

// express
setup(app => {
  app?.use(express.json())
  app?.use(express.text())
  app?.use(express.urlencoded())
})
