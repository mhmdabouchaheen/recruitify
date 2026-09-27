import { useEffect, useState } from 'react'
import { ArrowLeft, BriefcaseBusiness, Building2, CalendarDays, FileText, MapPin, Monitor } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { getApplication, withdrawApplication } from '../api/applications'
import { formatInterviewStatus, formatInterviewType, getApplicantApplicationInterviews } from '../api/interviews'
import { Button, Modal, Skeleton } from '../components/ui'
import { acceptApplicantContract, declineApplicantContract, downloadApplicantContractPdf, formatContractStatus, formatContractType, getApplicantApplicationContract } from '../api/contracts'
import { PublicHeader } from './Careers'

const withdrawBlocked = new Set(['selected', 'rejected', 'withdrawn'])

export default function ApplicationDetails() {
  const { applicationId } = useParams()
  const [result, setResult] = useState({ application: null, loading: true, error: '' })
  const [confirm, setConfirm] = useState(false)
  const [actionError, setActionError] = useState('')
  const [interviews, setInterviews] = useState([])
  const [contract, setContract] = useState(null)
  const [contractError, setContractError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([getApplication(applicationId), getApplicantApplicationInterviews(applicationId).catch(() => []), getApplicantApplicationContract(applicationId).catch(() => null)])
      .then(([application, nextInterviews, nextContract]) => { if (!cancelled) { setInterviews(nextInterviews); setContract(nextContract); setResult({ application, loading: false, error: '' }) } })
      .catch((error) => { if (!cancelled) setResult({ application: null, loading: false, error: error.status === 404 ? 'Application not found.' : 'Application could not be loaded.' }) })
    return () => { cancelled = true }
  }, [applicationId])

  const application = result.application
  const canWithdraw = application && !withdrawBlocked.has(application.status)
  const respondToContract = async (accept) => {
    if (!contract) return
    if (!window.confirm(accept ? 'Accept this contract?' : 'Decline this contract?')) return
    setContractError('')
    try {
      const next = accept ? await acceptApplicantContract(contract.id) : await declineApplicantContract(contract.id)
      setContract(next)
    } catch (error) {
      setContractError(error.message || 'Contract response could not be saved.')
    }
  }
  const downloadContract = async () => {
    setContractError('')
    try { await downloadApplicantContractPdf(contract.id) } catch (error) { setContractError(error.message || 'Contract PDF could not be downloaded.') }
  }

  const withdraw = async () => {
    try {
      setActionError('')
      const updated = await withdrawApplication(application.id)
      setResult({ application: updated, loading: false, error: '' })
      setConfirm(false)
    } catch (error) {
      setActionError(error.message || 'Application could not be withdrawn.')
    }
  }

  return <main className="public-page"><PublicHeader isAuthenticated accountPath="/profile" /><div className="profile-page-shell application-detail-shell"><Link className="back-link" to="/applications"><ArrowLeft size={14} />Back to applications</Link>
    {result.loading && <div className="profile-card"><Skeleton height={28} width="40%" /><Skeleton /><Skeleton /></div>}
    {!result.loading && result.error && <State title="Application unavailable" description={result.error} />}
    {application && <>
      <header className="profile-head application-detail-head"><div><p className="eyebrow">Application details</p><h1>{application.job.title}</h1><p className="application-job-meta"><span><Building2 size={14} />{application.job.department}</span><span><MapPin size={14} />{application.job.location}</span></p></div><span className={`application-status-badge status-${application.status.replaceAll('_', '-')}`}>{formatStatus(application.status)}</span></header>
      <section className="profile-card application-summary-card"><div className="application-section-head"><div><h2>Summary</h2><p>Your submitted application information.</p></div></div><dl className="application-summary-grid"><ApplicationMeta icon={CalendarDays} label="Submitted" value={formatDate(application.submitted_at)} /><ApplicationMeta icon={FileText} label="CV used" value={application.cv.original_filename} strong /><ApplicationMeta icon={BriefcaseBusiness} label="Employment type" value={application.job.employment_type} /><ApplicationMeta icon={Monitor} label="Work mode" value={application.job.workplace_type} /></dl>{canWithdraw && <div className="profile-actions application-withdraw-actions"><Button className="application-withdraw-button" variant="danger" onClick={() => setConfirm(true)}>Withdraw application</Button></div>}</section>
      {contract && <section className="profile-card contract-card"><h2>Job Offer / Contract</h2><dl className="application-detail-list"><div><dt>Position</dt><dd>{application.job.title}</dd></div><div><dt>Contract type</dt><dd>{formatContractType(contract.contract_type)}</dd></div><div><dt>Start date</dt><dd>{formatDate(contract.start_date)}</dd></div><div><dt>End date</dt><dd>{contract.end_date ? formatDate(contract.end_date) : 'Not applicable'}</dd></div><div><dt>Work location</dt><dd>{contract.work_location}</dd></div><div><dt>Salary</dt><dd>{contract.salary_amount ? `${contract.salary_amount} ${contract.salary_currency}` : 'Not specified'}</dd></div><div><dt>Contract status</dt><dd>{formatContractStatus(contract.status)}</dd></div><div><dt>Recruitment outcome</dt><dd>{contract.status === 'accepted' ? 'Hired' : contract.status === 'declined' ? 'Contract Declined' : 'Pending response'}</dd></div></dl><div className="profile-actions"><Button variant="secondary" onClick={downloadContract}>View / Download Contract PDF</Button>{contract.status === 'sent' && <><Button onClick={() => respondToContract(true)}>Accept Contract</Button><Button variant="danger" onClick={() => respondToContract(false)}>Decline Contract</Button></>}</div>{contractError && <p className="form-error">{contractError}</p>}</section>}
      <section className="profile-card application-interviews-card"><SectionHead icon={CalendarDays} title="Interview schedule" />{interviews.length ? <div className="interview-list">{interviews.map((interview) => <article key={interview.id} className="interview-card"><strong>{formatDateTime(interview.scheduled_at)}</strong><p className="app-interview-meta"><span>{formatInterviewType(interview.interview_type)}</span><span>{interview.duration_minutes} minutes</span><span>{formatInterviewStatus(interview.status)}</span></p><p>{interview.location_or_link || 'Location/link will be shared by HR.'}</p></article>)}</div> : <div className="application-empty-state"><span><CalendarDays size={18} /></span><p>No interview has been scheduled yet.</p></div>}</section>
      <section className="profile-card application-answers-card"><div className="application-section-head"><div><h2>Submitted answers</h2><p>Your responses to the application questions.</p></div></div>{application.answers.length ? <ol className="application-answer-list">{application.answers.map((answer, index) => <li key={answer.id}><span>Question {index + 1}</span><strong>{answer.question}</strong><p>{answer.answer}</p></li>)}</ol> : <p className="muted-copy">No additional answers submitted.</p>}</section>
    </>}
  </div><Modal open={confirm} title="Withdraw application?" onClose={() => setConfirm(false)} footer={<><Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button><Button variant="danger" onClick={withdraw}>Withdraw</Button></>}><p className="dialog-copy">You cannot apply to this job again after withdrawing.</p>{actionError && <p className="form-error">{actionError}</p>}</Modal></main>
}

function ApplicationMeta({ icon: Icon, label, value, strong = false }) { return <div><span><Icon size={15} /></span><dt>{label}</dt><dd className={strong ? 'is-strong' : ''}>{value}</dd></div> }
function SectionHead({ icon: Icon, title }) { return <div className="application-section-head"><span><Icon size={17} /></span><div><h2>{title}</h2></div></div> }
function State({ title, description }) { return <div className="profile-state"><span><FileText size={22} /></span><h2>{title}</h2><p>{description}</p></div> }
function formatStatus(status) { return status.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ') }
function formatDate(value) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) }
function formatDateTime(value) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)) }
