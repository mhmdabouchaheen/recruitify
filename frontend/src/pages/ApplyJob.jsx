import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, FileText } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { getApplicantCvs } from '../api/applicant'
import { submitApplication } from '../api/applications'
import { getPublicJob } from '../api/publicJobs'
import { Button, Field, Skeleton } from '../components/ui'
import { useAuth } from '../context/useAuth'
import { PublicHeader } from './Careers'

export default function ApplyJob() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [job, setJob] = useState(null)
  const [cvs, setCvs] = useState([])
  const [cvId, setCvId] = useState('')
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([getPublicJob(jobId), getApplicantCvs()])
      .then(([jobData, cvData]) => {
        if (cancelled) return
        setJob(jobData)
        setCvs(cvData)
        setCvId(String(cvData.find((cv) => cv.is_primary)?.id || cvData[0]?.id || ''))
      })
      .catch(() => {
        if (!cancelled) setError('Application form could not be loaded.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [jobId])

  const requiredQuestions = useMemo(() => job?.applicationQuestions?.filter((question) => question.required) || [], [job])

  if (loading) return <main className="public-page"><PublicHeader isAuthenticated accountPath="/profile" /><div className="profile-page-shell"><div className="profile-card"><Skeleton height={28} width="40%" /><Skeleton /><Skeleton height={120} /></div></div></main>

  if (!job) return <main className="public-page"><PublicHeader isAuthenticated accountPath="/profile" /><div className="profile-page-shell"><ApplicationState title="Job unavailable" description="This job may no longer be published." /></div></main>

  const submit = async (event) => {
    event.preventDefault()
    if (submitting) return
    setError('')
    if (!cvId) {
      setError('Select a CV before submitting.')
      return
    }
    const missing = requiredQuestions.find((question) => !answers[question.id]?.trim())
    if (missing) {
      setError('Please answer all required questions.')
      return
    }
    setSubmitting(true)
    try {
      const application = await submitApplication({
        job_id: Number(job.id),
        cv_id: Number(cvId),
        answers: (job.applicationQuestions || [])
          .filter((question) => answers[question.id]?.trim())
          .map((question) => ({ question_id: Number(question.id), answer: answers[question.id].trim() })),
      })
      navigate(`/applications/${application.id}`, { replace: true })
    } catch (requestError) {
      setError(requestError.status === 409 ? 'You have already applied to this job.' : requestError.message || 'Application could not be submitted.')
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="public-page">
    <PublicHeader isAuthenticated accountPath={user?.role === 'applicant' ? '/profile' : '/overview'} />
    <div className="profile-page-shell">
      <Link className="back-link" to={`/careers/${job.id}`}><ArrowLeft size={14} />Back to job</Link>
      <header className="profile-head"><div><p className="eyebrow">Apply now</p><h1>{job.title}</h1><p>{job.department} · {job.location} · {job.employmentType}</p></div></header>
      {error && <p className="login-error" role="alert">{error}</p>}
      {cvs.length === 0 ? <ApplicationState title="Upload a CV first" description="You need a PDF CV in your profile before applying." action={<Button render={<Link to="/profile" />}>Go to profile</Button>} /> : <form className="profile-grid" onSubmit={submit}>
        <section className="profile-card"><h2>Select CV</h2><div className="application-cv-options">{cvs.map((cv) => <label className={`application-cv-option ${String(cv.id) === cvId ? 'active' : ''}`} key={cv.id}><input type="radio" name="cv" value={cv.id} checked={String(cv.id) === cvId} onChange={(event) => setCvId(event.target.value)} /><FileText size={17} /><span><strong>{cv.original_filename}</strong>{cv.is_primary && <em><CheckCircle2 size={13} />Primary</em>}</span></label>)}</div></section>
        <section className="profile-card"><h2>Application questions</h2>{job.applicationQuestions?.length ? <div className="profile-fields">{job.applicationQuestions.map((question) => <Field key={question.id} label={`${question.text}${question.required ? ' *' : ''}`}><textarea rows={4} value={answers[question.id] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} required={question.required} /></Field>)}</div> : <p className="muted-copy">No additional questions for this job.</p>}</section>
        <div className="profile-actions"><Button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit application'}</Button></div>
      </form>}
    </div>
  </main>
}

function ApplicationState({ title, description, action }) { return <div className="profile-state"><span><FileText size={22} /></span><h2>{title}</h2><p>{description}</p>{action}</div> }
