# SDD — UET Empty Lecture Hall Finder

**Audience:** Claude Code (implementation brief).
**Product:** Static web app for VNU University of Engineering and Technology (ĐHQGHN — Trường Đại học Công nghệ) students to find empty lecture halls from the Semester II 2025–2026 timetable.
**Status:** Implementation-ready. No TBDs.

---

## 1. Problem Statement & Non-Goals

### Problem
UET students need to know which lecture halls are free at a given moment so they can study, hold club meetings, or wait between classes. The only source of truth is an xlsx timetable ("PHỤ LỤC: THỜI KHÓA BIỂU HỌC KỲ II NĂM HỌC 2025–2026") that is hard to query by hand. This tool turns that xlsx into three queries: *Is room X free now?*, *What's in room X, and when does it free up?*, *Which rooms are free right now near me?*

### In scope
- Parse the official xlsx timetable, including multi-sheet layouts and irregular `Ghi chú` notes.
- Answer the three queries above for any date+time within the configured semester.
- Mobile-first static web app, deployable to GitHub Pages.
- A single config file a maintainer edits once per term.

### Non-goals
- **No booking / reservation.** The tool only *reports* schedule data.
- **No authentication, accounts, or personalization.** Anonymous, stateless beyond local caching.
- **No exam schedules, no ad-hoc cancellations, no teacher-side views.**
- **No backend, no database, no real-time sync.** Data is the xlsx; updates ship via new xlsx or new deploy.
- **No native mobile app.** Responsive web only.
- **Vietnamese UI only.** No i18n framework.
- **No support for timetables other than UET's Semester II 2025–2026 schema.** Future terms reuse the same schema; other institutions are out of scope.

---

## 2. User Stories

### US-1 — Quick "can I go to this room right now?" check
**As** a student standing outside a building,
**I want** to type a room code and see if it's free,
**So that** I can walk in without interrupting a class.

| | |
|---|---|
| **Given** | The timetable is loaded and the date is within the configured semester. |
| **When** | I enter `308-B` with the default time (now). |
| **Then** | I see a clear Free/Occupied badge, the current class's end time if occupied, and the next class's start time. |

### US-2 — Find any empty room near me
**As** a student in building B,
**I want** a ranked list of currently-empty rooms, preferring B,
**So that** I can pick the closest one with enough time left.

| | |
|---|---|
| **Given** | Timetable loaded, date in semester, I select building B as my reference. |
| **When** | I tap "Tìm phòng trống ngay". |
| **Then** | I see a list of empty rooms with the B-building rooms first, sorted by how long they stay free, ties broken by room code. Each entry shows the room, building, and "trống đến HH:MM" (or "trống cả ngày"). |

### US-3 — Plan ahead for a future slot
**As** a student planning a group study session,
**I want** to query a date and time that aren't now,
**So that** I can reserve a slot mentally before classmates arrive.

| | |
|---|---|
| **Given** | Timetable loaded. |
| **When** | I change the date picker to next Thursday at 14:00 and submit. |
| **Then** | Results reflect that date's Thứ and week number, not today's. |

### US-4 — Maintainer updates the semester calendar
**As** the maintainer at the start of a new term,
**I want** to edit one config file,
**So that** the app correctly maps calendar dates to `Thứ` and week numbers.

| | |
|---|---|
| **Given** | I have repo write access. |
| **When** | I edit `public/semester.json` to set `semesterStartDate` and `totalWeeks` and push. |
| **Then** | GitHub Pages rebuilds; the app uses the new values on next load. No code change is required. |

---

## 3. Tech Stack

### Decision: Vue 3 + Vite + SheetJS + Tailwind, deployed to GitHub Pages.

| Concern | Choice | Rationale |
|---|---|---|
| Framework | Vue 3 (Composition API) | Small, ergonomic, first-class SPA story. Equally valid: vanilla JS. Reject React (heavier, build complexity not justified). |
| Build | Vite | Fast dev, zero-config static output. |
| xlsx parsing | SheetJS (`xlsx` package, community build) | De-facto standard, pure JS, works in browser. |
| Styling | Tailwind CSS | Fast mobile-first layout without hand-authored CSS. |
| State | Pinia (one store: `timetable`) | Trivial, avoids prop-drilling for cached parse. |
| Persistence | `localStorage` | Cache parsed `ParsedTimetable` as JSON keyed by file hash so repeat visitors skip re-parse. |
| Date/time | `date-fns` + `date-fns-tz` | No DST in Vietnam but timezone-anchored parsing avoids accidental UTC drift. |
| Hosting | GitHub Pages | Free, static, aligns with zero-backend constraint. |
| Package manager | pnpm | Preference; npm acceptable. |

### Why not a backend?
- Privacy: the xlsx never leaves the browser.
- Zero ops: no server to pay for, no auth to build.
- Data refresh cadence (once per term) doesn't justify a backend.

### Bundling
The shipped xlsx lives under `public/data/tkb-2025-2026-hk2.xlsx` and is auto-loaded on first visit. Users can also drag-drop a replacement xlsx for ad-hoc updates; the replacement is session-only unless the maintainer commits it.

### Directory layout
```
/public
  /data/tkb-2025-2026-hk2.xlsx
  semester.json
/src
  /components
  /lib
    parser.ts           # xlsx → ParsedTimetable
    ghichu.ts           # Ghi chú pattern matcher
    calendar.ts         # date ↔ (thứ, week) math
    query.ts            # isRoomFree, rankedEmptyRooms
  /stores/timetable.ts
  /views                # Home, RoomDetail, EmptyRooms
  App.vue
  main.ts
```

---

## 4. Data Model

```ts
// Normalized, parsed row from the xlsx. One per (class × room × ca) occurrence.
interface Class {
  lop: string;                 // "K69I-IT1"
  maHP: string;                // "INT2213"
  mon: string;                 // "Mạng máy tính"
  tc: number | null;
  maLHP: string;               // "INT2213 1"
  nhom: string | null;
  ltTh: "LT" | "TH" | string;
  thu: Thu;                    // 2..7 | "CN"
  ca: Ca;                      // 1..4
  gd: string;                  // original room cell, e.g. "105-B"
  roomId: string;              // normalized uppercase, e.g. "105-B"
  building: string;            // "B" (suffix after last "-")
  gv: string;                  // giảng viên
  ghiChu: string;              // raw note
  weekCoverage: WeekRange;     // resolved from ghiChu + ca
  sourceSheet: string;
  sourceRow: number;           // 1-indexed xlsx row for error messages
}

type Thu = 2 | 3 | 4 | 5 | 6 | 7 | "CN";
type Ca  = 1 | 2 | 3 | 4;

interface Room {
  id: string;                  // "105-B"
  code: string;                // "105"
  building: string;            // "B"
  usageCount: number;          // class-weeks this room is used across the term
}

interface Building {
  code: string;                // "A" | "B" | "T" | "E5" | ...
  rooms: string[];             // room ids
}

interface CaSlot {
  ca: Ca;
  buoi: "Sáng" | "Chiều";
  tiet: [number, number];      // inclusive
  startMin: number;            // minutes since midnight
  endMin: number;
}

// Which semester weeks a Class actually meets.
// `weeks` is always the canonical form after parsing.
interface WeekRange {
  weeks: number[];             // sorted, unique, 1..totalWeeks
  kind: "all" | "range" | "list" | "split" | "unparseable";
  sourceNote: string;
  warning?: string;            // present if kind === "unparseable" or ambiguity resolved
}

interface ParseWarning {
  severity: "info" | "warning" | "error";
  sheet: string;
  row: number;
  maLHP?: string;
  ghiChu?: string;
  message: string;             // Vietnamese, user-facing
}

interface ParsedTimetable {
  classes: Class[];
  rooms: Map<string, Room>;
  buildings: Map<string, Building>;
  warnings: ParseWarning[];
  parsedAt: string;            // ISO 8601
  sourceFileName: string;
  sourceFileHash: string;      // sha256 hex, for cache key
  semesterStartDate: string;   // echoed from config at parse time
  totalWeeks: number;
}

// The fixed daily structure, hard-coded (not configurable).
const CA_SLOTS: CaSlot[] = [
  { ca: 1, buoi: "Sáng",  tiet: [1, 3],  startMin: 7*60,       endMin: 9*60+40  },
  { ca: 2, buoi: "Sáng",  tiet: [4, 6],  startMin: 9*60+50,    endMin: 12*60+30 },
  { ca: 3, buoi: "Chiều", tiet: [7, 9],  startMin: 13*60+30,   endMin: 16*60+10 },
  { ca: 4, buoi: "Chiều", tiet: [10,12], startMin: 16*60+20,   endMin: 19*60    },
];
```

---

## 5. Xlsx Parsing Spec

### 5.1 Sheet discovery
Iterate **every** sheet in the workbook. For each sheet, attempt header detection. Skip sheets where detection fails. Do not hard-code `Sheet3`.

### 5.2 Header detection
Scan rows 1..15. A row is the header if its non-empty cell values (trimmed, lowercased) contain **all** of: `lớp`, `mã hp`, `thứ`, `ca`, `gđ`. Record the column index of each target header. Data rows are `headerRow+1` onward.

Required columns (all must be locatable; fail the sheet with a warning if any missing):
`Lớp`, `Mã HP`, `Môn`, `Mã LHP`, `Nhóm`, `LT/TH`, `Thứ`, `Ca`, `GĐ`, `GV`, `Ghi chú`.

Optional: `TC`, `LT`, `TH`, `Tự h`, `PCC`, `SS`, second `Ghi chú` column (concatenate with first, separated by `" | "`).

### 5.3 Row filtering (apply in order)

| # | Rule | Action |
|---|---|---|
| 1 | All cells in the row blank | Skip silently |
| 2 | `Môn` equals `"Tổng TC"` (trimmed) | Skip silently (summary row) |
| 3 | `GĐ` blank or whitespace | Skip silently |
| 4 | `GĐ` equals `"ONL"` (case-insensitive) | Skip silently |
| 5 | `LT/TH` equals `"ONL"` (case-insensitive) | Skip silently |
| 6 | `Thứ` is not one of `2,3,4,5,6,7,CN` | Warn, skip |
| 7 | `Ca` is not `1,2,3,4` | Warn, skip |
| 8 | Otherwise | Parse into `Class` |

### 5.4 Field normalization
- `roomId`: trim, uppercase, collapse internal whitespace. Split on last `"-"`; the right side is `building`.
- `thu`: `"CN"` or integer 2..7. Any stray whitespace or Vietnamese-digit quirks normalized.
- `ca`: integer 1..4.
- `ltTh`, `nhom`, `gv`, `mon`, `lop`, `maHP`, `maLHP`: trim.
- Strings with `NaN` from SheetJS on empty numeric cells → empty string.

### 5.5 `Ghi chú` → `WeekRange` (the messy part)

Apply the first matching rule. All matching is done on the note text after trimming, normalizing whitespace, and lowercasing for keyword checks (while preserving original for display).

| # | Pattern (informal) | Example | Resolution |
|---|---|---|---|
| G1 | Empty note | `""` | `weeks = [1..totalWeeks]`, `kind = "all"` |
| G2 | `học \d+ ca/(\d+) tuần`, with `thi đợt 2` and captured N equals `totalWeeks` | `"Học 1 ca/15 tuần, thi đợt 2"` | `weeks = [1..totalWeeks]`, `kind = "all"` |
| G3 | `học \d+ ca/(\d+) tuần`, `thi đợt 1`, N < totalWeeks | `"Học 1 ca/10 tuần, thi đợt 1"` | `weeks = [1..N]`, `kind = "range"` |
| G4 | `học \d+ ca/(\d+) tuần`, `thi đợt 2`, N < totalWeeks | `"Học 1 ca/10 tuần, thi đợt 2"` | `weeks = [totalWeeks-N+1..totalWeeks]`, `kind = "range"`. **Judgment:** "đợt 2" = back-loaded N weeks. |
| G5 | `học tuần (\d+)-(\d+)` | `"Học tuần 3-6"`, `"Học tuần 8-15"` | `weeks = [A..B]`, `kind = "range"` |
| G6 | `học tuần (\d+(, ?\d+)+)` comma list | `"Học tuần 2, 4, 6, 8"` | `weeks = [parsed list]`, `kind = "list"` |
| G7 | `ca (\d+) \(học từ tuần (\d+)-(\d+)\)` and the captured ca equals the row's `ca` | `"Ca 1 (học từ tuần 1-15)"` on a `Ca=1` row | `weeks = [A..B]`, `kind = "range"` |
| G8 | Same as G7 but captured ca ≠ row's ca | `"Ca 1 (học từ tuần 1-15)"` on a `Ca=2` row | Ignore the clause (it refers to a different ca); fall through to next applicable rule, else G1. |
| G9 | `ca (\d+) \(học đồng thời với ca \d+ từ tuần (\d+)\)` and the captured ca equals the row's `ca` | `"Ca 2 (học đồng thời với Ca 1 từ tuần 11)"` on a `Ca=2` row | `weeks = [N..totalWeeks]`, `kind = "range"` |
| G10 | `học \d+ ca/(\d+) tuần đầu, từ tuần (\d+) học \d+ ca/tuần` | `"Học 1 ca/10 tuần đầu, từ tuần 11 học 2 ca/tuần, thi vào đợt 2"` | **Judgment (documented):** this row covers `[1..totalWeeks]`. The "2 ca/tuần from week 11" implies a *second* row (different `Ca`) is expected in the data — parser does NOT synthesize it. `kind = "split"`, `warning` recorded for maintainer review. |
| G11 | Contains `nghỉ tuần (\d+(-\d+)?|\d+(, ?\d+)+)` | `"Nghỉ tuần 9"` | Start from all-weeks default (or previously matched set), subtract the listed weeks. |
| G12 | Anything else non-empty | `"Ghi chú riêng của giảng viên"` | `weeks = [1..totalWeeks]`, `kind = "unparseable"`, `warning` set. |

**Compound notes** (semicolon- or `|`-separated clauses): match each clause independently against G2–G11 and intersect their weeks. If no clause matches any rule, G12 applies.

**Warning policy:** every row with `kind ∈ {"split", "unparseable"}` or with an ambiguity resolved by judgment (G4, G10) emits a `ParseWarning` at `info` level. The UI surfaces a total warning count with a link to a details panel.

### 5.6 Deduplication
Rows from different sheets referring to the same class+room+ca+weeks may appear (e.g. the xlsx is split across faculty sheets). After parsing, dedupe by the composite key `(maLHP, nhom, thu, ca, roomId)` merging `weekCoverage.weeks` as the union. Log an `info` warning if `ghiChu` differs across merged rows.

### 5.7 Room & building index construction
After dedupe, build `rooms` and `buildings` indexes from the distinct `roomId` values encountered, with `usageCount = sum(class.weekCoverage.weeks.length) across that room's classes`.

---

## 6. Semester Calendar

### 6.1 Config: `public/semester.json`

```json
{
  "semesterStartDate": "2026-01-12",
  "totalWeeks": 15,
  "timezone": "Asia/Ho_Chi_Minh",
  "excludedWeeks": []
}
```

| Field | Meaning |
|---|---|
| `semesterStartDate` | **Monday of Week 1**, ISO date. Maintainer responsibility to pick the correct Monday. |
| `totalWeeks` | Integer, typically 15. Drives `[1..totalWeeks]` default. |
| `timezone` | Hard-coded `"Asia/Ho_Chi_Minh"`. Vietnam does not observe DST — all local-time arithmetic is safe, but we still anchor via `date-fns-tz` to avoid UTC drift in the browser. |
| `excludedWeeks` | Reserved for future (e.g., Tết break); empty in current release. Parser respects it by removing these weeks from every `WeekRange.weeks` set. |

### 6.2 Algorithm: `getDateInfo(date) → { inSemester, weekNumber, thu }`

```
function getDateInfo(date: Date):
    start := parseDate(semesterStartDate) at 00:00 in Asia/Ho_Chi_Minh
    d     := date at 00:00 in Asia/Ho_Chi_Minh
    daysSinceStart := floor((d - start) / 1 day)

    if daysSinceStart < 0:
        return { inSemester: false, reason: "before-semester" }
    if daysSinceStart >= totalWeeks * 7:
        return { inSemester: false, reason: "after-semester" }

    weekNumber := floor(daysSinceStart / 7) + 1      // 1..totalWeeks

    if weekNumber in excludedWeeks:
        return { inSemester: false, reason: "excluded-week", weekNumber }

    dow := date.dayOfWeek   // 1=Mon .. 7=Sun (ISO)
    thu := dow == 7 ? "CN" : dow + 1     // Mon→2, Tue→3, ..., Sat→7

    return { inSemester: true, weekNumber, thu }
```

---

## 7. Query Algorithms

### 7.1 `isRoomFree(roomId, date, time)`

```
function isRoomFree(roomId, date, time):
    info := getDateInfo(date)
    if not info.inSemester:
        return { status: "out-of-semester", reason: info.reason }

    nowMin := time.hours * 60 + time.minutes

    todaysClasses := timetable.classes
        .filter(c => c.roomId == roomId)
        .filter(c => c.thu == info.thu)
        .filter(c => c.weekCoverage.weeks.includes(info.weekNumber))
        .sortBy(c => CA_SLOTS[c.ca - 1].startMin)

    current := todaysClasses.find(c =>
        CA_SLOTS[c.ca-1].startMin <= nowMin AND nowMin < CA_SLOTS[c.ca-1].endMin)

    if current:
        return {
            status:   "occupied",
            current:  current,
            endsAt:   CA_SLOTS[current.ca-1].endMin,
            next:     todaysClasses.find(c => CA_SLOTS[c.ca-1].startMin > CA_SLOTS[current.ca-1].endMin) || null
        }

    next := todaysClasses.find(c => CA_SLOTS[c.ca-1].startMin > nowMin) || null
    freeUntil := next ? CA_SLOTS[next.ca-1].startMin : END_OF_DAY   // 23:59
    return {
        status:    "free",
        next:      next,
        freeUntil: freeUntil
    }
```

### 7.2 `rankedEmptyRooms(date, time, referenceBuilding?)`

```
function rankedEmptyRooms(date, time, referenceBuilding?):
    info := getDateInfo(date)
    if not info.inSemester: return { error: info.reason }

    nowMin := time.hours * 60 + time.minutes
    results := []

    for room in timetable.rooms.values():
        r := isRoomFree(room.id, date, time)
        if r.status != "free": continue
        freeDuration := r.freeUntil - nowMin
        results.push({
            room:         room,
            freeUntil:    r.freeUntil,
            freeDuration: freeDuration,
            nextClass:    r.next
        })

    results.sort((a, b) =>
        // 1. Matching building first
        sameBuilding(b, referenceBuilding) - sameBuilding(a, referenceBuilding)
        // 2. Longest free duration first
        || b.freeDuration - a.freeDuration
        // 3. Room code ascending (natural sort)
        || naturalCompare(a.room.code, b.room.code)
    )
    return { rooms: results }

sameBuilding(entry, ref) := ref && entry.room.building == ref ? 1 : 0
```

`naturalCompare` sorts `105`, `106`, `213` correctly (numeric-aware).

### 7.3 "Right now" semantics during breaks
- **Within a `Ca` (5-min tiết breaks):** the room is considered `occupied` the whole Ca. A query at 08:30 (between tiết 1 and 2 of Ca 1) returns occupied.
- **Between `Ca 1` and `Ca 2` (09:40–09:50):** `nowMin` falls in neither slot → `free` with `next.startMin = 9*60+50`.
- **Between `Ca 2` and `Ca 3` (12:30–13:30):** same — free for an hour.
- **Between `Ca 3` and `Ca 4` (16:10–16:20):** same — free for 10 min.
- **After `Ca 4` (>19:00) or before `Ca 1` (<07:00):** free with `freeUntil = END_OF_DAY` (after) or `freeUntil = 07:00` (before) of the same day.

---

## 8. UI Spec (Mobile-First)

Three views, one router. All copy in Vietnamese. Tailwind breakpoints: base = mobile, `md:` = tablet/desktop tweaks only.

### 8.1 Global chrome
- **Top bar:** logo placeholder + title `"Phòng trống UET"` + settings icon.
- **Below top bar:** persistent date+time picker, defaulting to now, with `"Bây giờ"` quick-reset button. Changing either re-queries the current view.
- **Footer strip (subtle):** `"Dữ liệu: HK II 2025–2026 • Cập nhật lần cuối: {parsedAt}"` + warning badge `"{N} ghi chú cần rà soát"` → opens warnings drawer.

### 8.2 View: Home (`/`)

```
┌─────────────────────────────┐
│  Phòng trống UET       ⚙   │
├─────────────────────────────┤
│  📅 Thứ 6, 06/03/2026       │
│  🕒 16:30    [Bây giờ]      │
├─────────────────────────────┤
│  [ Kiểm tra 1 phòng ]       │
│                             │
│  [ Tìm phòng trống ngay ]   │
├─────────────────────────────┤
│  🔼 Kéo-thả hoặc chọn file  │
│     thời khóa biểu (.xlsx)  │
└─────────────────────────────┘
```

If no timetable is loaded yet, the two action buttons are disabled and the upload card is emphasized with `"Chưa có dữ liệu thời khóa biểu"`.

### 8.3 View: Room check (`/room`)

Inputs:
- **Autocomplete field** `"Mã phòng (vd: 308-B)"`. Suggestions filtered from `timetable.rooms`.
- Submit button `"Kiểm tra"`.

Result card states:

**Occupied:**
```
🔴 Đang bận
308-B • Tòa B
─────────────────────────────
Hiện tại:
  INT2213 1 — Mạng máy tính
  K69I-IT1 • GV: Nguyễn Văn A
  Kết thúc: 19:00

Tiếp theo:
  Không có lớp nào nữa hôm nay
```

**Free:**
```
🟢 Đang trống
105-B • Tòa B
─────────────────────────────
Trống đến 13:30
Lớp tiếp theo:
  MAT1041 3 — Giải tích 1
  Bắt đầu: 13:30
```

**Out-of-semester:**
```
⚪ Ngoài học kỳ
Ngày bạn chọn (06/03/2027) không
nằm trong HK II 2025–2026.
```

### 8.4 View: Empty rooms now (`/empty`)

Inputs:
- **Building filter chips**: `Tất cả | A | B | T | E5 | ...` (dynamically enumerated from `buildings`).
- Selection acts as `referenceBuilding` for ranking (matching building first).
- `"Chỉ hiện phòng trống ≥ X phút"` slider (0/30/60/120).

Result: vertical list of cards.

```
🟢 105-B      trống đến 18:00  (còn 1h30)
   Tòa B
   Lớp tiếp theo: INT2213 1 lúc 18:00

🟢 308-B      trống cả ngày
   Tòa B

🟢 213-T      trống đến 16:10  (còn 40p)
   Tòa T
   ...
```

Empty-state: `"Không có phòng nào trống ở thời điểm này 😔"`.

### 8.5 Warnings drawer
Slide-up panel listing every `ParseWarning` grouped by sheet, with copyable row references: `"Sheet3, dòng 47: Ghi chú 'XYZ' không nhận diện được — mặc định dùng toàn bộ 15 tuần."`

### 8.6 Accessibility / interaction
- All interactive targets ≥ 44×44 px.
- Color is never the only signal: status uses both color and emoji/icon + text.
- Keyboard: tab through date, time, primary action. Enter submits.
- No animations beyond simple fades; respect `prefers-reduced-motion`.

---

## 9. Edge Cases

1. **Online classes (`ONL`).** Excluded at filter rule 4/5. They never appear as a room in any view. No warning (not an error).
2. **Classes spanning Ca boundaries.** Per domain, a class sits in one Ca. If `Ca` cell contains `"1-2"` or `"1,2"`, parser emits a `warning` and expands to both Ca entries for occupancy purposes, keeping `sourceRow` identical.
3. **Odd/even-week or arbitrary-week patterns.** Handled by `WeekRange.weeks` being an explicit set. If `Ghi chú` lists weeks, we intersect. Combined with `excludedWeeks` from config.
4. **Nhóm-specific rooms.** Same `Mã LHP` with different `Nhóm` and different `GĐ` → distinct `Class` records, each indexed in their own room. Queries never collapse across `Nhóm`.
5. **Rooms appearing once.** A room with a single class all term is still indexed and queryable; it shows as free at every other time.
6. **Two classes scheduled in the same room, same Thứ, same Ca, overlapping weeks.** Data error. Emit `error`-level warning listing both rows; in queries, report occupied with a `conflictingClasses` array so the UI can show both.
7. **Timezone.** Asia/Ho_Chi_Minh, UTC+7, **no DST**. Fixed in config, documented here, enforced via `date-fns-tz`. Browser clock drift is the user's problem.
8. **Dates outside the semester.** `getDateInfo` returns `inSemester: false`; UI shows an informational state, no query is executed.
9. **Queries during the 10-min gap between Ca 3 and Ca 4** (or any inter-Ca gap). `isRoomFree` returns `free` with `freeUntil` equal to the next Ca's `startMin`. UI shows e.g. `"Trống đến 16:20 (còn 10 phút)"`.
10. **Queries during the 5-min tiết break inside a Ca** (e.g. 07:50). Room is `occupied`. We do not model tiết-level granularity.
11. **Sunday (`CN`) queries.** Usually no classes. `isRoomFree` returns `free, freeUntil: END_OF_DAY`. UI copy handles this with `"Trống cả ngày (Chủ nhật)"`.
12. **Unparseable or missing `Thứ`/`Ca`/`GĐ`.** Row is skipped with warning; never reaches the room index.
13. **Case/whitespace variance in room codes** (`" 105-b "` vs `"105-B"`). Normalized before indexing.
14. **Building suffix variance** — `"E5"`, `"T"`, `"B"`, future suffixes. No hard-coded allowlist; building is whatever follows the last `-`. If `GĐ` has no `-`, building is `"?"` and a warning is emitted.
15. **Duplicate rows across sheets.** Deduped per §5.6.
16. **Leap-year / Tết break.** Use `excludedWeeks` in config to mark the break week(s); no special code path.
17. **xlsx with macros, passwords, or corrupted.** SheetJS errors are caught; UI shows `"Không đọc được file. Vui lòng kiểm tra định dạng .xlsx."`.
18. **Very large xlsx (all sheets).** Parse off the main thread via a Web Worker; UI shows a spinner with `"Đang phân tích thời khóa biểu..."`.

---

## 10. Acceptance Test Matrix

Assumes `semesterStartDate = 2026-01-12` (Monday, Week 1), `totalWeeks = 15`, `excludedWeeks = []`. Dates below use DD/MM/YYYY.

| # | Scenario | Input | Expected |
|---|---|---|---|
| T1 | Occupied mid-class | Row: `INT2213 1`, Mạng máy tính, `105-B`, `Thứ 6`, `Ca 4`, `Ghi chú "Học 1 ca/15 tuần, thi đợt 2"`. Query `roomId=105-B`, `date=06/03/2026` (Fri, W8), `time=16:30`. | `status=occupied`, current=`INT2213 1`, `endsAt=19:00`, `next=null`. |
| T2 | Free, next class later today | Same row as T1. Query `105-B`, `06/03/2026`, `time=10:00`. | `status=free`, `freeUntil=16:20`, `next=INT2213 1`. |
| T3 | Free, no classes rest of day | Query `105-B`, `06/03/2026`, `time=19:05`. | `status=free`, `freeUntil=23:59`, `next=null`. |
| T4 | Out-of-semester (before start) | Query any room, `01/01/2026`, `time=08:00`. | `status=out-of-semester`, `reason=before-semester`. |
| T5 | Out-of-semester (after end) | Query any room, `01/06/2026`, `time=08:00`. | `status=out-of-semester`, `reason=after-semester`. |
| T6 | Week-range `Ghi chú` — inside range | Row: `MAT1042 2` in `308-B`, `Thứ 4`, `Ca 2`, `Ghi chú "Học tuần 3-6"`. Query `308-B`, `11/02/2026` (Wed, W5), `time=10:30`. | `status=occupied`, ends at `12:30`. |
| T7 | Week-range `Ghi chú` — outside range | Same row. Query `308-B`, `04/03/2026` (Wed, W8), `time=10:30`. | `status=free`, no class this thứ/week. |
| T8 | Ca-specific note, matching ca | Row: `PHY1101 1` in `407-A`, `Thứ 5`, `Ca 2`, `Ghi chú "Ca 2 (học đồng thời với Ca 1 từ tuần 11)"`. Query `407-A`, `19/03/2026` (Thu, W10), `time=10:30`. | `status=free` (W10 not in `[11..15]`). |
| T9 | Ca-specific note, matching ca, in range | Same row. Query `407-A`, `26/03/2026` (Thu, W11), `time=10:30`. | `status=occupied`, ends `12:30`. |
| T10 | `ONL` row excluded | Row with `GĐ="ONL"` for `INT9999` on `Thứ 6, Ca 1`. Query any related thing: room index must not contain `ONL`; class never affects any physical-room query. | `rooms.has("ONL") == false`; no occupancy anywhere. |
| T11 | Ranked empty rooms, building preference | Current time 16:30, `06/03/2026`, `referenceBuilding="B"`. Timetable has `105-B` (occupied), `308-B` (free until EOD), `407-A` (free until 16:20… actually past—so until EOD), `213-T` (free until 17:00). | Order: `308-B` (B, free longest) → `407-A` (non-B, free longest) → `213-T` (non-B, shorter free) → `105-B` not in list. Any 407-A vs 213-T tie broken by building preference then natural code order. |
| T12 | Inter-Ca break | Query `105-B`, `06/03/2026`, `time=16:15` (between Ca 3 end 16:10 and Ca 4 start 16:20, Ca 4 is INT2213 1). | `status=free`, `freeUntil=16:20`, `next=INT2213 1`. |
| T13 | Unparseable `Ghi chú` | Row with `Ghi chú="Theo kế hoạch khoa"`. Any query in-semester on that room+thứ+ca. | Class is scheduled for all 15 weeks; one `info`-level `ParseWarning` exists referencing the row. |
| T14 | Duplicate across sheets merged | Same `(maLHP, nhom, thu, ca, roomId)` appears in `Sheet3` and `KhoaCNTT`. | Single `Class` in `parsedTimetable.classes`; `warning` emitted if `ghiChu` differs. |

---

## 11. Out of Scope / Future Work

- **Saved favorites** ("watch this room, alert me when free").
- **Push notifications** when a room frees up during a long class.
- **Reservation/booking integration** with university systems.
- **Exam schedule overlay.**
- **Student-specific timetable import** ("which of my classes is next and where?").
- **Teacher/admin views** with write access.
- **i18n (English mirror).**
- **PWA offline install** — nice-to-have, cheap extension, deferred.
- **Campus map overlay** showing room pins.
- **Better handling of G10-style split schedules** — automatic synthesis of the implicit second-ca row if we decide it's safe.
- **Automatic semester-start inference** from the xlsx itself, so the maintainer step disappears.

---

## Appendix A — Development order for Claude Code

Suggested implementation sequence; each step should be independently testable.

1. `lib/calendar.ts` + tests (pure functions, no deps on parser).
2. `lib/ghichu.ts` + tests covering every G-rule.
3. `lib/parser.ts` + fixture xlsx tests.
4. `lib/query.ts` + tests using a hand-built `ParsedTimetable`.
5. Pinia store + bootstrapping from `public/data/*.xlsx`.
6. Views in order: Home → Room check → Empty rooms → Warnings drawer.
7. Web Worker offload for parse.
8. GitHub Actions: build + deploy to Pages on push to `main`.

## Appendix B — Key judgment calls (recap)

| Decision | Choice | Section |
|---|---|---|
| "đợt 2" with N<totalWeeks weeks | Back-loaded range `[totalWeeks-N+1..totalWeeks]` | §5.5 G4 |
| G10 split notes | Row covers `[1..totalWeeks]`, a second row is assumed | §5.5 G10 |
| Dedupe key | `(maLHP, nhom, thu, ca, roomId)` | §5.6 |
| Inter-Ca gap treatment | Truly free, shown with minute-level countdown | §7.3, E9 |
| Room without `-` suffix | Building = `"?"`, warning | E14 |
| Tết / holidays | Via `excludedWeeks` config, not hard-coded | §6.1, E16 |
