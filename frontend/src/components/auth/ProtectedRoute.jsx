import { Navigate, useLocation } from 'react-router-dom'

import { PageSkeleton } from '../jobs/JobShared'
import { useAuth } from '../../context/useAuth'

export function ProtectedRoute({ blockApplicant = false, allowedRoles, children }) {
  const { isAuthenticated, loading, user } = useAuth()
  const location = useLocation()

  if (loading || (isAuthenticated && !user)) return <PageSkeleton />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  if (blockApplicant && user?.role === 'applicant') return <Navigate to="/careers" replace />
  if (allowedRoles?.length && !allowedRoles.includes(user?.role)) {
    return <Navigate to={fallbackForRole(user?.role)} replace />
  }

  return children
}

function fallbackForRole(role) {
  if (role === 'applicant') return '/careers'
  if (role === 'interviewer') return '/interviews'
  return '/overview'
}
