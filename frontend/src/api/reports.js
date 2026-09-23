
import { apiRequest } from '../lib/apiClient'

export function getHrReports(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, value)
  })
  const query = params.toString()
  return apiRequest(`/hr/reports${query ? `?${query}` : ''}`)
}
