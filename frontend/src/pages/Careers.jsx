import { useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, Building2, CalendarDays, LogIn, MapPin, Search, UserRound } from 'lucide-react'
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
  const accountPath = user?.role === 'applicant' ? '/careers' : '/overview'

  return <main className="public-page">
    <PublicHeader isAuthenticated={isAuthenticated} accountPath={accountPath} />
    <section className="careers-hero">
      <p className="eyebrow">Find jobs</p>
      <h1>Explore open roles at Recruitify</h1>
      <p>Browse current published vacancies and review the details before applying.</p>
    </section>

    <section className="careers-panel" aria-label="Published vacancies">
      <div className="careers-filters">
        <label className="careers-search">
          <Search size={15} />
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search by title, department, or location"
            type="search"
          />
        </label>
        <Field label="Department">
          <select value={filters.department} onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value }))}>
            <option value="">All departments</option>
            {facets.departments.map((department) => <option key={department} value={department}>{department}</option>)}
          </select>
        </Field>
        <Field label="Location">
          <select value={filters.location} onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))}>
            <option value="">All locations</option>
            {facets.locations.map((location) => <option key={location} value={location}>{location}</option>)}
          </select>
        </Field>
        <Field label="Employment">
          <select value={filters.employmentType} onChange={(event) => setFilters((current) => ({ ...current, employmentType: event.target.value }))}>
            <option value="">Any type</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contract">Contract</option>
            <option value="Internship">Internship</option>
            <option value="Temporary">Temporary</option>
          </select>
        </Field>
        <Field label="Workplace">
          <select value={filters.workplace_type} onChange={(event) => setFilters((current) => ({ ...current, workplace_type: event.target.value }))}>
            <option value="">Any workplace</option>
            <option value="onsite">On-site</option>
            <option value="hybrid">Hybrid</option>
            <option value="remote">Remote</option>
          </select>
        </Field>
        {hasFilters && <button className="clear-filters" type="button" onClick={() => setFilters(emptyFilters)}>Clear filters</button>}
      </div>

      {loading && <CareersLoading />}
      {!loading && result.error && <CareersState title="Unable to load jobs" description={result.error} />}
      {!loading && !result.error && !result.jobs.length && <CareersState title={hasFilters ? 'No jobs match your filters' : 'No published vacancies yet'} description={hasFilters ? 'Try changing your search or filters.' : 'Please check back soon for new opportunities.'} />}
      {!loading && !result.error && result.jobs.length > 0 && <div className="careers-list">
        {result.jobs.map((job) => <CareerCard key={job.id} job={job} />)}
      </div>}
    </section>
  </main>
}

export function PublicHeader({ isAuthenticated, accountPath = '/overview' }) {
  return <header className="public-header">
    <Link className="public-brand" to="/careers"><span className="brand-mark"><Building2 size={17} /></span><span>Recruitify</span></Link>
    <nav>
      <Link to="/careers">Find Jobs</Link>
      {isAuthenticated
        ? <Button variant="secondary" icon={UserRound} render={<Link to={accountPath} />}>Account</Button>
        : <Button variant="secondary" icon={LogIn} render={<Link to="/login" />}>Login</Button>}
    </nav>
  </header>
}

function CareerCard({ job }) {
  const skills = [...job.requiredSkills, ...job.preferredSkills].slice(0, 4)
  return <article className="career-card">
    <div>
      <p className="eyebrow">{job.department}</p>
      <h2><Link to={`/careers/${job.id}`}>{job.title}</Link></h2>
      <div className="career-meta"><span><MapPin size={14} />{job.location}</span><span><BriefcaseBusiness size={14} />{job.employmentType}</span><span>{job.workArrangement}</span></div>
      {skills.length > 0 && <div className="career-skills">{skills.map((skill) => <span key={skill}>{skill}</span>)}</div>}
      {job.applicationDeadline && <p className="career-deadline"><CalendarDays size={14} />Apply by {formatDate(job.applicationDeadline)}</p>}
    </div>
    <Button render={<Link to={`/careers/${job.id}`} />}>View Job</Button>
  </article>
}

function CareersLoading() {
  return <div className="careers-list" aria-label="Loading jobs">
    {[1, 2, 3].map((item) => <article className="career-card" key={item}><div><Skeleton width="24%" /><Skeleton width="48%" height={24} /><Skeleton width="64%" /><Skeleton width="36%" /></div><Skeleton width={92} height={38} /></article>)}
  </div>
}

function CareersState({ title, description }) {
  return <div className="careers-state"><span><BriefcaseBusiness size={22} /></span><h2>{title}</h2><p>{description}</p></div>
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}


