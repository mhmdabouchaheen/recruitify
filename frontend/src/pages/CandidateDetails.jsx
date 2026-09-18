import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, MessageSquare, UserRound } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import {
  createHrApplicationNote,
  formatApplicationStatus,
  getHrApplication,
  getHrApplicationActivities,
  getHrApplicationNotes,
  hrStatusOptions,
  updateHrApplicationStatus,
} from '../api/hrApplications'
import { Button, Field, Skeleton, StatusBadge } from '../components/ui'

const finalStatuses = new Set(['Selected', 'Rejected'])

export default function CandidateDetails() {
  const { applicationId } = useParams()
  const [application, setApplication] = useState(null)
  const [notes, setNotes] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusValue, setStatusValue] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteError, setNoteError] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([getHrApplication(applicationId), getHrApplicationNotes(applicationId), getHrApplicationActivities(applicationId)])
      .then(([nextApplication, nextNotes, nextActivities]) => {
        if (!cancelled) {
          setApplication(nextApplication)
          setStatusValue(formatApplicationStatus(nextApplication.status))
          setNotes(nextNotes)
          setActivities(nextActivities)
          setError('')
          setLoading(false)
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message || 'Candidate details could not be loaded.')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [applicationId])

  const fullName = application ? `${application.applicant.first_name} ${application.applicant.last_name}` : ''
  const isWithdrawn = application?.status === 'withdrawn'
  const profile = application?.applicant_profile
  const answers = useMemo(() => application?.answers || [], [application])

  const refreshActivity = async () => setActivities(await getHrApplicationActivities(applicationId))

  const changeStatus = async (event) => {
    const nextStatus = event.target.value
    if (finalStatuses.has(nextStatus) && !window.confirm(`Move this candidate to ${nextStatus}?`)) return
    setStatusValue(nextStatus)
    setSavingStatus(true)
    setStatusMessage('')
    try {
      const updated = await updateHrApplicationStatus(applicationId, nextStatus)
      setApplication(updated)
      setStatusValue(formatApplicationStatus(updated.status))
      setStatusMessage('Status updated.')
      await refreshActivity()
    } catch (requestError) {
      setStatusMessage(requestError.message || 'Status could not be updated.')
    } finally {
      setSavingStatus(false)
    }
  }

  const submitNote = async (event) => {
    event.preventDefault()
    const content = noteContent.trim()
    if (!content) { setNoteError('Enter a note before saving.'); return }
    setSavingNote(true)
    setNoteError('')
    try {
      const note = await createHrApplicationNote(applicationId, content)
      setNotes((current) => [...current, note])
      setNoteContent('')
      await refreshActivity()
    } catch (requestError) {
      setNoteError(requestError.message || 'Note could not be saved.')
    } finally {
      setSavingNote(false)
    }
  }

  if (loading) return <div className="panel candidate-detail-loading"><Skeleton width="35%" height={28} /><Skeleton /><Skeleton /></div>
  if (error) return <CandidateState title="Unable to load candidate" description={error} />
  if (!application) return <CandidateState title="Candidate not found" description="This application could not be found." />

  return <section className="candidate-detail-page">
    <Link className="text-action candidate-back" to="/candidates"><ArrowLeft size={14} /> Back to candidates</Link>
    <header className="candidate-detail-head"><div><p className="eyebrow">Candidate review</p><h1 className="page-title">{fullName}</h1><p className="page-description">Applied for {application.job.title}</p></div><StatusBadge>{formatApplicationStatus(application.status)}</StatusBadge></header>
    <div className="candidate-detail-grid">
      <main className="candidate-main-stack">
        <section className="panel candidate-card"><h2>Candidate profile</h2><div className="candidate-profile-grid"><Info label="Email" value={application.applicant.email} /><Info label="Phone" value={profile?.phone} /><Info label="Location" value={profile?.location} /><Info label="Professional title" value={profile?.professional_title} /><Info label="LinkedIn" value={profile?.linkedin_url} /><Info label="GitHub" value={profile?.github_url} /></div>{profile?.summary && <p className="candidate-summary">{profile.summary}</p>}</section>
        <section className="panel candidate-card"><h2>Application</h2><dl className="application-detail-list"><InfoTerm label="Job" value={application.job.title} /><InfoTerm label="Department" value={application.job.department} /><InfoTerm label="Submitted" value={formatDate(application.submitted_at)} /><InfoTerm label="CV used" value={application.cv.original_filename} /></dl></section>
        <section className="panel candidate-card"><h2>Application answers</h2>{answers.length ? <ol className="application-answers">{answers.map((answer) => <li key={answer.id}><strong>{answer.question}</strong><p>{answer.answer}</p></li>)}</ol> : <p className="panel-subtitle">No application questions were submitted.</p>}</section>
      </main>
      <aside className="candidate-side-stack">
        <section className="panel candidate-card"><h2>Recruitment status</h2><Field label="Status"><select value={statusValue} onChange={changeStatus} disabled={isWithdrawn || savingStatus}>{hrStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></Field>{isWithdrawn && <p className="field-helper">Applicant withdrew this application. HR status changes are disabled.</p>}{statusMessage && <p className="profile-success">{statusMessage}</p>}</section>
        <section className="panel candidate-card"><h2>Internal notes</h2><form className="candidate-note-form" onSubmit={submitNote}><textarea value={noteContent} onChange={(event) => setNoteContent(event.target.value)} placeholder="Add an internal HR note" /><Button type="submit" disabled={savingNote}>{savingNote ? 'Saving...' : 'Add note'}</Button></form>{noteError && <p className="login-error">{noteError}</p>}<div className="candidate-notes">{notes.length ? notes.map((note) => <article key={note.id}><strong>{note.author_first_name} {note.author_last_name}</strong><time>{formatDate(note.created_at)}</time><p>{note.content}</p></article>) : <p className="panel-subtitle">No internal notes yet.</p>}</div></section>
        <section className="panel candidate-card"><h2>Activity timeline</h2><div className="candidate-timeline">{activities.length ? activities.map((activity) => <TimelineItem key={activity.id} activity={activity} />) : <p className="panel-subtitle">No activity recorded yet.</p>}</div></section>
      </aside>
    </div>
  </section>
}

function CandidateState({ title, description }) { return <div className="careers-state"><span><UserRound size={22} /></span><h2>{title}</h2><p>{description}</p></div> }
function Info({ label, value }) { return <div><span>{label}</span><strong>{value || 'Not provided'}</strong></div> }
function InfoTerm({ label, value }) { return <div><dt>{label}</dt><dd>{value || 'Not provided'}</dd></div> }
function TimelineItem({ activity }) { return <article><span><MessageSquare size={13} /></span><div><strong>{activityTitle(activity)}</strong><p>{activityDescription(activity)}</p><time>{formatDate(activity.created_at)}</time></div></article> }
function activityTitle(activity) { if (activity.event_type === 'status_changed') return 'Status changed'; if (activity.event_type === 'note_added') return 'HR note added'; if (activity.event_type === 'application_submitted') return 'Application submitted'; return 'Activity recorded' }
function activityDescription(activity) { const actor = activity.actor_first_name ? ` by ${activity.actor_first_name} ${activity.actor_last_name}` : ''; if (activity.event_type === 'status_changed') return `${formatApplicationStatus(activity.from_status)} ? ${formatApplicationStatus(activity.to_status)}${actor}`; return actor ? actor.trim() : 'Recorded in Recruitify' }
function formatDate(value) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) }

