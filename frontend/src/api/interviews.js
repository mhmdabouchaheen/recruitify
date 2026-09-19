import { apiRequest } from '../lib/apiClient'

export async function getInterviewers() {
  return apiRequest('/hr/interviewers')
}

export async function getApplicationInterviews(applicationId) {
  return apiRequest(`/hr/applications/${applicationId}/interviews`)
}

export async function scheduleInterview(applicationId, payload) {
  return apiRequest(`/hr/applications/${applicationId}/interviews`, { method: 'POST', body: payload })
}

export async function getHrInterview(interviewId) {
  return apiRequest(`/hr/interviews/${interviewId}`)
}

export async function updateHrInterview(interviewId, payload) {
  return apiRequest(`/hr/interviews/${interviewId}`, { method: 'PATCH', body: payload })
}

export async function addInterviewQuestion(interviewId, payload) {
  return apiRequest(`/hr/interviews/${interviewId}/questions`, { method: 'POST', body: payload })
}

export async function generateInterviewQuestions(interviewId, refresh = false) {
  const suffix = refresh ? '?refresh=true' : ''
  return apiRequest(`/hr/interviews/${interviewId}/questions/ai${suffix}`, { method: 'POST' })
}

export async function getHrInterviews() {
  return apiRequest('/hr/interviews')
}

export async function getMyInterviews() {
  return apiRequest('/interviewer/interviews')
}

export async function getMyInterview(interviewId) {
  return apiRequest(`/interviewer/interviews/${interviewId}`)
}

export async function submitInterviewEvaluation(interviewId, payload) {
  return apiRequest(`/interviewer/interviews/${interviewId}/evaluation`, { method: 'PUT', body: payload })
}

export async function getApplicantApplicationInterviews(applicationId) {
  return apiRequest(`/applicant/applications/${applicationId}/interviews`)
}

export function formatInterviewStatus(status) {
  return status.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
}

export function formatInterviewType(type) {
  return type ? type[0].toUpperCase() + type.slice(1) : ''
}
