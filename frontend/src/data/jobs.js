export const jobStatuses = ['Draft', 'Published', 'Closed', 'Archived']
export const departments = ['Engineering', 'Human Resources', 'Data & Analytics', 'Finance', 'Product & Design']
export const locations = ['Beirut', 'Remote', 'Hybrid']
export const employmentTypes = ['Full-time', 'Part-time', 'Contract', 'Internship']

const sharedQuestions = [
  { id: 'q1', text: 'Are you currently based in Lebanon?', type: 'Yes / No', required: true },
  { id: 'q2', text: 'Please provide a link to your portfolio or GitHub profile.', type: 'Short answer', required: false },
]

export const initialJobs = [
  {
    id: 'JOB-1042', title: 'Junior Full Stack Developer', department: 'Engineering',
    location: 'Beirut', workArrangement: 'Hybrid', employmentType: 'Full-time',
    status: 'Published', openings: 2, owner: 'Nour Saad',
    summary: 'Join Cedar Labs to build thoughtful digital products used by growing teams across the region.',
    description: 'We are looking for a curious full stack developer to work across our React frontend and FastAPI services. You will collaborate closely with product, design, and senior engineers.',
    responsibilities: 'Build accessible product experiences\nDevelop and maintain REST APIs\nReview code and contribute to technical planning\nWork with product and design to ship improvements',
    requiredExperience: '2 years', educationLevel: "Bachelor's degree",
    requirements: 'Strong JavaScript and Python fundamentals\nExperience building responsive React interfaces\nUnderstanding of relational databases and REST APIs',
    preferredQualifications: 'Experience with Docker and cloud deployment\nPrior work in a product-focused team',
    requiredSkills: ['React', 'JavaScript', 'FastAPI', 'Python', 'PostgreSQL', 'Git'],
    preferredSkills: ['Docker', 'REST APIs'], applicationQuestions: sharedQuestions,
    applicationDeadline: '2026-10-15', publishedAt: '2026-09-02', createdAt: '2026-08-29',
    updatedAt: '2026-09-14', applicationCount: 42, shortlistedCount: 8, interviewCount: 3, selectedCount: 0,
  },
  {
    id: 'JOB-1041', title: 'HR Assistant', department: 'Human Resources',
    location: 'Beirut', workArrangement: 'On-site', employmentType: 'Full-time',
    status: 'Published', openings: 1, owner: 'Nour Saad',
    summary: 'Support a people-first HR team across recruitment operations and employee experience.',
    description: 'Cedar Labs is seeking an organized HR Assistant to support recruitment coordination, onboarding, and day-to-day people operations.',
    responsibilities: 'Coordinate candidate interviews\nMaintain recruitment records\nSupport onboarding activities\nRespond to employee requests',
    requiredExperience: '1 year', educationLevel: "Bachelor's degree",
    requirements: 'Excellent communication and organization skills\nStrong attention to detail',
    preferredQualifications: 'Experience with an ATS or HRIS',
    requiredSkills: ['Recruiting', 'Communication', 'Organization'], preferredSkills: ['HRIS'],
    applicationQuestions: sharedQuestions, applicationDeadline: '2026-09-28',
    publishedAt: '2026-09-05', createdAt: '2026-09-01', updatedAt: '2026-09-12',
    applicationCount: 28, shortlistedCount: 6, interviewCount: 4, selectedCount: 1,
  },
  {
    id: 'JOB-1040', title: 'Data Analyst', department: 'Data & Analytics',
    location: 'Remote', workArrangement: 'Remote', employmentType: 'Full-time',
    status: 'Published', openings: 1, owner: 'Omar Khoury',
    summary: 'Turn product and commercial data into clear decisions for teams across Cedar Labs.',
    description: 'You will own recurring reporting, investigate trends, and help teams define useful measures of success.',
    responsibilities: 'Build reliable dashboards\nAnalyze product and business performance\nPresent findings to stakeholders',
    requiredExperience: '3 years', educationLevel: "Bachelor's degree",
    requirements: 'Advanced SQL\nStrong analytical communication\nExperience with BI tools',
    preferredQualifications: 'Python or R experience', requiredSkills: ['SQL', 'Data visualization', 'Excel'],
    preferredSkills: ['Python', 'Statistics'], applicationQuestions: sharedQuestions,
    applicationDeadline: '2026-09-18', publishedAt: '2026-08-28', createdAt: '2026-08-25',
    updatedAt: '2026-09-13', applicationCount: 56, shortlistedCount: 11, interviewCount: 5, selectedCount: 0,
  },
  {
    id: 'JOB-1039', title: 'Finance Assistant', department: 'Finance',
    location: 'Hybrid', workArrangement: 'Hybrid', employmentType: 'Part-time',
    status: 'Draft', openings: 1, owner: 'Layla Farah',
    summary: 'Support accurate financial operations and reporting for Cedar Labs.',
    description: 'Help our finance team with invoice processing, reconciliations, and monthly reporting.',
    responsibilities: 'Process invoices\nSupport account reconciliation\nOrganize financial documentation',
    requiredExperience: '2 years', educationLevel: "Bachelor's degree",
    requirements: 'Accounting fundamentals\nHigh attention to detail', preferredQualifications: 'Familiarity with ERP software',
    requiredSkills: ['Accounting', 'Excel'], preferredSkills: ['ERP'], applicationQuestions: [],
    applicationDeadline: '2026-10-30', publishedAt: '', createdAt: '2026-09-10', updatedAt: '2026-09-14',
    applicationCount: 0, shortlistedCount: 0, interviewCount: 0, selectedCount: 0,
  },
  {
    id: 'JOB-1038', title: 'UI/UX Designer', department: 'Product & Design',
    location: 'Hybrid', workArrangement: 'Hybrid', employmentType: 'Contract',
    status: 'Closed', openings: 1, owner: 'Nour Saad',
    summary: 'Design clear, human product experiences for Cedar Labs customers.',
    description: 'Partner with product and engineering from discovery through delivery on our core B2B products.',
    responsibilities: 'Plan and conduct user research\nCreate flows and polished interfaces\nMaintain design-system patterns',
    requiredExperience: '4 years', educationLevel: "Bachelor's degree",
    requirements: 'Strong interaction and visual design portfolio\nExperience designing complex SaaS workflows',
    preferredQualifications: 'Front-end development familiarity', requiredSkills: ['Figma', 'Product design', 'Research'],
    preferredSkills: ['Prototyping', 'HTML/CSS'], applicationQuestions: sharedQuestions,
    applicationDeadline: '2026-09-10', publishedAt: '2026-08-10', createdAt: '2026-08-05',
    updatedAt: '2026-09-11', applicationCount: 38, shortlistedCount: 7, interviewCount: 4, selectedCount: 1,
  },
  {
    id: 'JOB-1037', title: 'Marketing Intern', department: 'Product & Design',
    location: 'Beirut', workArrangement: 'On-site', employmentType: 'Internship',
    status: 'Archived', openings: 1, owner: 'Layla Farah',
    summary: 'A completed internship vacancy retained for reference.',
    description: 'Support content planning and campaign execution.', responsibilities: 'Research topics\nDraft social content',
    requiredExperience: 'Not required', educationLevel: 'Not required', requirements: 'Clear written communication',
    preferredQualifications: '', requiredSkills: ['Writing'], preferredSkills: ['Canva'], applicationQuestions: [],
    applicationDeadline: '2026-07-01', publishedAt: '2026-05-12', createdAt: '2026-05-10',
    updatedAt: '2026-07-04', applicationCount: 31, shortlistedCount: 5, interviewCount: 3, selectedCount: 1,
  },
]

export const emptyJob = {
  title: '', department: '', location: '', workArrangement: 'Hybrid',
  employmentType: '', openings: 1, owner: 'Nour Saad', reference: '',
  summary: '', description: '', responsibilities: '', requiredExperience: '',
  educationLevel: '', requirements: '', preferredQualifications: '',
  requiredSkills: [], preferredSkills: [], applicationQuestions: [],
  applicationDeadline: '', status: 'Draft',
}

export const candidatePreview = [
  { name: 'Maya Ali', experience: '2 years experience', stage: 'Under Review', applied: 'Applied today', color: '#dcebe2' },
  { name: 'Rami Khalil', experience: '3 years experience', stage: 'Shortlisted', applied: 'Applied yesterday', color: '#e9e4d8' },
  { name: 'Lina Nasser', experience: '1 year experience', stage: 'Interview', applied: 'Applied Sep 12', color: '#dce7ed' },
]
