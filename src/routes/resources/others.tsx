import { createFileRoute } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'

const LINKS = [
  {
    label: 'Spotify',
    note: 'Sermons and podcasts',
    href: 'https://open.spotify.com/show/48ijgGXWkrQI9CYqnXzgHB',
  },
  {
    label: 'YouTube',
    note: 'Services and messages',
    href: 'https://www.youtube.com/@gracecitychurch2245',
  },
  {
    label: 'Facebook',
    note: 'News and live services',
    href: 'https://www.facebook.com/gccmorong',
  },
  {
    label: 'Directions',
    note: 'Grace City Church on Google Maps',
    href: 'https://www.google.com/maps/search/?api=1&query=Grace+City+Church+Morong',
  },
  {
    label: 'All links',
    note: 'Linktree',
    href: 'https://linktr.ee/gracecitychurchph',
  },
]

export const Route = createFileRoute('/resources/others')({
  head: () => ({ meta: [{ title: 'More from GCC · GCC Resources' }] }),
  component: () => (
    <ul className="flex flex-col border bg-card dark:border-transparent [&>*+*]:border-t">
      {LINKS.map((l) => (
        <li key={l.href}>
          <a
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-14 min-w-0 items-center gap-3 px-4 py-2.5 hover:bg-muted/50"
          >
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
