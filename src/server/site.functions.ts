import { createServerFn } from '@tanstack/react-start'

export const getAdminEmail = createServerFn({ method: 'GET' }).handler(
  async () => process.env.ADMIN_EMAIL ?? null,
)

/** The public address, for absolute links such as the share image. */
export const getSiteUrl = createServerFn({ method: 'GET' }).handler(async () =>
  (process.env.SITE_URL ?? '').replace(/\/$/, ''),
)
