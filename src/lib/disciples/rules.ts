import type { Gender, MemberType } from '@/db/schema'

/** Men are male and Women are female; Kids, Youth and Young pro are
 * either. The form sets one from the other, and the server checks it. */
export const GROUP_GENDER: Partial<Record<MemberType, Gender>> = {
  MEN: 'MALE',
  WOMEN: 'FEMALE',
}

/** The gender a group fixes, or what was chosen where it fixes none. */
export function genderFor(memberType: MemberType, gender: Gender): Gender {
  return GROUP_GENDER[memberType] ?? gender
}

/** What's wrong with a group and gender together, in words for the
 * person filling the form in (undefined when they're fine). Everyone
 * belongs to a group: "No group" is only what v2 left behind. */
export function groupIssue(
  memberType: MemberType,
  gender: Gender,
): { field: 'memberType' | 'gender'; message: string } | undefined {
  if (memberType === 'UNCATEGORIZED')
    return { field: 'memberType', message: 'Choose a group' }
  const fixed = GROUP_GENDER[memberType]
  if (fixed && fixed !== gender)
    return {
      field: 'gender',
      message: fixed === 'MALE' ? 'Men are male' : 'Women are female',
    }
  return undefined
}

/** For `superRefine` on anything with a gender and a member type. */
export function groupRules(
  v: { gender: Gender; memberType: MemberType },
  ctx: {
    addIssue: (issue: {
      code: 'custom'
      path: Array<string>
      message: string
    }) => void
  },
) {
  const issue = groupIssue(v.memberType, v.gender)
  if (issue)
    ctx.addIssue({
      code: 'custom',
      path: [issue.field],
      message: issue.message,
    })
}
