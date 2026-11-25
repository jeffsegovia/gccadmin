/** Local preview without a Clerk instance: in `pnpm dev` with no Clerk
 * keys, everyone is a stand-in admin (DEV_DISCIPLE_ID picks whose network,
 * default the first primary leader). Never in a production build. */
export const DEV_AUTH =
  import.meta.env.DEV && !import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
