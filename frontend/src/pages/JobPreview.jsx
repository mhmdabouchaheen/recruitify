import { useEffect, useState } from 'react'
import { ArrowLeft, BriefcaseBusiness, Building2, CalendarDays, MapPin } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui'
import { JobNotFound, PageSkeleton } from '../components/jobs/JobShared'
import { formatDate } from '../utils/jobs'
import { getJob } from '../api/jobs'

export default function JobPreview() {
  const { jobId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const routeStateJob = location.state?.job
  const [result, setResult] = useState({ job: null, error: '', id: '' })

  useEffect(() => {
    if (routeStateJob) return undefined

    let cancelled = false
    getJob(jobId)
      .then((job) => {
        if (!cancelled) setResult({ job, error: '', id: jobId })
      })
      .catch((error) => {
        if (!cancelled) setResult({ job: null, error: error.status === 404 ? 'not-found' : 'load-error', id: jobId })
      })

    return () => {
      cancelled = true
    }
  }, [jobId, routeStateJob])

  const loading = !routeStateJob && result.id !== jobId
  if (loading) return <PageSkeleton />
  if (!routeStateJob && result.error) return <JobNotFound />

  const job = routeStateJob || result.job
  if (!job) return <JobNotFound />

  const back = location.state?.from || (jobId === 'new' ? '/jobs/new' : `/jobs/${jobId}`)
  return <div className="job-preview-page">
    <div className="preview-bar"><div><span>Preview mode</span><p>This is approximately what applicants will see.</p></div><Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(back, { state: location.state?.from ? { job } : undefined })}>Return to editing</Button></div>
    <article className="applicant-preview">
      <header><div className="preview-company"><span><Building2 size={18} /></span>Cedar Labs</div><p className="eyebrow">{job.department || 'Department'}</p><h1>{job.title || 'Untitled vacancy'}</h1><div className="preview-meta"><span><MapPin size={15} />{job.location || 'Location'}</span><span><BriefcaseBusiness size={15} />{job.employmentType || 'Employment type'}</span><span>{job.workArrangement}</span></div><Button disabled>Apply for this job</Button></header>
      <div className="preview-content"><main><section><h2>About the role</h2><p>{job.summary || job.description || 'A summary of this opportunity will appear here.'}</p>{job.description && <p>{job.description}</p>}</section><PreviewList title="What you’ll do" value={job.responsibilities} /><PreviewList title="What we’re looking for" value={job.requirements} />{job.preferredQualifications && <PreviewList title="Preferred qualifications" value={job.preferredQualifications} />}<section><h2>Skills</h2><div className="preview-skills">{[...job.requiredSkills, ...job.preferredSkills].map((skill) => <span key={skill}>{skill}</span>)}</div></section></main><aside><h2>Job details</h2><dl><div><dt>Work arrangement</dt><dd>{job.workArrangement}</dd></div><div><dt>Experience</dt><dd>{job.requiredExperience || 'Not specified'}</dd></div><div><dt>Education</dt><dd>{job.educationLevel || 'Not specified'}</dd></div><div><dt>Openings</dt><dd>{job.openings}</dd></div></dl><p><CalendarDays size={15} />Apply by {formatDate(job.applicationDeadline)}</p></aside></div>
    </article>
  </div>
}
function PreviewList({ title, value }) { const lines = value?.split('\n').filter(Boolean) || []; if (!lines.length) return null; return <section><h2>{title}</h2><ul>{lines.map((line) => <li key={line}>{line}</li>)}</ul></section> }



