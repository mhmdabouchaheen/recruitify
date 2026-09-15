import { useMemo } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { JobForm } from '../components/jobs/JobForm'
import { JobNotFound, PageHeader } from '../components/jobs/JobShared'
import { useJobs } from '../context/JobsContext'
import { emptyJob } from '../data/jobs'

export default function JobFormPage() {
  const { jobId } = useParams()
  const location = useLocation()
  const { jobs, saveJob } = useJobs()
  const existing = jobs.find((job) => job.id === jobId)
  const initial = useMemo(
    () => structuredClone(location.state?.job || existing || emptyJob),
    [existing, location.state],
  )
  if (jobId && !existing) return <JobNotFound />
  return <>
    <PageHeader backTo={jobId ? `/jobs/${jobId}` : '/jobs'} eyebrow={jobId ? 'Job management' : 'New vacancy'}
      title={jobId ? `Edit ${existing.title}` : 'Create job'}
      description={jobId && existing.status === 'Published' ? 'Changes to this published vacancy may be visible to applicants.' : 'Build a clear vacancy that gives candidates the information they need.'} />
    <JobForm initialJob={initial} mode={jobId ? 'edit' : 'create'} onSave={saveJob} />
  </>
}
