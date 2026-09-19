import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, MessageSquare, UserRound } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import {
  createHrApplicationNote,
  formatApplicationStatus,
  getHrApplication,
  getHrApplicationActivities,
  getHrApplicationNotes,
  getHrApplicationAiAnalysis,
  hrStatusOptions,
  runHrApplicationAiAnalysis,
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
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMessage, setAiMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([getHrApplication(applicationId), getHrApplicationNotes(applicationId), getHrApplicationActivities(applicationId), getHrApplicationAiAnalysis(applicationId).catch(() => null)])
      .then(([nextApplication, nextNotes, nextActivities, nextAiAnalysis]) => {
        if (!cancelled) {
          setApplication(nextApplication)
          setStatusValue(formatApplicationStatus(nextApplication.status))
          setNotes(nextNotes)
          setActivities(nextActivities)
          setAiAnalysis(nextAiAnalysis)
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


  const runAiAnalysis = async (refresh = false) => {
    setAiLoading(true)
    setAiMessage('')
    try {
      const nextAnalysis = await runHrApplicationAiAnalysis(applicationId, refresh)
      setAiAnalysis(nextAnalysis)
    } catch (requestError) {
      setAiMessage(requestError.message || 'AI analysis could not be completed.')
    } finally {
      setAiLoading(false)
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
        <AiAnalysisCard analysis={aiAnalysis} loading={aiLoading} message={aiMessage} onAnalyze={() => runAiAnalysis(false)} onRefresh={() => runAiAnalysis(true)} />
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


function AiAnalysisCard({ analysis, loading, message, onAnalyze, onRefresh }) {
  return <section className="panel candidate-card ai-analysis-card">
    <div className="candidate-card-head"><div><h2>AI Candidate Analysis</h2><p>AI analysis is provided to support HR review. Final hiring decisions remain with the recruitment team.</p></div>{analysis && <Button variant="secondary" onClick={onRefresh} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh'}</Button>}</div>
    {!analysis && <div className="ai-empty"><p>No AI review has been generated for this application yet.</p><Button onClick={onAnalyze} disabled={loading}>{loading ? 'Analyzing...' : 'Analyze candidate'}</Button></div>}
    {message && <p className="login-error">{message}</p>}
    {analysis && <div className="ai-results"><div className="ai-score"><strong>{Math.round(analysis.overall_score)}%</strong><span>Match Score</span></div><div className="ai-breakdown"><ScoreBar label="Skills" value={analysis.skills_score} /><ScoreBar label="Experience" value={analysis.experience_score} /><ScoreBar label="Education" value={analysis.education_score} /></div><ChipSection title="Matched Skills" values={[...analysis.matched_required_skills, ...analysis.matched_preferred_skills]} /><ChipSection title="Missing Required Skills" values={analysis.missing_required_skills} empty="No missing required skills detected." /><TextList title="Strengths" values={analysis.strengths} /><TextList title="Potential Gaps" values={analysis.gaps} /><div className="ai-copy"><h3>Experience Assessment</h3><p>{analysis.relevant_experience}</p><h3>Education Assessment</h3><p>{analysis.education_assessment}</p><h3>AI Summary</h3><p>{analysis.explanation}</p></div></div>}
  </section>
}

function ScoreBar({ label, value }) { return <div className="ai-score-row"><span>{label}</span><strong>{Math.round(value)}%</strong><i><b style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></i></div> }
function ChipSection({ title, values, empty = 'None found.' }) { return <div className="ai-chip-section"><h3>{title}</h3>{values.length ? <div>{values.map((value) => <span key={value}>{value}</span>)}</div> : <p>{empty}</p>}</div> }
function TextList({ title, values }) { return <div className="ai-copy"><h3>{title}</h3>{values.length ? <ul>{values.map((value) => <li key={value}>{value}</li>)}</ul> : <p>No specific items found.</p>}</div> }

function CandidateState({ title, description }) { return <div className="careers-state"><span><UserRound size={22} /></span><h2>{title}</h2><p>{description}</p></div> }
function Info({ label, value }) { return <div><span>{label}</span><strong>{value || 'Not provided'}</strong></div> }
function InfoTerm({ label, value }) { return <div><dt>{label}</dt><dd>{value || 'Not provided'}</dd></div> }
function TimelineItem({ activity }) { return <article><span><MessageSquare size={13} /></span><div><strong>{activityTitle(activity)}</strong><p>{activityDescription(activity)}</p><time>{formatDate(activity.created_at)}</time></div></article> }
function activityTitle(activity) { if (activity.event_type === 'status_changed') return 'Status changed'; if (activity.event_type === 'note_added') return 'HR note added'; if (activity.event_type === 'application_submitted') return 'Application submitted'; return 'Activity recorded' }
function activityDescription(activity) { const actor = activity.actor_first_name ? ` by ${activity.actor_first_name} ${activity.actor_last_name}` : ''; if (activity.event_type === 'status_changed') return `${formatApplicationStatus(activity.from_status)} ? ${formatApplicationStatus(activity.to_status)}${actor}`; return actor ? actor.trim() : 'Recorded in Recruitify' }
function formatDate(value) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) }

