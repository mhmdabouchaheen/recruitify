import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, BriefcaseBusiness, CalendarDays, CheckCircle2, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

import { getNotifications, markAllNotificationsRead, markNotificationRead, notifyUnreadCountChanged } from '../api/notifications'
import { Button, Skeleton } from '../components/ui'

export default function Notifications() {
  const [filter, setFilter] = useState('all')
  const [result, setResult] = useState({ notifications: [], loading: true, error: '' })
  const [busy, setBusy] = useState(false)
  const { user } = useAuth()

  const load = useCallback(() => {
    getNotifications({ unreadOnly: filter === 'unread' })
      .then((notifications) => setResult({ notifications, loading: false, error: '' }))
      .catch((error) => setResult({ notifications: [], loading: false, error: error.message || 'Notifications could not be loaded.' }))
  }, [filter])

  useEffect(() => { load() }, [load])

  const grouped = useMemo(() => groupNotifications(result.notifications), [result.notifications])
  const unreadCount = result.notifications.filter((item) => !item.is_read).length

  const markOne = async (notification) => {
    if (notification.is_read) return
    setBusy(true)
    try {
      await markNotificationRead(notification.id)
      notifyUnreadCountChanged()
      load()
    } finally {
      setBusy(false)
    }
  }

  const markAll = async () => {
    setBusy(true)
    try {
      await markAllNotificationsRead()
      notifyUnreadCountChanged()
      load()
    } finally {
      setBusy(false)
    }
  }

  return <main className="notifications-page">
    <header className="page-head notifications-head"><div><p className="eyebrow">Notifications</p><h1 className="page-title">Notifications</h1><p className="page-description">Stay updated on your recruitment activity.</p></div>{unreadCount > 0 && <Button variant="secondary" onClick={markAll} disabled={busy}>Mark all as read</Button>}</header>
    <div className="notifications-tabs" role="tablist" aria-label="Notification filters"><button className={filter === 'all' ? 'active' : ''} onClick={() => { setResult((current) => ({ ...current, loading: true, error: '' })); setFilter('all') }} type="button">All</button><button className={filter === 'unread' ? 'active' : ''} onClick={() => { setResult((current) => ({ ...current, loading: true, error: '' })); setFilter('unread') }} type="button">Unread</button></div>
    {result.loading && <div className="panel notifications-loading"><Skeleton height={42} /><Skeleton height={72} /><Skeleton height={72} /></div>}
    {!result.loading && result.error && <NotificationsState title="Unable to load notifications" description={result.error} />}
    {!result.loading && !result.error && result.notifications.length === 0 && <NotificationsState title="No notifications yet" description="Updates about your recruitment activity will appear here." />}
    {!result.loading && !result.error && result.notifications.length > 0 && <section className="notifications-list panel">{grouped.map((group) => <div className="notification-group" key={group.label}><h2>{group.label}</h2>{group.items.map((notification) => <NotificationItem key={notification.id} notification={notification} onRead={() => markOne(notification)} busy={busy} userRole={user?.role} />)}</div>)}</section>}
  </main>
}

function NotificationItem({ notification, onRead, busy, userRole }) {
  const link = destinationFor(notification, userRole)
  const content = <><span className="notification-type-icon">{iconFor(notification.type)}</span><div><div className="notification-row-title"><h3>{notification.title}</h3>{!notification.is_read && <span>Unread</span>}</div><p>{notification.message}</p><time>{formatTime(notification.created_at)}</time></div></>
  return <article className={`notification-item ${notification.is_read ? '' : 'unread'}`}>{link ? <Link to={link} onClick={onRead}>{content}</Link> : <button type="button" onClick={onRead} disabled={busy}>{content}</button>}{!notification.is_read && <button className="notification-read-action" type="button" onClick={onRead} disabled={busy}>Mark read</button>}</article>
}

function NotificationsState({ title, description }) { return <div className="careers-state"><span><Bell size={22} /></span><h2>{title}</h2><p>{description}</p></div> }
function groupNotifications(items) { const today = new Date().toDateString(); const groups = [{ label: 'Today', items: [] }, { label: 'Earlier', items: [] }]; items.forEach((item) => groups[new Date(item.created_at).toDateString() === today ? 0 : 1].items.push(item)); return groups.filter((group) => group.items.length) }
function iconFor(type) { if (type.startsWith('interview')) return <CalendarDays size={15} />; if (type.startsWith('contract')) return <FileText size={15} />; if (type.includes('application')) return <BriefcaseBusiness size={15} />; return <CheckCircle2 size={15} /> }
function destinationFor(notification, userRole) { if (userRole === 'applicant') { if (notification.related_application_id) return `/applications/${notification.related_application_id}`; if (notification.related_job_id) return `/careers/${notification.related_job_id}`; return '' } if (notification.related_interview_id) return `/interviews/${notification.related_interview_id}`; if (notification.related_application_id) return `/candidates/${notification.related_application_id}`; if (notification.related_job_id) return `/jobs/${notification.related_job_id}`; return '' }
function formatTime(value) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)) }
