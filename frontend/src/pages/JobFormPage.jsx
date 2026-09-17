import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { JobForm } from '../components/jobs/JobForm'
import { JobNotFound, PageHeader, PageSkeleton } from '../components/jobs/JobShared'
import { emptyJob } from '../data/jobs'
import { createJob, getJob, updateJob } from '../api/jobs'

export default function JobFormPage() {
  const { jobId } = useParams()
  const location = useLocation()
  const [result, setResult] = useState({ job: null, error: '', id: jobId || 'new' })

  useEffect(() => {
    if (!jobId || location.state?.job) return
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
  }, [jobId, location.state])

  const existing = location.state?.job || result.job
  const initial = useMemo(
    () => structuredClone(existing || emptyJob),
    [existing],
  )
  const saveJob = (job, mode) => jobId ? updateJob(jobId, job) : createJob(job, mode)

  if (jobId && result.id !== jobId && !location.state?.job) return <PageSkeleton />
  if (jobId && result.error === 'not-found') return <JobNotFound />
  if (jobId && result.error) return <div className="jobs-empty standalone"><h1>Unable to load job</h1><p>Job details could not be loaded. Please try again.</p></div>
  if (jobId && !existing) return <PageSkeleton />

  return <>
    <PageHeader backTo={jobId ? `/jobs/${jobId}` : '/jobs'} eyebrow={jobId ? 'Job management' : 'New vacancy'}
      title={jobId ? `Edit ${existing.title}` : 'Create job'}
      description={jobId && existing.status === 'Published' ? 'Changes to this published vacancy may be visible to applicants.' : 'Build a clear vacancy that gives candidates the information they need.'} />
    <JobForm initialJob={initial} mode={jobId ? 'edit' : 'create'} onSave={saveJob} />
  </>
}
