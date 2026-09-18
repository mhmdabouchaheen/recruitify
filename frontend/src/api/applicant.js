import { apiRequest } from '../lib/apiClient'

export async function getApplicantProfile() {
  return apiRequest('/applicant/profile')
}

export async function updateApplicantProfile(profile) {
  return apiRequest('/applicant/profile', {
    method: 'PATCH',
    body: profile,
  })
}

export async function getApplicantCvs() {
  return apiRequest('/applicant/cvs')
}

export async function uploadApplicantCv(file) {
  const formData = new FormData()
  formData.append('file', file)
  return apiRequest('/applicant/cvs', {
    method: 'POST',
    body: formData,
  })
}

export async function deleteApplicantCv(cvId) {
  return apiRequest(`/applicant/cvs/${cvId}`, { method: 'DELETE' })
}

export async function setPrimaryApplicantCv(cvId) {
  return apiRequest(`/applicant/cvs/${cvId}/primary`, { method: 'PATCH' })
}
