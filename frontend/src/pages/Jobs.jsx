import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Modal } from '../components/ui'
import { JobFilters } from '../components/jobs/JobFilters'
import { JobsTable } from '../components/jobs/JobsTable'
import { EmptyState, PageHeader, PageSkeleton } from '../components/jobs/JobShared'
import { useJobs } from '../context/JobsContext'
import { deleteJob, getJobs } from '../api/jobs'

const initialFilters = { search: '', status: '', department: '', location: '', employmentType: '' }

export default function Jobs() {
  const { updateStatus } = useJobs()
  const [result, setResult] = useState({ jobs: [], error: '', key: '' })
  const [filters, setFilters] = useState(initialFilters)
  const [mobileFilters, setMobileFilters] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [refreshIndex, setRefreshIndex] = useState(0)
  const [actionError, setActionError] = useState('')
  const navigate = useNavigate()
  const requestKey = useMemo(() => JSON.stringify({ filters, refreshIndex }), [filters, refreshIndex])
  const loading = result.key !== requestKey
  const jobs = loading ? [] : result.jobs
  const error = loading ? '' : result.error

  useEffect(() => {
    let cancelled = false
    getJobs({ ...filters, skip: 0, limit: 100 })
      .then((items) => {
        if (!cancelled) setResult({ jobs: items, error: '', key: requestKey })
      })
      .catch((requestError) => {
        if (!cancelled) {
          setResult({
            jobs: [],
            error: requestError.status === 401
            ? 'Sign in to view job vacancies.'
              : 'Jobs could not be loaded. Please try again.',
            key: requestKey,
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [filters, requestKey])

  const summary = [
    ['Total jobs', jobs.length], ['Published', jobs.filter((job) => job.status === 'Published').length],
    ['Drafts', jobs.filter((job) => job.status === 'Draft').length],
    ['Closing soon', jobs.filter((job) => job.status === 'Published' && job.applicationDeadline <= '2026-09-28').length],
  ]
  const hasFilters = Object.values(filters).some(Boolean)
  const clear = () => setFilters(initialFilters)
  const handleAction = (action, job) => {
    if (action === 'Publish') setConfirmation({ action, job })
    if (action === 'Close') setConfirmation({ action, job })
    if (action === 'Archive') setConfirmation({ action, job })
    if (action === 'Delete') setConfirmation({ action, job })
  }
  const confirm = async () => {
    try {
      setActionError('')
      if (confirmation.action === 'Delete') {
        await deleteJob(confirmation.job.id)
      } else {
        const status = confirmation.action === 'Close' ? 'Closed' : confirmation.action === 'Archive' ? 'Archived' : 'Published'
        await updateStatus(confirmation.job.id, status)
      }
      setConfirmation(null)
      setRefreshIndex((current) => current + 1)
    } catch (error) {
      setActionError(error.status === 403 ? 'You do not have permission to manage jobs.' : error.message || 'The job could not be updated.')
    }
  }

  return <>
    <PageHeader title="Jobs" description="Manage vacancies and track hiring activity across your organization."
      actions={<Button icon={Plus} render={<Link to="/jobs/new" />}>Create job</Button>} />
    <section className="jobs-summary" aria-label="Jobs summary">{summary.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>
    <section className="jobs-panel">
      <JobFilters filters={filters} setFilters={setFilters} mobileOpen={mobileFilters} setMobileOpen={setMobileFilters} />
      {loading
        ? <PageSkeleton />
        : error
          ? <ApiState title="Unable to load jobs" message={error} />
          : jobs.length
            ? <JobsTable jobs={jobs} onAction={handleAction} />
            : <EmptyState filtered={hasFilters} onClear={clear} />}
      {actionError && <ApiState title="Action failed" message={actionError} />}
      {!loading && !error && jobs.length > 0 && <footer className="table-footer"><span>Showing {jobs.length} of {jobs.length} jobs</span><div><button disabled>Previous</button><strong>1</strong><button disabled>Next</button></div></footer>}
    </section>
    <StatusConfirmation value={confirmation} onClose={() => setConfirmation(null)} onConfirm={confirm} onView={() => navigate(`/jobs/${confirmation?.job.id}`)} error={actionError} />
  </>
}

function ApiState({ title, message }) {
  return <div className="jobs-empty"><h2>{title}</h2><p>{message}</p></div>
}

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
