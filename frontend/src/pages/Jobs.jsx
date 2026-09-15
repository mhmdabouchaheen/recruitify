import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Modal } from '../components/ui'
import { JobFilters } from '../components/jobs/JobFilters'
import { JobsTable } from '../components/jobs/JobsTable'
import { EmptyState, PageHeader } from '../components/jobs/JobShared'
import { useJobs } from '../context/JobsContext'

const initialFilters = { search: '', status: '', department: '', location: '', employmentType: '' }

export default function Jobs() {
  const { jobs, updateStatus } = useJobs()
  const [filters, setFilters] = useState(initialFilters)
  const [mobileFilters, setMobileFilters] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const navigate = useNavigate()

  const filtered = useMemo(() => jobs.filter((job) => {
    const query = filters.search.toLowerCase()
    return (!query || [job.title, job.id, job.department, ...job.requiredSkills].join(' ').toLowerCase().includes(query))
      && (!filters.status || job.status === filters.status)
      && (!filters.department || job.department === filters.department)
      && (!filters.location || job.location === filters.location)
      && (!filters.employmentType || job.employmentType === filters.employmentType)
  }), [filters, jobs])

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
  }
  const confirm = () => {
    const status = confirmation.action === 'Close' ? 'Closed' : confirmation.action === 'Archive' ? 'Archived' : 'Published'
    updateStatus(confirmation.job.id, status)
    setConfirmation(null)
  }

  return <>
    <PageHeader title="Jobs" description="Manage vacancies and track hiring activity across your organization."
      actions={<Button icon={Plus} render={<Link to="/jobs/new" />}>Create job</Button>} />
    <section className="jobs-summary" aria-label="Jobs summary">{summary.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>
    <section className="jobs-panel">
      <JobFilters filters={filters} setFilters={setFilters} mobileOpen={mobileFilters} setMobileOpen={setMobileFilters} />
      {filtered.length ? <JobsTable jobs={filtered} onAction={handleAction} /> : <EmptyState filtered={hasFilters} onClear={clear} />}
      {filtered.length > 0 && <footer className="table-footer"><span>Showing {filtered.length} of {jobs.length} jobs</span><div><button disabled>Previous</button><strong>1</strong><button disabled>Next</button></div></footer>}
    </section>
    <StatusConfirmation value={confirmation} onClose={() => setConfirmation(null)} onConfirm={confirm} onView={() => navigate(`/jobs/${confirmation?.job.id}`)} />
  </>
}

function StatusConfirmation({ value, onClose, onConfirm }) {
  if (!value) return null
  const { action, job } = value
  const copy = action === 'Close'
    ? 'Closing this vacancy will prevent new applications. Existing applications will remain available to the recruitment team.'
    : action === 'Archive'
      ? 'Archived jobs remain available for historical reference but are removed from active recruitment workflows.'
      : 'Once published, applicants will be able to submit applications until the vacancy is closed or reaches its deadline.'
  return <Modal open title={`${action} ${job.title}?`} onClose={onClose}
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={action === 'Close' ? 'danger' : 'primary'} onClick={onConfirm}>{action === 'Close' ? 'Close job' : `${action} job`}</Button></>}>
    <p className="dialog-copy">{copy}</p>
  </Modal>
}
