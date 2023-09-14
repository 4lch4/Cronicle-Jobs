import { WinstonTransport } from '@axiomhq/winston'
import { arch, platform } from 'os'
import Winston, { transports as WinstonTransports } from 'winston'

export const logger = Winston.createLogger({
  defaultMeta: {
    service: '@4cron/job-github',
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
