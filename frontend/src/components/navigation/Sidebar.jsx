import { motion } from 'motion/react'
import { NavLink } from 'react-router-dom'
import {
  BarChart3, Bell, BriefcaseBusiness, Building2, CalendarDays,
  ChevronDown, KanbanSquare, LayoutDashboard, Settings, UsersRound,
} from 'lucide-react'
import { Avatar } from '../ui'

const nav = [
  [LayoutDashboard, 'Overview', '/overview'],
  [BriefcaseBusiness, 'Jobs', '/jobs'],
  [UsersRound, 'Candidates'],
  [KanbanSquare, 'Pipeline'],
  [CalendarDays, 'Interviews'],
  [BarChart3, 'Reports'],
  [Bell, 'Notifications', null, 4],
]

export function Sidebar({ open, onNavigate }) {
  return (
    <motion.aside
      className="sidebar"
      aria-label="Primary navigation"
      animate={{ x: open || window.innerWidth > 760 ? 0 : '-100%' }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <NavLink to="/overview" className="brand" onClick={onNavigate}>
        <span className="brand-mark"><Building2 size={17} /></span>
        Recruitify
      </NavLink>
      <p className="nav-label">Workspace</p>
      <nav>
        <ul className="nav-list">
          {nav.map(([Icon, label, path, count]) => (
            <li key={label}>
              {path ? <NavLink
                to={path}
                onClick={onNavigate}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={17} />
                <span>{label}</span>
                {count && <span className="nav-count">{count}</span>}
              </NavLink> : <button className="nav-item" onClick={onNavigate}>
                <Icon size={17} />
                <span>{label}</span>
                {count && <span className="nav-count">{count}</span>}
              </button>}
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-spacer" />
      <button className="nav-item"><Settings size={17} /><span>Settings</span></button>
      <div className="org-profile">
        <Avatar name="Nour Saad" small color="#d7e5dc" />
        <div className="org-copy"><strong>Nour Saad</strong><span>Cedar Labs · HR</span></div>
        <ChevronDown size={14} />
      </div>
    </motion.aside>
  )
}
