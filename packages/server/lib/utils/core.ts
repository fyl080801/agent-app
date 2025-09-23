import { RequestHandler } from 'express'
import { Context, initCurrentInstance } from './context'

export const JsonAuth: RequestHandler = async (req, res, next) => {
  const context = useContext()

  const payload = await context?.withRequest(req)

  if (payload?.session) {
    return next()
  }

  return res.status(403).json({ error: 'no access' })
}

// export const useApp = (init?: Express) => {
//   const context = initCurrentInstance()

//   context.setups = context.setups || []

//   if (!init) {
//     return {
//       setup(fn) {
//         context.setups.push(fn)
//       },
//     }
//   }

//   // 权限
//   // init.use((req, res, next) => {
//   //   if (req['user']) {
//   //     return next()
//   //   }

//   //   return res.status(403).json({ error: 'no access' })
//   // })

//   init.use(json())
//   init.use(text())
//   init.use(raw())
//   init.use(urlencoded({ extended: true }))

//   context.app = init

//   context.setups.forEach(fn => {
//     fn(context.app)
//   })
// }

const setups: Array<() => void> = []

export const useInstance = (init?: Context): Context | undefined => {
  const instance = initCurrentInstance()

  if (init?.app) {
    instance.app = init.app
  }

  if (init?.context) {
    instance.context = init.context
  }

  if (init?.server) {
    instance.server = init.server
  }

  return instance
}

export const useContext = () => {
  return useInstance()?.context
}

export const useApp = () => {
  return useInstance()?.app
}

export const useServer = () => {
  return useInstance()?.server
}

export const setup = (setup: () => void) => {
  setups.push(setup)
}

export const executeSetup = () => {
  setups.forEach(setup => {
    setup()
  })
}
