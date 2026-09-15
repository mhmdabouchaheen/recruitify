import { Archive, Eye, FilePenLine, MoreHorizontal, Radio, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, IconButton } from '../ui'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { JobStatusBadge } from './JobShared'
import { formatDate } from '../../utils/jobs'

const actionIcons = { View: Eye, Edit: FilePenLine, Preview: Radio, Publish: Radio, Close: XCircle, Archive }

function actionsFor(status) {
  if (status === 'Draft') return ['View', 'Edit', 'Preview', 'Publish', 'Archive']
  if (status === 'Published') return ['View', 'Edit', 'Preview', 'Close']
  if (status === 'Closed') return ['View', 'Edit', 'Archive']
  return ['View']
}

export function JobActions({ job, onAction }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<IconButton label={`Actions for ${job.title}`} />}>
        <MoreHorizontal size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="job-menu">
        {actionsFor(job.status).map((action, index) => {
          const Icon = actionIcons[action]
          const path = action === 'View' ? `/jobs/${job.id}`
            : action === 'Edit' ? `/jobs/${job.id}/edit`
              : action === 'Preview' ? `/jobs/${job.id}/preview` : null
          return (
            <span key={action}>
              {index === 3 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                className={action === 'Close' ? 'menu-warning' : ''}
                render={path ? <Link to={path} /> : undefined}
                onClick={() => !path && onAction(action, job)}
              >
                <Icon size={14} />{action === 'Close' ? 'Close job' : action}
              </DropdownMenuItem>
            </span>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function JobsTable({ jobs, onAction }) {
  return (
    <>
      <div className="jobs-table-wrap">
        <table className="jobs-table">
          <caption className="sr-only">Job vacancies at Cedar Labs</caption>
          <thead><tr>
            <th scope="col">Job</th><th scope="col">Department</th><th scope="col">Status</th>
            <th scope="col" className="numeric">Applications</th><th scope="col" className="numeric">Shortlisted</th>
            <th scope="col" className="numeric">Interviews</th><th scope="col">Closing</th><th scope="col">Owner</th>
            <th scope="col"><span className="sr-only">Actions</span></th>
          </tr></thead>
          <tbody>{jobs.map((job) => (
            <tr key={job.id}>
              <td><Link className="job-title-link" to={`/jobs/${job.id}`}>{job.title}</Link>
                <span className="job-meta">{job.location} · {job.employmentType} · {job.id}</span></td>
              <td>{job.department}</td><td><JobStatusBadge status={job.status} /></td>
              <td className="numeric">{job.applicationCount}</td><td className="numeric">{job.shortlistedCount}</td>
              <td className="numeric">{job.interviewCount}</td><td>{formatDate(job.applicationDeadline)}</td>
              <td><span className="owner-cell"><Avatar name={job.owner} small />{job.owner}</span></td>
              <td><JobActions job={job} onAction={onAction} /></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="jobs-mobile-list">
        {jobs.map((job) => <article className="job-mobile-item" key={job.id}>
          <div><Link className="job-title-link" to={`/jobs/${job.id}`}>{job.title}</Link>
            <span className="job-meta">{job.department} · {job.location}</span></div>
          <JobStatusBadge status={job.status} />
          <dl><div><dt>Applications</dt><dd>{job.applicationCount}</dd></div><div><dt>Closing</dt><dd>{formatDate(job.applicationDeadline)}</dd></div></dl>
          <JobActions job={job} onAction={onAction} />
        </article>)}
      </div>
    </>
  )
}
