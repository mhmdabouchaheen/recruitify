import { apiRequest } from '../lib/apiClient'

export function getHrDashboard() {
  return apiRequest('/hr/dashboard')
}
