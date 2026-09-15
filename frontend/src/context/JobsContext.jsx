/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'
import { initialJobs } from '../data/jobs'

const JobsContext = createContext(null)

export function JobsProvider({ children }) {
  const [jobs, setJobs] = useState(initialJobs)
  const [toast, setToast] = useState(null)

  const notify = (message) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2600)
  }

  const saveJob = (job, mode = 'draft') => {
    const existing = jobs.some((item) => item.id === job.id)
    const nextJob = {
      ...job,
      id: job.id || `JOB-${1043 + jobs.length}`,
      status: mode === 'publish' ? 'Published' : job.status || 'Draft',
      updatedAt: '2026-09-15',
      createdAt: job.createdAt || '2026-09-15',
      publishedAt: mode === 'publish' ? '2026-09-15' : job.publishedAt || '',
      applicationCount: job.applicationCount || 0,
      shortlistedCount: job.shortlistedCount || 0,
      interviewCount: job.interviewCount || 0,
      selectedCount: job.selectedCount || 0,
    }
    setJobs((current) => existing
      ? current.map((item) => item.id === nextJob.id ? nextJob : item)
      : [nextJob, ...current])
    notify(mode === 'publish' ? 'Job published' : existing ? 'Changes saved' : 'Draft saved')
    return nextJob
  }

  const updateStatus = (id, status) => {
    setJobs((current) => current.map((job) => job.id === id ? { ...job, status, updatedAt: '2026-09-15' } : job))
    notify(status === 'Closed' ? 'Vacancy closed' : status === 'Archived' ? 'Job archived' : 'Job published')
  }

  const value = { jobs, saveJob, updateStatus, toast, notify }
  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>
}

export function useJobs() {
  const context = useContext(JobsContext)
  if (!context) throw new Error('useJobs must be used within JobsProvider')
  return context
}
