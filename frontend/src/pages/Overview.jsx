import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  Attention,
  Pipeline,
  RecentApplications,
  SummaryStrip,
  UpcomingInterviews,
} from '../components/dashboard/DashboardPanels'
import { Button, Field, Modal } from '../components/ui'
import { Input } from '../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'

export function Overview() {
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    const close = (event) => event.key === 'Escape' && setCreateOpen(false)
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">Tuesday, 15 September</p>
          <h1 className="page-title">Good morning, Nour</h1>
          <p className="page-description">
            Here’s what is happening with Cedar Labs’ hiring pipeline.
          </p>
        </div>
        <Button icon={Plus} onClick={() => setCreateOpen(true)}>
          <span className="button-label">Create job</span>
        </Button>
      </header>

      <div className="overview-grid">
        <div className="primary-column">
          <SummaryStrip />
          <Pipeline />
          <RecentApplications />
        </div>
        <aside className="secondary-column">
          <UpcomingInterviews />
          <Attention />
        </aside>
      </div>

      <Modal
        open={createOpen}
        title="Create a new job"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled>Continue</Button>
          </>
        }
      >
        <Field
          label="Job title"
          helper="You can finish the full job details later."
        >
          <Input placeholder="e.g. Product Designer" autoFocus />
        </Field>
        <Field label="Department">
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="engineering">Engineering</SelectItem>
              <SelectItem value="people">People &amp; Culture</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="design">Design</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Workplace">
          <Select defaultValue="hybrid">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hybrid">Hybrid</SelectItem>
              <SelectItem value="onsite">On-site · Beirut</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </Modal>
    </>
  )
}
