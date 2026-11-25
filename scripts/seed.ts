import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as s from '../src/db/schema'

/* Local only: a small church to click around in (`pnpm seed`). Refuses to
   run against a database that already has disciples. */
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle({ client: pool })

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const at = (iso: string) => new Date(`${iso}:00.000+08:00`)
const pick = <T>(list: ReadonlyArray<T>, i: number) => list[i % list.length]

async function main() {
  const existing = await db
    .select({ id: s.disciples.id })
    .from(s.disciples)
    .limit(1)
  if (existing.length)
    throw new Error(
      'This database already has disciples; seed only an empty one.',
    )

  const mk = async (
    v: Partial<typeof s.disciples.$inferInsert> & {
      name: string
      gender: 'MALE' | 'FEMALE'
    },
  ) => {
    const [row] = await db
      .insert(s.disciples)
      .values({ address: 'Morong, Rizal', birthdate: day('1995-03-14'), ...v })
      .returning({ id: s.disciples.id })
    return row.id
  }
  const pastor = await mk({
    name: 'Ptr. John De Guzman',
    gender: 'MALE',
    isPrimary: true,
    memberType: 'MEN',
    churchStatus: 'REGULAR',
    cellStatus: 'REGULAR',
    processLevel: 'LEADERSHIP_3',
    processLevelStatus: 'FINISHED',
    contactNo: '0917 555 0100',
  })
  const mark = await mk({
    name: 'Ptr. Mark Aquino',
    gender: 'MALE',
    isPrimary: true,
    leaderId: pastor,
    memberType: 'MEN',
    churchStatus: 'REGULAR',
    cellStatus: 'REGULAR',
    processLevel: 'LEADERSHIP_3',
    processLevelStatus: 'FINISHED',
    contactNo: '0917 555 0101',
  })
  const joy = await mk({
    name: 'Ptra. Joy Aquino',
    gender: 'FEMALE',
    isPrimary: true,
    leaderId: pastor,
    memberType: 'WOMEN',
    churchStatus: 'REGULAR',
    cellStatus: 'REGULAR',
    processLevel: 'LEADERSHIP_3',
    processLevelStatus: 'FINISHED',
  })
  const ramon = await mk({
    name: 'Ramon Dela Cruz',
    gender: 'MALE',
    isPrimary: true,
    leaderId: pastor,
    memberType: 'MEN',
    churchStatus: 'REGULAR',
    cellStatus: 'REGULAR',
    processLevel: 'LEADERSHIP_2',
    processLevelStatus: 'ON_GOING',
  })
  const joshua = await mk({
    name: 'Joshua Reyes',
    gender: 'MALE',
    leaderId: mark,
    isMyPrimary: true,
    memberType: 'YOUTH',
    churchStatus: 'REGULAR',
    cellStatus: 'REGULAR',
    processLevel: 'LEADERSHIP_2',
    processLevelStatus: 'ON_GOING',
    contactNo: '0918 222 3344',
  })

  const men = [
    'Carlo Bautista',
    'Enzo Garcia',
    'Miguel Santos',
    'Paolo Tan',
    'Nico Villareal',
    'Jerome Mendoza Castillo-Villanueva',
    'Daniel Ocampo',
    'Arvin Lim',
  ]
  const women = [
    'Anna Mendoza',
    'Bea Castillo',
    'Kristine Ramos',
    'Lea Navarro',
    'Sofia Lim',
    'Trisha Manalo',
    'Ella Cruz',
    'Jasmine Go',
    'Rina Pascual',
  ]
  const leaders = [mark, joy, ramon]
  const types = ['YOUTH', 'YOUNGPRO', 'MEN', 'WOMEN', 'KIDS'] as const
  const levels = ['NONE', 'PREENC', 'ENCOUNTER', 'LEADERSHIP_1'] as const
  const church = ['REGULAR', 'REGULAR', 'ACS', 'NACS'] as const
  const ids: Array<string> = [joshua]
  for (const [i, name] of men.entries()) {
    const leaderId = i < 4 ? mark : pick(leaders, i)
    ids.push(
      await mk({
        name,
        gender: 'MALE',
        leaderId,
        handledById: i < 3 ? joshua : null,
        memberType: pick(types, i),
        churchStatus: pick(church, i),
        cellStatus: i === 6 ? 'SECOND_TIMER' : 'REGULAR',
        processLevel: pick(levels, i),
        processLevelStatus: 'ON_GOING',
      }),
    )
  }
  for (const [i, name] of women.entries()) {
    ids.push(
      await mk({
        name,
        gender: 'FEMALE',
        leaderId: i < 4 ? joy : pick(leaders, i + 1),
        memberType: pick(types, i + 1),
        churchStatus: pick(church, i + 1),
        cellStatus: 'REGULAR',
        processLevel: pick(levels, i + 2),
        processLevelStatus: i % 3 ? 'ON_GOING' : 'FINISHED',
      }),
    )
  }

  const [series] = await db
    .insert(s.lessonSeries)
    .values({ title: 'Foundations of Faith', tags: ['Discipleship'] })
    .returning()
  const lessonIds: Array<string> = []
  for (const title of [
    'Grace that Saves',
    'Identity in Christ',
    'Walking in Faith',
    'The Power of Prayer',
    'The Word of God',
    'Fellowship',
  ]) {
    const [l] = await db
      .insert(s.lessons)
      .values({
        lessonSeriesId: series.id,
        title,
        scriptureReferences: ['Ephesians 2:8-9'],
      })
      .returning()
    lessonIds.push(l.id)
  }

  // The series new believers are tracked against (v2: by series title).
  const swLessons: Record<string, Array<string>> = {}
  for (const [title, names] of [
    ['Soul-Winning', ['The Gospel', 'Assurance of Salvation']],
    ['Consolidation', ['New Life', 'Prayer', 'The Church']],
  ] as const) {
    const [sr] = await db
      .insert(s.lessonSeries)
      .values({ title, tags: ['Soul winning'] })
      .returning()
    swLessons[title] = []
    for (const name of names) {
      const [l] = await db
        .insert(s.lessons)
        .values({ lessonSeriesId: sr.id, title: name })
        .returning()
      swLessons[title].push(l.id)
    }
  }

  // Cell reports over the last month.
  const today = new Date()
  for (let w = 0; w < 5; w++) {
    for (const [i, leader] of leaders.entries()) {
      if (w === 0 && i === 2) continue // Ramon hasn't reported this week
      const d = new Date(today.getTime() - (w * 7 + i + 1) * 86_400_000)
      const iso = d.toISOString().slice(0, 10)
      const [r] = await db
        .insert(s.cellReports)
        .values({
          type: i === 0 ? 'DISCIPLESHIP' : 'OPEN',
          venue: `${['Reyes', 'Aquino', 'Dela Cruz'][i]} residence`,
          date: at(`${iso}T19:30`),
          lessonId: lessonIds[w % lessonIds.length],
          leaderId: leader,
          worship: ['Way Maker', 'Goodness of God'],
        })
        .returning()
      const members = ids.filter((_, k) => k % 3 === i).slice(0, 6)
      await db
        .insert(s.attendedCellGroups)
        .values(members.map((m) => ({ cellReportId: r.id, discipleId: m })))
    }
  }

  // Sunday services: the last eight, plus this coming Sunday (open).
  const sunday = new Date(today)
  sunday.setUTCDate(sunday.getUTCDate() + ((7 - sunday.getUTCDay()) % 7))
  const guests = [
    'Mae Soriano',
    'Jerome Uy',
    'Kaye Lopez',
    'Arnel Diaz',
    'Rica Fernandez',
  ]
  const guestIds: Array<string> = []
  for (const [i, name] of guests.entries()) {
    const [g] = await db
      .insert(s.newComers)
      .values({
        name,
        gender: i % 2 ? 'MALE' : 'FEMALE',
        memberType: 'YOUNGPRO',
        invitedById: pick(ids, i),
      })
      .returning()
    guestIds.push(g.id)
  }
  for (let w = 8; w >= 0; w--) {
    const d = new Date(sunday.getTime() - w * 7 * 86_400_000)
      .toISOString()
      .slice(0, 10)
    const [a] = await db
      .insert(s.attendances)
      .values({ title: 'Sunday Service', date: day(d), isLocked: w > 0 })
      .returning()
    if (w === 0) continue
    const present = ids.filter((_, k) => (k + w) % 4 !== 0)
    await db
      .insert(s.attendanceDisciples)
      .values(present.map((p) => ({ attendanceId: a.id, discipleId: p })))
    const here = guestIds.filter((_, k) => k <= 8 - w && (k + w) % 2 === 0)
    if (here.length)
      await db
        .insert(s.attendanceNewComers)
        .values(here.map((g) => ({ attendanceId: a.id, newComerId: g })))
  }

  // A soul-winning session this month.
  const [sw] = await db
    .insert(s.soulWinningReports)
    .values({
      venue: 'Plaza Rizal',
      date: at(`${today.toISOString().slice(0, 10)}T16:00`),
      lessonId: swLessons['Soul-Winning'][0],
      networkLeaderId: mark,
      assistantLeaderId: joshua,
    })
    .returning()
  const won: Array<string> = []
  for (const name of ['Liam Torres', 'Grace Villanueva']) {
    const [b] = await db
      .insert(s.newBelievers)
      .values({
        name,
        gender: name.startsWith('Liam') ? 'MALE' : 'FEMALE',
        networkLeaderId: mark,
        handledById: joshua,
      })
      .returning()
    await db
      .insert(s.soulWinningNewBelievers)
      .values({ newBelieverId: b.id, reportId: sw.id })
    won.push(b.id)
  }
  // Follow-ups: Liam has taken a few more lessons than Grace.
  for (const [i, lessonId] of [
    swLessons['Soul-Winning'][1],
    swLessons.Consolidation[0],
  ].entries()) {
    const [r] = await db
      .insert(s.soulWinningReports)
      .values({
        venue: 'Torres residence',
        date: at(`${today.toISOString().slice(0, 10)}T1${8 + i}:00`),
        lessonId,
        type: 'CONSOLIDATION',
        networkLeaderId: mark,
        assistantLeaderId: joshua,
      })
      .returning()
    await db.insert(s.soulWinningNewBelievers).values(
      (i === 0 ? won : won.slice(0, 1)).map((id) => ({
        newBelieverId: id,
        reportId: r.id,
      })),
    )
  }

  // Joshua's portal link, for trying /me/<token>.
  await db
    .insert(s.disciplePortalLinks)
    .values({ discipleId: joshua, token: 'preview-portal-joshua-reyes' })
  console.log('Seeded. Portal: /me/preview-portal-joshua-reyes')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
