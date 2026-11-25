import { createFileRoute } from '@tanstack/react-router'
import { automaticEmailsOn } from '@/server/email/send.server'
import { JOBS } from '@/server/email/reminders.server'
import type { JobName } from '@/server/email/reminders.server'

/** Vercel Cron calls these (vercel.json) with `Authorization: Bearer
 * $CRON_SECRET`. A job sends nothing until EMAIL_REMINDERS=on. */
export const Route = createFileRoute('/api/cron/$job')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const secret = process.env.CRON_SECRET
        if (
          !secret ||
          request.headers.get('authorization') !== `Bearer ${secret}`
        )
          return new Response('Unauthorized', { status: 401 })
        const job = JOBS[params.job as JobName] as
          (() => Promise<number>) | undefined
        if (!job) return new Response('No such job', { status: 404 })
        if (!automaticEmailsOn())
          return Response.json({ job: params.job, sent: 0, off: true })
        const sent = await job()
        return Response.json({ job: params.job, sent })
      },
    },
  },
})
