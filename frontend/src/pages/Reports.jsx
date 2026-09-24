
import { useEffect, useState } from 'react'
import { BarChart3, CalendarDays, Download, FileText, RotateCcw, TrendingUp } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { getHrReports } from '../api/reports'
import { buildRecruitmentReportPdf } from '../utils/reportPdf'
import { Skeleton } from '../components/ui'

const STATUS_COLORS = ['#14785a', '#65bd8f', '#f0cc67', '#88b6f2', '#b79bea', '#77c8a0', '#ee817b', '#94a3b8']
const FUNNEL_COLORS = ['#a9dbc4', '#bce4d0', '#f4dda0', '#bcd4fb', '#ded0fa', '#cbe9dc', '#8ccfac']
const CONTRACT_COLORS = { draft: '#94a3b8', sent: '#f0cc67', accepted: '#14785a', declined: '#ee817b' }

const initialFilters = { start_date: '', end_date: '', job_id: '', department: '', status: '' }

export default function Reports() {
  const [filters, setFilters] = useState(initialFilters)
  const [result, setResult] = useState({ data: null, loading: true, error: '' })

  useEffect(() => {
    let cancelled = false
    getHrReports(filters)
      .then((data) => { if (!cancelled) setResult({ data, loading: false, error: '' }) })
      .catch((error) => { if (!cancelled) setResult({ data: null, loading: false, error: error.message || 'Reports could not be loaded.' }) })
    return () => { cancelled = true }
  }, [filters])

  const updateFilter = (key, value) => {
    setResult((current) => ({ ...current, loading: true, error: '' }))
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const resetFilters = () => {
    setResult((current) => ({ ...current, loading: true, error: '' }))
    setFilters(initialFilters)
  }

  return <section className="reports-page">
    <header className="reports-head">
      <div>
        <h1>Recruitment Reports &amp; Analytics</h1>
      </div>
      {result.data && <button type="button" className="reports-export" onClick={() => exportReport(result.data, getActiveFilterLabels(filters, result.data))}><Download size={15} />Export Report</button>}
    </header>

    <section className="reports-filters" aria-label="Report filters">
      <FilterField icon={CalendarDays} label="Start date"><input type="date" value={filters.start_date} onChange={(event) => updateFilter('start_date', event.target.value)} /></FilterField>
      <FilterField icon={CalendarDays} label="End date"><input type="date" value={filters.end_date} onChange={(event) => updateFilter('end_date', event.target.value)} /></FilterField>
      <FilterField label="All Jobs"><select value={filters.job_id} onChange={(event) => updateFilter('job_id', event.target.value)}><option value="">All Jobs</option>{result.data?.filters.jobs.map((job) => <option value={job.value} key={job.value}>{job.label}</option>)}</select></FilterField>
      <FilterField label="All Departments"><select value={filters.department} onChange={(event) => updateFilter('department', event.target.value)}><option value="">All Departments</option>{result.data?.filters.departments.map((department) => <option value={department} key={department}>{department}</option>)}</select></FilterField>
      <FilterField label="All Statuses"><select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}><option value="">All Statuses</option>{result.data?.filters.statuses.map((status) => <option value={status} key={status}>{formatLabel(status)}</option>)}</select></FilterField>
      <button type="button" className="reports-reset" onClick={resetFilters}><RotateCcw size={14} />Reset</button>
    </section>

    {result.loading && <ReportsLoading />}
    {!result.loading && result.error && <ReportsState title="Unable to load reports" description={result.error} />}
    {!result.loading && result.data && <ReportsContent data={result.data} />}
  </section>
}

function ReportsContent({ data }) {
  const totalApplications = data.funnel.stages[0]?.count || 0
  const statusTotal = data.applications_by_status.reduce((sum, item) => sum + item.count, 0)
  const departmentChartHeight = Math.max(150, Math.min(240, data.applications_by_department.length * 42 + 42))
  return <>
    <section className="reports-funnel-card">
      <div className="reports-card-head"><div><h2>Recruitment Funnel</h2><p>From application to hire</p></div></div>
      <div className="reports-funnel-layout">
        <div className="reports-funnel-track">
          {data.funnel.stages.map((stage, index) => <article className="reports-funnel-segment" style={{ '--segment-color': FUNNEL_COLORS[index % FUNNEL_COLORS.length] }} key={stage.key}><strong>{stage.count}</strong><span>{stage.label}</span></article>)}
          <div className="reports-conversions">{data.funnel.conversions.map((item) => <span key={`${item.from}-${item.to}`}>{item.rate}% proceeded</span>)}</div>
        </div>
        <aside className="reports-funnel-stat"><TrendingUp size={24} /><strong>{data.funnel.overall_conversion}%</strong><span>application-to-hire conversion</span><small>{data.funnel.hired_count} hired from {totalApplications} applications</small></aside>
      </div>
    </section>

    <div className="reports-grid">
      <ChartCard className="reports-span-2" title="Applications Over Time" action={<span className="reports-pill">Monthly</span>} empty={!data.applications_over_time.length} emptyText="No application data is available for this period.">
        <div className="reports-chart-frame reports-line-frame"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.applications_over_time} margin={{ top: 8, right: 14, left: -12, bottom: 0 }}><defs><linearGradient id="applicationsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#14785a" stopOpacity={0.24} /><stop offset="95%" stopColor="#14785a" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#e8eee9" vertical={false} /><XAxis dataKey="period" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} /><Tooltip /><Area type="monotone" dataKey="applications" stroke="#14785a" fill="url(#applicationsFill)" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 5 }} name="Applications" /><Area type="monotone" dataKey="hires" stroke="#7aa090" fill="transparent" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} name="Hires" /></AreaChart></ResponsiveContainer></div>
      </ChartCard>

      <DonutCard title="Applications by Status" total={statusTotal} centerLabel="Total" data={data.applications_by_status} nameKey="label" colors={STATUS_COLORS} emptyText="No application statuses for this period." />

      <section className="reports-card reports-span-2"><div className="reports-card-head"><h2>Job Performance</h2></div>{data.job_performance.length ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>Job Title</th><th>Applicants</th><th>Shortlisted</th><th>Interviewed</th><th>Hired</th><th>Avg. AI Match</th></tr></thead><tbody>{data.job_performance.map((job) => <tr key={job.job_id}><td>{job.title}</td><td>{job.applicants}</td><td>{job.shortlisted}</td><td>{job.interviewed}</td><td>{job.hired}</td><td>{job.avg_ai_match == null ? '?' : <span className="reports-score">{job.avg_ai_match}%</span>}</td></tr>)}</tbody></table></div> : <ReportsEmpty text="No job performance data is available." />}</section>

      <ChartCard title="Applications by Department" empty={!data.applications_by_department.length} emptyText="No department data is available.">
        <div className="reports-chart-frame reports-department-frame" style={{ height: departmentChartHeight }}><ResponsiveContainer width="100%" height="100%"><BarChart data={data.applications_by_department} layout="vertical" margin={{ top: 4, right: 18, left: 8, bottom: 4 }}><CartesianGrid stroke="#eef2ee" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="department" type="category" width={92} tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="count" fill="#59b98a" radius={[0, 6, 6, 0]} maxBarSize={24} /></BarChart></ResponsiveContainer></div>
      </ChartCard>

      <ChartCard title="AI Match Score Analysis" empty={!data.ai_match.total_scored} emptyText="No stored AI match scores are available for this filter.">
        <div className="reports-ai-layout"><div className="reports-chart-frame reports-ai-chart-frame"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.ai_match.buckets} margin={{ top: 8, right: 8, left: -12, bottom: 12 }}><CartesianGrid stroke="#eef2ee" vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} /><Tooltip /><Bar dataKey="count" fill="#69c99a" maxBarSize={46} radius={[7, 7, 0, 0]} /></BarChart></ResponsiveContainer></div><div className="reports-ai-stat"><BarChart3 size={22} /><strong>{data.ai_match.average ?? '?'}{data.ai_match.average == null ? '' : '%'}</strong><span>Average Match Score</span><small>{data.ai_match.total_scored} scored applications</small></div></div>
      </ChartCard>

      <DonutCard title="Interview Outcomes" total={data.interview_outcomes.total} centerLabel="Evaluations" data={data.interview_outcomes.items} nameKey="label" colors={STATUS_COLORS} emptyText="No interview evaluations are available." />
      <DonutCard title="Contract Outcomes" total={data.contract_outcomes.reduce((sum, item) => sum + item.count, 0)} centerLabel="Contracts" data={data.contract_outcomes} nameKey="label" colors={data.contract_outcomes.map((item) => CONTRACT_COLORS[item.status] || '#94a3b8')} emptyText="No contracts are available." />

      <ChartCard title="Hires Over Time" action={<span className="reports-pill">Monthly</span>} empty={!data.hires_over_time.length} emptyText="No hires are available for this period.">
        <div className="reports-chart-frame reports-bar-frame"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.hires_over_time} margin={{ top: 8, right: 14, left: -12, bottom: 0 }}><CartesianGrid stroke="#eef2ee" vertical={false} /><XAxis dataKey="period" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="hires" fill="#65bd8f" radius={[7, 7, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </ChartCard>
    </div>

    {data.insights.length > 0 && <section className="reports-card reports-insights"><div className="reports-card-head"><h2>Key Insights</h2></div><div className="reports-insight-grid">{data.insights.map((insight) => <article key={insight.title}><span><TrendingUp size={18} /></span><div><strong>{insight.title}</strong><p>{insight.description}</p></div></article>)}</div></section>}
  </>
}

function FilterField({ icon: Icon, label, children }) { return <label className="reports-filter-field">{Icon && <Icon size={15} />}<span className="sr-only">{label}</span>{children}</label> }
function ChartCard({ title, action, children, className = '', empty, emptyText }) { return <section className={`reports-card ${className}`}><div className="reports-card-head"><h2>{title}</h2>{action}</div>{empty ? <ReportsEmpty text={emptyText} /> : children}</section> }
function DonutCard({ title, total, centerLabel, data, nameKey, colors, emptyText }) { return <section className="reports-card"><div className="reports-card-head"><h2>{title}</h2></div>{data.length ? <div className="reports-donut-layout"><div className="reports-donut-chart"><ResponsiveContainer width="100%" height="100%"><PieChart margin={{ top: 6, right: 6, bottom: 6, left: 6 }}><Pie data={data} dataKey="count" innerRadius="58%" outerRadius="82%" cx="50%" cy="50%" paddingAngle={1}>{data.map((entry, index) => <Cell key={entry[nameKey]} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="reports-donut-center"><strong>{total}</strong><span>{centerLabel}</span></div></div><ul className="reports-legend">{data.map((item, index) => <li key={item[nameKey]}><i style={{ background: colors[index % colors.length] }} /><span>{item[nameKey]}</span><strong>{item.count} <em>({item.percentage}%)</em></strong></li>)}</ul></div> : <ReportsEmpty text={emptyText} />}</section> }
function ReportsEmpty({ text }) { return <div className="reports-empty"><FileText size={20} /><p>{text}</p></div> }
function ReportsState({ title, description }) { return <div className="careers-state"><span><FileText size={22} /></span><h2>{title}</h2><p>{description}</p></div> }
function ReportsLoading() { return <div className="reports-loading"><Skeleton height={210} /><Skeleton height={260} /><Skeleton height={260} /></div> }
function formatLabel(value) { return String(value).split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') }
function exportReport(data, activeFilters) {
  const pdfBytes = buildRecruitmentReportPdf(data, activeFilters)
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'recruitify-recruitment-report.pdf'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
function getActiveFilterLabels(filters, data) {
  const selectedJob = data?.filters?.jobs?.find((job) => String(job.value) === String(filters.job_id))
  return { ...filters, job_label: selectedJob?.label || '' }
}
