import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Shield } from 'lucide-react'
import { z } from 'zod'
import { Empty, Page } from '@/components/shell/page'
import { ListSearch } from '@/components/list-search'
import { Pill } from '@/components/status-pill'
import { RemindButton } from '@/components/remind-button'
import { Group, RowChevron } from '@/components/ui/list'
import { getLeaders } from '@/server/admin/admin.functions'

export const Route = createFileRoute('/_app/leaders')({
  validateSearch: z.object({ q: z.string().optional() }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getLeaders({ data: deps }),
  head: () => ({ meta: [{ title: 'Leaders · GCC Admin' }] }),
  component: LeadersPage,
})

function LeadersPage() {
  const leaders = Route.useLoaderData()
  const { q } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const withAccount = leaders.filter((l) => l.userAccountId).map((l) => l.id)

  return (
    <Page
      title="Leaders"
      description={`Primary leaders · ${leaders.length} in all · ${withAccount.length} can sign in`}
      action={
        withAccount.length > 0 ? (
          <RemindButton leaderIds={withAccount} />
        ) : undefined
      }
    >
      <ListSearch
        value={q}
        placeholder="Search leaders"
        onChange={(next) =>
          void navigate({ search: { q: next }, replace: true })
        }
      />
      {leaders.length === 0 ? (
        <Empty icon={Shield} title="No primary leaders found." />
      ) : (
        <Group>
          {leaders.map((l) => (
            <Link
              key={l.id}
              to="/disciples/$discipleId"
              params={{ discipleId: l.id }}
              className="flex min-h-15 min-w-0 items-center gap-3 px-3.5 py-2 hover:bg-muted/50"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-medium">
                  {l.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {l.disciples ?? 0} disciples · {l.email ?? 'no sign-in yet'}
                </span>
              </span>
              {!l.isActive ? (
                <Pill tone="short">Inactive</Pill>
              ) : l.reportedThisWeek ? (
                <Pill tone="covered">Reported</Pill>
              ) : (
                <Pill tone="caution">Not yet</Pill>
              )}
              <RowChevron />
            </Link>
          ))}
        </Group>
      )}
    </Page>
  )
}
