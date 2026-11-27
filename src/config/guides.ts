/** The user guides, as PDFs to download from More (and the account menu
 * on wide screens). Rendered from scripts/guides by `pnpm guides`. */
export const GUIDES = [
  {
    title: 'GCC Admin User Guide',
    label: 'User guide',
    note: 'How to use GCC Admin · PDF',
    href: '/guides/gcc-admin-user-guide.pdf',
    source: 'admin.html',
  },
  {
    title: 'Disciple Portal Guide',
    label: 'Disciple portal guide',
    note: 'To send your disciples with their link · PDF',
    href: '/guides/gcc-disciple-portal-guide.pdf',
    source: 'portal.html',
  },
] as const
