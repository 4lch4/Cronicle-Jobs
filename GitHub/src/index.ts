// import { logger } from '@4lch4/logger'
import { GHUtil, logger, DBUtil, CONCURRENCY_MAX } from './lib'
import PQueue from 'p-queue'

const start = Date.now()

async function main() {
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required!')
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required!')

  const ghUtil = new GHUtil(process.env.GITHUB_TOKEN)

  const starredRepos = await ghUtil.getAllStarredRepos()

  logger.info(`[main]: ${starredRepos.length} repos returned!`)

  const queue = new PQueue({ concurrency: CONCURRENCY_MAX })
  const dbUtil = await DBUtil.init(process.env.MONGODB_URI)

  const newRepos = []

  for (const starredRepo of starredRepos) {
    queue.add(async () => {
      const existingRepo = await dbUtil.getStarredRepo(starredRepo.repo.full_name)

      if (existingRepo) {
        logger.info(`[main]: ${starredRepo.repo.full_name} already exists in the DB, skipping.`)
      } else {
        await dbUtil.saveStarredRepo(starredRepo)
        newRepos.push(starredRepo)
      }
    })
  }

  queue.on('empty', async () => {
    if (queue.size === 0) {
      const end = Date.now()

      logger.log('success', {
        message: `${newRepos.length} new repos added to the DB.`,
        functionName: 'main:then',
      })

      logger.log('success', {
        message: `Job has completed successfully in ${(end - start) / 1000} seconds!`,
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        duration: end - start,
        functionName: 'main:then',
      })

      await dbUtil.close()

      process.exit(0)
    }
  })

  return queue
}

main()
  .then(queue => {
    logger.info(`[main:then]: Queue returned from main!`)
  })
  .catch(err => {
    logger.error(`Execution failed, error caught!`)
    logger.error(err)
  })
