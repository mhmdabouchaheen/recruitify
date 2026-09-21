import { apiRequest } from '../lib/apiClient'

export function getNotifications({ unreadOnly = false } = {}) {
  const query = unreadOnly ? '?unread_only=true' : ''
  return apiRequest(`/notifications${query}`)
}

export function getUnreadNotificationCount() {
  return apiRequest('/notifications/unread-count')
}

export function markNotificationRead(notificationId) {
  return apiRequest(`/notifications/${notificationId}/read`, { method: 'PATCH' })
}

export function markAllNotificationsRead() {
  return apiRequest('/notifications/mark-all-read', { method: 'POST' })
}

export function notifyUnreadCountChanged() {
  window.dispatchEvent(new Event('recruitify:notifications-updated'))
}
