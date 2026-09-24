import { useEffect, useState } from 'react'
import { ArrowLeft, BriefcaseBusiness, CalendarDays, Clock, MapPin, Phone, UserRound, Video } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import {
  addInterviewQuestion,
  formatInterviewStatus,
  formatInterviewType,
  generateInterviewQuestions,
  getHrInterview,
  getMyInterview,
  submitInterviewEvaluation,
  updateHrInterview,
} from '../api/interviews'
import { useAuth } from '../context/useAuth'
import { Button, Field, Skeleton, StatusBadge } from '../components/ui'

const emptyEvaluation = { technical_rating: 3, communication_rating: 3, problem_solving_rating: 3, overall_rating: 3, strengths: '', concerns: '', comments: '', recommendation: 'neutral' }
const emptyQuestion = { question: '', category: 'General' }

export default function InterviewDetails() {
  const { interviewId } = useParams()
  const { user } = useAuth()
  const [state, setState] = useState({ interview: null, loading: true, error: '' })
  const [evaluation, setEvaluation] = useState(emptyEvaluation)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [questionFormOpen, setQuestionFormOpen] = useState(false)
  const [manualQuestion, setManualQuestion] = useState(emptyQuestion)
  const [questionBusy, setQuestionBusy] = useState(false)
  const [questionMessage, setQuestionMessage] = useState('')
  const [managementOpen, setManagementOpen] = useState(false)
  const [managementForm, setManagementForm] = useState(null)
  const [managementBusy, setManagementBusy] = useState(false)
  const [managementMessage, setManagementMessage] = useState('')

  const isHr = user?.role === 'hr' || user?.role === 'admin'

  const loadInterview = async () => {
    const loader = isHr ? getHrInterview : getMyInterview
    const interview = await loader(interviewId)
    setState({ interview, loading: false, error: '' })
    if (interview.evaluations?.[0]) setEvaluation({ ...emptyEvaluation, ...interview.evaluations[0] })
    return interview
  }

  useEffect(() => {
    let cancelled = false
    const loader = isHr ? getHrInterview : getMyInterview
    loader(interviewId)
      .then((interview) => {
        if (!cancelled) {
          setState({ interview, loading: false, error: '' })
          if (interview.evaluations?.[0]) setEvaluation({ ...emptyEvaluation, ...interview.evaluations[0] })
        }
      })
      .catch((error) => { if (!cancelled) setState({ interview: null, loading: false, error: error.message || 'Interview could not be loaded.' }) })
    return () => { cancelled = true }
  }, [interviewId, isHr])

  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setMessage('')
    try {
      const saved = await submitInterviewEvaluation(interviewId, { ...evaluation, technical_rating: Number(evaluation.technical_rating), communication_rating: Number(evaluation.communication_rating), problem_solving_rating: Number(evaluation.problem_solving_rating), overall_rating: Number(evaluation.overall_rating) })
      setEvaluation({ ...emptyEvaluation, ...saved }); setMessage('Evaluation saved.')
    } catch (error) { setMessage(error.message || 'Evaluation could not be saved.') } finally { setSaving(false) }
  }

  const runQuestionGeneration = async () => {
    setQuestionBusy(true); setQuestionMessage('')
    try {
      const hasAiQuestions = state.interview.questions.some((question) => question.source === 'ai')
      await generateInterviewQuestions(interviewId, hasAiQuestions)
      await loadInterview()
      setQuestionMessage(hasAiQuestions ? 'AI questions regenerated and saved.' : 'AI questions generated and saved.')
    } catch (error) {
      setQuestionMessage(error.message || 'AI questions could not be generated.')
    } finally { setQuestionBusy(false) }
  }

  const saveManualQuestion = async (event) => {
    event.preventDefault(); setQuestionBusy(true); setQuestionMessage('')
    try {
      await addInterviewQuestion(interviewId, manualQuestion)
      await loadInterview()
      setManualQuestion(emptyQuestion)
      setQuestionFormOpen(false)
      setQuestionMessage('Manual question saved.')
    } catch (error) {
      setQuestionMessage(error.message || 'Manual question could not be saved.')
    } finally { setQuestionBusy(false) }
  }

  const openManagement = () => {
    const interview = state.interview
    setManagementForm({
      scheduled_at: toDateTimeLocal(interview.scheduled_at),
      duration_minutes: interview.duration_minutes,
      interview_type: interview.interview_type,
      location_or_link: interview.location_or_link || '',
    })
    setManagementMessage('')
    setManagementOpen(true)
  }

  const saveManagement = async (event) => {
    event.preventDefault(); setManagementBusy(true); setManagementMessage('')
    try {
      await updateHrInterview(interviewId, { ...managementForm, duration_minutes: Number(managementForm.duration_minutes), scheduled_at: new Date(managementForm.scheduled_at).toISOString() })
      await loadInterview()
      setManagementOpen(false)
      setManagementMessage('Interview updated.')
    } catch (error) {
      setManagementMessage(error.message || 'Interview could not be updated.')
    } finally { setManagementBusy(false) }
  }

  const changeInterviewStatus = async (status) => {
    if (status === 'cancelled' && !window.confirm('Cancel this interview? Completed interview history will be preserved.')) return
    setManagementBusy(true); setManagementMessage('')
    try {
      await updateHrInterview(interviewId, { status })
      await loadInterview()
      setManagementMessage(status === 'completed' ? 'Interview marked completed.' : 'Interview cancelled.')
    } catch (error) {
      setManagementMessage(error.message || 'Interview status could not be updated.')
    } finally { setManagementBusy(false) }
  }

  const interview = state.interview
  if (state.loading) return <div className="panel interviews-loading"><Skeleton height={28} width="35%" /><Skeleton /><Skeleton /></div>
  if (state.error) return <div className="careers-state"><h2>Interview unavailable</h2><p>{state.error}</p></div>

  const TypeIcon = interview.interview_type === 'phone' ? Phone : interview.interview_type === 'onsite' ? MapPin : Video
  const canManageStatus = isHr && interview.status === 'scheduled'

  return <section className="interview-detail-page candidate-detail-page">
    <Link className="text-action candidate-back" to="/interviews"><ArrowLeft size={14} /> Back to interviews</Link>
    <header className="candidate-detail-head interview-detail-head">
      <div><h1 className="page-title">{interview.candidate_name}</h1></div>
      <StatusBadge>{formatInterviewStatus(interview.status)}</StatusBadge>
    </header>

    <div className="candidate-detail-grid">
      <main className="candidate-main-stack">
        <section className="panel candidate-card interview-info-panel">
          <SectionTitle icon={CalendarDays} title="Interview information" />
          <div className="interview-info-grid">
            <InfoTile icon={CalendarDays} label="Date" value={formatDate(interview.scheduled_at)} />
            <InfoTile icon={Clock} label="Time" value={formatTime(interview.scheduled_at)} />
            <InfoTile icon={TypeIcon} label="Type" value={formatInterviewType(interview.interview_type)} />
            <InfoTile icon={Clock} label="Duration" value={`${interview.duration_minutes} minutes`} />
            <InfoTile icon={MapPin} label="Location/link" value={interview.location_or_link || 'Not provided'} wide />
          </div>
        </section>

        <section className="panel candidate-card interview-info-panel">
          <SectionTitle icon={UserRound} title="Candidate" />
          <div className="interview-info-grid">
            <InfoTile icon={BriefcaseBusiness} label="Professional title" value={interview.candidate_profile?.professional_title || 'Not provided'} />
            <InfoTile icon={MapPin} label="Location" value={interview.candidate_profile?.location || 'Not provided'} />
            <InfoTile icon={CalendarDays} label="Application status" value={formatInterviewStatus(interview.application_status)} />
          </div>
          {interview.candidate_profile?.summary && <p className="candidate-summary interview-summary">{interview.candidate_profile.summary}</p>}
        </section>

        <section className="panel candidate-card interview-info-panel">
          <div className="interview-section-row">
            <SectionTitle icon={BriefcaseBusiness} title="Interview questions" />
            {isHr && <div className="interview-inline-actions"><Button onClick={runQuestionGeneration} disabled={questionBusy}>{questionBusy ? 'Generating...' : interview.questions.some((question) => question.source === 'ai') ? 'Regenerate AI Questions' : 'Generate AI Questions'}</Button><Button variant="secondary" onClick={() => setQuestionFormOpen((open) => !open)} disabled={questionBusy}>Add Manual Question</Button></div>}
          </div>
          {interview.questions.length ? <ol className="interview-question-list">{interview.questions.map((question) => <li key={question.id}><span>{question.category} ? {question.source === 'ai' ? 'AI' : 'Manual'}</span><p>{question.question}</p></li>)}</ol> : <p className="panel-subtitle">No questions prepared yet.</p>}
          {isHr && questionFormOpen && <form className="interview-manual-question" onSubmit={saveManualQuestion}><Field label="Category"><input value={manualQuestion.category} onChange={(event) => setManualQuestion({ ...manualQuestion, category: event.target.value })} required /></Field><Field label="Question"><textarea value={manualQuestion.question} onChange={(event) => setManualQuestion({ ...manualQuestion, question: event.target.value })} placeholder="Add a manual interview question" required /></Field><Button type="submit" disabled={questionBusy}>{questionBusy ? 'Saving...' : 'Save manual question'}</Button></form>}
          {questionMessage && <p className={questionMessage.includes('could not') ? 'login-error' : 'profile-success'}>{questionMessage}</p>}
        </section>
      </main>

      <aside className="candidate-side-stack">
        {isHr && <section className="panel candidate-card interview-info-panel"><SectionTitle icon={CalendarDays} title="Interview management" /><div className="interview-management-actions"><Button variant="secondary" onClick={openManagement} disabled={interview.status !== 'scheduled'}>Edit / Reschedule</Button><Button variant="secondary" onClick={() => changeInterviewStatus('completed')} disabled={!canManageStatus || managementBusy}>{managementBusy ? 'Updating...' : 'Mark Completed'}</Button><Button variant="danger" onClick={() => changeInterviewStatus('cancelled')} disabled={!canManageStatus || managementBusy}>Cancel Interview</Button></div>{interview.status !== 'scheduled' && <p className="field-helper">Completed or cancelled interviews are kept as history and cannot be rescheduled here.</p>}{managementOpen && <form className="interview-form interview-management-form" onSubmit={saveManagement}><Field label="Date and time"><input type="datetime-local" value={managementForm.scheduled_at} onChange={(event) => setManagementForm({ ...managementForm, scheduled_at: event.target.value })} required /></Field><Field label="Duration"><input type="number" min="15" max="480" value={managementForm.duration_minutes} onChange={(event) => setManagementForm({ ...managementForm, duration_minutes: event.target.value })} required /></Field><Field label="Type"><select value={managementForm.interview_type} onChange={(event) => setManagementForm({ ...managementForm, interview_type: event.target.value })}><option value="video">Video</option><option value="phone">Phone</option><option value="onsite">Onsite</option></select></Field><Field label="Location or link"><input value={managementForm.location_or_link} onChange={(event) => setManagementForm({ ...managementForm, location_or_link: event.target.value })} /></Field><div className="interview-inline-actions"><Button type="submit" disabled={managementBusy}>{managementBusy ? 'Saving...' : 'Save changes'}</Button><Button type="button" variant="secondary" onClick={() => setManagementOpen(false)}>Cancel</Button></div></form>}{managementMessage && <p className={managementMessage.includes('could not') ? 'login-error' : 'profile-success'}>{managementMessage}</p>}</section>}
        {isHr && <section className="panel candidate-card interview-info-panel"><SectionTitle icon={UserRound} title="Submitted evaluations" />{interview.evaluations.length ? <div className="evaluation-list">{interview.evaluations.map((item) => <article key={item.id}><strong>{item.interviewer_first_name} {item.interviewer_last_name}</strong><span>Overall {item.overall_rating}/5 ? {formatRecommendation(item.recommendation)}</span>{item.comments && <p>{item.comments}</p>}</article>)}</div> : <p className="panel-subtitle">No evaluations submitted yet.</p>}</section>}
        {user?.role === 'interviewer' && <section className="panel candidate-card interview-info-panel"><SectionTitle icon={UserRound} title="Evaluation" /><form className="interview-form" onSubmit={submit}>{['technical_rating','communication_rating','problem_solving_rating','overall_rating'].map((field) => <Field key={field} label={ratingLabel(field)}><input type="number" min="1" max="5" value={evaluation[field]} onChange={(event) => setEvaluation({ ...evaluation, [field]: event.target.value })} required /></Field>)}<Field label="Recommendation"><select value={evaluation.recommendation} onChange={(event) => setEvaluation({ ...evaluation, recommendation: event.target.value })}><option value="strong_yes">Strong yes</option><option value="yes">Yes</option><option value="neutral">Neutral</option><option value="no">No</option><option value="strong_no">Strong no</option></select></Field><Field label="Strengths"><textarea value={evaluation.strengths || ''} onChange={(event) => setEvaluation({ ...evaluation, strengths: event.target.value })} /></Field><Field label="Concerns"><textarea value={evaluation.concerns || ''} onChange={(event) => setEvaluation({ ...evaluation, concerns: event.target.value })} /></Field><Field label="Comments"><textarea value={evaluation.comments || ''} onChange={(event) => setEvaluation({ ...evaluation, comments: event.target.value })} /></Field><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save evaluation'}</Button>{message && <p className="profile-success">{message}</p>}</form></section>}
      </aside>
    </div>
  </section>
}

function SectionTitle({ icon: Icon, title }) { return <div className="interview-section-title"><span><Icon size={15} /></span><h2>{title}</h2></div> }
function InfoTile({ icon: Icon, label, value, wide = false }) { return <div className={`interview-info-tile ${wide ? 'wide' : ''}`}><span><Icon size={14} /></span><div><small>{label}</small><strong>{value}</strong></div></div> }
function ratingLabel(value) { return value.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ') }
function formatRecommendation(value) { return value.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ') }
function formatDate(value) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) }
function formatTime(value) { return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value)) }
function toDateTimeLocal(value) { const date = new Date(value); const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16) }
