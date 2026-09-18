import { useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, CalendarDays, LogIn, MapPin, Search, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

import { getPublicJobs } from '../api/publicJobs'
import { Button, Field, Skeleton } from '../components/ui'
import { useAuth } from '../context/useAuth'
import { formatDate } from '../utils/jobs'

const emptyFilters = {
  search: '',
  department: '',
  location: '',
  employmentType: '',
  workplace_type: '',
}

const employmentOptions = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary']
const workplaceOptions = [
  { label: 'On-site', value: 'onsite' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'Remote', value: 'remote' },
]

export default function Careers() {
  const { isAuthenticated, user } = useAuth()
  const [filters, setFilters] = useState(emptyFilters)
  const [result, setResult] = useState({ jobs: [], error: '', key: '' })

  const requestParams = useMemo(() => ({
    search: filters.search.trim(),
    department: filters.department,
    location: filters.location,
    employmentType: filters.employmentType,
    workplace_type: filters.workplace_type,
    limit: 50,
  }), [filters])

  const requestKey = JSON.stringify(requestParams)

  useEffect(() => {
    let cancelled = false
    getPublicJobs(requestParams)
      .then((jobs) => {
        if (!cancelled) setResult({ jobs, error: '', key: requestKey })
      })
      .catch((error) => {
        if (!cancelled) setResult({ jobs: [], error: error.message || 'Published jobs could not be loaded.', key: requestKey })
      })
    return () => {
      cancelled = true
    }
  }, [requestKey, requestParams])

  const loading = result.key !== requestKey

  const facets = useMemo(() => ({
    departments: unique(result.jobs.map((job) => job.department)),
    locations: unique(result.jobs.map((job) => job.location)),
  }), [result.jobs])

  const hasFilters = Object.values(filters).some(Boolean)
  const accountPath = user?.role === 'applicant' ? '/profile' : '/overview'

  return <main className="public-page careers-jobs-page">
    <section className="careers-board" aria-label="Published vacancies">
      <aside className="careers-filter-sidebar" aria-label="Job filters">
        <div className="careers-filter-head">
          <h2>Filters</h2>
          {hasFilters && <button type="button" onClick={() => setFilters(emptyFilters)}>Reset all</button>}
        </div>
        <FilterGroup title="Department" options={facets.departments} value={filters.department} onChange={(department) => setFilters((current) => ({ ...current, department }))} />
        <FilterGroup title="Employment type" options={employmentOptions} value={filters.employmentType} onChange={(employmentType) => setFilters((current) => ({ ...current, employmentType }))} />
        <FilterGroup title="Location" options={facets.locations} value={filters.location} onChange={(location) => setFilters((current) => ({ ...current, location }))} />
        <FilterGroup title="Workplace" options={workplaceOptions} value={filters.workplace_type} onChange={(workplaceType) => setFilters((current) => ({ ...current, workplace_type: workplaceType }))} />
      </aside>

      <div className="careers-board-main">
        <div className="careers-toolbar">
          <label className="careers-search jobs-search">
            <Search size={18} />
            <input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search by job title or keyword"
              type="search"
            />
          </label>
          <Field label="Location">
            <select value={filters.location} onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))}>
              <option value="">All locations</option>
              {facets.locations.map((location) => <option key={location} value={location}>{location}</option>)}
            </select>
          </Field>
          <div className="careers-account-action">
            {isAuthenticated
              ? <Button variant="secondary" icon={UserRound} render={<Link to={accountPath} />}>Account</Button>
              : <Button variant="secondary" icon={LogIn} render={<Link to="/login" />}>Login</Button>}
          </div>
        </div>

        <div className="careers-results-head">
          <div>
            <p className="eyebrow">Open positions</p>
            <h1>{loading ? 'Loading jobs' : `${result.jobs.length} open ${result.jobs.length === 1 ? 'position' : 'positions'}`}</h1>
          </div>
        </div>

        {loading && <CareersLoading />}
        {!loading && result.error && <CareersState title="Unable to load jobs" description={result.error} />}
        {!loading && !result.error && !result.jobs.length && <CareersState title={hasFilters ? 'No jobs match your filters' : 'No published vacancies yet'} description={hasFilters ? 'Try changing your search or filters.' : 'Please check back soon for new opportunities.'} />}
        {!loading && !result.error && result.jobs.length > 0 && <div className="careers-list careers-job-grid">
          {result.jobs.map((job, index) => <CareerCard key={job.id} job={job} tone={index % 5} />)}
        </div>}
      </div>
    </section>
  </main>
}

export function PublicHeader({ isAuthenticated, accountPath = '/overview' }) {
  return <header className="public-header">
    <Link className="public-brand" to="/careers"><span className="brand-mark"><BriefcaseBusiness size={17} /></span><span>Recruitify</span></Link>
    <nav>
      <Link to="/careers">Find Jobs</Link>
      {isAuthenticated
        ? <Button variant="secondary" icon={UserRound} render={<Link to={accountPath} />}>Account</Button>
        : <Button variant="secondary" icon={LogIn} render={<Link to="/login" />}>Login</Button>}
    </nav>
  </header>
}

function FilterGroup({ title, options, value, onChange }) {
  if (!options.length) return null
  return <fieldset className="filter-group">
    <legend>{title}</legend>
    <div>
      {options.map((option) => {
        const optionValue = typeof option === 'string' ? option : option.value
        const label = typeof option === 'string' ? option : option.label
        return <label key={optionValue} className="filter-check">
          <input type="checkbox" checked={value === optionValue} onChange={(event) => onChange(event.target.checked ? optionValue : '')} />
          <span>{label}</span>
        </label>
      })}
    </div>
  </fieldset>
}

function CareerCard({ job, tone }) {
  return <article className={`career-card career-card-tone-${tone}`}>
    <Link className="career-card-link" to={`/careers/${job.id}`} aria-label={`View ${job.title}`} />
    <div className="career-card-body">
      <span className="career-badge">{job.department}</span>
      <h2><Link to={`/careers/${job.id}`}>{job.title}</Link></h2>
      <div className="career-meta">
        <span><MapPin size={14} />{job.location}</span>
        <span><BriefcaseBusiness size={14} />{job.employmentType}</span>
        <span>{job.workArrangement}</span>
      </div>
      {(job.publishedAt || job.createdAt) && <p className="career-deadline"><CalendarDays size={14} />Posted {formatDate(job.publishedAt || job.createdAt)}</p>}
    </div>
    <Button render={<Link to={`/careers/${job.id}/apply`} />}>Apply now</Button>
  </article>
}

function CareersLoading() {
  return <div className="careers-list careers-job-grid" aria-label="Loading jobs">
    {[1, 2, 3, 4, 5, 6].map((item) => <article className={`career-card career-card-tone-${item % 5}`} key={item}><div className="career-card-body"><Skeleton width="30%" /><Skeleton width="68%" height={25} /><Skeleton width="72%" /><Skeleton width="48%" /></div><Skeleton width="100%" height={42} /></article>)}
  </div>
}

function CareersState({ title, description }) {
  return <div className="careers-state"><span><BriefcaseBusiness size={22} /></span><h2>{title}</h2><p>{description}</p></div>
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}
