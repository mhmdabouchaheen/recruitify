const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const MARGIN = 46
const LINE_HEIGHT = 15
const BODY_SIZE = 10
const TITLE_SIZE = 20
const SECTION_SIZE = 13

export function buildRecruitmentReportPdf(data, filters = {}) {
  const pages = []
  let page = []
  let y = PAGE_HEIGHT - MARGIN

  const newPage = () => {
    if (page.length) pages.push(page)
    page = []
    y = PAGE_HEIGHT - MARGIN
  }

  const addText = (text, options = {}) => {
    const { size = BODY_SIZE, color = '0.12 0.18 0.15', bold = false, gap = 0, x = MARGIN } = options
    const maxChars = options.maxChars || Math.max(36, Math.floor((PAGE_WIDTH - x - MARGIN) / (size * 0.48)))
    const lines = wrapText(text, maxChars)
    for (const line of lines) {
      if (y < MARGIN + LINE_HEIGHT) newPage()
      page.push({ type: 'text', text: line, x, y, size, color, bold })
      y -= LINE_HEIGHT + gap
    }
  }

  const addRule = () => {
    if (y < MARGIN + 18) newPage()
    page.push({ type: 'rule', x1: MARGIN, x2: PAGE_WIDTH - MARGIN, y: y - 4 })
    y -= 18
  }

  const addSection = (title) => {
    y -= 4
    if (y < MARGIN + 42) newPage()
    addText(title, { size: SECTION_SIZE, color: '0.04 0.36 0.26', bold: true })
    addRule()
  }

  const addList = (items, formatter) => {
    if (!items?.length) {
      addText('No data available for the current filters.', { color: '0.42 0.48 0.45' })
      return
    }
    items.forEach((item) => addText(`- ${formatter(item)}`))
  }

  addText('RECRUITIFY', { size: 15, color: '0.02 0.36 0.25', bold: true })
  addText('Recruitment Reports & Analytics', { size: TITLE_SIZE, color: '0.05 0.08 0.13', bold: true, gap: 2 })
  addText(`Generated ${formatDateTime(new Date())}`, { color: '0.40 0.46 0.43' })
  addRule()

  addSection('Active Filters')
  addText(`Date range: ${filters.start_date || 'Any start'} to ${filters.end_date || 'Any end'}`)
  addText(`Job: ${filters.job_label || filters.job_id || 'All jobs'}`)
  addText(`Department: ${filters.department || 'All departments'}`)
  addText(`Status: ${filters.status ? formatLabel(filters.status) : 'All statuses'}`)

  addSection('Recruitment Funnel')
  addList(data.funnel?.stages || [], (stage) => `${stage.label}: ${stage.count}`)
  addText(`Overall conversion: ${data.funnel?.overall_conversion ?? 0}%`)
  addText(`Hired count: ${data.funnel?.hired_count ?? 0}`)

  addSection('Applications by Status')
  addList(data.applications_by_status || [], (item) => `${item.label}: ${item.count} (${item.percentage}%)`)

  addSection('Job Performance')
  addList(data.job_performance || [], (job) => `${job.title}: ${job.applicants} applicants, ${job.shortlisted} shortlisted, ${job.interviewed} interviewed, ${job.hired} hired, Avg. AI Match ${job.avg_ai_match == null ? 'N/A' : `${job.avg_ai_match}%`}`)

  addSection('Applications by Department')
  addList(data.applications_by_department || [], (item) => `${item.department}: ${item.count}`)

  addSection('AI Match Analysis')
  addText(`Average match score: ${data.ai_match?.average == null ? 'N/A' : `${data.ai_match.average}%`}`)
  addText(`Scored applications: ${data.ai_match?.total_scored ?? 0}`)
  addList(data.ai_match?.buckets || [], (item) => `${item.label}: ${item.count}`)

  addSection('Interview Outcomes')
  addText(`Total evaluations: ${data.interview_outcomes?.total ?? 0}`)
  addList(data.interview_outcomes?.items || [], (item) => `${item.label}: ${item.count} (${item.percentage}%)`)

  addSection('Contract Outcomes')
  addList(data.contract_outcomes || [], (item) => `${item.label}: ${item.count} (${item.percentage}%)`)

  addSection('Trend Data')
  addText('Applications over time')
  addList(data.applications_over_time || [], (item) => `${item.period}: ${item.applications} applications, ${item.hires} hires`)
  addText('Hires over time')
  addList(data.hires_over_time || [], (item) => `${item.period}: ${item.hires} hires`)

  addSection('Key Insights')
  addList(data.insights || [], (item) => `${item.title}: ${item.description}`)

  pages.push(page)
  return createPdf(pages)
}

function createPdf(pages) {
  const encoder = new TextEncoder()
  const objects = []
  const pageRefs = []
  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push('')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')

  pages.forEach((items) => {
    const content = renderPage(items)
    const contentRef = objects.length + 1
    objects.push(`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`)
    const pageRef = objects.length + 1
    pageRefs.push(`${pageRef} 0 R`)
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentRef} 0 R >>`)
  })

  objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pages.length} >>`

  let pdf = '%PDF-1.4\n%Recruitify\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(encoder.encode(pdf).length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefOffset = encoder.encode(pdf).length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n` })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return encoder.encode(pdf)
}

function renderPage(items) {
  const commands = [
    'q',
    '0.97 0.99 0.98 rg',
    `0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT} re f`,
    'Q',
  ]
  items.forEach((item) => {
    if (item.type === 'rule') {
      commands.push('q', '0.82 0.88 0.84 RG', '0.8 w', `${item.x1} ${item.y} m ${item.x2} ${item.y} l S`, 'Q')
      return
    }
    commands.push('BT')
    commands.push(`${item.color} rg`)
    commands.push(`/${item.bold ? 'F2' : 'F1'} ${item.size} Tf`)
    commands.push(`1 0 0 1 ${item.x} ${item.y} Tm`)
    commands.push(`(${escapePdf(item.text)}) Tj`)
    commands.push('ET')
  })
  commands.push('BT', '0.42 0.48 0.45 rg', '/F1 8 Tf', `1 0 0 1 ${MARGIN} 24 Tm`, '(Generated through Recruitify) Tj', 'ET')
  return commands.join('\n')
}

function wrapText(value, maxChars) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim() || '-'
  const words = text.split(' ')
  const lines = []
  let current = ''
  words.forEach((word) => {
    if (!current) current = word
    else if (`${current} ${word}`.length <= maxChars) current += ` ${word}`
    else { lines.push(current); current = word }
  })
  if (current) lines.push(current)
  return lines
}

function escapePdf(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function formatLabel(value) {
  return String(value).split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}
