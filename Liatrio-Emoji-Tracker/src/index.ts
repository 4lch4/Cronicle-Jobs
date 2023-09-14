import App from '@slack/bolt'
import { logger } from '@4lch4/logger'
import { Redis } from '@upstash/redis'
import PQueue from 'p-queue'

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const REDIS_URL = process.env.REDIS_URL
const REDIS_TOKEN = process.env.REDIS_TOKEN
const MAX_CONCURRENCY = Number(process.env.MAX_CONCURRENCY) || 10

if (!SLACK_SIGNING_SECRET) throw new Error('SLACK_SIGNING_SECRET is required!')
if (!SLACK_BOT_TOKEN) throw new Error('SLACK_BOT_TOKEN is required!')
if (!REDIS_URL) throw new Error('REDIS_URL is required!')
if (!REDIS_TOKEN) throw new Error('REDIS_TOKEN is required!')

const queue = new PQueue({ concurrency: MAX_CONCURRENCY })
const redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN })
const app = new App.App({ token: SLACK_SIGNING_SECRET, signingSecret: SLACK_BOT_TOKEN })

async function main() {
  try {
    const res = await app.client.emoji.list()
    const emoji = Object.entries(res.emoji as {})

    logger.info(`Latest Emoji count: ${emoji?.length}`)
    const count = await redis.get('meta:emoji:count')

    if (count === emoji.length) {
      logger.info(`No new emoji found!`)
      process.exit(0)
    }

    await redis.set('meta:emoji:count', emoji.length)

    for (const [key, value] of emoji) {
      queue.add(async () => {
        logger.info(`Setting emoji:${key} to: ${value}`)
        const emojiExists = await redis.exists(`emoji:${key}`)

        // Verify that the emoji doesn't already exist in the database.
        if (emojiExists === 0) {
          await redis.hset(`emoji:${key}`, {
            url: value,
            added: new Date().toISOString(),
          })
        }
      })
    }

    queue.on('empty', () => {
      logger.success(`Queue is empty!`)
    })
  } catch (error) {
    logger.error(error)
  }
}

main()
  .then(() => {
    logger.info('Execution completed successfully!')
  })
  .catch(err => {
    logger.error(`Execution failed!`)
    logger.error(err)
  })
