import { useEffect, useState } from 'react'
import { CalendarDays, Clock, MapPin, Phone, UserRound, UsersRound, Video } from 'lucide-react'
import { Link } from 'react-router-dom'

import { formatInterviewStatus, formatInterviewType, getHrInterviews, getMyInterviews } from '../api/interviews'
import { useAuth } from '../context/useAuth'
import { Skeleton, StatusBadge } from '../components/ui'

export default function Interviews() {
  const { user } = useAuth()
  const [state, setState] = useState({ interviews: [], loading: true, error: '' })

  useEffect(() => {
    let cancelled = false
    const loader = user?.role === 'hr' || user?.role === 'admin' ? getHrInterviews : getMyInterviews
    loader()
      .then((interviews) => { if (!cancelled) setState({ interviews, loading: false, error: '' }) })
      .catch((error) => { if (!cancelled) setState({ interviews: [], loading: false, error: error.message || 'Interviews could not be loaded.' }) })
    return () => { cancelled = true }
  }, [user?.role])

  return <section className="interviews-workspace candidate-detail-page">
    <header className="candidate-detail-head interviews-head">
      <div>
        <p className="eyebrow">Interview workspace</p>
        <h1 className="page-title">Interviews</h1>
        <p className="page-description">{user?.role === 'interviewer' ? 'Assigned interviews only.' : 'Scheduled interviews across candidates.'}</p>
      </div>
    </header>

    {state.loading && <div className="panel interviews-loading"><Skeleton height={28} width="34%" /><Skeleton /><Skeleton /></div>}
    {state.error && <State title="Unable to load interviews" description={state.error} />}
    {!state.loading && !state.error && (state.interviews.length ? <div className="interviews-list">{state.interviews.map((interview) => <InterviewCard key={interview.id} interview={interview} />)}</div> : <State title="No interviews scheduled yet." description="Scheduled interviews will appear here when candidates are moved into interview stages." />)}
  </section>
}

function InterviewCard({ interview }) {
  const scheduled = new Date(interview.scheduled_at)
  const TypeIcon = interview.interview_type === 'phone' ? Phone : interview.interview_type === 'onsite' ? MapPin : Video
  const interviewers = interview.interviewers?.length ? interview.interviewers.map((person) => `${person.first_name} ${person.last_name}`).join(', ') : 'Not assigned'
  return <Link className="interview-row-card" to={`/interviews/${interview.id}`}>
    <div className="interview-row-main">
      <div className="interview-avatar"><UserRound size={18} /></div>
      <div className="interview-title-block">
        <strong>{interview.candidate_name}</strong>
        <span>{interview.job_title}{interview.department ? ` ? ${interview.department}` : ''}</span>
      </div>
    </div>
    <div className="interview-row-meta">
      <Meta icon={CalendarDays} value={formatDate(scheduled)} />
      <Meta icon={Clock} value={formatTime(scheduled)} />
      <Meta icon={TypeIcon} value={formatInterviewType(interview.interview_type)} />
      {interview.duration_minutes && <Meta icon={Clock} value={`${interview.duration_minutes} min`} />}
      <Meta icon={UsersRound} value={interviewers} wide />
    </div>
    <div className="interview-row-end">
      <StatusBadge>{formatInterviewStatus(interview.status)}</StatusBadge>
      <span className="interview-view-action">View interview ?</span>
    </div>
  </Link>
}

function Meta({ icon: Icon, value, wide = false }) { return <span className={`interview-meta ${wide ? 'wide' : ''}`}><Icon size={14} />{value}</span> }
function State({ title, description }) { return <div className="careers-state"><span><CalendarDays size={22} /></span><h2>{title}</h2><p>{description}</p></div> }
function formatDate(value) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(value) }
function formatTime(value) { return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(value) }
