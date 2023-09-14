import { Octokit } from '@octokit/rest'
import { paginateRest } from '@octokit/plugin-paginate-rest'
import { logger } from '@4lch4/logger'
import { StarredRepos } from './types'
import { MongoClient } from 'mongodb'

const PER_PAGE_MAX = 100

export class GHUtil {
  private octokit: Octokit

  public constructor(githubToken: string) {
    const OctokitExtended = Octokit.plugin(paginateRest)

    this.octokit = new OctokitExtended({ auth: githubToken, userAgent: '4lch4' })
  }

  /**
   * Retrieves a page of repositories starred by the authenticated user. If no page number is
   * provided, the first page (`1`) is returned.
   *
   * @param page The page number to retrieve, starting at 1, which is also the default.
   *
   * @returns An array of starred repos.
   */
  public async getStarredReposPage(page: number = 1, username?: string): Promise<StarredRepos[]> {
    logger.debug(`[Processor#getStarredReposPage]: Getting page ${page}...`)

    try {
      const URL = username ? `/users/${username}/starred` : '/user/starred'

      const res = await this.octokit.request(`GET ${URL}`, {
        page,
        per_page: PER_PAGE_MAX,
        headers: {
          accept: 'application/vnd.github.star+json',
        },
      })

      return res.data
    } catch (error) {
      logger.error(`[Processor#getStarredReposPage]: Error caught!`)
      logger.error(error)

      return []
    }
  }

  /**
   * Retrieves all of the repositories starred by the authenticated user.
   *
   * @returns An array of all the repos starred by the authenticated user.
   */
  public async getAllStarredRepos(username?: string): Promise<StarredRepos[]> {
    logger.debug(`[Processor#getAllStarredRepos]: Getting all starred repos...`)

    try {
      const allRepos = []
      let pageNumber = 1
      let page = []

      do {
        // Get the current page of repos.
        page = await this.getStarredReposPage(pageNumber, username)

        // Add the current page to the list of all repos.
        allRepos.push(...page)

        // Increment the page number.
        pageNumber += 1
      } while (page.length === PER_PAGE_MAX)

      logger.debug(`[Processor#getAllStarredRepos]: ${allRepos.length} repos retrieved!`)

      return allRepos
    } catch (error) {
      logger.error(`[Processor#getAllStarredRepos]: Error caught!`)
      logger.error(error)

      return []
    }
  }
}

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

  public async saveStarredRepos(repos: StarredRepos[]) {
    try {
      const collection = this.client.db('github').collection('starred')

      const insertRes = await collection.insertMany(repos)

      logger.info(`[DBUtil#saveStarredRepos]: ${insertRes.insertedCount} repos inserted!`)

      return insertRes
    } catch (error) {
      logger.error(`[DBUtil#saveStarredRepos]: Error caught!`)
      logger.error(error)
    }
  }
}

async function main() {
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required!')
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required!')

  const ghUtil = new GHUtil(process.env.GITHUB_TOKEN)
  
  const starredRepos = await ghUtil.getAllStarredRepos()
  
  logger.info(`[main]: ${starredRepos.length} repos returned!`)
  
  const dbUtil = await DBUtil.init(process.env.MONGODB_URI)
  await dbUtil.saveStarredRepos(starredRepos)

  // logger.info(`[main]: ${JSON.stringify(starred[0], null, 2)}`)
  // Bun.write('starred.json', JSON.stringify(starred, null, 2))
}

main()
  .then(() => {
    logger.success(`Execution completed successfully!`)

    // console.log(res.length)
    // console.log(`Execution completed successfully!`)
  })
  .catch(err => {
    console.error(err)
    console.error(`Execution failed!`)
  })
