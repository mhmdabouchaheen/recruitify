import { lazy, Suspense, useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AppShell } from './layouts/AppShell'
import { AuthProvider } from './context/AuthContext'
import { JobsProvider } from './context/JobsContext'
import { useAuth } from './context/useAuth'
import { PublicHeader } from './pages/Careers'
import { PageSkeleton } from './components/jobs/JobShared'
import './App.css'
import './styles/jobs.css'

const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Careers = lazy(() => import('./pages/Careers'))
const CareerDetails = lazy(() => import('./pages/CareerDetails'))
const Profile = lazy(() => import('./pages/Profile'))
const ApplyJob = lazy(() => import('./pages/ApplyJob'))
const Applications = lazy(() => import('./pages/Applications'))
const Candidates = lazy(() => import('./pages/Candidates'))
const Pipeline = lazy(() => import('./pages/Pipeline'))
const CandidateDetails = lazy(() => import('./pages/CandidateDetails'))
const Interviews = lazy(() => import('./pages/Interviews'))
const InterviewDetails = lazy(() => import('./pages/InterviewDetails'))
const ApplicationDetails = lazy(() => import('./pages/ApplicationDetails'))
const Overview = lazy(() => import('./pages/Overview').then((module) => ({ default: module.Overview })))
const Reports = lazy(() => import('./pages/Reports'))
const Jobs = lazy(() => import('./pages/Jobs'))
const JobFormPage = lazy(() => import('./pages/JobFormPage'))
const JobDetails = lazy(() => import('./pages/JobDetails'))
const JobPreview = lazy(() => import('./pages/JobPreview'))
const Notifications = lazy(() => import('./pages/Notifications'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))

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
            <Route path="/profile" element={<ProtectedRoute allowedRoles={['applicant']}><Profile /></ProtectedRoute>} />
            <Route path="/careers/:jobId/apply" element={<ProtectedRoute allowedRoles={['applicant']}><ApplyJob /></ProtectedRoute>} />
            <Route path="/applications" element={<ProtectedRoute allowedRoles={['applicant']}><Applications /></ProtectedRoute>} />
            <Route path="/applications/:applicationId" element={<ProtectedRoute allowedRoles={['applicant']}><ApplicationDetails /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsSurface mobileNavOpen={mobileNavOpen} setMobileNavOpen={setMobileNavOpen} /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AppShell mobileNavOpen={mobileNavOpen} setMobileNavOpen={setMobileNavOpen}><AdminUsers /></AppShell></ProtectedRoute>} />
            <Route path="/*" element={
              <ProtectedRoute blockApplicant>
                <AppShell mobileNavOpen={mobileNavOpen} setMobileNavOpen={setMobileNavOpen}>
                  <Routes>
                    <Route path="/" element={<RoleHome />} />
                    <Route path="/overview" element={<ProtectedRoute allowedRoles={['hr', 'admin']}><Overview /></ProtectedRoute>} />
                    <Route path="/jobs" element={<ProtectedRoute allowedRoles={['hr', 'admin']}><Jobs /></ProtectedRoute>} />
                    <Route path="/candidates" element={<ProtectedRoute allowedRoles={['hr', 'admin']}><Candidates /></ProtectedRoute>} />
                    <Route path="/pipeline" element={<ProtectedRoute allowedRoles={['hr', 'admin']}><Pipeline /></ProtectedRoute>} />
                    <Route path="/reports" element={<ProtectedRoute allowedRoles={['hr', 'admin']}><Reports /></ProtectedRoute>} />
                    <Route path="/candidates/:applicationId" element={<ProtectedRoute allowedRoles={['hr', 'admin']}><CandidateDetails /></ProtectedRoute>} />
                    <Route path="/interviews" element={<ProtectedRoute allowedRoles={['hr', 'admin', 'interviewer']}><Interviews /></ProtectedRoute>} />
                    <Route path="/interviews/:interviewId" element={<ProtectedRoute allowedRoles={['hr', 'admin', 'interviewer']}><InterviewDetails /></ProtectedRoute>} />
                    <Route path="/jobs/new" element={<ProtectedRoute allowedRoles={['hr', 'admin']}><JobFormPage /></ProtectedRoute>} />
                    <Route path="/jobs/:jobId" element={<ProtectedRoute allowedRoles={['hr', 'admin']}><JobDetails /></ProtectedRoute>} />
                    <Route path="/jobs/:jobId/edit" element={<ProtectedRoute allowedRoles={['hr', 'admin']}><JobFormPage /></ProtectedRoute>} />
                    <Route path="/jobs/:jobId/preview" element={<ProtectedRoute allowedRoles={['hr', 'admin']}><JobPreview /></ProtectedRoute>} />
                    <Route path="*" element={<RoleHome />} />
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










function RoleHome() {
  const { user } = useAuth()
  return <Navigate to={user?.role === 'interviewer' ? '/interviews' : '/overview'} replace />
}

function NotificationsSurface({ mobileNavOpen, setMobileNavOpen }) {
  const { user } = useAuth()
  if (user?.role === 'applicant') return <ApplicantNotificationsSurface />
  return (
    <AppShell mobileNavOpen={mobileNavOpen} setMobileNavOpen={setMobileNavOpen}>
      <Notifications />
    </AppShell>
  )
}


function ApplicantNotificationsSurface() {
  return (
    <div className="public-page">
      <PublicHeader isAuthenticated accountPath="/profile" />
      <div className="profile-page-shell applicant-notifications-shell">
        <nav className="applicant-nav" aria-label="Applicant navigation">
          <Link to="/careers">Find Jobs</Link>
          <Link to="/applications">My Applications</Link>
          <Link to="/profile">Profile</Link>
          <Link className="active" to="/notifications">Notifications</Link>
        </nav>
        <Notifications />
      </div>
    </div>
  )
}
