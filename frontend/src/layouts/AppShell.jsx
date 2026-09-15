import { AnimatePresence, motion } from 'motion/react'
import { Sidebar } from '../components/navigation/Sidebar'
import { Topbar } from '../components/navigation/Topbar'
import { useJobs } from '../context/JobsContext'

export function AppShell({ mobileNavOpen, setMobileNavOpen, children }) {
  const { toast } = useJobs()
  return (
    <div className="app-shell">
      <Sidebar open={mobileNavOpen} onNavigate={() => setMobileNavOpen(false)} />
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.button className="overlay mobile-only" aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)} initial={{ opacity: 0 }}
            animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        )}
      </AnimatePresence>
      <div className="app-column">
        <Topbar onMenu={() => setMobileNavOpen(true)} />
        <main className="main">{children}</main>
      </div>
      <AnimatePresence>
        {toast && (
          <motion.div className="toast" role="status" initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <span className="toast-check">✓</span>{toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
