import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BriefcaseBusiness, FileText, Search, Sparkles } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'

import { formatApplicationStatus, getHrApplications, updateHrApplicationStatus } from '../api/hrApplications'
import { Button, Field, Skeleton, StatusBadge } from '../components/ui'
import { useAuth } from '../context/useAuth'

const activeColumns = [
  ['applied', 'Applied'],
  ['under_review', 'Under Review'],
  ['shortlisted', 'Shortlisted'],
  ['interview_scheduled', 'Interview Scheduled'],
  ['interview_completed', 'Interview Completed'],
  ['selected', 'Selected'],
]

const outcomeStatuses = new Set(['rejected', 'withdrawn'])
const blockedDirectTargets = new Set(['interview_scheduled', 'interview_completed', 'withdrawn'])
const moveOptions = {
  applied: ['under_review', 'rejected'],
  under_review: ['shortlisted', 'rejected'],
  shortlisted: ['selected', 'rejected'],
  interview_scheduled: ['rejected'],
  interview_completed: ['selected', 'rejected'],
  selected: [],
  rejected: [],
  withdrawn: [],
}

export default function Pipeline() {
  const { user } = useAuth()
  const isHr = user?.role === 'hr' || user?.role === 'admin'
  const [filters, setFilters] = useState({ search: '', job_id: '', status: 'active' })
  const [result, setResult] = useState({ applications: [], loading: true, error: '' })
  const [updatingId, setUpdatingId] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })

  const loadApplications = async () => {
    const applications = await getHrApplications({ limit: 100 })
    setResult({ applications, loading: false, error: '' })
  }

  useEffect(() => {
    let cancelled = false
    getHrApplications({ limit: 100 })
      .then((applications) => { if (!cancelled) setResult({ applications, loading: false, error: '' }) })
      .catch((error) => { if (!cancelled) setResult({ applications: [], loading: false, error: error.message || 'Pipeline could not be loaded.' }) })
    return () => { cancelled = true }
  }, [])

  const jobs = useMemo(() => {
    const map = new Map()
    result.applications.forEach((application) => map.set(String(application.job_id), application.job_title))
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [result.applications])

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    return result.applications.filter((application) => {
      const matchesJob = !filters.job_id || String(application.job_id) === filters.job_id
      const name = `${application.applicant_first_name} ${application.applicant_last_name}`.toLowerCase()
      const matchesSearch = !search || name.includes(search) || application.applicant_email.toLowerCase().includes(search) || application.job_title.toLowerCase().includes(search)
      const matchesStatus = filters.status === 'active' ? !outcomeStatuses.has(application.status) : filters.status === 'outcomes' ? outcomeStatuses.has(application.status) : application.status === filters.status
      return matchesJob && matchesSearch && matchesStatus
    })
  }, [result.applications, filters])

  const grouped = useMemo(() => {
    const map = new Map(activeColumns.map(([status]) => [status, []]))
    filtered.forEach((application) => {
      if (map.has(application.status)) map.get(application.status).push(application)
    })
    return map
  }, [filtered])

  const outcomes = filtered.filter((application) => outcomeStatuses.has(application.status))
  const hasFilters = filters.search || filters.job_id || filters.status !== 'active'

  const moveCandidate = async (application, nextStatus) => {
    if (blockedDirectTargets.has(nextStatus)) return
    setUpdatingId(application.id)
    setMessage({ type: '', text: '' })
    try {
      const updated = await updateHrApplicationStatus(application.id, nextStatus)
      setResult((current) => ({
        ...current,
        applications: current.applications.map((item) => item.id === application.id ? { ...item, status: updated.status } : item),
      }))
      setFilters((current) => current.status !== 'active' && current.status !== 'outcomes' ? { ...current, status: 'active' } : current)
      setMessage({ type: 'success', text: `${application.applicant_first_name} ${application.applicant_last_name} moved to ${formatApplicationStatus(nextStatus)}.` })
      loadApplications().catch((error) => setMessage({ type: 'error', text: error.message || 'Pipeline refreshed failed after the status update.' }))
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Candidate status could not be updated.' })
    } finally {
      setUpdatingId(null)
    }
  }

  if (!isHr) return <Navigate to="/interviews" replace />

  return <section className="pipeline-page">
    <header className="page-head pipeline-head"><div><p className="eyebrow">Recruitment pipeline</p><h1 className="page-title">Pipeline</h1><p className="page-description">Track real candidates across active recruitment stages.</p></div></header>

    <div className="pipeline-toolbar panel">
      <label className="candidate-search"><Search size={15} /><input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search candidate, email, or job" type="search" /></label>
      <Field label="Job vacancy"><select value={filters.job_id} onChange={(event) => setFilters((current) => ({ ...current, job_id: event.target.value }))}><option value="">All jobs</option>{jobs.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></Field>
      <Field label="View"><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="active">Active pipeline</option>{activeColumns.map(([status, label]) => <option key={status} value={status}>{label}</option>)}<option value="outcomes">Rejected / Withdrawn</option></select></Field>
      {hasFilters && <Button variant="ghost" onClick={() => setFilters({ search: '', job_id: '', status: 'active' })}>Reset</Button>}
    </div>

    {message.text && <p className={message.type === 'error' ? 'login-error' : 'profile-success'} role="status">{message.text}</p>}
    {result.loading && <div className="panel pipeline-loading"><Skeleton height={26} width="32%" /><Skeleton /><Skeleton /></div>}
    {!result.loading && result.error && <PipelineState title="Unable to load pipeline" description={result.error} />}
    {!result.loading && !result.error && result.applications.length === 0 && <PipelineState title="No applications in the recruitment pipeline yet." description="Submitted applications will appear here when applicants apply to jobs." />}
    {!result.loading && !result.error && result.applications.length > 0 && filtered.length === 0 && <PipelineState title="No candidates match your filters" description="Try changing the search, job vacancy, or status view." />}

    {!result.loading && !result.error && filtered.length > 0 && filters.status !== 'outcomes' && <div className="pipeline-board" aria-label="Recruitment pipeline board">{activeColumns.map(([status, label]) => <PipelineColumn key={status} status={status} label={label} applications={grouped.get(status) || []} updatingId={updatingId} onMove={moveCandidate} />)}</div>}
    {!result.loading && !result.error && filters.status === 'outcomes' && <section className="panel pipeline-outcomes"><div className="panel-header"><div><h2 className="panel-title">Rejected / Withdrawn</h2><p className="panel-subtitle">Outcome candidates are kept separate from the active board.</p></div></div><div className="pipeline-outcome-grid">{outcomes.length ? outcomes.map((application) => <CandidateCard key={application.id} application={application} updating={updatingId === application.id} onMove={moveCandidate} />) : <p className="pipeline-empty">No rejected or withdrawn candidates match this view.</p>}</div></section>}
  </section>
}

function PipelineColumn({ status, label, applications, updatingId, onMove }) {
  const busy = applications.some((application) => updatingId === application.id)
  return <section className={`pipeline-column ${busy ? 'is-updating' : ''}`} data-status={status}><header><span>{label}</span><strong>{applications.length}</strong></header><div className="pipeline-column-body">{applications.length ? applications.map((application) => <CandidateCard key={application.id} application={application} updating={updatingId === application.id} onMove={onMove} />) : <p className="pipeline-empty">No candidates</p>}</div></section>
}

function CandidateCard({ application, updating, onMove }) {
  const options = moveOptions[application.status] || []
  const canScheduleInterview = application.status === 'shortlisted'
  return <article className="pipeline-card">
    <div className="pipeline-card-head"><span className="pipeline-initials">{initials(application)}</span><StatusBadge>{formatApplicationStatus(application.status)}</StatusBadge></div>
    <h2>{application.applicant_first_name} {application.applicant_last_name}</h2>
    <p className="pipeline-job"><BriefcaseBusiness size={13} />{application.job_title}</p>
    <p className="pipeline-date">Applied {formatDate(application.submitted_at)}</p>
    <div className="pipeline-match"><Sparkles size={13} /><span>AI Match</span><strong>{typeof application.match_score === 'number' ? `${Math.round(application.match_score)}%` : 'Not analyzed'}</strong></div>
    <div className="pipeline-card-actions"><Link className="text-action" to={`/candidates/${application.id}`}>View candidate</Link>{canScheduleInterview && <Link className="text-action" to={`/candidates/${application.id}`}>Schedule interview</Link>}</div>
    {options.length > 0 && <div className="pipeline-move-actions">{options.map((status) => <button key={status} disabled={updating} onClick={() => onMove(application, status)}>{updating ? 'Moving...' : `Move to ${formatApplicationStatus(status)}`} <ArrowRight size={12} /></button>)}</div>}
  </article>
}

function PipelineState({ title, description }) { return <div className="careers-state"><span><FileText size={22} /></span><h2>{title}</h2><p>{description}</p></div> }
function initials(application) { return `${application.applicant_first_name?.[0] || ''}${application.applicant_last_name?.[0] || ''}`.toUpperCase() || 'C' }
function formatDate(value) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) }
