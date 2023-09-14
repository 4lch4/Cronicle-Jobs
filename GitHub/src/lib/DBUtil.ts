// import { logger } from '@4lch4/logger'
import { MongoClient } from 'mongodb'
import { StarredRepository, logger } from './index'

export class DBUtil {
  private client: MongoClient

  private constructor(dbUri: string) {
    this.client = new MongoClient(dbUri, { appName: '@4cron/jobs-github' })
  }

  public static async init(dbUri: string): Promise<DBUtil> {
    const dbUtil = new DBUtil(dbUri)

    await dbUtil.client.connect()

    return dbUtil
  }

  public async close() {
    return this.client.close()
  }

  public getCollection() {
    return this.client.db('github').collection('starred')
  }

  public async saveStarredRepo(starredRepo: StarredRepository) {
    try {
      logger.info(`[DBUtil#saveStarredRepo]: Saving ${starredRepo.repo.full_name} to the DB...`)

      const collection = this.getCollection()

      const insertRes = await collection.insertOne(starredRepo)

      logger.info(`[DBUtil#saveStarredRepo]: ${starredRepo.repo.full_name} inserted into the DB!`)

      return insertRes
    } catch (error) {
      logger.error(`[DBUtil#saveStarredRepo]: Error caught!`)
      logger.error(error)
    }
  }

  public async getStarredRepo(repoFullName: string) {
    try {
      logger.info(`[DBUtil#getStarredRepo]: Getting ${repoFullName} from the DB...`)

      const collection = this.getCollection()

      const res = await collection.findOne({ 'repo.full_name': repoFullName })

      return res
    } catch (error) {
      logger.error(`[DBUtil#getStarredRepo]: Error caught!`)
      logger.error(error)

      return null
    }
  }
}
