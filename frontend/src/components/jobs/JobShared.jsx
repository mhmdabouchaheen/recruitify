import { ChevronLeft, FileQuestion, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, Skeleton } from '../ui'

export function JobStatusBadge({ status }) {
  return <span className={`job-status job-status-${status.toLowerCase()}`}><span />{status}</span>
}

export function PageHeader({ eyebrow, title, description, actions, backTo }) {
  return (
    <header className="page-head jobs-page-head">
      <div>
        {backTo && <Link className="back-link" to={backTo}><ChevronLeft size={14} />Back to jobs</Link>}
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

export function EmptyState({ filtered = false, onClear }) {
  return (
    <div className="jobs-empty">
      <span><FileQuestion size={22} /></span>
      <h2>{filtered ? 'No jobs match your filters' : 'No vacancies yet'}</h2>
      <p>{filtered ? 'Try adjusting your search or clearing the active filters.' : 'Create your first job to start receiving applications.'}</p>
      {filtered
        ? <Button variant="secondary" onClick={onClear}>Clear filters</Button>
        : <Button icon={Plus} render={<Link to="/jobs/new" />}>Create job</Button>}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="page-loading" aria-label="Loading page">
      <Skeleton width="32%" height={30} /><Skeleton width="58%" />
      <div className="loading-panel"><Skeleton height={52} /><Skeleton height={52} /><Skeleton height={52} /></div>
    </div>
  )
}

export function JobNotFound() {
  return (
    <div className="jobs-empty standalone">
      <span><FileQuestion size={22} /></span>
      <h1>Job not found</h1>
      <p>This vacancy may have been removed or you may not have access to it.</p>
      <Button variant="secondary" render={<Link to="/jobs" />}>Back to jobs</Button>
    </div>
  )
}

export function JobSummary({ job }) {
  const items = [
    ['Applications', job.applicationCount],
    ['Shortlisted', job.shortlistedCount],
    ['Interviews', job.interviewCount],
    ['Selected', job.selectedCount],
  ]
  return <section className="job-activity" aria-label="Recruitment activity">
    {items.map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
  </section>
}
