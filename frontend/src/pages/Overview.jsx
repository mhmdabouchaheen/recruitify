import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Attention,
  Pipeline,
  RecentApplications,
  SummaryStrip,
  UpcomingInterviews,
} from '../components/dashboard/DashboardPanels'
import { Button } from '../components/ui'

export function Overview() {
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
        <Button icon={Plus} render={<Link to="/jobs/new" />}>
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
    </>
  )
}
