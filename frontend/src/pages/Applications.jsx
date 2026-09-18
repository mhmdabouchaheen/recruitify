import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

import { getApplications } from '../api/applications'
import { Button, Skeleton } from '../components/ui'
import { PublicHeader } from './Careers'

export default function Applications() {
  const [result, setResult] = useState({ applications: [], loading: true, error: '' })

  useEffect(() => {
    let cancelled = false
    getApplications()
      .then((applications) => { if (!cancelled) setResult({ applications, loading: false, error: '' }) })
      .catch((error) => { if (!cancelled) setResult({ applications: [], loading: false, error: error.message || 'Applications could not be loaded.' }) })
    return () => { cancelled = true }
  }, [])

  return <main className="public-page"><PublicHeader isAuthenticated accountPath="/profile" /><div className="profile-page-shell"><ApplicantNav />
    <header className="profile-head"><div><p className="eyebrow">My applications</p><h1>Applications</h1><p>Track jobs you have applied to.</p></div></header>
    {result.loading && <div className="profile-card"><Skeleton height={26} width="35%" /><Skeleton /><Skeleton /></div>}
    {!result.loading && result.error && <State title="Unable to load applications" description={result.error} />}
    {!result.loading && !result.error && result.applications.length === 0 && <State title="No applications yet" description="Published jobs you apply to will appear here." action={<Button render={<Link to="/careers" />}>Find jobs</Button>} />}
    {!result.loading && !result.error && result.applications.length > 0 && <div className="application-list">{result.applications.map((application) => <Link className="application-row" to={`/applications/${application.id}`} key={application.id}><div><strong>{application.job.title}</strong><span>{application.job.department} · {application.job.location}</span></div><span>{formatStatus(application.status)}</span><small>{formatDate(application.submitted_at)}</small></Link>)}</div>}
  </div></main>
}

function ApplicantNav() { return <nav className="applicant-nav" aria-label="Applicant navigation"><Link to="/careers">Find Jobs</Link><Link className="active" to="/applications">My Applications</Link><Link to="/profile">Profile</Link></nav> }
function State({ title, description, action }) { return <div className="profile-state"><span><FileText size={22} /></span><h2>{title}</h2><p>{description}</p>{action}</div> }
function formatStatus(status) { return status.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ') }
function formatDate(value) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) }
