import { Bell, Menu, Search } from 'lucide-react'
import { Avatar, IconButton } from '../ui'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../ui/tooltip'

export function Topbar({ onMenu }) {
  return (
    <header className="topbar">
      <IconButton
        label="Open navigation"
        className="mobile-menu"
        onClick={onMenu}
      >
        <Menu size={18} />
      </IconButton>
      <span className="topbar-context">HR workspace</span>
      <label className="search">
        <Search size={15} />
        <span className="sr-only">Search Recruitify</span>
        <input type="search" placeholder="Search jobs, candidates…" />
        <kbd>⌘ K</kbd>
      </label>
      <Tooltip>
        <TooltipTrigger render={<IconButton label="Notifications" />}>
          <Bell size={17} />
          <span className="notification-dot" />
        </TooltipTrigger>
        <TooltipContent>Notifications</TooltipContent>
      </Tooltip>
      <Avatar name="Nour Saad" color="#d9e8de" />
    </header>
  )
}
