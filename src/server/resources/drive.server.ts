import { auth, drive } from '@googleapis/drive'

/* GCC Resources read the church's Google Drive with a service account, as
   v2 did: the "gcc_app" folder holds the cell group lessons (one folder a
   series, PDFs inside) and "Preaching" the sermons. */

let client: ReturnType<typeof drive> | null = null

function gdrive() {
  if (client) return client
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    '\n',
  )
  if (!email || !key) throw new Error('GCC Resources aren’t set up yet.')
  const credentials = new auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    credentials: {
      client_email: email,
      private_key: key,
      client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
    },
  })
  client = drive({ version: 'v3', auth: credentials })
  return client
}

const FOLDER = 'application/vnd.google-apps.folder'

export type DriveFolder = {
  id: string
  name: string
  description: string | null
}
export type DriveFile = {
  id: string
  name: string
  size: number | null
  webViewLink: string | null
  createdTime: string | null
}

async function rootId(name: string): Promise<string | null> {
  const found = await gdrive().files.list({
    q: `name = '${name}' and mimeType = '${FOLDER}' and trashed = false`,
    fields: 'files(id)',
    spaces: 'drive',
  })
  return found.data.files?.[0]?.id ?? null
}

export async function foldersIn(
  rootName: string,
  order: string,
): Promise<Array<DriveFolder>> {
  const root = await rootId(rootName)
  if (!root) return []
  const res = await gdrive().files.list({
    q: `mimeType = '${FOLDER}' and '${root}' in parents and trashed = false`,
    fields: 'files(id, name, description)',
    orderBy: order,
    pageSize: 200,
    spaces: 'drive',
  })
  return (res.data.files ?? []).map((f) => ({
    id: f.id!,
    name: f.name ?? 'Untitled',
    description: f.description ?? null,
  }))
}

/** A folder's PDFs, by name: A to Z for lessons, Z to A for preachings
 * (the newest series first), as in v2. */
export async function folderFiles(
  folderId: string,
  order: 'asc' | 'desc' = 'asc',
) {
  const g = gdrive()
  const folder = await g.files.get({
    fileId: folderId,
    fields: 'id, name, description, mimeType',
  })
  if (folder.data.mimeType !== FOLDER)
    throw new Error('That folder isn’t here.')
  const files = await g.files.list({
    q: `mimeType = 'application/pdf' and '${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, size, webViewLink, webContentLink, createdTime)',
    orderBy: order === 'desc' ? 'name desc' : 'name',
    pageSize: 300,
    spaces: 'drive',
  })
  return {
    folder: {
      id: folder.data.id!,
      name: folder.data.name ?? 'Folder',
      description: folder.data.description ?? null,
    },
    files: (files.data.files ?? []).map((f) => ({
      id: f.id!,
      name: (f.name ?? 'File').replace(/\.pdf$/i, ''),
      size: f.size ? Number(f.size) : null,
      webViewLink: f.webViewLink ?? null,
      webContentLink: f.webContentLink ?? null,
      createdTime: f.createdTime ?? null,
    })),
  }
}
