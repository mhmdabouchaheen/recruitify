import { apiRequest } from '../lib/apiClient'

function toQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value)
  })
  const value = query.toString()
  return value ? `?${value}` : ''
}

export function getAdminUsers(params = {}) {
  return apiRequest(`/admin/users${toQuery(params)}`)
}

export function getAdminUser(userId) {
  return apiRequest(`/admin/users/${userId}`)
}

export function createAdminUser(user) {
  return apiRequest('/admin/users', {
    method: 'POST',
    body: user,
  })
}

export function updateAdminUserRole(userId, role) {
  return apiRequest(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: { role },
  })
}

export function updateAdminUserStatus(userId, isActive) {
  return apiRequest(`/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: { is_active: isActive },
  })
}
