import { useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, CalendarDays, CheckCircle2, Clock3, FileText, UsersRound, AlertCircle } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'

import { getHrDashboard } from '../api/dashboard'
import { Button, Skeleton, StatusBadge } from '../components/ui'
import { useAuth } from '../context/useAuth'

const pipelineLabels = [
  ['applied', 'Applied'],
  ['under_review', 'Under Review'],
  ['shortlisted', 'Shortlisted'],
  ['interview_scheduled', 'Interview Scheduled'],
  ['interview_completed', 'Interview Completed'],
  ['selected', 'Selected'],
  ['rejected', 'Rejected'],
]

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

  return <section className="dashboard-page">
    <header className="page-head dashboard-head">
      <div>
        <p className="eyebrow">Overview</p>
        <h1 className="page-title">Recruitment Dashboard</h1>
        <p className="page-description">An overview of your current recruitment activity.</p>
      </div>
      <Button render={<Link to="/pipeline" />}>View Pipeline</Button>
    </header>

    {result.loading && <DashboardLoading />}
    {!result.loading && result.error && <DashboardState title="Unable to load dashboard" description={result.error} />}
    {!result.loading && result.data && <DashboardContent dashboard={result.data} />}
  </section>
}

function DashboardContent({ dashboard }) {
  const maxPipeline = useMemo(() => Math.max(1, ...Object.values(dashboard.pipeline)), [dashboard.pipeline])
  return <>
    <section className="dashboard-metrics" aria-label="Dashboard metrics">
      <MetricCard icon={BriefcaseBusiness} label="Active Jobs" value={dashboard.metrics.active_jobs} />
      <MetricCard icon={UsersRound} label="Total Candidates" value={dashboard.metrics.total_candidates} />
      <MetricCard icon={CalendarDays} label="Upcoming Interviews" value={dashboard.metrics.upcoming_interviews} />
      <MetricCard icon={CheckCircle2} label="Hired" value={dashboard.metrics.hired} />
    </section>

    <div className="dashboard-grid">
      <section className="panel dashboard-panel dashboard-pipeline-panel">
        <PanelHead title="Recruitment pipeline" subtitle="Real application counts by stage." action={<Link className="text-action" to="/pipeline">View Pipeline</Link>} />
        <div className="dashboard-pipeline-list">
          {pipelineLabels.map(([key, label]) => <div className="dashboard-pipeline-row" key={key}><span>{label}</span><div><i style={{ width: `${(dashboard.pipeline[key] / maxPipeline) * 100}%` }} /></div><strong>{dashboard.pipeline[key]}</strong></div>)}
        </div>
      </section>

      <section className="panel dashboard-panel">
        <PanelHead title="Recruitment outcomes" subtitle="Current hiring movement from real applications." />
        <div className="dashboard-outcome-grid">
          <Outcome label="Active Candidates" value={dashboard.outcomes.active_candidates} />
          <Outcome label="Selected" value={dashboard.outcomes.selected} />
          <Outcome label="Hired" value={dashboard.outcomes.hired} />
          <Outcome label="Rejected" value={dashboard.outcomes.rejected} />
        </div>
      </section>

      <section className="panel dashboard-panel">
        <PanelHead title="Upcoming interviews" subtitle="Next scheduled interviews." action={<Link className="text-action" to="/interviews">View All</Link>} />
        {dashboard.upcoming_interviews.length ? <div className="dashboard-list">{dashboard.upcoming_interviews.map((interview) => <article className="dashboard-list-item" key={interview.id}><span className="dashboard-icon"><CalendarDays size={15} /></span><div><h3>{interview.candidate_name}</h3><p>{interview.job_title}</p><p>{formatDateTime(interview.scheduled_at)} • {formatEnum(interview.interview_type)} • {interview.duration_minutes} min</p>{interview.interviewers.length > 0 && <p>Interviewers: {interview.interviewers.join(', ')}</p>}</div><Link to={`/interviews/${interview.id}`}>View Interview</Link></article>)}</div> : <EmptyLine icon={CalendarDays} text="No upcoming interviews." />}
      </section>

      <section className="panel dashboard-panel">
        <PanelHead title="Recent activity" subtitle="Latest recruitment events." />
        {dashboard.recent_activity.length ? <div className="dashboard-list">{dashboard.recent_activity.map((activity) => <article className="dashboard-list-item" key={activity.id}><span className="dashboard-icon"><Clock3 size={15} /></span><div><h3>{activity.title}</h3><p>{activity.candidate_name} · {activity.job_title}</p><p>{activity.description} · {formatDateTime(activity.created_at)}</p></div><Link to={`/candidates/${activity.application_id}`}>View</Link></article>)}</div> : <EmptyLine icon={Clock3} text="No recent recruitment activity." />}
      </section>

      <section className="panel dashboard-panel">
        <PanelHead title="Recent jobs" subtitle="Latest vacancies and application volume." action={<Link className="text-action" to="/jobs">View Jobs</Link>} />
        {dashboard.recent_jobs.length ? <div className="dashboard-job-list">{dashboard.recent_jobs.map((job) => <article key={job.id}><div><h3>{job.title}</h3><p>{job.department}</p></div><StatusBadge>{formatEnum(job.status)}</StatusBadge><span>{job.application_count} applications</span><Link to={`/jobs/${job.id}`}>View Job</Link></article>)}</div> : <EmptyLine icon={BriefcaseBusiness} text="No jobs created yet." />}
      </section>

      <section className="panel dashboard-panel">
        <PanelHead title="Needs attention" subtitle="Actionable items from current recruitment data." />
        {dashboard.needs_attention.length ? <div className="attention-list dashboard-attention-list">{dashboard.needs_attention.map((item) => <article className="attention-item" key={item.title}><span className="attention-icon"><AlertCircle size={14} /></span><div className="attention-copy"><strong>{item.title}</strong><p>{item.count} · {item.detail}</p><Link to={item.link}>Review</Link></div></article>)}</div> : <EmptyLine icon={CheckCircle2} text="No dashboard items need attention right now." />}
      </section>
    </div>
  </>
}

function MetricCard({ icon: Icon, label, value }) { return <article className="dashboard-metric"><span><Icon size={19} /></span><div><strong>{value}</strong><p>{label}</p></div></article> }
function Outcome({ label, value }) { return <article className="dashboard-outcome"><strong>{value}</strong><span>{label}</span></article> }
function PanelHead({ title, subtitle, action }) { return <header className="panel-header"><div><h2 className="panel-title">{title}</h2><p className="panel-subtitle">{subtitle}</p></div>{action}</header> }
function EmptyLine({ icon: Icon, text }) { return <div className="dashboard-empty"><Icon size={18} /><p>{text}</p></div> }
function DashboardState({ title, description }) { return <div className="careers-state"><span><FileText size={22} /></span><h2>{title}</h2><p>{description}</p></div> }
function DashboardLoading() { return <div className="dashboard-loading"><Skeleton height={80} /><Skeleton height={240} /><Skeleton height={240} /></div> }
function formatEnum(value) { return String(value || '').split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') }
function formatDateTime(value) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)) }
