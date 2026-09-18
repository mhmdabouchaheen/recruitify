import { lazy, Suspense, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AppShell } from './layouts/AppShell'
import { AuthProvider } from './context/AuthContext'
import { JobsProvider } from './context/JobsContext'
import { PageSkeleton } from './components/jobs/JobShared'
import './App.css'
import './styles/jobs.css'

const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Careers = lazy(() => import('./pages/Careers'))
const CareerDetails = lazy(() => import('./pages/CareerDetails'))
const Profile = lazy(() => import('./pages/Profile'))
const Overview = lazy(() => import('./pages/Overview').then((module) => ({ default: module.Overview })))
const Jobs = lazy(() => import('./pages/Jobs'))
const JobFormPage = lazy(() => import('./pages/JobFormPage'))
const JobDetails = lazy(() => import('./pages/JobDetails'))
const JobPreview = lazy(() => import('./pages/JobPreview'))

export default function App() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  return (
    <AuthProvider>
      <JobsProvider>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/careers/:jobId" element={<CareerDetails />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/*" element={
              <ProtectedRoute blockApplicant>
                <AppShell mobileNavOpen={mobileNavOpen} setMobileNavOpen={setMobileNavOpen}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/overview" replace />} />
                    <Route path="/overview" element={<Overview />} />
                    <Route path="/jobs" element={<Jobs />} />
                    <Route path="/jobs/new" element={<JobFormPage />} />
                    <Route path="/jobs/:jobId" element={<JobDetails />} />
                    <Route path="/jobs/:jobId/edit" element={<JobFormPage />} />
                    <Route path="/jobs/:jobId/preview" element={<JobPreview />} />
                    <Route path="*" element={<Navigate to="/overview" replace />} />
                  </Routes>
                </AppShell>
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </JobsProvider>
    </AuthProvider>
  )
}





