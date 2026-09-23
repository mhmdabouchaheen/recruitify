import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarDays, MessageSquare, UserRound } from 'lucide-react'
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
import {
  addInterviewQuestion,
  formatInterviewStatus,
  formatInterviewType,
  generateInterviewQuestions,
  getApplicationInterviews,
  getInterviewers,
  scheduleInterview,
  updateHrInterview,
} from '../api/interviews'
import { Button, Field, Modal, Skeleton, StatusBadge } from '../components/ui'
import {
  createHrApplicationContract,
  downloadHrContractPdf,
  formatContractStatus,
  formatContractType,
  generateHrContractPdf,
  getHrApplicationContract,
  sendHrContract,
  updateHrContract,
} from '../api/contracts'

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
  const [interviews, setInterviews] = useState([])
  const [interviewers, setInterviewers] = useState([])
  const [interviewError, setInterviewError] = useState('')
  const [contract, setContract] = useState(null)
  const [contractMessage, setContractMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([getHrApplication(applicationId), getHrApplicationNotes(applicationId), getHrApplicationActivities(applicationId), getHrApplicationAiAnalysis(applicationId).catch(() => null), getApplicationInterviews(applicationId), getInterviewers().catch(() => []), getHrApplicationContract(applicationId).catch(() => null)])
      .then(([nextApplication, nextNotes, nextActivities, nextAiAnalysis, nextInterviews, nextInterviewers, nextContract]) => {
        if (!cancelled) {
          setApplication(nextApplication)
          setStatusValue(formatApplicationStatus(nextApplication.status))
          setNotes(nextNotes)
          setActivities(nextActivities)
          setAiAnalysis(nextAiAnalysis)
          setInterviews(nextInterviews)
          setInterviewers(nextInterviewers)
          setContract(nextContract)
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
  const refreshInterviews = async () => setInterviews(await getApplicationInterviews(applicationId))
  const refreshContract = async () => setContract(await getHrApplicationContract(applicationId).catch(() => null))

  const changeStatus = async (event) => {
    const nextStatus = event.target.value
    let rejectionFeedback = null
    if (nextStatus === 'Rejected') {
      rejectionFeedback = window.prompt('Enter the applicant-facing rejection feedback/reason. This exact text will be emailed to the applicant.')
      if (!rejectionFeedback || !rejectionFeedback.trim()) {
        setStatusMessage('Rejection feedback is required before rejecting a candidate.')
        setStatusValue(formatApplicationStatus(application.status))
        return
      }
      rejectionFeedback = rejectionFeedback.trim()
    }
    if (finalStatuses.has(nextStatus) && !window.confirm(`Move this candidate to ${nextStatus}?`)) {
      setStatusValue(formatApplicationStatus(application.status))
      return
    }
    setStatusValue(nextStatus)
    setSavingStatus(true)
    setStatusMessage('')
    try {
      const updated = await updateHrApplicationStatus(applicationId, nextStatus, { rejectionFeedback })
      setApplication(updated)
      setStatusValue(formatApplicationStatus(updated.status))
      setStatusMessage('Status updated.')
      await refreshActivity()
      await refreshContract()
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
        <ContractSection application={application} contract={contract} setContract={setContract} message={contractMessage} setMessage={setContractMessage} onRefreshActivity={refreshActivity} />
        <InterviewSection interviews={interviews} interviewers={interviewers} error={interviewError} setError={setInterviewError} applicationId={applicationId} onRefresh={refreshInterviews} />
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




function ContractSection({ application, contract, setContract, message, setMessage, onRefreshActivity }) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(contractToForm(contract, application))
  const selected = application.status === 'selected'
  const outcome = contract?.status === 'accepted' ? 'Hired' : contract?.status === 'declined' ? 'Contract Declined' : null

  if (!selected && !contract) return null

  const saveDraft = async (event) => {
    event.preventDefault()
    setBusy(true); setMessage('')
    try {
      const payload = normalizeContractPayload(form)
      const next = contract ? await updateHrContract(contract.id, payload) : await createHrApplicationContract(application.id, payload)
      setContract(next); setEditing(false); setMessage(contract ? 'Contract draft updated.' : 'Contract draft prepared.'); await onRefreshActivity()
    } catch (error) { setMessage(error.message || 'Contract could not be saved.') } finally { setBusy(false) }
  }
  const generate = async () => { setBusy(true); setMessage(''); try { const next = await generateHrContractPdf(contract.id); setContract(next); setMessage('Contract PDF generated.'); } catch (error) { setMessage(error.message || 'PDF could not be generated.') } finally { setBusy(false) } }
  const send = async () => { if (!window.confirm('Send this contract to the applicant?')) return; setBusy(true); setMessage(''); try { const next = await sendHrContract(contract.id); setContract(next); setMessage('Contract sent to applicant.'); await onRefreshActivity() } catch (error) { setMessage(error.message || 'Contract could not be sent.') } finally { setBusy(false) } }
  const download = async () => { setBusy(true); setMessage(''); try { await downloadHrContractPdf(contract.id) } catch (error) { setMessage(error.message || 'PDF could not be downloaded.') } finally { setBusy(false) } }

  return <section className="panel candidate-card contract-card"><div className="candidate-card-head"><div><h2>Contract</h2><p>{contract ? `Status: ${formatContractStatus(contract.status)}` : 'Prepare a contract after final selection.'}</p>{outcome && <p className="profile-success">Recruitment Outcome: {outcome}</p>}</div>{!contract && selected && <Button onClick={() => { setForm(contractToForm(null, application)); setEditing(true) }}>Prepare Contract</Button>}</div>{contract && <dl className="application-detail-list"><InfoTerm label="Type" value={formatContractType(contract.contract_type)} /><InfoTerm label="Start" value={formatDate(contract.start_date)} /><InfoTerm label="End" value={contract.end_date ? formatDate(contract.end_date) : 'Not applicable'} /><InfoTerm label="Location" value={contract.work_location} /><InfoTerm label="Salary" value={contract.salary_amount ? `${contract.salary_amount} ${contract.salary_currency}` : 'Not specified'} /><InfoTerm label="Response" value={contract.responded_at ? formatDate(contract.responded_at) : 'Pending'} /></dl>}{(editing || (!contract && selected)) && <form className="contract-form" onSubmit={saveDraft}><Field label="Contract type"><select value={form.contract_type} onChange={(event) => setForm({ ...form, contract_type: event.target.value })}><option value="full_time">Full Time</option><option value="fixed_term">Fixed Term</option><option value="part_time">Part Time</option><option value="internship">Internship</option></select></Field><Field label="Start date"><input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} required /></Field><Field label="End date"><input type="date" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} /></Field><Field label="Salary amount"><input type="number" min="0" step="0.01" value={form.salary_amount} onChange={(event) => setForm({ ...form, salary_amount: event.target.value })} /></Field><Field label="Currency"><select value={form.salary_currency} onChange={(event) => setForm({ ...form, salary_currency: event.target.value })}><option value="">Not specified</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="LBP">LBP</option><option value="AED">AED</option><option value="SAR">SAR</option></select></Field><Field label="Work location"><input value={form.work_location} onChange={(event) => setForm({ ...form, work_location: event.target.value })} required /></Field><Field label="Probation period"><input value={form.probation_period} onChange={(event) => setForm({ ...form, probation_period: event.target.value })} /></Field><Field label="Additional terms"><textarea value={form.additional_terms} onChange={(event) => setForm({ ...form, additional_terms: event.target.value })} /></Field><div className="interview-inline-actions"><Button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save Draft'}</Button>{contract && <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>}</div></form>}{contract && !editing && <div className="interview-inline-actions contract-actions">{contract.status === 'draft' && <Button variant="secondary" onClick={() => { setForm(contractToForm(contract, application)); setEditing(true) }} disabled={busy}>Edit Draft</Button>}{contract.status === 'draft' && <Button onClick={generate} disabled={busy}>{busy ? 'Working...' : 'Generate PDF'}</Button>}{contract.has_pdf && <Button variant="secondary" onClick={download} disabled={busy}>View / Download PDF</Button>}{contract.status === 'draft' && <Button onClick={send} disabled={busy || !contract.has_pdf}>Send to Applicant</Button>}</div>}{message && <p className={message.includes('could not') ? 'login-error' : 'profile-success'}>{message}</p>}</section>
}

function contractToForm(contract, application) {
  return {
    contract_type: contract?.contract_type || 'full_time',
    start_date: contract?.start_date || '',
    end_date: contract?.end_date || '',
    salary_amount: contract?.salary_amount || '',
    salary_currency: contract?.salary_currency || 'USD',
    work_location: contract?.work_location || application?.job?.location || '',
    probation_period: contract?.probation_period || '',
    additional_terms: contract?.additional_terms || '',
  }
}
function normalizeContractPayload(form) {
  return { ...form, end_date: form.end_date || null, salary_amount: form.salary_amount === '' ? null : Number(form.salary_amount), salary_currency: form.salary_amount === '' ? null : form.salary_currency, probation_period: form.probation_period || null, additional_terms: form.additional_terms || null }
}

function InterviewSection({ interviews, interviewers, error, setError, applicationId, onRefresh }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [questionText, setQuestionText] = useState('')
  const [questionInterview, setQuestionInterview] = useState('')
  const [questionBusy, setQuestionBusy] = useState('')
  const [form, setForm] = useState({ scheduled_at: '', duration_minutes: 60, interview_type: 'video', location_or_link: '', interviewer_ids: [] })
  const reset = () => setForm({ scheduled_at: '', duration_minutes: 60, interview_type: 'video', location_or_link: '', interviewer_ids: [] })
  const submit = async (event) => {
    event.preventDefault()
    if (!form.interviewer_ids.length) { setError('Assign at least one interviewer.'); return }
    setSaving(true); setError('')
    try {
      await scheduleInterview(applicationId, { ...form, duration_minutes: Number(form.duration_minutes), scheduled_at: new Date(form.scheduled_at).toISOString() })
      await onRefresh()
      reset(); setOpen(false)
    } catch (requestError) {
      setError(requestError.message || 'Interview could not be scheduled.')
    } finally { setSaving(false) }
  }
  const toggleInterviewer = (id) => setForm((current) => ({ ...current, interviewer_ids: current.interviewer_ids.includes(id) ? current.interviewer_ids.filter((value) => value !== id) : [...current.interviewer_ids, id] }))
  const setStatus = async (interview, status) => {
    setError('')
    try { await updateHrInterview(interview.id, { status }); await onRefresh() } catch (requestError) { setError(requestError.message || 'Interview could not be updated.') }
  }
  const addQuestion = async (event) => {
    event.preventDefault()
    if (!questionInterview || !questionText.trim()) return
    setQuestionBusy(questionInterview); setError('')
    try { await addInterviewQuestion(questionInterview, { question: questionText, category: 'General' }); setQuestionText(''); await onRefresh() } catch (requestError) { setError(requestError.message || 'Question could not be added.') } finally { setQuestionBusy('') }
  }
  const generateQuestions = async (interviewId, refresh = false) => {
    setQuestionBusy(String(interviewId)); setError('')
    try { await generateInterviewQuestions(interviewId, refresh); await onRefresh() } catch (requestError) { setError(requestError.message || 'AI questions could not be generated.') } finally { setQuestionBusy('') }
  }
  return <section className="panel candidate-card interview-panel refined-interviews"><div className="candidate-card-head"><div><h2>Interviews</h2><p>Schedule interviewers, prepare questions, and review feedback.</p></div><Button onClick={() => setOpen(true)} icon={CalendarDays}>Schedule Interview</Button></div>{error && <p className="login-error">{error}</p>}{!interviewers.length && <p className="field-helper">No active interviewer users were found. Create an interviewer user before scheduling.</p>}{interviews.length ? <div className="interview-list refined-interview-list">{interviews.map((interview) => <article key={interview.id} className="interview-card refined-interview-card"><header className="refined-interview-head"><div><p className="eyebrow">Interview</p><h3>{formatInterviewStatus(interview.status)}</h3><div className="refined-interview-meta"><span>{formatDate(interview.scheduled_at)}</span><span>{formatTime(interview.scheduled_at)}</span><span>{formatInterviewType(interview.interview_type)}</span><span>{interview.duration_minutes} minutes</span></div></div><StatusBadge>{formatInterviewStatus(interview.status)}</StatusBadge></header><div className="refined-interview-grid"><InfoBlock label="Interviewer" value={interview.interviewers.map((person) => `${person.first_name} ${person.last_name}`).join(', ') || 'Not assigned'} /><InfoBlock label="Location" value={interview.location_or_link || 'Not provided'} /></div>{interview.status === 'scheduled' && <div className="interview-actions refined-actions"><Button variant="secondary" onClick={() => setStatus(interview, 'completed')}>Mark Completed</Button><Button variant="danger" onClick={() => window.confirm('Cancel this interview?') && setStatus(interview, 'cancelled')}>Cancel</Button></div>}<QuestionSection interview={interview} questionBusy={questionBusy} questionInterview={questionInterview} questionText={questionText} setQuestionInterview={setQuestionInterview} setQuestionText={setQuestionText} addQuestion={addQuestion} generateQuestions={generateQuestions} /><EvaluationSection evaluations={interview.evaluations || []} /></article>)}</div> : <p className="panel-subtitle">No interviews scheduled yet.</p>}<Modal open={open} title="Schedule interview" onClose={() => setOpen(false)} footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="schedule-interview-form" disabled={saving || !interviewers.length}>{saving ? 'Scheduling...' : 'Schedule'}</Button></>}><form id="schedule-interview-form" className="interview-form" onSubmit={submit}><Field label="Date and time"><input type="datetime-local" value={form.scheduled_at} onChange={(event) => setForm({ ...form, scheduled_at: event.target.value })} required /></Field><Field label="Duration"><input type="number" min="15" max="480" value={form.duration_minutes} onChange={(event) => setForm({ ...form, duration_minutes: event.target.value })} required /></Field><Field label="Type"><select value={form.interview_type} onChange={(event) => setForm({ ...form, interview_type: event.target.value })}><option value="video">Video</option><option value="phone">Phone</option><option value="onsite">Onsite</option></select></Field><Field label="Location or link"><input value={form.location_or_link} onChange={(event) => setForm({ ...form, location_or_link: event.target.value })} placeholder="Meeting link, phone note, or office location" /></Field><div className="field"><label>Interviewers</label><div className="checkbox-stack">{interviewers.map((person) => <label key={person.id}><input type="checkbox" checked={form.interviewer_ids.includes(person.id)} onChange={() => toggleInterviewer(person.id)} /> {person.first_name} {person.last_name}</label>)}</div></div></form></Modal></section>
}

function QuestionSection({ interview, questionBusy, questionInterview, questionText, setQuestionInterview, setQuestionText, addQuestion, generateQuestions }) {
  const questions = interview.questions || []
  const hasAi = questions.some((question) => question.source === 'ai')
  const busy = questionBusy === String(interview.id)
  return <section className="refined-subsection"><div className="refined-subsection-head"><div><h4>Interview Questions</h4><p>{questions.length} {questions.length === 1 ? 'question' : 'questions'}</p></div><div className="interview-actions refined-actions"><Button variant="secondary" onClick={() => generateQuestions(interview.id, hasAi)} disabled={busy}>{busy ? 'Generating...' : hasAi ? 'Regenerate AI Questions' : 'Generate AI Questions'}</Button><Button variant="secondary" onClick={() => setQuestionInterview(String(interview.id))}>Add Manual Question</Button></div></div>{questions.length ? <ol className="refined-question-list">{questions.map((question, index) => <li key={question.id}><span className="question-number">{String(index + 1).padStart(2, '0')}</span><div><span className="question-category">{normalizeCategory(question.category)}</span><p>{question.question}</p><small>{question.source === 'ai' ? 'AI generated' : 'Manual'}</small></div></li>)}</ol> : <p className="panel-subtitle">No questions prepared yet.</p>}{questionInterview === String(interview.id) && <form className="candidate-note-form refined-question-form" onSubmit={addQuestion}><textarea value={questionText} onChange={(event) => setQuestionText(event.target.value)} placeholder="Add a manual interview question" /><Button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save question'}</Button></form>}</section>
}

function EvaluationSection({ evaluations }) {
  return <section className="refined-subsection"><div className="refined-subsection-head"><div><h4>Interviewer Evaluation</h4><p>{evaluations.length ? 'Submitted feedback' : 'No evaluations submitted yet'}</p></div></div>{evaluations.length ? <div className="refined-evaluation-list">{evaluations.map((evaluation) => <article key={evaluation.id} className="refined-evaluation-card"><div className="refined-evaluation-top"><div><strong>{evaluation.interviewer_first_name} {evaluation.interviewer_last_name}</strong><span>Submitted</span></div><span className="recommendation-badge">{formatRecommendation(evaluation.recommendation)}</span></div><div className="rating-row"><span>Overall Rating</span><strong><StarRating value={evaluation.overall_rating} /> {evaluation.overall_rating} of 5</strong></div>{evaluation.comments && <div className="evaluation-comments"><span>Comments</span><p>{evaluation.comments}</p></div>}</article>)}</div> : <p className="panel-subtitle">No evaluations submitted yet.</p>}</section>
}

function StarRating({ value }) { const rating = Math.max(0, Math.min(5, Number(value) || 0)); return <span className="stars" aria-label={`${rating} of 5 stars`}>{[1, 2, 3, 4, 5].map((star) => <span key={star} className={star <= rating ? 'filled' : ''}>★</span>)}</span> }
function InfoBlock({ label, value }) { return <div className="refined-info-block"><span>{label}</span><strong>{value}</strong></div> }
function normalizeCategory(value) { const text = value || 'General'; return text.split('_').map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase()).join(' ') }
function formatTime(value) { return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value)) }

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
function TimelineItem({ activity }) { return <article><span><MessageSquare size={13} /></span><div><strong>{activityTitle(activity)}</strong><p><ActivityDescription activity={activity} /></p><time>{formatDate(activity.created_at)}</time></div></article> }
function ActivityDescription({ activity }) { const actor = activity.actor_first_name ? ` by ${activity.actor_first_name} ${activity.actor_last_name}` : ''; if (activity.event_type === 'status_changed') return <span className="status-transition"><span>{formatApplicationStatus(activity.from_status)}</span><i aria-hidden="true" /><span>{formatApplicationStatus(activity.to_status)}</span>{actor && <em>{actor}</em>}</span>; return actor ? actor.trim() : 'Recorded in Recruitify' }
function activityTitle(activity) { if (activity.event_type === 'status_changed') return 'Status changed'; if (activity.event_type === 'note_added') return 'HR note added'; if (activity.event_type === 'application_submitted') return 'Application submitted'; return 'Activity recorded' }
function formatDate(value) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) }
function formatRecommendation(value) { return value.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ') }


