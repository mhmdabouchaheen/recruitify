import { useEffect, useMemo, useRef, useState } from 'react'
import { BriefcaseBusiness, CheckCircle2, FileText, Trash2, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  deleteApplicantCv,
  getApplicantCvs,
  getApplicantProfile,
  setPrimaryApplicantCv,
  updateApplicantProfile,
  uploadApplicantCv,
} from '../api/applicant'
import { Button, Field, Modal, Skeleton } from '../components/ui'
import { useAuth } from '../context/useAuth'
import { PublicHeader } from './Careers'

const emptyProfile = {
  phone: '',
  location: '',
  professional_title: '',
  summary: '',
  linkedin_url: '',
  github_url: '',
}

const maxFileSize = 5 * 1024 * 1024

export default function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [draft, setDraft] = useState(emptyProfile)
  const [cvs, setCvs] = useState([])
  const [loadedForUserId, setLoadedForUserId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const fileInputRef = useRef(null)

  const isApplicant = user?.role === 'applicant'

  useEffect(() => {
    if (!isApplicant) return undefined

    let cancelled = false
    Promise.all([getApplicantProfile(), getApplicantCvs()])
      .then(([profileData, cvsData]) => {
        if (cancelled) return
        setProfile(profileData)
        setDraft(toDraft(profileData))
        setCvs(cvsData)
        setError('')
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.status === 403 ? 'Applicant profile is available only to applicant accounts.' : 'Profile data could not be loaded.')
      })
      .finally(() => {
        if (!cancelled) setLoadedForUserId(user?.id || 'applicant')
      })
    return () => {
      cancelled = true
    }
  }, [isApplicant, user?.id])

  const loading = isApplicant && loadedForUserId !== (user?.id || 'applicant')
  const accountPath = user?.role === 'applicant' ? '/profile' : '/overview'
  const account = profile || user
  const primaryCv = useMemo(() => cvs.find((cv) => cv.is_primary), [cvs])

  if (loading) return <main className="public-page"><PublicHeader isAuthenticated accountPath={accountPath} /><ProfileShell><ProfileLoading /></ProfileShell></main>

  if (!isApplicant) {
    return <main className="public-page"><PublicHeader isAuthenticated accountPath={accountPath} /><ProfileShell><ProfileState title="Profile is for applicants" description="Use the internal dashboard for recruiting workspaces." action={<Button render={<Link to="/overview" />}>Go to dashboard</Button>} /></ProfileShell></main>
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const updated = await updateApplicantProfile(normalizeDraft(draft))
      setProfile(updated)
      setDraft(toDraft(updated))
      setMessage('Profile saved.')
    } catch (requestError) {
      setError(requestError.status === 422 ? 'Please check the profile fields and URLs.' : 'Profile could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const uploadCv = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || uploading) return
    setError('')
    setMessage('')

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file.')
      return
    }
    if (file.size > maxFileSize) {
      setError('CV must be 5 MB or smaller.')
      return
    }

    setUploading(true)
    try {
      const cv = await uploadApplicantCv(file)
      setCvs((current) => [cv, ...current.filter((item) => item.id !== cv.id)].sort(sortCvs))
      setMessage('CV uploaded.')
    } catch (requestError) {
      setError(requestError.message || 'CV could not be uploaded.')
    } finally {
      setUploading(false)
    }
  }

  const makePrimary = async (cv) => {
    setError('')
    setMessage('')
    try {
      const updated = await setPrimaryApplicantCv(cv.id)
      setCvs((current) => current.map((item) => ({ ...item, is_primary: item.id === updated.id })).sort(sortCvs))
      setMessage('Primary CV updated.')
    } catch (requestError) {
      setError(requestError.message || 'Primary CV could not be updated.')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setError('')
    setMessage('')
    try {
      await deleteApplicantCv(deleteTarget.id)
      const nextCvs = await getApplicantCvs()
      setCvs(nextCvs)
      setDeleteTarget(null)
      setMessage('CV deleted.')
    } catch (requestError) {
      setError(requestError.message || 'CV could not be deleted.')
    }
  }

  return <main className="public-page">
    <PublicHeader isAuthenticated accountPath={accountPath} />
    <ProfileShell>
      <header className="profile-head">
        <div>
          <p className="eyebrow">Applicant profile</p>
          <h1>{account?.first_name} {account?.last_name}</h1>
          <p>Manage your profile details and CVs for future applications.</p>
        </div>
        {primaryCv && <div className="profile-primary-cv"><CheckCircle2 size={17} /><span>Primary CV</span><strong>{primaryCv.original_filename}</strong></div>}
      </header>

      <ApplicantNav />
      {message && <p className="profile-success" role="status">{message}</p>}
      {error && <p className="login-error" role="alert">{error}</p>}

      <form className="profile-grid" onSubmit={saveProfile}>
        <section className="profile-card">
          <h2>Personal information</h2>
          <div className="profile-fields two">
            <Field label="First name"><input value={account?.first_name || ''} readOnly /></Field>
            <Field label="Last name"><input value={account?.last_name || ''} readOnly /></Field>
            <Field label="Email"><input value={account?.email || ''} readOnly /></Field>
            <Field label="Phone"><input value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="+961 ..." /></Field>
            <Field label="Location"><input value={draft.location} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} placeholder="City, country" /></Field>
          </div>
        </section>

        <section className="profile-card">
          <h2>Professional information</h2>
          <div className="profile-fields">
            <Field label="Professional title"><input value={draft.professional_title} onChange={(event) => setDraft((current) => ({ ...current, professional_title: event.target.value }))} placeholder="Frontend Developer" /></Field>
            <Field label="Professional summary"><textarea value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} rows={5} placeholder="Briefly describe your background and goals." /></Field>
            <div className="profile-fields two">
              <Field label="LinkedIn URL"><input value={draft.linkedin_url} onChange={(event) => setDraft((current) => ({ ...current, linkedin_url: event.target.value }))} placeholder="https://linkedin.com/in/..." /></Field>
              <Field label="GitHub URL"><input value={draft.github_url} onChange={(event) => setDraft((current) => ({ ...current, github_url: event.target.value }))} placeholder="https://github.com/..." /></Field>
            </div>
          </div>
          <div className="profile-actions"><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</Button></div>
        </section>
      </form>

      <section className="profile-card profile-cvs">
        <div className="profile-card-head">
          <div><h2>CVs</h2><p>Upload PDF files only. Maximum file size is 5 MB.</p></div>
          <Button icon={Upload} onClick={() => fileInputRef.current?.click()} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload CV'}</Button>
          <input ref={fileInputRef} className="sr-only" type="file" accept="application/pdf,.pdf" onChange={uploadCv} />
        </div>
        {cvs.length === 0 ? <ProfileState title="No CVs uploaded" description="Upload a PDF CV so your applicant account is ready when applications open." /> : <div className="cv-list">
          {cvs.map((cv) => <article className="cv-item" key={cv.id}>
            <span className="cv-icon"><FileText size={18} /></span>
            <div><strong>{cv.original_filename}</strong><span>{formatFileSize(cv.file_size)} · Uploaded {formatDate(cv.uploaded_at)}</span></div>
            {cv.is_primary ? <span className="cv-primary">Primary</span> : <Button variant="secondary" onClick={() => makePrimary(cv)}>Set as Primary</Button>}
            <Button variant="ghost" icon={Trash2} onClick={() => setDeleteTarget(cv)}>Delete</Button>
          </article>)}
        </div>}
      </section>
    </ProfileShell>

    <Modal open={Boolean(deleteTarget)} title="Delete CV?" onClose={() => setDeleteTarget(null)} footer={<><Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="danger" onClick={confirmDelete}>Delete CV</Button></>}>
      <p className="dialog-copy">This removes {deleteTarget?.original_filename} from your profile. You can upload it again later if needed.</p>
    </Modal>
  </main>
}

function ApplicantNav() {
  return <nav className="applicant-nav" aria-label="Applicant navigation">
    <Link to="/careers">Find Jobs</Link>
    <span aria-disabled="true">My Applications</span>
    <span aria-disabled="true">Interviews</span>
    <Link className="active" to="/profile">Profile</Link>
  </nav>
}

function ProfileShell({ children }) { return <div className="profile-page-shell">{children}</div> }
function ProfileLoading() { return <div className="profile-card"><Skeleton height={28} width="35%" /><Skeleton /><Skeleton /><Skeleton height={90} /></div> }
function ProfileState({ title, description, action }) { return <div className="profile-state"><span><BriefcaseBusiness size={22} /></span><h2>{title}</h2><p>{description}</p>{action}</div> }
function toDraft(profile) { return { ...emptyProfile, ...Object.fromEntries(Object.entries(emptyProfile).map(([key]) => [key, profile?.[key] || ''])) } }
function normalizeDraft(draft) { return Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim() || null])) }
function sortCvs(a, b) { return Number(b.is_primary) - Number(a.is_primary) || new Date(b.uploaded_at) - new Date(a.uploaded_at) || b.id - a.id }
function formatDate(value) { return value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : 'Not specified' }
function formatFileSize(bytes) { return `${(bytes / 1024 / 1024).toFixed(bytes > 1024 * 1024 ? 1 : 2)} MB` }

