# v2 parity

v3 keeps v2's experience (CLAUDE.md: no v2 feature is removed). This list is
every place v3 departed from v2, found by walking v2's screens and features
(`app/(u)`, `features/*`, `components/*`) against v3. Each is either brought
back or kept on purpose, with the reason.

## Brought back

- [x] Cell report form: GCC Lesson / Custom Lesson, Series then Lesson
      (newest first), lesson's scripture shown, custom lesson needs
      scripture, "I have an assistant leader" (primary leaders and primary
      disciples, never the network leader; ticked as attended), Worship and
      Work as tags with v2's questions, Select all / Deselect all, Create
      another report, venue placeholder.
- [x] Cell type choices: Open Cell and Discipleship, as v2's form.
- [x] GCC Resources: lessons A to Z, preachings Z to A, search with
      "Found N", added date, copy link, download, Back to its tab.
- [x] GCC Links in More (Facebook, YouTube, Spotify).
- [x] New believers: lesson tracking table, edit, delete, promote only
      after every lesson, filters (leader, won by, member type, lesson
      view), Track from a session.
- [x] Dashboard numbers: soul winning year to date, cell groups with an
      assistant, disciples leading cell groups.
- [x] Words as v2 used them: Member Type (not Group), Process Level (not
      Growth step), Cell Status, Church Status, Handled By, Lessons Taken,
      Cell Groups, Handled Disciples.
- [x] Disciple page sections in v2's order: Details, Lessons Taken, Cell
      Groups, Handled Disciples.
- [x] Disciples filters: Handled By (v2's filter).
- [x] Date ranges: Year To Date (YTD) and Last Year on cell reports and
      soul winning.
- [x] The banner on every page: "Gawa tayo lagi ng Cell Reports 🙏."
- [x] New believer edit: Who handles this new believer?
- [x] Users: Email verified column.
- [ ] Attendance sheet views as v2: Leaders, Male, Female, Returnees, New
      Comers, and the statistics card (by gender, by member type, usual
      attendees + new and returnees).
- [ ] Insights: v2's Cell Groups card with its date range (by type, with
      assistant or by primary, change from the period before), Cell
      Groups by Leaders (male and female leaders, Show breakdown), Church
      Attendance By Member Type, Recent Cell Groups.
- [ ] Lists that v2 paged and v3 capped (soul-winning sessions at 200,
      new believers at 300): paged like v2, nothing hidden.

## Kept on purpose

- Cell report form in three steps (Details, Lesson, Attendees): asked
  for, so the form is short on a phone. Every v2 field is in it.
- Attendance saves each tap and works offline: asked for, and v2's
  whole-list save could drop people (see README, Attendance).
- Emails on an action or a button, never scheduled: asked for (as in
  Reviu). v2's reminder is the Remind button.
- Insights as its own page, and Home: asked for. v2's dashboard widgets
  live there.
- Disciple portal, quick add, birthdays: added, nothing of v2 removed.
- Unused in v2 (built but never shown): the announcement dialog, the "No
  Cell Reports" alert dialogs. Not brought back.
