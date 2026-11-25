import { createFileRoute } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { SiteIcon } from '@/components/site-icon'
import { GCC_LINKS, MORE_LINKS } from '@/config/links'

const LINKS = [...GCC_LINKS, ...MORE_LINKS]

export const Route = createFileRoute('/resources/others')({
  head: () => ({ meta: [{ title: 'More from GCC · GCC Resources' }] }),
  component: () => (
    <ul className="flex flex-col border bg-card dark:border-transparent [&>*+*]:border-t rounded-xl overflow-hidden">
      {LINKS.map((l) => (
        <li key={l.href}>
          <a
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-14 min-w-0 items-center gap-3 px-4 py-2.5 hover:bg-muted/50"
          >
            <SiteIcon href={l.href} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium">{l.label}</span>
              <span className="truncate text-xs text-muted-foreground">
                {l.note}
              </span>
            </span>
            <ExternalLink
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
          </a>
        </li>
      ))}
    </ul>
  ),
})
