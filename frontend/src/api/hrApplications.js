import { apiRequest } from '../lib/apiClient'

const statusToApi = {
  Applied: 'applied',
  'Under Review': 'under_review',
  Shortlisted: 'shortlisted',
  'Interview Scheduled': 'interview_scheduled',
  'Interview Completed': 'interview_completed',
  Selected: 'selected',
  Rejected: 'rejected',
  Withdrawn: 'withdrawn',
}

export const hrStatusOptions = [
  'Applied',
  'Under Review',
  'Shortlisted',
  'Interview Scheduled',
  'Interview Completed',
  'Selected',
  'Rejected',
]

export function formatApplicationStatus(status) {
  return status.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
}

export function buildHrApplicationQuery(params = {}) {
  const query = new URLSearchParams()
  if (params.skip) query.set('skip', params.skip)
  if (params.limit) query.set('limit', params.limit)
  if (params.job_id) query.set('job_id', params.job_id)
  if (params.status) query.set('status', statusToApi[params.status] || params.status)
  if (params.search?.trim()) query.set('search', params.search.trim())
  const value = query.toString()
  return value ? `?${value}` : ''
}

export async function getHrApplications(params) {
  return apiRequest(`/hr/applications${buildHrApplicationQuery(params)}`)
}

export async function getHrApplication(applicationId) {
  return apiRequest(`/hr/applications/${applicationId}`)
}

export async function updateHrApplicationStatus(applicationId, status, options = {}) {
  const nextStatus = statusToApi[status] || status
  return apiRequest(`/hr/applications/${applicationId}/status`, {
    method: 'PATCH',
    body: {
      status: nextStatus,
      ...(nextStatus === 'rejected' ? { rejection_feedback: options.rejectionFeedback } : {}),
    },
  })
}

export async function getHrApplicationNotes(applicationId) {
  return apiRequest(`/hr/applications/${applicationId}/notes`)
}

export async function createHrApplicationNote(applicationId, content) {
  return apiRequest(`/hr/applications/${applicationId}/notes`, { method: 'POST', body: { content } })
}

export async function getHrApplicationActivities(applicationId) {
  return apiRequest(`/hr/applications/${applicationId}/activities`)
}

export async function getHrApplicationAiAnalysis(applicationId) {
  return apiRequest(`/hr/applications/${applicationId}/ai-analysis`)
}

export async function runHrApplicationAiAnalysis(applicationId, refresh = false) {
  const suffix = refresh ? '?refresh=true' : ''
  return apiRequest(`/hr/applications/${applicationId}/ai-analysis${suffix}`, { method: 'POST' })
}
