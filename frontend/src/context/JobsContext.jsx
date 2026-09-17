/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'
import { updateJobStatus } from '../api/jobs'

const JobsContext = createContext(null)

export function JobsProvider({ children }) {
  const [toast, setToast] = useState(null)

  const notify = (message) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2600)
  }

  const updateStatus = async (id, status) => {
    const updated = await updateJobStatus(id, status)
    notify(status === 'Closed' ? 'Vacancy closed' : status === 'Archived' ? 'Job archived' : 'Job published')
    return updated
  }

  const value = { updateStatus, toast, notify }
  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>
}

export function useJobs() {
  const context = useContext(JobsContext)
  if (!context) throw new Error('useJobs must be used within JobsProvider')
  return context
}
