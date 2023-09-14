import { WinstonTransport } from '@axiomhq/winston'
import { arch, platform } from 'os'
import Winston, { transports as WinstonTransports } from 'winston'

// class Logger extends Winston.Logger {
//   success(message: string | object, meta?: Record<string, unknown>): Logger {
//     if (typeof message === 'object') this.log('success', message)
//     elsethis.log('success', message, meta)
//     return this
//   }
//   // success(message: string, meta?: any) {
//   //   this.log('success', message, meta)
//   // }
// }

export const logger = Winston.createLogger({
  defaultMeta: {
    service: '@4cron/hacker-news',
    nodeEnv: process.env.NODE_ENV || 'development',
    hostname: process.env.HOSTNAME || 'localhost',
    arch: arch(),
    platform: platform(),
  },
  level: process.env.LOG_LEVEL || process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels: { ...Winston.config.npm.levels, success: -1 },
  transports: [
    new WinstonTransport({
      dataset: process.env.AXIOM_DATA_SET,
      token: process.env.AXIOM_TOKEN,
      orgId: process.env.AXIOM_ORG_ID,
    }),
    new WinstonTransports.Console({
      format: Winston.format.combine(
        Winston.format.colorize({ colors: { success: 'cyan', info: 'gray' } }),
        Winston.format.simple()
      ),
    }),
  ],
})

// export const logger: Logger = new Logger({
//   defaultMeta: {
//     service: '@4cron/hacker-news',
//     nodeEnv: process.env.NODE_ENV || 'development',
//     hostname: process.env.HOSTNAME || 'localhost',
//     arch: arch(),
//     platform: platform(),
//   },
//   level: process.env.LOG_LEVEL || process.env.NODE_ENV === 'production' ? 'info' : 'debug',
//   levels: { ...Winston.config.npm.levels, success: -1 },
//   transports: [
//     new WinstonTransport({
//       dataset: process.env.AXIOM_DATA_SET,
//       token: process.env.AXIOM_TOKEN,
//       orgId: process.env.AXIOM_ORG_ID,
//     }),
//     new WinstonTransports.Console({
//       format: Winston.format.combine(
//         Winston.format.colorize({ colors: { success: 'cyan', info: 'gray' } }),
//         Winston.format.simple()
//       ),
//     }),
//   ],
// })

// logger.success = () => {}
