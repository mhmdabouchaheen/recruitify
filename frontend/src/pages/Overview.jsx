
import { useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BriefcaseBusiness, CalendarDays, CheckCircle2, Clock3, FileText, Plus, UsersRound } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'

import { getHrDashboard } from '../api/dashboard'
import { Button, Skeleton, StatusBadge } from '../components/ui'
import { useAuth } from '../context/useAuth'

const STATUS_COLORS = ['#14785a', '#65bd8f', '#f0cc67', '#88b6f2', '#b79bea', '#ee817b']

export function Overview() {
  const { user } = useAuth()
  const isHr = user?.role === 'hr' || user?.role === 'admin'
  const [result, setResult] = useState({ data: null, loading: true, error: '' })

  useEffect(() => {
    let cancelled = false
    getHrDashboard()
      .then((data) => { if (!cancelled) setResult({ data, loading: false, error: '' }) })
      .catch((error) => { if (!cancelled) setResult({ data: null, loading: false, error: error.message || 'Dashboard could not be loaded.' }) })
    return () => { cancelled = true }
  }, [])

  if (!isHr) return <Navigate to="/interviews" replace />

  return <section className="dashboard-page dashboard-redesign-page">
    <DashboardHero user={user} />
    {result.loading && <DashboardLoading />}
    {!result.loading && result.error && <DashboardState title="Unable to load dashboard" description={result.error} />}
    {!result.loading && result.data && <DashboardContent dashboard={result.data} />}
  </section>
}

function DashboardHero({ user }) {
  return <header className="dashboard-hero"><div><p className="eyebrow">Overview</p><h1>{greeting()}, {user?.first_name || 'Recruiter'} ??</h1><p>Here?s what?s happening with your recruitment process today.</p></div><aside><strong>{formatToday()}</strong><span>Great talent builds great teams.</span></aside></header>
}

function DashboardContent({ dashboard }) {
  const statusTotal = dashboard.applications_by_status.reduce((sum, item) => sum + item.count, 0)
  return <>
    <section className="dashboard-redesign-metrics" aria-label="Dashboard metrics">
      <MetricCard icon={UsersRound} tone="green" label="Total Applications" value={dashboard.metrics.total_candidates} />
      <MetricCard icon={BriefcaseBusiness} tone="blue" label="Active Jobs" value={dashboard.metrics.active_jobs} />
      <MetricCard icon={CalendarDays} tone="purple" label="Interviews Scheduled" value={dashboard.metrics.upcoming_interviews} />
      <MetricCard icon={CheckCircle2} tone="amber" label="Hired Candidates" value={dashboard.metrics.hired} />
    </section>

    <div className="dashboard-redesign-grid">
      <section className="dashboard-card dashboard-chart-card span-2"><PanelHead title="Applications Overview" /><div className="dashboard-chart-frame"><ResponsiveContainer width="100%" height="100%"><AreaChart data={dashboard.applications_over_time} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}><defs><linearGradient id="dashboardApplications" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#14785a" stopOpacity={0.24} /><stop offset="95%" stopColor="#14785a" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#e8eee9" vertical={false} /><XAxis dataKey="period" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} /><Tooltip /><Area type="monotone" dataKey="applications" stroke="#14785a" fill="url(#dashboardApplications)" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 5 }} name="Applications" /><Area type="monotone" dataKey="hires" stroke="#8aa99b" fill="transparent" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} name="Hired" /></AreaChart></ResponsiveContainer></div></section>

      <section className="dashboard-card"><PanelHead title="Applications by Status" />{dashboard.applications_by_status.length ? <div className="dashboard-donut-layout"><div className="dashboard-donut-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dashboard.applications_by_status} dataKey="count" innerRadius="58%" outerRadius="82%" paddingAngle={1}>{dashboard.applications_by_status.map((item, index) => <Cell key={item.status} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div><strong>{statusTotal}</strong><span>Total</span></div></div><ul>{dashboard.applications_by_status.map((item, index) => <li key={item.status}><i style={{ background: STATUS_COLORS[index % STATUS_COLORS.length] }} /><span>{item.label}</span><strong>{item.count} ({item.percentage}%)</strong></li>)}</ul></div> : <EmptyLine icon={FileText} text="No application status data yet." />}</section>

      <section className="dashboard-cta"><h2>Keep going! ??</h2><p>You?re one step closer to building an amazing team.</p><Button icon={Plus} render={<Link to="/jobs/new" />}>Create a New Job</Button></section>

      <section className="dashboard-card"><PanelHead title="Upcoming Interviews" action={<Link to="/interviews">View all</Link>} />{dashboard.upcoming_interviews.length ? <div className="dashboard-upcoming-list">{dashboard.upcoming_interviews.map((interview) => <Link to={`/interviews/${interview.id}`} key={interview.id}><span>{formatMonthDay(interview.scheduled_at)}</span><div><strong>{interview.candidate_name}</strong><small>{interview.job_title}</small></div><em>{formatTime(interview.scheduled_at)}</em></Link>)}</div> : <EmptyLine icon={CalendarDays} text="No upcoming interviews." />}</section>

      <section className="dashboard-card"><PanelHead title="Recent Applications" action={<Link to="/candidates">View all</Link>} />{dashboard.recent_applications.length ? <div className="dashboard-application-list">{dashboard.recent_applications.map((application) => <Link to={`/candidates/${application.id}`} key={application.id}><span>{initials(application.candidate_name)}</span><div><strong>{application.candidate_name}</strong><small>{application.job_title}</small></div><time>{formatRelative(application.submitted_at)}</time><StatusBadge>{formatEnum(application.status)}</StatusBadge></Link>)}</div> : <EmptyLine icon={UsersRound} text="No recent applications." />}</section>

      <section className="dashboard-card"><PanelHead title="Active Jobs" action={<Link to="/jobs">View all</Link>} />{dashboard.recent_jobs.length ? <div className="dashboard-active-job-list">{dashboard.recent_jobs.map((job) => <Link to={`/jobs/${job.id}`} key={job.id}><span><BriefcaseBusiness size={15} /></span><div><strong>{job.title}</strong><small>{job.department}</small></div><em>{job.application_count} applications</em></Link>)}</div> : <EmptyLine icon={BriefcaseBusiness} text="No active jobs yet." />}</section>

      <section className="dashboard-card"><PanelHead title="Recent Activity" action={<Link to="/pipeline">View all</Link>} />{dashboard.recent_activity.length ? <div className="dashboard-activity-list">{dashboard.recent_activity.slice(0, 5).map((activity) => <Link to={`/candidates/${activity.application_id}`} key={activity.id}><span><Clock3 size={14} /></span><div><strong>{activity.title}</strong><small>{activity.candidate_name} ? {activity.job_title}</small></div><time>{formatRelative(activity.created_at)}</time></Link>)}</div> : <EmptyLine icon={Clock3} text="No recent activity." />}</section>
    </div>
  </>
}

function MetricCard({ icon: Icon, tone, label, value }) { return <article className={`dashboard-redesign-metric ${tone}`}><span><Icon size={22} /></span><div><p>{label}</p><strong>{value}</strong></div></article> }
function PanelHead({ title, action }) { return <header className="dashboard-card-head"><h2>{title}</h2>{action}</header> }
function EmptyLine({ icon: Icon, text }) { return <div className="dashboard-empty"><Icon size={18} /><p>{text}</p></div> }
function DashboardState({ title, description }) { return <div className="careers-state"><span><FileText size={22} /></span><h2>{title}</h2><p>{description}</p></div> }
function DashboardLoading() { return <div className="dashboard-loading"><Skeleton height={110} /><Skeleton height={280} /><Skeleton height={240} /></div> }
function formatEnum(value) { return String(value || '').split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') }
function formatTime(value) { return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value)) }
function formatToday() { return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date()) }
function formatMonthDay(value) { const date = new Date(value); return <><small>{date.toLocaleString(undefined, { month: 'short' })}</small><strong>{date.getDate()}</strong></> }
function initials(name) { return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() }
function greeting() { const hour = new Date().getHours(); if (hour < 12) return 'Good morning'; if (hour < 18) return 'Good afternoon'; return 'Good evening' }
function formatRelative(value) { const diff = Date.now() - new Date(value).getTime(); const hours = Math.max(1, Math.round(diff / 3600000)); if (hours < 24) return `${hours}h ago`; return `${Math.round(hours / 24)}d ago` }
