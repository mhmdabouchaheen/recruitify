import { motion } from 'motion/react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart3, Bell, BriefcaseBusiness, Building2, CalendarDays,
  KanbanSquare, LayoutDashboard, LogOut, Settings, UsersRound,
} from 'lucide-react'
import { Avatar } from '../ui'
import { useAuth } from '../../context/useAuth'

const nav = [
  [LayoutDashboard, 'Overview', '/overview'],
  [BriefcaseBusiness, 'Jobs', '/jobs'],
  [UsersRound, 'Candidates', '/candidates'],
  [KanbanSquare, 'Pipeline'],
  [CalendarDays, 'Interviews', '/interviews'],
  [BarChart3, 'Reports'],
  [Bell, 'Notifications', null, 4],
]

export function Sidebar({ open, onNavigate }) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const name = user ? `${user.first_name} ${user.last_name}` : 'Recruitify user'
  const role = user?.role ? user.role[0].toUpperCase() + user.role.slice(1) : 'Workspace'
  const handleLogout = () => {
    logout()
    onNavigate?.()
    navigate('/login', { replace: true })
  }

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
        <Avatar name={name} small color="#d7e5dc" />
        <div className="org-copy"><strong>{name}</strong><span>Cedar Labs · {role}</span></div>
        <button className="logout-button" aria-label="Log out" onClick={handleLogout}><LogOut size={14} /></button>
      </div>
    </motion.aside>
  )
}

