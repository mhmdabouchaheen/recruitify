import { Navigate, useLocation } from 'react-router-dom'

import { PageSkeleton } from '../jobs/JobShared'
import { useAuth } from '../../context/useAuth'

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageSkeleton />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />

  return children
}
