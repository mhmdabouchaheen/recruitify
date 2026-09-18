import { useEffect, useMemo, useState } from 'react'
import { FileText, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

import { formatApplicationStatus, getHrApplications, hrStatusOptions } from '../api/hrApplications'
import { Button, Field, Skeleton, StatusBadge } from '../components/ui'

export default function Candidates() {
  const [filters, setFilters] = useState({ search: '', job_id: '', status: '' })
  const [result, setResult] = useState({ applications: [], loading: true, error: '' })

  useEffect(() => {
    let cancelled = false
    getHrApplications({ ...filters, limit: 100 })
      .then((applications) => { if (!cancelled) setResult({ applications, loading: false, error: '' }) })
      .catch((error) => { if (!cancelled) setResult({ applications: [], loading: false, error: error.message || 'Candidates could not be loaded.' }) })
    return () => { cancelled = true }
  }, [filters])

  const jobs = useMemo(() => {
    const map = new Map()
    result.applications.forEach((application) => map.set(String(application.job_id), application.job_title))
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [result.applications])
  const hasFilters = Object.values(filters).some(Boolean)

  return <section>
    <header className="page-head"><div><p className="eyebrow">Candidate management</p><h1 className="page-title">Candidates</h1><p className="page-description">Review submitted applications and move candidates through the pipeline.</p></div></header>
    <div className="candidate-toolbar panel">
      <label className="candidate-search"><Search size={15} /><input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search name or email" type="search" /></label>
      <Field label="Job"><select value={filters.job_id} onChange={(event) => setFilters((current) => ({ ...current, job_id: event.target.value }))}><option value="">All jobs</option>{jobs.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></Field>
      <Field label="Status"><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">All statuses</option>{hrStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}<option value="withdrawn">Withdrawn</option></select></Field>
      {hasFilters && <Button variant="ghost" onClick={() => setFilters({ search: '', job_id: '', status: '' })}>Reset</Button>}
    </div>
    {result.loading && <div className="panel candidate-list-panel"><Skeleton height={24} width="30%" /><Skeleton /><Skeleton /></div>}
    {!result.loading && result.error && <CandidateState title="Unable to load candidates" description={result.error} />}
    {!result.loading && !result.error && result.applications.length === 0 && <CandidateState title={hasFilters ? 'No candidates match your filters' : 'No applications yet'} description={hasFilters ? 'Try changing the search, job, or status filter.' : 'Submitted applications will appear here.'} />}
    {!result.loading && !result.error && result.applications.length > 0 && <div className="panel candidate-list-panel"><div className="table-scroll"><table className="data-table"><thead><tr><th>Candidate</th><th>Applied job</th><th>Department</th><th>Status</th><th>Submitted</th></tr></thead><tbody>{result.applications.map((application) => <tr key={application.id}><td><Link className="candidate-link" to={`/candidates/${application.id}`}><strong>{application.applicant_first_name} {application.applicant_last_name}</strong><span>{application.applicant_email}</span></Link></td><td>{application.job_title}</td><td>{application.department}</td><td><StatusBadge>{formatApplicationStatus(application.status)}</StatusBadge></td><td>{formatDate(application.submitted_at)}</td></tr>)}</tbody></table></div></div>}
  </section>
}

function CandidateState({ title, description }) { return <div className="careers-state"><span><FileText size={22} /></span><h2>{title}</h2><p>{description}</p></div> }
function formatDate(value) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) }
