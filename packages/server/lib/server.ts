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
  app.use(
    express.urlencoded({
      extended: true,
    }),
  )
})

// setup(app => {
//   app.use((req, res, next) => {
//     try {
//       next()
//     } catch (err) {
//       console.error('Server error:', err)
//       res.status(500).json({
//         error: err instanceof Error ? err.message : 'Internal server error',
//       })
//     }
//   })
// })
