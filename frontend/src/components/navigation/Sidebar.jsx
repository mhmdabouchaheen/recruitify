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
  [BriefcaseBusiness, 'Jobs', '/jobs', null, ['hr', 'admin']],
  [UsersRound, 'Candidates', '/candidates', null, ['hr', 'admin']],
  [KanbanSquare, 'Pipeline', '/pipeline', null, ['hr', 'admin']],
  [CalendarDays, 'Interviews', '/interviews'],
  [BarChart3, 'Reports', null, null, ['hr', 'admin']],
  [Bell, 'Notifications', '/notifications'],
]

export function Sidebar({ open, onNavigate, unreadNotifications = 0 }) {
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
          {nav.filter(([, , , , roles]) => !roles || roles.includes(user?.role)).map(([Icon, label, path, count]) => {
            const displayCount = label === 'Notifications' ? unreadNotifications : count
            return (
            <li key={label}>
              {path ? <NavLink
                to={path}
                onClick={onNavigate}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={17} />
                <span>{label}</span>
                {displayCount > 0 && <span className="nav-count">{displayCount}</span>}
              </NavLink> : <button className="nav-item" onClick={onNavigate}>
                <Icon size={17} />
                <span>{label}</span>
                {displayCount > 0 && <span className="nav-count">{displayCount}</span>}
              </button>}
            </li>
          )})}
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

