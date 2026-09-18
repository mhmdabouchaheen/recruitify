import { apiRequest } from '../lib/apiClient'

export async function submitApplication(payload) {
  return apiRequest('/applicant/applications', { method: 'POST', body: payload })
}

export async function getApplications() {
  return apiRequest('/applicant/applications')
}

export async function getApplication(applicationId) {
  return apiRequest(`/applicant/applications/${applicationId}`)
}

export async function withdrawApplication(applicationId) {
  return apiRequest(`/applicant/applications/${applicationId}/withdraw`, { method: 'PATCH' })
}
