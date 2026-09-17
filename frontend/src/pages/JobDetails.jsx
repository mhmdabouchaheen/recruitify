import { useEffect, useState } from 'react'
import { Archive, Eye, FilePenLine, Radio, XCircle } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Avatar, Button, Modal } from '../components/ui'
import { JobNotFound, JobStatusBadge, JobSummary, PageHeader, PageSkeleton } from '../components/jobs/JobShared'
import { formatDate } from '../utils/jobs'
import { useJobs } from '../context/JobsContext'
import { candidatePreview } from '../data/jobs'
import { getJob } from '../api/jobs'

export default function JobDetails() {
  const { jobId } = useParams()
  const { updateStatus } = useJobs()
  const [result, setResult] = useState({ job: null, error: '', id: '' })
  const [confirmation, setConfirmation] = useState(null)
  const [actionError, setActionError] = useState('')
  const loading = result.id !== jobId
  const job = loading ? null : result.job
  const error = loading ? '' : result.error

  useEffect(() => {
    let cancelled = false
    getJob(jobId)
      .then((item) => {
        if (!cancelled) setResult({ job: item, error: '', id: jobId })
      })
      .catch((requestError) => {
        if (!cancelled) {
          setResult({
            job: null,
            error: requestError.status === 404 ? 'not-found' : 'Job details could not be loaded. Please try again.',
            id: jobId,
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [jobId])

  if (loading) return <PageSkeleton />
  if (error === 'not-found') return <JobNotFound />
  if (error) return <div className="jobs-empty standalone"><h1>Unable to load job</h1><p>{error}</p><Button variant="secondary" render={<Link to="/jobs" />}>Back to jobs</Button></div>
  if (!job) return <JobNotFound />

  const confirm = async () => {
    try {
      setActionError('')
      const updated = await updateStatus(job.id, confirmation)
      setResult((current) => current.job ? { ...current, job: updated } : current)
      setConfirmation(null)
    } catch (error) {
      setActionError(error.status === 403 ? 'You do not have permission to manage jobs.' : error.message || 'The job could not be updated.')
    }
  }
  return <>
    <PageHeader backTo="/jobs" eyebrow={job.id} title={job.title}
      description={<span className="job-header-meta">{job.department} · {job.location} · {job.employmentType} <JobStatusBadge status={job.status} /></span>}
      actions={<>
        <Button variant="secondary" icon={Eye} render={<Link to={`/jobs/${job.id}/preview`} />}>Preview</Button>
        {job.status !== 'Archived' && <Button variant="secondary" icon={FilePenLine} render={<Link to={`/jobs/${job.id}/edit`} />}>Edit</Button>}
        {job.status === 'Draft' && <Button icon={Radio} onClick={() => setConfirmation('Published')}>Publish</Button>}
        {job.status === 'Published' && <Button variant="danger" icon={XCircle} onClick={() => setConfirmation('Closed')}>Close job</Button>}
        {(job.status === 'Closed' || job.status === 'Draft') && <Button variant="secondary" icon={Archive} onClick={() => setConfirmation('Archived')}>Archive</Button>}
      </>} />
    {job.status !== 'Draft' && <JobSummary job={job} />}
    <div className="job-details-grid">
      <div className="job-details-main">
        <DetailsSection title="Overview"><p>{job.summary}</p><dl className="definition-grid"><div><dt>Department</dt><dd>{job.department}</dd></div><div><dt>Work arrangement</dt><dd>{job.workArrangement}</dd></div><div><dt>Employment type</dt><dd>{job.employmentType}</dd></div><div><dt>Openings</dt><dd>{job.openings}</dd></div></dl></DetailsSection>
        <DetailsSection title="Description"><p>{job.description}</p></DetailsSection>
        <DetailsSection title="Responsibilities"><LineList value={job.responsibilities} /></DetailsSection>
        <DetailsSection title="Requirements"><dl className="definition-grid compact"><div><dt>Experience</dt><dd>{job.requiredExperience || 'Not specified'}</dd></div><div><dt>Education</dt><dd>{job.educationLevel || 'Not specified'}</dd></div></dl><LineList value={job.requirements} />{job.preferredQualifications && <><h3>Preferred qualifications</h3><LineList value={job.preferredQualifications} /></>}</DetailsSection>
        <DetailsSection title="Skills"><div className="detail-skills">{job.requiredSkills.map((item) => <span key={item}>{item}</span>)}</div>{job.preferredSkills.length > 0 && <><h3>Preferred</h3><div className="detail-skills preferred">{job.preferredSkills.map((item) => <span key={item}>{item}</span>)}</div></>}</DetailsSection>
        <DetailsSection title="Application questions">{job.applicationQuestions.length ? <ol className="detail-questions">{job.applicationQuestions.map((question) => <li key={question.id}>{question.text}{question.required && <span>Required</span>}<small>{question.type}</small></li>)}</ol> : <p className="muted-copy">No job-specific questions configured.</p>}</DetailsSection>
      </div>
      <aside className="job-details-side">
        <section className="metadata-panel"><h2>Publishing information</h2><dl><div><dt>Created</dt><dd>{formatDate(job.createdAt)}</dd></div><div><dt>Published</dt><dd>{formatDate(job.publishedAt)}</dd></div><div><dt>Application deadline</dt><dd>{formatDate(job.applicationDeadline)}</dd></div><div><dt>Last updated</dt><dd>{formatDate(job.updatedAt)}</dd></div><div><dt>Hiring owner</dt><dd><Avatar name={job.owner} small />{job.owner}</dd></div></dl></section>
        {job.status !== 'Draft' && <section className="recent-candidates"><header><h2>Recent candidates</h2><button>View all candidates</button></header>{candidatePreview.map((person) => <article key={person.name}><Avatar name={person.name} color={person.color} /><div><strong>{person.name}</strong><span>{person.experience} · {person.applied}</span></div><small>{person.stage}</small></article>)}</section>}
      </aside>
    </div>
    <Modal open={Boolean(confirmation)} title={confirmation === 'Closed' ? `Close ${job.title}?` : `${confirmation === 'Archived' ? 'Archive' : 'Publish'} ${job.title}?`} onClose={() => setConfirmation(null)}
      footer={<><Button variant="secondary" onClick={() => setConfirmation(null)}>Cancel</Button><Button variant={confirmation === 'Closed' ? 'danger' : 'primary'} onClick={confirm}>{confirmation === 'Closed' ? 'Close job' : confirmation === 'Archived' ? 'Archive job' : 'Publish job'}</Button></>}>
      <p className="dialog-copy">{confirmation === 'Closed' ? 'Closing this vacancy will prevent new applications. Existing applications will remain available to the recruitment team.' : confirmation === 'Archived' ? 'The vacancy will remain available for historical reference and leave active recruitment workflows.' : 'Applicants will be able to submit applications until this vacancy is closed or reaches its deadline.'}</p>
      {actionError && <p className="form-error" role="alert">{actionError}</p>}
    </Modal>
  </>
}

function DetailsSection({ title, children }) { return <section className="details-section"><h2>{title}</h2>{children}</section> }
function LineList({ value }) { const lines = value?.split('\n').filter(Boolean) || []; return lines.length > 1 ? <ul>{lines.map((line) => <li key={line}>{line}</li>)}</ul> : <p>{value || 'Not specified'}</p> }
