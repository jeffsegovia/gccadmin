import * as XLSX from 'xlsx'
import type { DiscipleInput } from './schema'
import {
  CELL_STATUS,
  CHURCH_STATUS,
  GENDER,
  MEMBER_TYPE,
  PROCESS_LEVEL,
  PROCESS_STATUS,
} from '@/lib/labels'
import { dateToDay } from '@/lib/dates'

/* The import template (public/disciple-template.xlsx, from v2) and the
   export share columns. Cells may hold either the stored value (MALE,
   YOUNGPRO) or its words (Male, Young pro); both are read. */

function reverse<T extends string>(labels: Record<T, string>) {
  const map = new Map<string, T>()
  for (const [value, label] of Object.entries(labels) as Array<[T, string]>) {
    map.set(value.toLowerCase(), value)
    map.set(label.toLowerCase(), value)
  }
  return (cell: unknown, fallback: T): T =>
    map.get(
      String(cell ?? '')
        .trim()
        .toLowerCase(),
    ) ?? fallback
}

const readGender = reverse(GENDER)
const readType = reverse(MEMBER_TYPE)
const readChurch = reverse(CHURCH_STATUS)
const readCell = reverse(CELL_STATUS)
const readLevel = reverse(PROCESS_LEVEL)
const readLevelStatus = reverse(PROCESS_STATUS)

function cellDay(cell: unknown): string {
  if (cell instanceof Date) return dateToDay(cell)
  if (typeof cell === 'number') {
    const parsed = XLSX.SSF.parse_date_code(cell)
    if (parsed)
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`
  }
  const text = String(cell ?? '').trim()
  const d = new Date(text)
  return Number.isNaN(d.getTime())
    ? text
    : dateToDay(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())))
}

const pick = (row: Record<string, unknown>, ...keys: Array<string>) => {
  for (const key of Object.keys(row)) {
    const k = key.toLowerCase().replace(/[^a-z]/g, '')
    if (keys.includes(k)) return row[key]
  }
  return undefined
}

export async function readDisciplesFile(
  file: File,
): Promise<Array<DiscipleInput>> {
  const book = XLSX.read(await file.arrayBuffer(), { cellDates: true })
  const sheet = book.Sheets[book.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  })
  return rows
    .filter((r) => String(pick(r, 'name') ?? '').trim())
    .map((r) => ({
      name: String(pick(r, 'name')).trim(),
      address: String(pick(r, 'address') ?? '').trim(),
      birthdate: cellDay(pick(r, 'birthdate', 'birthday', 'dateofbirth')),
      gender: readGender(pick(r, 'gender', 'sex'), 'MALE'),
      contactNo: String(
        pick(r, 'contactno', 'contact', 'phone', 'mobile') ?? '',
      ).trim(),
      memberType: readType(
        pick(r, 'membertype', 'group', 'type'),
        'UNCATEGORIZED',
      ),
      churchStatus: readChurch(pick(r, 'churchstatus'), 'NACS'),
      cellStatus: readCell(pick(r, 'cellstatus'), 'FIRST_TIMER'),
      processLevel: readLevel(pick(r, 'processlevel', 'growthstep'), 'NONE'),
      processLevelStatus: readLevelStatus(
        pick(r, 'processlevelstatus', 'processstatus', 'stepstatus'),
        'NOT_STARTED',
      ),
      isMyPrimary: false,
    }))
}

export function writeDisciplesFile(
  rows: ReadonlyArray<{
    name: string
    gender: keyof typeof GENDER
    birthdate: Date | string
    address: string
    contactNo: string | null
    memberType: keyof typeof MEMBER_TYPE
    churchStatus: keyof typeof CHURCH_STATUS
    cellStatus: keyof typeof CELL_STATUS
    processLevel: keyof typeof PROCESS_LEVEL
    processLevelStatus: keyof typeof PROCESS_STATUS
    leaderName: string | null
    handledByName: string | null
    isPrimary: boolean
  }>,
  fileName: string,
) {
  const sheet = XLSX.utils.json_to_sheet(
    rows.map((r) => ({
      Name: r.name,
      Gender: GENDER[r.gender],
      Birthdate: dateToDay(r.birthdate),
      Address: r.address,
      'Contact No': r.contactNo ?? '',
      Group: MEMBER_TYPE[r.memberType],
      'Church Status': CHURCH_STATUS[r.churchStatus],
      'Cell Status': CELL_STATUS[r.cellStatus],
      'Process Level': PROCESS_LEVEL[r.processLevel],
      'Process Status': PROCESS_STATUS[r.processLevelStatus],
      Leader: r.leaderName ?? '',
      'Handled By': r.handledByName ?? '',
      'Primary Leader': r.isPrimary ? 'Yes' : '',
    })),
  )
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Disciples')
  XLSX.writeFile(book, fileName)
}
