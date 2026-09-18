import { useEffect, useState } from 'react'
import { ArrowLeft, BriefcaseBusiness, CalendarDays, MapPin } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { getPublicJob } from '../api/publicJobs'
import { Button } from '../components/ui'
import { JobNotFound, PageSkeleton } from '../components/jobs/JobShared'
import { useAuth } from '../context/useAuth'
import { formatDate } from '../utils/jobs'
import { PublicHeader } from './Careers'

export default function CareerDetails() {
  const { jobId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [result, setResult] = useState({ job: null, error: '', id: '' })
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    getPublicJob(jobId)
      .then((job) => {
        if (!cancelled) setResult({ job, error: '', id: jobId })
      })
      .catch((error) => {
        if (!cancelled) setResult({ job: null, error: error.status === 404 ? 'not-found' : 'load-error', id: jobId })
      })
    return () => {
      cancelled = true
    }
  }, [jobId])

  const accountPath = user?.role === 'applicant' ? '/profile' : '/overview'
  const loading = result.id !== jobId
  const job = result.job

  const applyNow = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } })
      return
    }
    if (user?.role === 'applicant') {
      navigate('/careers/' + jobId + '/apply')
      return
    }
    setNotice('Sign in as an applicant to apply for this job.')
  }

  if (loading) return <main className="public-page"><PublicHeader isAuthenticated={isAuthenticated} accountPath={accountPath} /><PageSkeleton /></main>
  if (result.error || !job) return <main className="public-page"><PublicHeader isAuthenticated={isAuthenticated} accountPath={accountPath} /><JobNotFound /></main>

  return <main className="public-page">
    <PublicHeader isAuthenticated={isAuthenticated} accountPath={accountPath} />
    <article className="career-detail">
      <Link className="back-link" to="/careers"><ArrowLeft size={14} />Back to jobs</Link>
      <header className="career-detail-head">
        <div>
          <p className="eyebrow">{job.department}</p>
          <h1>{job.title}</h1>
          <div className="career-meta"><span><MapPin size={15} />{job.location}</span><span><BriefcaseBusiness size={15} />{job.employmentType}</span><span>{job.workArrangement}</span></div>
        </div>
        <div className="career-apply-card">
          <Button onClick={applyNow}>Apply Now</Button>
          {notice && <p role="status">{notice}</p>}
        </div>
      </header>

      <div className="career-detail-grid">
        <div className="career-detail-main">
          <PublicSection title="About the role"><p>{job.description}</p></PublicSection>
          {job.responsibilities && <PublicSection title="Responsibilities"><LineList value={job.responsibilities} /></PublicSection>}
          <PublicSection title="Requirements"><LineList value={job.requirements} /></PublicSection>
          <PublicSection title="Skills">
            {job.requiredSkills.length > 0 && <><h3>Required</h3><div className="career-skills">{job.requiredSkills.map((skill) => <span key={skill}>{skill}</span>)}</div></>}
            {job.preferredSkills.length > 0 && <><h3>Preferred</h3><div className="career-skills muted">{job.preferredSkills.map((skill) => <span key={skill}>{skill}</span>)}</div></>}
          </PublicSection>
        </div>
        <aside className="career-facts">
          <h2>Job details</h2>
          <dl>
            <div><dt>Department</dt><dd>{job.department}</dd></div>
            <div><dt>Location</dt><dd>{job.location}</dd></div>
            <div><dt>Employment</dt><dd>{job.employmentType}</dd></div>
            <div><dt>Workplace</dt><dd>{job.workArrangement}</dd></div>
            <div><dt>Positions</dt><dd>{job.openings}</dd></div>
            <div><dt>Deadline</dt><dd><CalendarDays size={14} />{formatDate(job.applicationDeadline)}</dd></div>
          </dl>
        </aside>
      </div>
    </article>
  </main>
}

function PublicSection({ title, children }) { return <section className="career-section"><h2>{title}</h2>{children}</section> }
function LineList({ value }) { const lines = value?.split('\n').filter(Boolean) || []; return lines.length > 1 ? <ul>{lines.map((line) => <li key={line}>{line}</li>)}</ul> : <p>{value || 'Not specified'}</p> }





