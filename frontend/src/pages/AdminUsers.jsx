import { useEffect, useMemo, useState } from 'react'
import { Eye, Plus, Search, ShieldCheck, UserCheck, UsersRound } from 'lucide-react'

import { createAdminUser, getAdminUsers, updateAdminUserRole, updateAdminUserStatus } from '../api/adminUsers'
import { Button, Field, Modal, Skeleton, StatusBadge } from '../components/ui'

const emptyFilters = { search: '', role: '', is_active: '' }
const emptyCreateForm = { first_name: '', last_name: '', email: '', role: 'hr', password: '' }
const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'hr', label: 'HR' },
  { value: 'interviewer', label: 'Interviewer' },
  { value: 'applicant', label: 'Applicant' },
]
const internalRoleOptions = roleOptions.filter((role) => role.value !== 'applicant')

export default function AdminUsers() {
  const [filters, setFilters] = useState(emptyFilters)
  const [result, setResult] = useState({ users: [], loading: true, error: '' })
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [createError, setCreateError] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')
  const [detailUser, setDetailUser] = useState(null)

  const params = useMemo(() => ({
    search: filters.search.trim(),
    role: filters.role,
    is_active: filters.is_active,
    limit: 100,
  }), [filters])

  const loadUsers = () => {
    getAdminUsers(params)
      .then((users) => setResult({ users, loading: false, error: '' }))
      .catch((error) => setResult({ users: [], loading: false, error: error.message || 'Users could not be loaded.' }))
  }

  useEffect(() => {
    let cancelled = false
    getAdminUsers(params)
      .then((users) => { if (!cancelled) setResult({ users, loading: false, error: '' }) })
      .catch((error) => { if (!cancelled) setResult({ users: [], loading: false, error: error.message || 'Users could not be loaded.' }) })
    return () => { cancelled = true }
  }, [params])

  const summary = useMemo(() => ({
    total: result.users.length,
    hr: result.users.filter((user) => user.role === 'hr').length,
    interviewers: result.users.filter((user) => user.role === 'interviewer').length,
    applicants: result.users.filter((user) => user.role === 'applicant').length,
  }), [result.users])

  const createUser = async (event) => {
    event.preventDefault()
    setSaving(true)
    setCreateError('')
    try {
      await createAdminUser({
        first_name: createForm.first_name.trim(),
        last_name: createForm.last_name.trim(),
        email: createForm.email.trim().toLowerCase(),
        role: createForm.role,
        password: createForm.password,
      })
      setCreateOpen(false)
      setCreateForm(emptyCreateForm)
      loadUsers()
    } catch (error) {
      setCreateError(error.message || 'User could not be created.')
    } finally {
      setSaving(false)
    }
  }

  const changeRole = async (user) => {
    const nextRole = window.prompt('Enter new role: admin, hr, interviewer, or applicant', user.role)
    if (!nextRole || nextRole === user.role) return
    const normalizedRole = nextRole.trim().toLowerCase()
    if (!roleOptions.some((role) => role.value === normalizedRole)) {
      setActionError('Invalid role. Use admin, hr, interviewer, or applicant.')
      return
    }
    setActionError('')
    try {
      await updateAdminUserRole(user.id, normalizedRole)
      loadUsers()
    } catch (error) {
      setActionError(error.message || 'Role could not be changed.')
    }
  }

  const toggleStatus = async (user) => {
    const nextStatus = !user.is_active
    const label = nextStatus ? 'activate' : 'deactivate'
    if (!window.confirm(`${label[0].toUpperCase()}${label.slice(1)} ${user.first_name} ${user.last_name}?`)) return
    setActionError('')
    try {
      await updateAdminUserStatus(user.id, nextStatus)
      loadUsers()
    } catch (error) {
      setActionError(error.message || 'User status could not be changed.')
    }
  }

  const resetFilters = () => setFilters(emptyFilters)

  return <section className="admin-users-page">
    <header className="admin-users-head">
      <div><h1>User Management</h1></div>
      <Button icon={Plus} onClick={() => setCreateOpen(true)}>Create User</Button>
    </header>

    <div className="admin-summary-grid">
      <SummaryCard icon={UsersRound} label="Total Users" value={summary.total} />
      <SummaryCard icon={ShieldCheck} label="HR" value={summary.hr} />
      <SummaryCard icon={UserCheck} label="Interviewers" value={summary.interviewers} />
      <SummaryCard icon={UsersRound} label="Applicants" value={summary.applicants} />
    </div>

    <div className="admin-filters panel">
      <label className="admin-search"><Search size={16} /><input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search by name or email" type="search" /></label>
      <select value={filters.role} onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}>
        <option value="">All roles</option>
        {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
      </select>
      <select value={filters.is_active} onChange={(event) => setFilters((current) => ({ ...current, is_active: event.target.value }))}>
        <option value="">All statuses</option>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select>
      <Button variant="ghost" onClick={resetFilters}>Reset</Button>
    </div>

    {actionError && <p className="login-error" role="alert">{actionError}</p>}
    {result.loading && <div className="panel admin-users-loading"><Skeleton height={24} width="30%" /><Skeleton /><Skeleton /></div>}
    {!result.loading && result.error && <div className="careers-state"><h2>Unable to load users</h2><p>{result.error}</p></div>}
    {!result.loading && !result.error && <UsersTable users={result.users} onView={setDetailUser} onRole={changeRole} onStatus={toggleStatus} />}

    <Modal open={createOpen} title="Create internal user" onClose={() => { setCreateOpen(false); setCreateError(''); setCreateForm(emptyCreateForm) }} footer={<><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" form="create-admin-user-form" disabled={saving}>{saving ? 'Creating...' : 'Create user'}</Button></>}>
      <form id="create-admin-user-form" className="admin-user-form" onSubmit={createUser}>
        <div className="admin-form-grid"><Field label="First name"><input value={createForm.first_name} onChange={(event) => setCreateForm((current) => ({ ...current, first_name: event.target.value }))} required /></Field><Field label="Last name"><input value={createForm.last_name} onChange={(event) => setCreateForm((current) => ({ ...current, last_name: event.target.value }))} required /></Field></div>
        <Field label="Email"><input type="email" value={createForm.email} onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))} required /></Field>
        <Field label="Role" helper="Applicants register publicly. Admin can create internal users only."><select value={createForm.role} onChange={(event) => setCreateForm((current) => ({ ...current, role: event.target.value }))}>{internalRoleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></Field>
        <Field label="Temporary password"><input type="password" value={createForm.password} onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))} required minLength={8} /></Field>
        {createError && <p className="login-error" role="alert">{createError}</p>}
      </form>
    </Modal>

    <Modal open={Boolean(detailUser)} title="User details" onClose={() => setDetailUser(null)} footer={<Button variant="secondary" onClick={() => setDetailUser(null)}>Close</Button>}>
      {detailUser && <dl className="admin-user-detail"><div><dt>Name</dt><dd>{detailUser.first_name} {detailUser.last_name}</dd></div><div><dt>Email</dt><dd>{detailUser.email}</dd></div><div><dt>Role</dt><dd>{formatRole(detailUser.role)}</dd></div><div><dt>Status</dt><dd>{detailUser.is_active ? 'Active' : 'Inactive'}</dd></div><div><dt>Created</dt><dd>{formatDate(detailUser.created_at)}</dd></div></dl>}
    </Modal>
  </section>
}

function SummaryCard({ icon: Icon, label, value }) { return <article className="admin-summary-card"><span><Icon size={20} /></span><div><strong>{value}</strong><p>{label}</p></div></article> }

function UsersTable({ users, onView, onRole, onStatus }) {
  if (!users.length) return <div className="careers-state"><h2>No users found</h2><p>Try changing your filters or create an internal user.</p></div>
  return <div className="admin-users-table-wrap"><table className="admin-users-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><div className="admin-user-person"><span>{initials(user)}</span><strong>{user.first_name} {user.last_name}</strong></div></td><td>{user.email}</td><td>{formatRole(user.role)}</td><td><StatusBadge>{user.is_active ? 'Active' : 'Inactive'}</StatusBadge></td><td>{formatDate(user.created_at)}</td><td><div className="admin-user-actions"><button type="button" onClick={() => onView(user)}><Eye size={14} />View</button><button type="button" onClick={() => onRole(user)}>Change role</button><button type="button" onClick={() => onStatus(user)}>{user.is_active ? 'Deactivate' : 'Activate'}</button></div></td></tr>)}</tbody></table></div>
}

function initials(user) { return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() }
function formatRole(role) { return role.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ') }
function formatDate(value) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) }
