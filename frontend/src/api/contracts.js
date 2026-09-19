import { apiRequest } from '../lib/apiClient'
import { getAccessToken } from '../lib/authToken'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export async function getHrApplicationContract(applicationId) {
  return apiRequest(`/hr/applications/${applicationId}/contract`)
}

export async function createHrApplicationContract(applicationId, payload) {
  return apiRequest(`/hr/applications/${applicationId}/contract`, { method: 'POST', body: payload })
}

export async function updateHrContract(contractId, payload) {
  return apiRequest(`/hr/contracts/${contractId}`, { method: 'PATCH', body: payload })
}

export async function generateHrContractPdf(contractId) {
  return apiRequest(`/hr/contracts/${contractId}/generate-pdf`, { method: 'POST' })
}

export async function sendHrContract(contractId) {
  return apiRequest(`/hr/contracts/${contractId}/send`, { method: 'POST' })
}

export async function getApplicantApplicationContract(applicationId) {
  return apiRequest(`/applicant/applications/${applicationId}/contract`)
}

export async function acceptApplicantContract(contractId) {
  return apiRequest(`/applicant/contracts/${contractId}/accept`, { method: 'POST' })
}

export async function declineApplicantContract(contractId) {
  return apiRequest(`/applicant/contracts/${contractId}/decline`, { method: 'POST' })
}

export function hrContractPdfUrl(contractId) {
  return `${API_BASE_URL}/hr/contracts/${contractId}/pdf`
}

export function applicantContractPdfUrl(contractId) {
  return `${API_BASE_URL}/applicant/contracts/${contractId}/pdf`
}

export function formatContractStatus(status) {
  return status.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
}

export function formatContractType(type) {
  return type.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
}


async function downloadPdf(path, filename) {
  const token = getAccessToken()
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!response.ok) throw new Error('Contract PDF could not be downloaded')
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export function downloadHrContractPdf(contractId) {
  return downloadPdf(`/hr/contracts/${contractId}/pdf`, `recruitify-contract-${contractId}.pdf`)
}

export function downloadApplicantContractPdf(contractId) {
  return downloadPdf(`/applicant/contracts/${contractId}/pdf`, `recruitify-contract-${contractId}.pdf`)
}
