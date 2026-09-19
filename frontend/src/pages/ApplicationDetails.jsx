import { useEffect, useState } from 'react'
import { ArrowLeft, FileText } from 'lucide-react'
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

  return <main className="public-page"><PublicHeader isAuthenticated accountPath="/profile" /><div className="profile-page-shell"><Link className="back-link" to="/applications"><ArrowLeft size={14} />Back to applications</Link>
    {result.loading && <div className="profile-card"><Skeleton height={28} width="40%" /><Skeleton /><Skeleton /></div>}
    {!result.loading && result.error && <State title="Application unavailable" description={result.error} />}
    {application && <><header className="profile-head"><div><p className="eyebrow">Application details</p><h1>{application.job.title}</h1><p>{application.job.department} · {application.job.location}</p></div><div className="profile-primary-cv"><span>Status</span><strong>{formatStatus(application.status)}</strong></div></header>
      <section className="profile-card"><h2>Summary</h2><dl className="application-detail-list"><div><dt>Submitted</dt><dd>{formatDate(application.submitted_at)}</dd></div><div><dt>CV used</dt><dd>{application.cv.original_filename}</dd></div><div><dt>Job</dt><dd>{application.job.employment_type} · {application.job.workplace_type}</dd></div></dl>{canWithdraw && <div className="profile-actions"><Button variant="danger" onClick={() => setConfirm(true)}>Withdraw application</Button></div>}</section>
      {contract && <section className="profile-card contract-card"><h2>Job Offer / Contract</h2><dl className="application-detail-list"><div><dt>Position</dt><dd>{application.job.title}</dd></div><div><dt>Contract type</dt><dd>{formatContractType(contract.contract_type)}</dd></div><div><dt>Start date</dt><dd>{formatDate(contract.start_date)}</dd></div><div><dt>End date</dt><dd>{contract.end_date ? formatDate(contract.end_date) : 'Not applicable'}</dd></div><div><dt>Work location</dt><dd>{contract.work_location}</dd></div><div><dt>Salary</dt><dd>{contract.salary_amount ? `${contract.salary_amount} ${contract.salary_currency}` : 'Not specified'}</dd></div><div><dt>Contract status</dt><dd>{formatContractStatus(contract.status)}</dd></div><div><dt>Recruitment outcome</dt><dd>{contract.status === 'accepted' ? 'Hired' : contract.status === 'declined' ? 'Contract Declined' : 'Pending response'}</dd></div></dl><div className="profile-actions"><Button variant="secondary" onClick={downloadContract}>View / Download Contract PDF</Button>{contract.status === 'sent' && <><Button onClick={() => respondToContract(true)}>Accept Contract</Button><Button variant="danger" onClick={() => respondToContract(false)}>Decline Contract</Button></>}</div>{contractError && <p className="form-error">{contractError}</p>}</section>}
      <section className="profile-card"><h2>Interview schedule</h2>{interviews.length ? <div className="interview-list">{interviews.map((interview) => <article key={interview.id} className="interview-card"><strong>{formatDateTime(interview.scheduled_at)}</strong><p className="app-interview-meta"><span>{formatInterviewType(interview.interview_type)}</span><span>{interview.duration_minutes} minutes</span><span>{formatInterviewStatus(interview.status)}</span></p><p>{interview.location_or_link || 'Location/link will be shared by HR.'}</p></article>)}</div> : <p className="muted-copy">No interview has been scheduled for this application yet.</p>}</section>
      <section className="profile-card"><h2>Submitted answers</h2>{application.answers.length ? <ol className="application-answers">{application.answers.map((answer) => <li key={answer.id}><strong>{answer.question}</strong><p>{answer.answer}</p></li>)}</ol> : <p className="muted-copy">No additional answers submitted.</p>}</section>
    </>}
  </div><Modal open={confirm} title="Withdraw application?" onClose={() => setConfirm(false)} footer={<><Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button><Button variant="danger" onClick={withdraw}>Withdraw</Button></>}><p className="dialog-copy">You cannot apply to this job again after withdrawing.</p>{actionError && <p className="form-error">{actionError}</p>}</Modal></main>
}

function State({ title, description }) { return <div className="profile-state"><span><FileText size={22} /></span><h2>{title}</h2><p>{description}</p></div> }
function formatStatus(status) { return status.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ') }
function formatDate(value) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) }
function formatDateTime(value) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)) }
