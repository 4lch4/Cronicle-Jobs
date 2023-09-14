/** The max items to return per page from the GitHub API. */
export const PER_PAGE_MAX = 100

/** The max amount of processes to run at once in a P-Queue. */
export const CONCURRENCY_MAX = Number(process.env.CONCURRENCY_MAX) || 10
