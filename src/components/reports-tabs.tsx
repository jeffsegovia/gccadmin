import { SegmentLinks } from '@/components/ui/segment-links'

/** Phones: Reports holds cell groups and soul winning, as two segments.
 * On wide screens each has its own place in the menu. */
export function ReportsTabs({ on }: { on: 'cell' | 'soul' }) {
  return (
    <SegmentLinks
      label="Reports"
      className="md:hidden"
      items={[
        { to: '/reports', label: 'Cell groups', on: on === 'cell' },
        { to: '/soul-winning', label: 'Soul winning', on: on === 'soul' },
      ]}
    />
  )
}

/** Attendance's two pages: the services, and the guests who came. */
export function AttendanceTabs({ on }: { on: 'services' | 'guests' }) {
  return (
    <SegmentLinks
      label="Attendance"
      className="md:max-w-sm"
      items={[
        { to: '/attendance', label: 'Services', on: on === 'services' },
        { to: '/attendance/guests', label: 'Guests', on: on === 'guests' },
      ]}
    />
  )
}
