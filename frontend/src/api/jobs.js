import { apiRequest } from '../lib/apiClient'

const statusToApi = {
  Draft: 'draft',
  Published: 'published',
  Closed: 'closed',
  Archived: 'archived',
}

const statusFromApi = {
  draft: 'Draft',
  published: 'Published',
  closed: 'Closed',
  archived: 'Archived',
}

const employmentToApi = {
  'Full-time': 'full_time',
  'Part-time': 'part_time',
  Contract: 'contract',
  Internship: 'internship',
  Temporary: 'temporary',
}

const employmentFromApi = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
  temporary: 'Temporary',
}

const workplaceFromApi = {
  onsite: 'On-site',
  hybrid: 'Hybrid',
  remote: 'Remote',
}

const workplaceToApi = {
  'On-site': 'onsite',
  Hybrid: 'hybrid',
  Remote: 'remote',
}

const questionToApi = {
  'Short answer': 'short_text',
  'Long answer': 'long_text',
  'Yes / No': 'yes_no',
  Number: 'number',
}

const questionFromApi = {
  short_text: 'Short answer',
  long_text: 'Long answer',
  yes_no: 'Yes / No',
  number: 'Number',
}

export function buildJobQuery(params = {}) {
  const query = new URLSearchParams()
  const mappings = {
    skip: params.skip,
    limit: params.limit,
    search: params.search,
    status: statusToApi[params.status] || params.status,
    department: params.department,
    location: params.location,
    employment_type: employmentToApi[params.employmentType] || params.employment_type,
    workplace_type: params.workplace_type,
  }

  Object.entries(mappings).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value)
  })

  const value = query.toString()
  return value ? `?${value}` : ''
}

function mapQuestion(question) {
  return {
    id: question.id,
    text: question.question,
    type: questionFromApi[question.question_type] || question.question_type,
    required: question.is_required,
    displayOrder: question.display_order,
  }
}

function mapSkill(name, skillType) {
  return { name, skill_type: skillType }
}

function normalizeJobPayload(job, status) {
  const nextStatus = status || job.status || 'Draft'
  const description = job.description || job.summary || 'Draft job description'
  const requirements = job.requirements || 'Draft requirements'

  return {
    title: job.title,
    department: job.department,
    location: job.location,
    employment_type: employmentToApi[job.employmentType] || job.employmentType,
    workplace_type: workplaceToApi[job.workArrangement] || 'hybrid',
    status: statusToApi[nextStatus] || nextStatus,
    description,
    responsibilities: job.responsibilities || null,
    requirements,
    required_experience: job.requiredExperience || null,
    required_education: job.educationLevel || null,
    application_deadline: job.applicationDeadline || null,
    positions_count: Number(job.openings) || 1,
    skills: [
      ...(job.requiredSkills || []).map((skill) => mapSkill(skill, 'required')),
      ...(job.preferredSkills || []).map((skill) => mapSkill(skill, 'preferred')),
    ],
    application_questions: (job.applicationQuestions || [])
      .filter((question) => question.text?.trim())
      .map((question, index) => ({
        question: question.text,
        question_type: questionToApi[question.type] || question.type || 'short_text',
        is_required: Boolean(question.required),
        display_order: question.displayOrder ?? index,
      })),
  }
}

export function mapJob(job) {
  const requiredSkills = job.skills
    ?.filter((skill) => skill.skill_type === 'required')
    .map((skill) => skill.name) || []
  const preferredSkills = job.skills
    ?.filter((skill) => skill.skill_type === 'preferred')
    .map((skill) => skill.name) || []

  return {
    id: String(job.id),
    title: job.title,
    department: job.department,
    location: job.location,
    workArrangement: workplaceFromApi[job.workplace_type] || job.workplace_type,
    employmentType: employmentFromApi[job.employment_type] || job.employment_type,
    status: statusFromApi[job.status] || job.status,
    openings: job.positions_count,
    owner: `User ${job.created_by_id}`,
    summary: job.description,
    description: job.description,
    responsibilities: job.responsibilities || '',
    requiredExperience: job.required_experience || '',
    educationLevel: job.required_education || '',
    requirements: job.requirements,
    preferredQualifications: '',
    requiredSkills,
    preferredSkills,
    applicationQuestions: job.application_questions?.map(mapQuestion) || [],
    applicationDeadline: job.application_deadline || '',
    publishedAt: job.status === 'published' ? job.created_at?.slice(0, 10) : '',
    createdAt: job.created_at?.slice(0, 10) || '',
    updatedAt: job.updated_at?.slice(0, 10) || '',
    applicationCount: 0,
    shortlistedCount: 0,
    interviewCount: 0,
    selectedCount: 0,
  }
}

export async function getJobs(params) {
  const jobs = await apiRequest(`/jobs${buildJobQuery(params)}`)
  return jobs.map(mapJob)
}

export async function getJob(jobId) {
  const job = await apiRequest(`/jobs/${jobId}`)
  return mapJob(job)
}

export async function createJob(job, mode = 'draft') {
  const status = mode === 'publish' ? 'Published' : job.status || 'Draft'
  const created = await apiRequest('/jobs', {
    method: 'POST',
    body: normalizeJobPayload(job, status),
  })
  return mapJob(created)
}

export async function updateJob(jobId, job) {
  const updated = await apiRequest(`/jobs/${jobId}`, {
    method: 'PATCH',
    body: normalizeJobPayload(job, job.status),
  })
  return mapJob(updated)
}

export async function updateJobStatus(jobId, status) {
  const updated = await apiRequest(`/jobs/${jobId}`, {
    method: 'PATCH',
    body: { status: statusToApi[status] || status },
  })
  return mapJob(updated)
}

export async function deleteJob(jobId) {
  return apiRequest(`/jobs/${jobId}`, { method: 'DELETE' })
}

