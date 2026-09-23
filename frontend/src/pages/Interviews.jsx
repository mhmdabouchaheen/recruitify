
import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Phone, Search, UsersRound, Video, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { formatInterviewStatus, formatInterviewType, getHrInterviews, getMyInterviews } from '../api/interviews'
import { useAuth } from '../context/useAuth'
import { Skeleton, StatusBadge } from '../components/ui'

export default function Interviews() {
  const { user } = useAuth()
  const [state, setState] = useState({ interviews: [], loading: true, error: '' })
  const [filters, setFilters] = useState({ search: '', job: '', interviewer: '', status: 'all' })

  useEffect(() => {
    let cancelled = false
    const loader = user?.role === 'hr' || user?.role === 'admin' ? getHrInterviews : getMyInterviews
    loader()
      .then((interviews) => { if (!cancelled) setState({ interviews, loading: false, error: '' }) })
      .catch((error) => { if (!cancelled) setState({ interviews: [], loading: false, error: error.message || 'Interviews could not be loaded.' }) })
    return () => { cancelled = true }
  }, [user?.role])

  const jobs = useMemo(() => [...new Set(state.interviews.map((interview) => interview.job_title).filter(Boolean))].sort(), [state.interviews])
  const interviewers = useMemo(() => {
    const map = new Map()
    state.interviews.forEach((interview) => interview.interviewers?.forEach((person) => map.set(String(person.id), `${person.first_name} ${person.last_name}`)))
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [state.interviews])

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    return state.interviews.filter((interview) => {
      const names = interview.interviewers?.map((person) => `${person.first_name} ${person.last_name} ${person.email}`).join(' ').toLowerCase() || ''
      const matchesSearch = !search || interview.candidate_name.toLowerCase().includes(search) || interview.job_title.toLowerCase().includes(search) || names.includes(search)
      const matchesJob = !filters.job || interview.job_title === filters.job
      const matchesInterviewer = !filters.interviewer || interview.interviewers?.some((person) => String(person.id) === filters.interviewer)
      const matchesStatus = filters.status === 'all' || interview.status === filters.status
      return matchesSearch && matchesJob && matchesInterviewer && matchesStatus
    })
  }, [state.interviews, filters])

  const summary = useMemo(() => {
    const now = new Date()
    return {
      total: state.interviews.length,
      completed: state.interviews.filter((interview) => interview.status === 'completed').length,
      upcoming: state.interviews.filter((interview) => interview.status === 'scheduled' && new Date(interview.scheduled_at) >= now).length,
      cancelled: state.interviews.filter((interview) => interview.status === 'cancelled').length,
    }
  }, [state.interviews])

  const upcoming = useMemo(() => state.interviews
    .filter((interview) => interview.status === 'scheduled' && new Date(interview.scheduled_at) >= new Date())
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    .slice(0, 5), [state.interviews])

  return <section className="interviews-workspace interviews-page">
    <header className="interviews-page-head">
      <div>
        <p className="eyebrow">Interview Management</p>
        <h1>Interviews</h1>
        <p>{user?.role === 'interviewer' ? 'Assigned interviews only.' : 'Schedule, conduct, and track interviews with ease.'}</p>
      </div>
    </header>

    {state.loading && <div className="panel interviews-loading"><Skeleton height={82} /><Skeleton height={280} /><Skeleton height={260} /></div>}
    {state.error && <State title="Unable to load interviews" description={state.error} />}
    {!state.loading && !state.error && <>
      <section className="interview-summary-grid" aria-label="Interview summary">
        <SummaryCard icon={CalendarDays} tone="blue" label="Total Interviews" value={summary.total} />
        <SummaryCard icon={UsersRound} tone="green" label="Completed" value={summary.completed} />
        <SummaryCard icon={Clock} tone="amber" label="Upcoming" value={summary.upcoming} />
        <SummaryCard icon={XCircle} tone="red" label="Cancelled" value={summary.cancelled} />
      </section>

      {state.interviews.length ? <>
        <section className="interview-planner-grid">
          <InterviewCalendar interviews={state.interviews} />
          <UpcomingInterviews interviews={upcoming} />
        </section>

        <section className="interviews-table-card panel">
          <div className="interviews-table-head">
            <div><h2><CalendarDays size={16} />All Interviews</h2><p>Showing {filtered.length} of {state.interviews.length} interviews</p></div>
            <div className="interviews-filter-row">
              <select value={filters.job} onChange={(event) => setFilters((current) => ({ ...current, job: event.target.value }))}><option value="">All Jobs</option>{jobs.map((job) => <option key={job} value={job}>{job}</option>)}</select>
              <select value={filters.interviewer} onChange={(event) => setFilters((current) => ({ ...current, interviewer: event.target.value }))}><option value="">All Interviewers</option>{interviewers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
              <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="all">All Statuses</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
              <label><Search size={14} /><input type="search" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search interviews..." /></label>
            </div>
          </div>
          {filtered.length ? <div className="interviews-table-wrap"><table className="interviews-table"><thead><tr><th>Candidate</th><th>Job Title</th><th>Interviewers</th><th>Date & Time</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map((interview) => <InterviewRow key={interview.id} interview={interview} />)}</tbody></table></div> : <State title="No interviews match your filters" description="Try changing the job, interviewer, status, or search term." compact />}
        </section>
      </> : <State title="No interviews scheduled yet." description="Scheduled interviews will appear here when candidates are moved into interview stages." />}
    </>}
  </section>
}

function SummaryCard({ icon: Icon, tone, label, value }) { return <article className={`interview-summary-card ${tone}`}><span><Icon size={21} /></span><div><strong>{value}</strong><p>{label}</p></div></article> }

function InterviewCalendar({ interviews }) {
  const initialDate = useMemo(() => interviews.length ? new Date(interviews[0].scheduled_at) : new Date(), [interviews])
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), initialDate.getDate()))
  const dates = useMemo(() => buildCalendar(interviews, visibleMonth, selectedDate), [interviews, visibleMonth, selectedDate])
  const selectedDay = dates.find((day) => sameDay(day.date, selectedDate)) || { date: selectedDate, items: [] }
  const monthLabel = visibleMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })

  const moveMonth = (offset) => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  const goToday = () => {
    const today = new Date()
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()))
  }
  const selectDay = (date) => {
    setSelectedDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()))
    if (date.getMonth() !== visibleMonth.getMonth() || date.getFullYear() !== visibleMonth.getFullYear()) {
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    }
  }

  return <section className="interview-calendar-card panel"><div className="interview-section-heading interview-calendar-heading"><h2><CalendarDays size={16} />Interview Calendar</h2><div className="interview-calendar-controls"><button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month"><ChevronLeft size={15} /></button><strong>{monthLabel}</strong><button type="button" onClick={() => moveMonth(1)} aria-label="Next month"><ChevronRight size={15} /></button><button type="button" onClick={goToday}>Today</button></div></div><div className="interview-calendar-grid"><div className="interview-month"><div className="interview-weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div><div className="interview-days">{dates.map((day) => <button type="button" className={`interview-day ${day.currentMonth ? '' : 'muted'} ${day.isToday ? 'today' : ''} ${day.isSelected ? 'selected' : ''}`} key={day.key} onClick={() => selectDay(day.date)} aria-label={`${formatFullDate(day.date)}${day.items.length ? `, ${day.items.length} interviews` : ''}`}><span>{day.date.getDate()}</span>{day.items.length > 0 && <i aria-hidden="true" />}</button>)}</div></div><aside className="interview-day-agenda"><h3>{formatFullDate(selectedDay.date)}</h3>{selectedDay.items.length ? selectedDay.items.slice(0, 5).map((interview) => <Link to={`/interviews/${interview.id}`} key={interview.id}><strong>{formatTime(new Date(interview.scheduled_at))}</strong><span>{interview.candidate_name}</span><small>{interview.job_title}</small></Link>) : <p>No interviews scheduled for this day.</p>}</aside></div></section>
}

function UpcomingInterviews({ interviews }) {
  return <section className="upcoming-interviews-card panel"><div className="interview-section-heading"><h2><Clock size={16} />Upcoming Interviews</h2><Link to="/interviews">View all</Link></div>{interviews.length ? <div className="upcoming-interview-list">{interviews.map((interview) => <UpcomingInterview key={interview.id} interview={interview} />)}</div> : <div className="interviews-empty-inline">No upcoming interviews.</div>}</section>
}

function UpcomingInterview({ interview }) {
  const scheduled = new Date(interview.scheduled_at)
  return <article className="upcoming-interview-item"><div className="interview-date-tile"><span>{scheduled.toLocaleString(undefined, { month: 'short' })}</span><strong>{scheduled.getDate()}</strong></div><div><strong>{interview.candidate_name}</strong><span>{interview.job_title}</span></div><p><Clock size={13} />{formatTime(scheduled)}</p><p>{typeIcon(interview.interview_type)}{formatInterviewType(interview.interview_type)}</p>{meetingHref(interview) ? <a className="interview-join" href={meetingHref(interview)} target="_blank" rel="noreferrer">Join</a> : <Link className="interview-view-button" to={`/interviews/${interview.id}`}>View</Link>}</article>
}

function InterviewRow({ interview }) {
  const scheduled = new Date(interview.scheduled_at)
  return <tr><td><div className="interview-candidate-cell"><span>{initials(interview.candidate_name)}</span><div><strong>{interview.candidate_name}</strong><small>{interview.department}</small></div></div></td><td>{interview.job_title}</td><td><InterviewerAvatars interviewers={interview.interviewers || []} /></td><td><span className="interview-date-cell"><CalendarDays size={14} />{formatDateTime(scheduled)}</span></td><td><span className={`interview-type-pill ${interview.interview_type}`}>{formatInterviewType(interview.interview_type)}</span></td><td><StatusBadge>{formatInterviewStatus(interview.status)}</StatusBadge></td><td><div className="interview-actions-cell">{meetingHref(interview) ? <a className="interview-join compact" href={meetingHref(interview)} target="_blank" rel="noreferrer">Join</a> : null}<Link className="interview-view-button" to={`/interviews/${interview.id}`}>View</Link></div></td></tr>
}

function InterviewerAvatars({ interviewers }) {
  if (!interviewers.length) return <span className="interviewer-muted">Not assigned</span>
  const visible = interviewers.slice(0, 2)
  return <div className="interviewer-avatar-list">{visible.map((person) => <span key={person.id} title={`${person.first_name} ${person.last_name}`}>{`${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`.toUpperCase()}</span>)}{interviewers.length > visible.length && <em>+{interviewers.length - visible.length}</em>}</div>
}

function State({ title, description, compact = false }) { return <div className={`careers-state ${compact ? 'interviews-state-compact' : ''}`}><span><CalendarDays size={22} /></span><h2>{title}</h2><p>{description}</p></div> }
function initials(name) { return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'IN' }
function formatDate(value) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(value) }
function formatTime(value) { return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(value) }
function formatDateTime(value) { return `${formatDate(value)} ${formatTime(value)}` }
function formatFullDate(value) { return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(value) }
function typeIcon(type) { const Icon = type === 'phone' ? Phone : type === 'onsite' ? MapPin : Video; return <Icon size={13} /> }
function meetingHref(interview) { const value = interview.location_or_link || ''; return /^https?:\/\//i.test(value) ? value : '' }

function buildCalendar(interviews, visibleMonth, selectedDate) {
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
  const start = new Date(monthStart)
  start.setDate(start.getDate() - start.getDay())
  const byDate = new Map()
  interviews.forEach((interview) => {
    const key = new Date(interview.scheduled_at).toDateString()
    byDate.set(key, [...(byDate.get(key) || []), interview])
  })
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const items = (byDate.get(date.toDateString()) || []).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    return { key: date.toISOString(), date, items, currentMonth: date.getMonth() === monthStart.getMonth(), isToday: sameDay(date, new Date()), isSelected: sameDay(date, selectedDate) }
  })
}

function sameDay(first, second) {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate()
}
