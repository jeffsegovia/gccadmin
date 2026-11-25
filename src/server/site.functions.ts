import { createServerFn } from '@tanstack/react-start'

export const getAdminEmail = createServerFn({ method: 'GET' }).handler(
  async () => process.env.ADMIN_EMAIL ?? null,
)
