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

export async function registerApplicant({ firstName, lastName, email, password }) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: {
      first_name: firstName,
      last_name: lastName,
      email,
      password,
    },
  })
}
