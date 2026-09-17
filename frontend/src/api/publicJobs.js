import { buildJobQuery, mapJob } from './jobs'
import { apiRequest } from '../lib/apiClient'

export async function getPublicJobs(params) {
  const jobs = await apiRequest(`/public/jobs${buildJobQuery(params)}`)
  return jobs.map(mapJob)
}

export async function getPublicJob(jobId) {
  const job = await apiRequest(`/public/jobs/${jobId}`)
  return mapJob(job)
}
