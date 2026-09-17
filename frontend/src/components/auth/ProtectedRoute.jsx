import { Navigate, useLocation } from 'react-router-dom'

import { PageSkeleton } from '../jobs/JobShared'
import { useAuth } from '../../context/useAuth'

export function ProtectedRoute({ blockApplicant = false, children }) {
  const { isAuthenticated, loading, user } = useAuth()
  const location = useLocation()

  if (loading) return <PageSkeleton />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  if (blockApplicant && user?.role === 'applicant') return <Navigate to="/careers" replace />

  return children
}
