import { startFastMcp } from './mcp'
import { setup } from './utils/core'
import express from 'express'

// mcp server
setup((app, context) => {
  return () => {
    startFastMcp(context)
  }
})

// express
setup(app => {
  app.use(express.json())
  app.use(express.text())
  app.use(express.urlencoded())
})

setup(app => {
  app.use(async (req, res, next) => {
    try {
      await Promise.resolve(next())
    } catch (err) {
      console.error('Server error:', err)
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Internal server error',
      })
    }
  })
})
