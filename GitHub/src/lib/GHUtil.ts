import { Octokit } from '@octokit/rest'
import { paginateRest } from '@octokit/plugin-paginate-rest'
// import { logger } from '@4lch4/logger'
import { StarredRepository, PER_PAGE_MAX, logger } from './index'

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
  public async getStarredReposPage(page: number = 1, username?: string): Promise<StarredRepository[]> {
    logger.debug(`[GHUtil#getStarredReposPage]: Getting page ${page}...`)

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
      logger.error(`[GHUtil#getStarredReposPage]: Error caught!`)
      logger.error(error)

      return []
    }
  }

  /**
   * Retrieves all of the repositories starred by the authenticated user.
   *
   * @returns An array of all the repos starred by the authenticated user.
   */
  public async getAllStarredRepos(username?: string): Promise<StarredRepository[]> {
    logger.debug(`[GHUtil#getAllStarredRepos]: Getting all starred repos...`)

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

      logger.debug(`[GHUtil#getAllStarredRepos]: ${allRepos.length} repos retrieved!`)

      return allRepos
    } catch (error) {
      logger.error(`[GHUtil#getAllStarredRepos]: Error caught!`)
      logger.error(error)

      return []
    }
  }
}
