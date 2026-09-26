
import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Eye, FileText, Search, UserRoundCheck, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'

import { formatApplicationStatus, getHrApplications, hrStatusOptions } from '../api/hrApplications'
import { Button, Skeleton, StatusBadge } from '../components/ui'

const tabs = [
  ['all', 'All'],
  ['applied', 'Applied'],
  ['under_review', 'Under Review'],
  ['shortlisted', 'Shortlisted'],
  ['interview', 'Interview'],
  ['selected', 'Selected'],
  ['rejected', 'Rejected'],
]

export default function Candidates() {
  const [filters, setFilters] = useState({ search: '', job_id: '', status: '', department: '', tab: 'all' })
  const [result, setResult] = useState({ applications: [], loading: true, error: '' })

  useEffect(() => {
    let cancelled = false
    getHrApplications({ limit: 100 })
      .then((applications) => { if (!cancelled) setResult({ applications, loading: false, error: '' }) })
      .catch((error) => { if (!cancelled) setResult({ applications: [], loading: false, error: error.message || 'Candidates could not be loaded.' }) })
    return () => { cancelled = true }
  }, [])

  const jobs = useMemo(() => {
    const map = new Map()
    result.applications.forEach((application) => map.set(String(application.job_id), application.job_title))
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [result.applications])

  const departments = useMemo(() => [...new Set(result.applications.map((application) => application.department).filter(Boolean))].sort(), [result.applications])
  const counts = useMemo(() => buildCounts(result.applications), [result.applications])
  const summary = useMemo(() => ({
    total: result.applications.length,
    newApplications: counts.applied || 0,
    shortlisted: counts.shortlisted || 0,
    interviewing: (counts.interview_scheduled || 0) + (counts.interview_completed || 0),
  }), [result.applications.length, counts])

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    return result.applications.filter((application) => {
      const matchesSearch = matchesCandidateSearch(application, search)
      const matchesJob = !filters.job_id || String(application.job_id) === filters.job_id
      const matchesDepartment = !filters.department || application.department === filters.department
      const matchesStatus = !filters.status || application.status === filters.status
      const matchesTab = filters.tab === 'all' || (filters.tab === 'interview' ? ['interview_scheduled', 'interview_completed'].includes(application.status) : application.status === filters.tab)
      return matchesSearch && matchesJob && matchesDepartment && matchesStatus && matchesTab
    })
  }, [result.applications, filters])

  const hasFilters = filters.search || filters.job_id || filters.status || filters.department || filters.tab !== 'all'
  const resetFilters = () => setFilters({ search: '', job_id: '', status: '', department: '', tab: 'all' })

  return <section className="candidates-page">
    <header className="candidates-head">
      <div><h1>Candidates</h1></div>
    </header>

    <section className="candidate-summary-grid" aria-label="Candidate summary">
      <SummaryCard icon={UsersRound} tone="green" label="Total Candidates" value={summary.total} />
      <SummaryCard icon={FileText} tone="blue" label="New Applications" value={summary.newApplications} />
      <SummaryCard icon={UserRoundCheck} tone="purple" label="Shortlisted" value={summary.shortlisted} />
      <SummaryCard icon={CalendarDays} tone="amber" label="Interviewing" value={summary.interviewing} />
    </section>

    <section className="candidate-filter-panel panel">
      <label className="candidate-management-search"><Search size={16} /><input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search candidates by name, email, or job..." type="search" /></label>
      <select value={filters.job_id} onChange={(event) => setFilters((current) => ({ ...current, job_id: event.target.value }))}><option value="">All Jobs</option>{jobs.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select>
      <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">All Statuses</option>{hrStatusOptions.map((status) => <option key={status} value={statusToValue(status)}>{status}</option>)}<option value="withdrawn">Withdrawn</option></select>
      <select value={filters.department} onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value }))}><option value="">All Departments</option>{departments.map((department) => <option key={department} value={department}>{department}</option>)}</select>
      {hasFilters && <Button variant="ghost" onClick={resetFilters}>Reset</Button>}
    </section>

    {result.loading && <div className="panel candidate-list-panel"><Skeleton height={24} width="30%" /><Skeleton /><Skeleton /></div>}
    {!result.loading && result.error && <CandidateState title="Unable to load candidates" description={result.error} />}
    {!result.loading && !result.error && result.applications.length === 0 && <CandidateState title="No applications yet" description="Submitted applications will appear here." />}
    {!result.loading && !result.error && result.applications.length > 0 && <section className="candidate-table-card panel">
      <div className="candidate-tabs" role="tablist" aria-label="Candidate status filters">
        {tabs.map(([key, label]) => <button key={key} type="button" className={filters.tab === key ? 'active' : ''} onClick={() => setFilters((current) => ({ ...current, tab: key }))}>{label}<span>{tabCount(key, counts, result.applications.length)}</span></button>)}
      </div>
      {filtered.length ? <div className="candidate-table-wrap"><table className="candidate-management-table"><thead><tr><th>Candidate</th><th>Applied Job</th><th>Department</th><th>Status</th><th>Applied On</th><th>Actions</th></tr></thead><tbody>{filtered.map((application) => <CandidateRow key={application.id} application={application} />)}</tbody></table></div> : <CandidateState title="No candidates match your filters" description="Try changing the search, job, status, department, or tab filter." compact />}
      <div className="candidate-table-footer">Showing {filtered.length} of {result.applications.length} candidates</div>
    </section>}
  </section>
}

function CandidateRow({ application }) {
  const name = `${application.applicant_first_name} ${application.applicant_last_name}`
  return <tr><td><div className="candidate-management-person"><span>{initials(application)}</span><div><strong>{name}</strong><small>{application.applicant_email}</small></div></div></td><td>{application.job_title}</td><td>{application.department}</td><td><StatusBadge>{formatApplicationStatus(application.status)}</StatusBadge></td><td>{formatDate(application.submitted_at)}</td><td><Link className="candidate-view-action" to={`/candidates/${application.id}`} aria-label={`View ${name}`}><Eye size={16} />View</Link></td></tr>
}

function SummaryCard({ icon: Icon, tone, label, value }) { return <article className={`candidate-summary-card ${tone}`}><span><Icon size={23} /></span><div><p>{label}</p><strong>{value}</strong></div></article> }
function CandidateState({ title, description, compact = false }) { return <div className={`careers-state ${compact ? 'candidate-state-compact' : ''}`}><span><FileText size={22} /></span><h2>{title}</h2><p>{description}</p></div> }
function formatDate(value) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) }
function initials(application) { return `${application.applicant_first_name?.[0] || ''}${application.applicant_last_name?.[0] || ''}`.toUpperCase() || 'CA' }
function candidateName(application) { return `${application.applicant_first_name || ''} ${application.applicant_last_name || ''}`.trim() }
function matchesCandidateSearch(application, search) {
  if (!search) return true
  return [candidateName(application), application.applicant_email, application.job_title]
    .some((value) => String(value || '').toLowerCase().includes(search))
}
function statusToValue(status) { return status.toLowerCase().replaceAll(' ', '_') }
function buildCounts(applications) { return applications.reduce((acc, application) => { acc[application.status] = (acc[application.status] || 0) + 1; return acc }, {}) }
function tabCount(key, counts, total) { if (key === 'all') return total; if (key === 'interview') return (counts.interview_scheduled || 0) + (counts.interview_completed || 0); return counts[key] || 0 }
