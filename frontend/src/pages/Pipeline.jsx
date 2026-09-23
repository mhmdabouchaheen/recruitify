import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Clock3, FileText, MoreHorizontal, Search, Sparkles, UsersRound, XCircle } from 'lucide-react'
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
  const [filters, setFilters] = useState({ search: '', job_id: '', department: '', status: 'active' })
  const [result, setResult] = useState({ applications: [], loading: true, error: '' })
  const [updatingId, setUpdatingId] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [openActionId, setOpenActionId] = useState(null)

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

  const departments = useMemo(() => [...new Set(result.applications.map((application) => application.department).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [result.applications])

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    return result.applications.filter((application) => {
      const matchesJob = !filters.job_id || String(application.job_id) === filters.job_id
      const matchesDepartment = !filters.department || application.department === filters.department
      const name = `${application.applicant_first_name} ${application.applicant_last_name}`.toLowerCase()
      const matchesSearch = !search || name.includes(search) || application.applicant_email.toLowerCase().includes(search) || application.job_title.toLowerCase().includes(search)
      const matchesStatus = filters.status === 'active' ? !outcomeStatuses.has(application.status) : filters.status === 'outcomes' ? outcomeStatuses.has(application.status) : application.status === filters.status
      return matchesJob && matchesDepartment && matchesSearch && matchesStatus
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
  const summary = useMemo(() => {
    const total = result.applications.length
    const rejected = result.applications.filter((application) => application.status === 'rejected').length
    const hired = result.applications.filter((application) => application.status === 'selected' && application.contract_status === 'accepted').length
    const inProgress = result.applications.filter((application) => !['rejected', 'withdrawn'].includes(application.status) && !(application.status === 'selected' && application.contract_status === 'accepted')).length
    return { total, inProgress, hired, rejected }
  }, [result.applications])

  const hasFilters = filters.search || filters.job_id || filters.department || filters.status !== 'active'

  const moveCandidate = async (application, nextStatus) => {
    if (blockedDirectTargets.has(nextStatus)) return
    let rejectionFeedback = null
    if (nextStatus === 'rejected') {
      rejectionFeedback = window.prompt('Enter the applicant-facing rejection feedback/reason. This exact text will be emailed to the applicant.')
      if (!rejectionFeedback || !rejectionFeedback.trim()) {
        setMessage({ type: 'error', text: 'Rejection feedback is required before rejecting a candidate.' })
        return
      }
      rejectionFeedback = rejectionFeedback.trim()
    }
    setUpdatingId(application.id)
    setMessage({ type: '', text: '' })
    try {
      const updated = await updateHrApplicationStatus(application.id, nextStatus, { rejectionFeedback })
      setResult((current) => ({
        ...current,
        applications: current.applications.map((item) => item.id === application.id ? { ...item, status: updated.status } : item),
      }))
      setOpenActionId(null)
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
    <header className="page-head pipeline-head"><div><p className="eyebrow">Recruitment pipeline</p><h1 className="page-title">Pipeline</h1><p className="page-description">Track and manage candidates across your recruitment process.</p></div></header>

    <div className="pipeline-toolbar panel">
      <label className="candidate-search pipeline-search"><Search size={15} /><input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search candidates, emails, or jobs" type="search" /></label>
      <Field label="Job vacancy"><select value={filters.job_id} onChange={(event) => setFilters((current) => ({ ...current, job_id: event.target.value }))}><option value="">All jobs</option>{jobs.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></Field>
      {departments.length > 0 && <Field label="Department"><select value={filters.department} onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value }))}><option value="">All departments</option>{departments.map((department) => <option key={department} value={department}>{department}</option>)}</select></Field>}
      <Field label="View / Status"><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="active">Active pipeline</option>{activeColumns.map(([status, label]) => <option key={status} value={status}>{label}</option>)}<option value="outcomes">Rejected / Withdrawn</option></select></Field>
      {hasFilters && <Button variant="ghost" onClick={() => setFilters({ search: '', job_id: '', department: '', status: 'active' })}>Reset</Button>}
    </div>

    {message.text && <p className={message.type === 'error' ? 'login-error' : 'profile-success'} role="status">{message.text}</p>}

    {!result.loading && !result.error && <div className="pipeline-summary-grid" aria-label="Pipeline summary"><SummaryCard icon={UsersRound} label="Total Candidates" value={summary.total} tone="total" /><SummaryCard icon={Clock3} label="In Progress" value={summary.inProgress} tone="progress" /><SummaryCard icon={CheckCircle2} label="Hired" value={summary.hired} tone="hired" /><SummaryCard icon={XCircle} label="Rejected" value={summary.rejected} tone="rejected" /></div>}
    {result.loading && <div className="panel pipeline-loading"><Skeleton height={26} width="32%" /><Skeleton /><Skeleton /></div>}
    {!result.loading && result.error && <PipelineState title="Unable to load pipeline" description={result.error} />}
    {!result.loading && !result.error && result.applications.length === 0 && <PipelineState title="No applications in the recruitment pipeline yet." description="Submitted applications will appear here when applicants apply to jobs." />}
    {!result.loading && !result.error && result.applications.length > 0 && filtered.length === 0 && <PipelineState title="No candidates match your filters" description="Try changing the search, job vacancy, or status view." />}

    {!result.loading && !result.error && filtered.length > 0 && filters.status !== 'outcomes' && <><div className="pipeline-board" aria-label="Recruitment pipeline board">{activeColumns.map(([status, label]) => <PipelineColumn key={status} status={status} label={label} applications={grouped.get(status) || []} updatingId={updatingId} onMove={moveCandidate} openActionId={openActionId} setOpenActionId={setOpenActionId} />)}</div><PipelineOverview grouped={grouped} /></>}
    {!result.loading && !result.error && filters.status === 'outcomes' && <section className="panel pipeline-outcomes"><div className="panel-header"><div><h2 className="panel-title">Rejected / Withdrawn</h2><p className="panel-subtitle">Outcome candidates are kept separate from the active board.</p></div></div><div className="pipeline-outcome-grid">{outcomes.length ? outcomes.map((application) => <CandidateCard key={application.id} application={application} updating={updatingId === application.id} onMove={moveCandidate} open={openActionId === application.id} setOpenActionId={setOpenActionId} />) : <p className="pipeline-empty">No rejected or withdrawn candidates match this view.</p>}</div></section>}
  </section>
}

function PipelineColumn({ status, label, applications, updatingId, onMove, openActionId, setOpenActionId }) {
  const [expanded, setExpanded] = useState(false)
  const busy = applications.some((application) => updatingId === application.id)
  const visibleApplications = expanded ? applications : applications.slice(0, 3)
  const hiddenCount = applications.length - visibleApplications.length
  return <section className={`pipeline-column ${busy ? 'is-updating' : ''}`} data-status={status}><header><span>{label}</span><strong>{applications.length}</strong></header><div className="pipeline-column-body">{applications.length ? <>{visibleApplications.map((application) => <CandidateCard key={application.id} application={application} updating={updatingId === application.id} onMove={onMove} open={openActionId === application.id} setOpenActionId={setOpenActionId} />)}{hiddenCount > 0 && <button type="button" className="pipeline-view-more" onClick={() => setExpanded(true)}>+ View {hiddenCount} more</button>}{expanded && applications.length > 3 && <button type="button" className="pipeline-view-more" onClick={() => setExpanded(false)}>Show less</button>}</> : <div className="pipeline-empty"><strong>No candidates</strong><span>Candidates moved to this stage will appear here.</span></div>}</div></section>
}

function PipelineOverview({ grouped }) {
  const stages = activeColumns.map(([status, label]) => ({ status, label, count: grouped.get(status)?.length || 0 }))
  const conversions = stages.slice(1).map((stage, index) => {
    const previous = stages[index]
    return previous.count ? Math.round((stage.count / previous.count) * 100) : 0
  })
  return <section className="pipeline-overview-card panel"><div className="panel-header"><div><h2 className="panel-title">Pipeline Overview</h2><p className="panel-subtitle">Stage volume and conversion based on the current filters.</p></div></div><div className="pipeline-overview-flow">{stages.map((stage, index) => <div className="pipeline-overview-step" data-status={stage.status} key={stage.status}><strong>{stage.count}</strong><span>{stage.label}</span>{index < conversions.length && <em>{conversions[index]}%</em>}</div>)}</div></section>
}

function CandidateCard({ application, updating, onMove, open, setOpenActionId }) {
  const options = moveOptions[application.status] || []
  const canScheduleInterview = application.status === 'shortlisted'
  const hired = application.status === 'selected' && application.contract_status === 'accepted'
  return <article className="pipeline-card">
    <div className="pipeline-card-head"><span className="pipeline-initials">{initials(application)}</span><div className="pipeline-card-menu"><button type="button" aria-label={`Actions for ${application.applicant_first_name} ${application.applicant_last_name}`} aria-expanded={open} onClick={() => setOpenActionId(open ? null : application.id)}><MoreHorizontal size={15} /></button>{open && <div className="pipeline-action-menu"><Link to={`/candidates/${application.id}`} onClick={() => setOpenActionId(null)}>View Candidate</Link>{canScheduleInterview && <Link to={`/candidates/${application.id}`} onClick={() => setOpenActionId(null)}>Schedule Interview</Link>}{options.map((status) => <button key={status} disabled={updating} onClick={() => onMove(application, status)}>{updating ? 'Moving...' : `Move to ${formatApplicationStatus(status)}`} <ArrowRight size={12} /></button>)}</div>}</div></div>
    <h2>{application.applicant_first_name} {application.applicant_last_name}</h2>
    <p className="pipeline-job" title={application.job_title}><BriefcaseBusiness size={12} />{application.job_title}</p>
    <div className="pipeline-card-meta"><span>{formatDate(application.submitted_at)}</span>{typeof application.match_score === 'number' && <span className="pipeline-ai-score"><Sparkles size={11} />AI Match {Math.round(application.match_score)}%</span>}</div>
    <div className="pipeline-card-flags"><StatusBadge>{hired ? 'Hired' : formatApplicationStatus(application.status)}</StatusBadge>{application.contract_status && <span className="pipeline-contract-indicator">Contract: {contractLabel(application.contract_status)}</span>}</div>
  </article>
}

function SummaryCard({ icon: Icon, label, value, tone }) { return <article className={`pipeline-summary-card ${tone}`}><span><Icon size={18} /></span><div><strong>{value}</strong><p>{label}</p></div></article> }

function PipelineState({ title, description }) { return <div className="careers-state"><span><FileText size={22} /></span><h2>{title}</h2><p>{description}</p></div> }
function initials(application) { return `${application.applicant_first_name?.[0] || ''}${application.applicant_last_name?.[0] || ''}`.toUpperCase() || 'C' }
function formatDate(value) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) }

function contractLabel(status) { return status === 'accepted' ? 'Accepted / Hired' : status.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ') }
