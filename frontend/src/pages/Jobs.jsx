
import { useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, CalendarDays, ExternalLink, FileText, MapPin, Plus, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Modal } from '../components/ui'
import { JobActions } from '../components/jobs/JobsTable'
import { JobStatusBadge } from '../components/jobs/JobShared'
import { useJobs } from '../context/JobsContext'
import { deleteJob, getJobs } from '../api/jobs'

const initialFilters = { search: '', status: '', department: '', location: '', employmentType: '', tab: 'all' }
const tabs = [['all', 'All Jobs'], ['Published', 'Published'], ['Draft', 'Drafts'], ['closing_soon', 'Closing Soon'], ['Archived', 'Archived']]

export default function Jobs() {
  const { updateStatus } = useJobs()
  const [result, setResult] = useState({ jobs: [], loading: true, error: '' })
  const [filters, setFilters] = useState(initialFilters)
  const [confirmation, setConfirmation] = useState(null)
  const [refreshIndex, setRefreshIndex] = useState(0)
  const [actionError, setActionError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    getJobs({ skip: 0, limit: 100 })
      .then((items) => { if (!cancelled) setResult({ jobs: items, loading: false, error: '' }) })
      .catch((requestError) => { if (!cancelled) setResult({ jobs: [], loading: false, error: requestError.status === 401 ? 'Sign in to view job vacancies.' : 'Jobs could not be loaded. Please try again.' }) })
    return () => { cancelled = true }
  }, [refreshIndex])

  const options = useMemo(() => ({
    departments: [...new Set(result.jobs.map((job) => job.department).filter(Boolean))].sort(),
    locations: [...new Set(result.jobs.map((job) => job.location).filter(Boolean))].sort(),
    employmentTypes: [...new Set(result.jobs.map((job) => job.employmentType).filter(Boolean))].sort(),
  }), [result.jobs])

  const counts = useMemo(() => ({
    all: result.jobs.length,
    Published: result.jobs.filter((job) => job.status === 'Published').length,
    Draft: result.jobs.filter((job) => job.status === 'Draft').length,
    Archived: result.jobs.filter((job) => job.status === 'Archived').length,
    closing_soon: result.jobs.filter(isClosingSoon).length,
  }), [result.jobs])

  const filteredJobs = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    return result.jobs.filter((job) => {
      const matchesSearch = !search || job.title.toLowerCase().includes(search) || job.department.toLowerCase().includes(search) || job.location.toLowerCase().includes(search)
      const matchesStatus = !filters.status || job.status === filters.status
      const matchesDepartment = !filters.department || job.department === filters.department
      const matchesLocation = !filters.location || job.location === filters.location
      const matchesEmployment = !filters.employmentType || job.employmentType === filters.employmentType
      const matchesTab = filters.tab === 'all' || (filters.tab === 'closing_soon' ? isClosingSoon(job) : job.status === filters.tab)
      return matchesSearch && matchesStatus && matchesDepartment && matchesLocation && matchesEmployment && matchesTab
    })
  }, [result.jobs, filters])

  const hasFilters = filters.search || filters.status || filters.department || filters.location || filters.employmentType || filters.tab !== 'all'
  const clear = () => setFilters(initialFilters)
  const handleAction = (action, job) => {
    if (['Publish', 'Close', 'Archive', 'Delete'].includes(action)) setConfirmation({ action, job })
  }
  const confirm = async () => {
    try {
      setActionError('')
      if (confirmation.action === 'Delete') await deleteJob(confirmation.job.id)
      else {
        const status = confirmation.action === 'Close' ? 'Closed' : confirmation.action === 'Archive' ? 'Archived' : 'Published'
        await updateStatus(confirmation.job.id, status)
      }
      setConfirmation(null)
      setResult((current) => ({ ...current, loading: true, error: '' }))
      setRefreshIndex((current) => current + 1)
    } catch (error) {
      setActionError(error.status === 403 ? 'You do not have permission to manage jobs.' : error.message || 'The job could not be updated.')
    }
  }

  return <section className="jobs-management-page">
    <header className="jobs-management-head"><div><h1>Jobs</h1></div><div><Button variant="secondary" render={<Link to="/careers" target="_blank" />}>View Career Page <ExternalLink size={14} /></Button><Button icon={Plus} render={<Link to="/jobs/new" />}>Create Job</Button></div></header>

    <section className="jobs-management-summary" aria-label="Jobs summary">
      <SummaryCard icon={BriefcaseBusiness} tone="blue" label="Total Jobs" value={counts.all} />
      <SummaryCard icon={FileText} tone="green" label="Published" value={counts.Published} />
      <SummaryCard icon={FileText} tone="amber" label="Drafts" value={counts.Draft} />
      <SummaryCard icon={CalendarDays} tone="purple" label="Closing Soon" value={counts.closing_soon} />
    </section>

    <section className="jobs-management-filters panel">
      <label className="jobs-management-search"><Search size={16} /><input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search by job title, department, or keyword..." type="search" /></label>
      <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">Status</option><option>Published</option><option>Draft</option><option>Closed</option><option>Archived</option></select>
      <select value={filters.department} onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value }))}><option value="">Department</option>{options.departments.map((value) => <option key={value}>{value}</option>)}</select>
      <select value={filters.location} onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))}><option value="">Location</option>{options.locations.map((value) => <option key={value}>{value}</option>)}</select>
      <select value={filters.employmentType} onChange={(event) => setFilters((current) => ({ ...current, employmentType: event.target.value }))}><option value="">Employment Type</option>{options.employmentTypes.map((value) => <option key={value}>{value}</option>)}</select>
      {hasFilters && <button type="button" onClick={clear}>Reset</button>}
    </section>

    <section className="jobs-management-table-card panel">
      <div className="jobs-management-tabs">{tabs.map(([key, label]) => <button key={key} type="button" className={filters.tab === key ? 'active' : ''} onClick={() => setFilters((current) => ({ ...current, tab: key }))}>{label}<span>{counts[key] || 0}</span></button>)}</div>
      {result.loading ? <div className="jobs-empty"><h2>Loading jobs...</h2><p>Fetching current vacancies.</p></div> : result.error ? <ApiState title="Unable to load jobs" message={result.error} /> : filteredJobs.length ? <JobsManagementTable jobs={filteredJobs} onAction={handleAction} /> : <ApiState title={hasFilters ? 'No jobs match your filters' : 'No jobs created yet'} message={hasFilters ? 'Try changing the search, filters, or status tab.' : 'Create a job to start collecting applications.'} />}
      {actionError && <ApiState title="Action failed" message={actionError} />}
      {!result.loading && !result.error && filteredJobs.length > 0 && <footer className="jobs-management-footer"><span>Showing {filteredJobs.length} of {result.jobs.length} jobs</span></footer>}
    </section>
    <StatusConfirmation value={confirmation} onClose={() => setConfirmation(null)} onConfirm={confirm} onView={() => navigate(`/jobs/${confirmation?.job.id}`)} error={actionError} />
  </section>
}

function JobsManagementTable({ jobs, onAction }) {
  return <div className="jobs-management-table-wrap"><table className="jobs-management-table"><thead><tr><th>Job Title</th><th>Department</th><th>Location</th><th>Type</th><th>Status</th><th>Applications</th><th>Created</th><th>Closing</th><th>Actions</th></tr></thead><tbody>{jobs.map((job) => <tr key={job.id}><td><div className="jobs-title-cell"><span>{job.title.slice(0, 2).toUpperCase()}</span><div><Link to={`/jobs/${job.id}`}>{job.title}</Link><small>REC-{String(job.id).padStart(3, '0')}</small></div></div></td><td>{job.department}</td><td><span className="jobs-location-cell"><MapPin size={14} />{job.location}{job.workArrangement ? ` (${job.workArrangement})` : ''}</span></td><td>{job.employmentType}</td><td><JobStatusBadge status={statusForDisplay(job)} /></td><td>{job.applicationCount}</td><td>{formatDate(job.createdAt)}</td><td><ClosingCell job={job} /></td><td><JobActions job={job} onAction={onAction} /></td></tr>)}</tbody></table></div>
}

function ClosingCell({ job }) {
  if (!job.applicationDeadline) return <span className="jobs-muted">?</span>
  const days = daysUntil(job.applicationDeadline)
  return <span className="jobs-closing-cell"><strong>{formatDate(job.applicationDeadline)}</strong>{days >= 0 && <small className={days <= 7 ? 'urgent' : ''}>{days} days left</small>}</span>
}

function SummaryCard({ icon: Icon, tone, label, value }) { return <article className={`jobs-management-summary-card ${tone}`}><span><Icon size={22} /></span><div><strong>{value}</strong><p>{label}</p></div></article> }
function ApiState({ title, message }) { return <div className="jobs-empty"><h2>{title}</h2><p>{message}</p></div> }
function isClosingSoon(job) { const days = daysUntil(job.applicationDeadline); return job.status === 'Published' && days >= 0 && days <= 14 }
function daysUntil(value) { if (!value) return Number.POSITIVE_INFINITY; const today = new Date(); today.setHours(0, 0, 0, 0); const deadline = new Date(value); deadline.setHours(0, 0, 0, 0); return Math.ceil((deadline - today) / 86400000) }
function statusForDisplay(job) { return isClosingSoon(job) ? 'Closing Soon' : job.status }
function formatDate(value) { if (!value) return '?'; return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) }

function StatusConfirmation({ value, onClose, onConfirm, error }) {
  if (!value) return null
  const { action, job } = value
  const copy = action === 'Delete'
    ? 'Deleting this vacancy will remove it and its configured skills and application questions.'
    : action === 'Close'
    ? 'Closing this vacancy will prevent new applications. Existing applications will remain available to the recruitment team.'
    : action === 'Archive'
      ? 'Archived jobs remain available for historical reference but are removed from active recruitment workflows.'
      : 'Once published, applicants will be able to submit applications until the vacancy is closed or reaches its deadline.'
  return <Modal open title={`${action} ${job.title}?`} onClose={onClose}
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={action === 'Close' || action === 'Delete' ? 'danger' : 'primary'} onClick={onConfirm}>{action === 'Close' ? 'Close job' : action === 'Delete' ? 'Delete job' : `${action} job`}</Button></>}>
    <p className="dialog-copy">{copy}</p>
    {error && <p className="form-error" role="alert">{error}</p>}
  </Modal>
}
