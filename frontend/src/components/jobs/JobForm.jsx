import { useEffect, useMemo, useState } from 'react'
import { Check, Eye, GripVertical, Plus, Save, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { departments, employmentTypes, locations } from '../../data/jobs'
import { Button, Field, IconButton, Modal } from '../ui'
import { Checkbox } from '../ui/checkbox'

const sections = [
  ['basic', 'Basic information'], ['description', 'Job description'],
  ['requirements', 'Requirements'], ['skills', 'Skills'],
  ['questions', 'Application questions'], ['publishing', 'Publishing'],
]

export function JobForm({ initialJob, mode, onSave }) {
  const [form, setForm] = useState(initialJob)
  const [errors, setErrors] = useState({})
  const [dirty, setDirty] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [pendingPath, setPendingPath] = useState(null)
  const [activeSection, setActiveSection] = useState('basic')
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
  const [saveState, setSaveState] = useState(
    mode === 'edit' ? `${initialJob.status} vacancy` : 'New vacancy',
  )
  const [pendingRequiredSkill, setPendingRequiredSkill] = useState('')
  const [pendingPreferredSkill, setPendingPreferredSkill] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const warn = (event) => {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) setActiveSection(visible[0].target.id)
      },
      { rootMargin: '-90px 0px -55% 0px', threshold: [0.05, 0.25, 0.5] },
    )
    sections.forEach(([id]) => {
      const section = document.getElementById(id)
      if (section) observer.observe(section)
    })
    return () => observer.disconnect()
  }, [])

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setDirty(true)
    setApiError('')
    setSaveState('Not saved')
    if (errors[key]) setErrors((current) => ({ ...current, [key]: '' }))
  }


  const withPendingSkills = (job = form) => {
    const addPending = (skills, pending) => {
      const skill = pending.trim()
      return skill && !skills.includes(skill) ? [...skills, skill] : skills
    }
    return {
      ...job,
      requiredSkills: addPending(job.requiredSkills || [], pendingRequiredSkill),
      preferredSkills: addPending(job.preferredSkills || [], pendingPreferredSkill),
    }
  }

  const clearPendingSkills = () => {
    setPendingRequiredSkill('')
    setPendingPreferredSkill('')
  }

  const updatePendingSkill = (setter, value) => {
    setter(value)
    setDirty(true)
    setApiError('')
    setSaveState('Not saved')
  }

  const validate = (job = form) => {
    const next = {}
    if (!job.title.trim()) next.title = 'Enter a job title.'
    if (!job.department) next.department = 'Select a department.'
    if (!job.location) next.location = 'Select a location.'
    if (!job.employmentType) next.employmentType = 'Select an employment type.'
    if (!job.description.trim()) next.description = 'Add a job description before publishing.'
    if (!job.requirements.trim()) next.requirements = 'Add requirements before saving.'
    if (Number(job.openings) < 1) next.openings = 'Openings must be at least 1.'
    if (job.applicationDeadline && job.applicationDeadline < '2026-09-15') next.applicationDeadline = 'Choose today or a future date.'
    if (job.applicationQuestions.some((question) => question.required && !question.text.trim())) next.questions = 'Required questions cannot be blank.'
    setErrors(next)
    if (Object.keys(next).length) {
      setApiError('Please fix the highlighted fields before saving.')
      document.getElementById(Object.keys(next)[0])?.focus()
      document.getElementById(Object.keys(next)[0])?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    }
    return Object.keys(next).length === 0
  }

  const saveDraft = async () => {
    const jobToSave = withPendingSkills()
    if (!validate(jobToSave) || submitting) return
    setSubmitting(true)
    setApiError('')
    setSaveState('Saving...')
    try {
      const saved = await onSave({ ...jobToSave, status: jobToSave.status === 'Published' ? 'Published' : 'Draft' }, 'draft')
      setForm(saved)
      clearPendingSkills()
      setDirty(false)
      setSaveState(saved.status === 'Published' ? 'Changes saved' : 'Draft saved')
      if (mode === 'create') navigate(`/jobs/${saved.id}`)
    } catch (error) {
      setSaveState('Not saved')
      setApiError(error.status === 403 ? 'You do not have permission to manage jobs.' : error.message || 'The job could not be saved.')
    } finally {
      setSubmitting(false)
    }
  }
  const requestPublish = () => {
    const jobToSave = withPendingSkills()
    if (validate(jobToSave)) setPublishOpen(true)
  }
  const publish = async () => {
    if (submitting) return
    setSubmitting(true)
    setApiError('')
    try {
      const jobToSave = withPendingSkills()
      const saved = await onSave({ ...jobToSave, status: 'Published' }, 'publish')
      clearPendingSkills()
      setDirty(false)
      setPublishOpen(false)
      navigate(`/jobs/${saved.id}`)
    } catch (error) {
      setApiError(error.status === 403 ? 'You do not have permission to publish jobs.' : error.message || 'The job could not be published.')
      setPublishOpen(false)
    } finally {
      setSubmitting(false)
    }
  }
  const preview = () => navigate(`/jobs/${form.id || 'new'}/preview`, {
    state: { job: form, from: window.location.pathname },
  })
  const requestLeave = (path) => {
    if (!dirty) return navigate(path)
    setPendingPath(path)
    setLeaveOpen(true)
  }

  const completion = useMemo(() => [
    Boolean(form.title.trim() && form.department && form.location && form.employmentType && Number(form.openings) > 0),
    Boolean(form.summary.trim() && form.description.trim() && form.responsibilities.trim()),
    Boolean(form.requiredExperience.trim() && form.educationLevel && form.requirements.trim()),
    form.requiredSkills.length > 0,
    form.applicationQuestions.length > 0
      && form.applicationQuestions.every((question) => question.text.trim()),
    Boolean(form.applicationDeadline),
  ], [form])

  return (
    <div className="job-form-layout">
      <aside className="form-progress" aria-label="Job form sections">
        <p>Job setup</p>
        <ol>{sections.map(([id, label], index) => <li key={id}>
          <a href={`#${id}`} onClick={() => setActiveSection(id)}
            className={`${completion[index] ? 'complete' : ''} ${activeSection === id ? 'active' : ''}`}
            aria-current={activeSection === id ? 'step' : undefined}>
            <span>{completion[index] ? <Check size={11} /> : index + 1}</span>{label}
          </a>
        </li>)}</ol>
        <div className="form-progress-note"><strong>{completion.filter(Boolean).length} of 6</strong><span>sections ready</span></div>
      </aside>

      <form className="job-form" id="job-edit-form" onSubmit={(event) => { event.preventDefault(); saveDraft() }} noValidate>
        <FormSection id="basic" number="01" title="Basic information" description="Define the role and where it sits in your organization.">
          <div className="form-grid">
            <Field label={<>Job title <Required /></>} error={errors.title}><input id="title" value={form.title} onChange={(e) => update('title', e.target.value)} /></Field>
            <Field label={<>Department <Required /></>} error={errors.department}><select id="department" value={form.department} onChange={(e) => update('department', e.target.value)}><option value="">Select department</option>{departments.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label={<>Location <Required /></>} error={errors.location}><select id="location" value={form.location} onChange={(e) => update('location', e.target.value)}><option value="">Select location</option>{locations.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Work arrangement"><select value={form.workArrangement} onChange={(e) => update('workArrangement', e.target.value)}><option>On-site</option><option>Hybrid</option><option>Remote</option></select></Field>
            <Field label={<>Employment type <Required /></>} error={errors.employmentType}><select id="employmentType" value={form.employmentType} onChange={(e) => update('employmentType', e.target.value)}><option value="">Select employment type</option>{employmentTypes.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Number of openings" error={errors.openings}><input id="openings" type="number" min="1" value={form.openings} onChange={(e) => update('openings', e.target.value)} /></Field>
            <Field label="Hiring owner"><select value={form.owner} onChange={(e) => update('owner', e.target.value)}><option>Nour Saad</option><option>Omar Khoury</option><option>Layla Farah</option></select></Field>
            <Field label="Job reference" helper="Optional internal code"><input value={form.reference || ''} placeholder="e.g. ENG-2026-04" onChange={(e) => update('reference', e.target.value)} /></Field>
          </div>
        </FormSection>

        <FormSection id="description" number="02" title="Job description" description="Help candidates understand the opportunity and day-to-day work.">
          <Field label="Job summary" helper="A concise introduction shown near the top of the vacancy."><textarea value={form.summary} onChange={(e) => update('summary', e.target.value)} rows="3" /></Field>
          <Field label={<>Job description <Required /></>} error={errors.description}><textarea id="description" value={form.description} onChange={(e) => update('description', e.target.value)} rows="6" /></Field>
          <Field label="Responsibilities" helper="Place each responsibility on a new line."><textarea value={form.responsibilities} onChange={(e) => update('responsibilities', e.target.value)} rows="6" /></Field>
        </FormSection>

        <FormSection id="requirements" number="03" title="Requirements" description="Set clear expectations without discouraging strong candidates.">
          <div className="form-grid">
            <Field label="Required experience"><input value={form.requiredExperience} placeholder="e.g. 2 years" onChange={(e) => update('requiredExperience', e.target.value)} /></Field>
            <Field label="Education level"><select value={form.educationLevel} onChange={(e) => update('educationLevel', e.target.value)}><option value="">Select education level</option>{['High school','Diploma',"Bachelor's degree","Master's degree",'Doctorate','Not required'].map((item) => <option key={item}>{item}</option>)}</select></Field>
          </div>
          <Field label="Requirements" helper="Place each requirement on a new line."><textarea value={form.requirements} onChange={(e) => update('requirements', e.target.value)} rows="5" /></Field>
          {errors.requirements && <p className="form-error" role="alert">{errors.requirements}</p>}
          <Field label="Preferred qualifications"><textarea value={form.preferredQualifications} onChange={(e) => update('preferredQualifications', e.target.value)} rows="4" /></Field>
        </FormSection>

        <FormSection id="skills" number="04" title="Skills" description="Separate essential capabilities from useful additions.">
          <SkillsInput label="Required skills" skills={form.requiredSkills} value={pendingRequiredSkill} onInputChange={(value) => updatePendingSkill(setPendingRequiredSkill, value)} onChange={(value) => update('requiredSkills', value)} />
          <SkillsInput label="Preferred skills" skills={form.preferredSkills} value={pendingPreferredSkill} onInputChange={(value) => updatePendingSkill(setPendingPreferredSkill, value)} onChange={(value) => update('preferredSkills', value)} />
        </FormSection>

        <FormSection id="questions" number="05" title="Application questions" description="Collect role-specific information when candidates apply.">
          <QuestionsEditor questions={form.applicationQuestions} onChange={(value) => update('applicationQuestions', value)} />
          {errors.questions && <p className="form-error" role="alert">{errors.questions}</p>}
        </FormSection>

        <FormSection id="publishing" number="06" title="Publishing" description="Review the deadline and choose when applicants can see the vacancy.">
          <div className="form-grid">
            <Field label="Application deadline" error={errors.applicationDeadline}><input id="applicationDeadline" type="date" min="2026-09-15" value={form.applicationDeadline} onChange={(e) => update('applicationDeadline', e.target.value)} /></Field>
            <Field label="Visibility"><select value={form.status === 'Published' ? 'Published' : 'Draft'} onChange={(e) => update('status', e.target.value)}><option>Draft</option><option>Published</option></select></Field>
          </div>
          <div className="publishing-note"><strong>Before publishing</strong><p>Confirm the role details, requirements, and deadline. You can edit a published job later, but applicants will see those changes.</p></div>
        </FormSection>
      </form>

      <aside className="form-side">
        <div><span className="form-state-dot" />{saveState}</div>
        <p>{dirty ? 'You have unsaved changes.' : saveState === 'Draft saved' ? 'Not published' : mode === 'edit' ? `${form.status} · ready to update` : 'Not published'}</p>
        <Button variant="secondary" icon={Eye} onClick={preview}>Preview</Button>
        {apiError && <p className="form-error" role="alert">{apiError}</p>}
        <Button type="submit" form="job-edit-form" variant="secondary" icon={Save} disabled={submitting}>{submitting ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Save draft'}</Button>
        <Button onClick={requestPublish} disabled={submitting}>{submitting ? 'Saving...' : form.status === 'Published' ? 'Save & publish' : 'Publish job'}</Button>
        <button className="cancel-form" onClick={() => requestLeave(mode === 'edit' ? `/jobs/${form.id}` : '/jobs')}>Cancel</button>
      </aside>

      <Modal open={publishOpen} title={`Publish ${form.title}?`} onClose={() => setPublishOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setPublishOpen(false)} disabled={submitting}>Cancel</Button><Button onClick={publish} disabled={submitting}>{submitting ? 'Publishing...' : 'Publish job'}</Button></>}>
        <div className="confirm-summary"><dl><div><dt>Department</dt><dd>{form.department}</dd></div><div><dt>Location</dt><dd>{form.location}</dd></div><div><dt>Deadline</dt><dd>{form.applicationDeadline || 'No deadline'}</dd></div></dl><p>Once published, applicants will be able to submit applications until the vacancy is closed or reaches its deadline.</p></div>
      </Modal>
      <Modal open={leaveOpen} title="Leave without saving?" onClose={() => setLeaveOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setLeaveOpen(false)}>Keep editing</Button><Button variant="danger" onClick={() => navigate(pendingPath)}>Discard changes</Button></>}>
        <p className="dialog-copy">Your unsaved changes will be lost.</p>
      </Modal>
    </div>
  )
}

function FormSection({ id, number, title, description, children }) {
  return <section className="form-section" id={id}><header><span>{number}</span><div><h2>{title}</h2><p>{description}</p></div></header><div className="form-section-body">{children}</div></section>
}
function Required() { return <span className="required" aria-label="required">*</span> }

function SkillsInput({ label, skills, value, onInputChange, onChange }) {
  const add = () => {
    const skill = value.trim()
    if (skill && !skills.includes(skill)) onChange([...skills, skill])
    onInputChange('')
  }
  return <div className="skills-field"><label>{label}</label><div className="skill-entry"><input value={value} placeholder="Type a skill and press Enter" onBlur={add} onChange={(e) => onInputChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} /><Button type="button" variant="secondary" onClick={add}>Add</Button></div><div className="skill-list">{skills.map((skill) => <span key={skill}>{skill}<button type="button" aria-label={`Remove ${skill}`} onClick={() => onChange(skills.filter((item) => item !== skill))}><X size={11} /></button></span>)}</div></div>
}

function QuestionsEditor({ questions, onChange }) {
  const add = () => onChange([...questions, { id: crypto.randomUUID(), text: '', type: 'Short answer', required: false }])
  const update = (id, changes) => onChange(questions.map((question) => question.id === id ? { ...question, ...changes } : question))
  return <div className="questions-editor">{questions.map((question, index) => <motion.div layout className="question-row" key={question.id}><GripVertical size={15} className="drag-handle" /><div className="question-fields"><label className="sr-only" htmlFor={question.id}>Question {index + 1}</label><input id={question.id} value={question.text} placeholder="Enter an application question" onChange={(e) => update(question.id, { text: e.target.value })} /><select value={question.type} onChange={(e) => update(question.id, { type: e.target.value })}><option>Short answer</option><option>Long answer</option><option>Yes / No</option><option>Number</option></select><label className="question-required"><Checkbox checked={question.required} onCheckedChange={(checked) => update(question.id, { required: checked === true })} />Required</label></div><IconButton label="Remove question" onClick={() => onChange(questions.filter((item) => item.id !== question.id))}><Trash2 size={14} /></IconButton></motion.div>)}<Button variant="secondary" icon={Plus} onClick={add}>Add question</Button></div>
}
