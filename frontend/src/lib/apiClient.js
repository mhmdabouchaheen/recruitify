import { getAccessToken } from './authToken'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export async function apiRequest(path, options = {}) {
  const token = getAccessToken()
  const headers = new Headers(options.headers)

  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body && typeof options.body !== 'string'
      ? JSON.stringify(options.body)
      : options.body,
  })

  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    const message = data?.detail || 'Request failed'
    throw new ApiError(message, response.status, data)
  }

  return data
}
