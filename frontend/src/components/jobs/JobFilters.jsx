import { AnimatePresence, motion } from 'motion/react'
import { Filter, Search, X } from 'lucide-react'
import { departments, employmentTypes, jobStatuses, locations } from '../../data/jobs'
import { Button, IconButton } from '../ui'

const filterOptions = [
  ['status', 'Status', jobStatuses],
  ['department', 'Department', departments],
  ['location', 'Location', locations],
  ['employmentType', 'Employment type', employmentTypes],
]

export function JobFilters({ filters, setFilters, mobileOpen, setMobileOpen }) {
  const active = filterOptions.filter(([key]) => filters[key])
  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const clear = () => setFilters({ search: '', status: '', department: '', location: '', employmentType: '' })

  const controls = <div className="filter-controls">
    {filterOptions.map(([key, label, options]) => (
      <label className="compact-select" key={key}><span className="sr-only">{label}</span>
        <select value={filters[key]} onChange={(event) => update(key, event.target.value)}>
          <option value="">{label}</option>{options.map((option) => <option key={option}>{option}</option>)}
        </select>
      </label>
    ))}
    {active.length > 0 && <button className="clear-filters" onClick={clear}>Clear filters</button>}
  </div>

  return (
    <section className="job-filters" aria-label="Job filters">
      <div className="job-search"><Search size={15} /><label className="sr-only" htmlFor="job-search">Search jobs</label>
        <input id="job-search" value={filters.search} onChange={(event) => update('search', event.target.value)}
          placeholder="Search by title or keyword" /></div>
      <div className="desktop-filters">{controls}</div>
      <Button variant="secondary" icon={Filter} className="filter-mobile-button" onClick={() => setMobileOpen(true)}>Filters{active.length > 0 && <span>{active.length}</span>}</Button>
      <AnimatePresence>{mobileOpen && <>
        <motion.button className="filter-backdrop" aria-label="Close filters" onClick={() => setMobileOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        <motion.aside className="filter-sheet" aria-label="Filter jobs" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: .2 }}>
          <header><div><h2>Filter jobs</h2><p>Narrow vacancies by their key details.</p></div><IconButton label="Close filters" onClick={() => setMobileOpen(false)}><X size={17} /></IconButton></header>
          {controls}<footer><Button variant="secondary" onClick={clear}>Clear</Button><Button onClick={() => setMobileOpen(false)}>Show results</Button></footer>
        </motion.aside>
      </>}</AnimatePresence>
      {active.length > 0 && <div className="active-filters">{active.map(([key, label]) => <button key={key} onClick={() => update(key, '')}>{label}: {filters[key]} <X size={11} /></button>)}</div>}
    </section>
  )
}
