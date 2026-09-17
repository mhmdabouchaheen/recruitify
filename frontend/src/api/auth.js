import { apiRequest } from '../lib/apiClient'

export async function login(email, password) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export async function getCurrentUser() {
  return apiRequest('/auth/me')
}
