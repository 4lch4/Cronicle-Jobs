// import { logger } from '@4lch4/logger'
import { LibHN, logger, HNItem } from './lib/index.js'
import { Collection, MongoClient, ObjectId } from 'mongodb'
import PQueue from 'p-queue'

logger.profile('main')

type FullHNItem = HNItem & {
  _id: ObjectId
  kids?: FullHNItem[]
}

const start = Date.now()
const MONGODB_URI = process.env.MONGODB_URI
const MAX_CONCURRENCY = Number(process.env.MAX_CONCURRENCY) || 5

if (!MONGODB_URI) throw new Error('MONGODB_URI is required!')

const pQueue = new PQueue({ concurrency: MAX_CONCURRENCY })
const client = new MongoClient(MONGODB_URI)
const libHn = new LibHN()

type HNList = 'top' | 'new' | 'best' | 'ask' | 'show' | 'job'

// #region Database Functions
async function getCollection(list: HNList): Promise<Collection<FullHNItem>> {
  await client.connect()

  return client.db('hackernews').collection<FullHNItem>(list)
}

async function upsertFullItem(item: FullHNItem, collection: Collection<FullHNItem>) {
  const existingItem = await collection.findOne({ id: item.id })

  if (existingItem) {
    if (existingItem?.descendants === item.descendants) {
      logger.debug({
        message: `Item ${item.id} already exists in the database with same number of descendants!`,
        functionName: 'saveFullItemToDB',
      })

      return
    }

    logger.debug({
      message: `Item ${item.id} already exists in the database but has a different number of descendants, updating!`,
      functionName: 'saveFullItemToDB',
    })

    await collection.updateOne(
      { id: item.id },
      { $set: { descendants: item.descendants, kids: item.kids } }
    )

    logger.debug({
      message: `Updated document in the top collection.`,
      functionName: 'saveFullItemToDB',
    })

    return
  }

  await collection.insertOne(item)

  logger.info({
    message: 'Inserted document into the top collection.',
    functionName: 'saveFullItemToDB',
  })
}
// #endregion Database Functions

// #region HackerNews Functions
async function getItem(id: number): Promise<HNItem> {
  const res = await libHn.getItem(id)

  return res.data
}

async function getFullItem(item: HNItem): Promise<FullHNItem> {
  const fullItem: FullHNItem = { ...item, kids: [], _id: new ObjectId(item.id) }
  if (!item.kids) return fullItem

  for (const kidId of item.kids) {
    logger.debug({
      message: `[${item.id}]: Processing kid: ${kidId}...`,
      functionName: 'getFullItem',
    })

    const kid = await getItem(kidId)
    const fullKid = await getFullItem(kid)

    fullItem.kids?.push(fullKid)
  }

  return fullItem
}
// #endregion HackerNews Functions

async function main() {
  const topStories = await libHn.getTopStories(100)

  // logger.info(`[main]: `)
  logger.info({
    message: `${topStories.data.length} Top Stories returned...`,
    functionName: 'main',
  })

  const collection = await getCollection('top')

  for (const story of topStories.data) {
    pQueue.add(async () => {
      // logger.debug(`[main]: `)
      logger.debug({ message: `Processing story: ${story.id}...`, functionName: 'main' })
      const fullStory = await getFullItem(story)
      await upsertFullItem(fullStory, collection)
    })
  }

  return pQueue
}

main()
  .then(queue => {
    queue.on('empty', () => {
      if (queue.size === 0) {
        const end = Date.now()

        logger.log('success', {
          message: 'Queue is completely empty!',
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          elapsedMs: end - start,
          functionName: 'main',
        })

        // logger.debug({
        //   end,
        //   start,
        //   elapsedMs: end - start,
        //   functionName: 'main',
        // })

        logger.profile('main')

        process.exit(0)
      }
    })
  })
  .catch(err => {
    logger.error('[main:catch]: Error encountered!')
    logger.error(err)
    process.exit(1)
  })
