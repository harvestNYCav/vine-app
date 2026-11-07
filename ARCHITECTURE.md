# Architecture

This document is a map of Vine for people (and agents) new to the code. It describes the parts that
change rarely. For the details of a specific area, follow the pointers to the code or to `docs/`.

## Bird's-eye view

Vine supports an in-person tutoring program. Tutors teach students in scheduled sessions, and
students practice on their own between sessions. Learners enroll in one or more **tracks**:

- **ESL**: everyday English for adult learners. 20 hand-authored lessons ("modules") with
  vocabulary, grammar, a tutor slide deck, a quiz, and homework. Lesson copy is bilingual
  (English, with optional Spanish).
- **ELA**: grade-school reading. A few authored modules plus released NYSED Grade 3–8 ELA exam
  questions, and English Regents for high-school students.
- **Math**: adaptive arithmetic practice plus released NYSED Grade 3–8 Math exam questions, and
  Algebra I / Geometry / Algebra II Regents for high-school students.

There are four roles. **Students** learn and practice. **Tutors** run lessons, take attendance and
leave notes. **Parents** get a read-only view of a linked child. **Admins** provision accounts and
place students (grade, tracks, Regents courses, tutors).

The app is one Next.js (App Router) project served under the base path `/vine-app`. It has three
moving parts:

1. **Curriculum and exam content lives in the repo**, as TypeScript and generated JSON under
   `content/`, with question images under `public/nysed/`. It is versioned with the code and is
   never stored in the database.
2. **Per-user state lives in a libSQL/SQLite database**: accounts, enrollments, schedules and
   progress. It is reached through a single client in `lib/db.ts`.
3. **Server Components and route handlers** sit between the two. Pages read from both directly.
   Any write, and any answer checking, goes through a JSON route handler under `app/api/`.

Grading always happens on the server. The browser never receives answer keys for exam questions.

## Code map

### `app/`: routes

Routes are split into route groups by role. Each group's `layout.tsx` calls `getSession()` and
redirects any user whose role doesn't belong there. There is no `middleware.ts`/`proxy.ts`; the
layouts and the API handlers are the access checks.

- `app/page.tsx`: landing page. Picks a role and sends signed-in users to their home.
- `app/(auth)/login`: PIN pad (plus the email-code step for admins).
- `app/(student)/`: the learner app.
  - `home`, `progress`, `skills/[tag]`, `tracks` (students choose their own tracks).
  - `modules/[slug]/…`: lesson overview, study games (flashcards, match, quiz), review slides,
    homework.
  - `practice`: spaced-repetition vocab review, and adaptive math practice (`?mode=math`).
  - `math/exams/…`, `ela/exams/…`: NYSED Grade 3–8 course pages, lessons and practice runners.
  - `regents/[course]/…`: Regents course pages and practice runners.
- `app/(parent)/family/**`: a read-only mirror of the learner pages (see *Parent view* below).
- `app/(tutor)/tutor/`: the tutor dashboard.
  - `[studentId]`: one student's dashboard. Assign lessons, homework and exam sections; write a
    prep note; file the session wrap-up.
  - `[studentId]/placement`: the tutor-led ESL placement test for a student's first session.
  - `lessons`, `lessons/[slug]`: the lesson library and the in-class slide deck.
  - `cohort`, `check-in`: student attendance and the tutor's own check-in.
  - `exams/…`: read-only previews of exam content.
- `app/(admin)/admin/`: one admin page. Its forms (`Admin*Controls.tsx`) cover students, parents,
  accounts (PIN resets and deletion), the admin email allowlist, tutor approvals and a danger zone
  (full database reset). Students are a searchable, collapsible list (`AdminStudentList`), and
  tutors and children are linked through a type-to-add picker (`AdminPeoplePicker`). `check-ins/`
  shows attendance for any date.
- `app/api/`: JSON endpoints, grouped as `auth/`, `admin/`, `tutor/`, `parent/`, `student/`,
  `progress`, `practice`, `math/`, `ela/`, `regents/`. Each handler checks the session role itself.

### `lib/`: domain logic

These are plain modules, most of which take a libSQL `Client` as their first argument, which makes
them testable without Next. Look here first for any rule.

- Infrastructure: `db.ts` (client, schema, migrations), `auth.ts` (session JWT cookie), and
  `dates.ts` / `scheduling.ts` (program-local calendar dates; `todayString()` keys every daily
  record).
- Accounts and roles: `student-accounts.ts`, `parents.ts`, `tutor-approvals.ts`, `pin-reset.ts`,
  `admin-allowlist.ts`, `email-verification.ts`, `admin-reset.ts`, `pin-entry.ts`, `auth-copy.ts`.
- Placement: `tracks.ts`, `student-settings.ts`, `grade-levels.ts`, `regents-courses.ts`,
  `tutors.ts`.
- Who a page is about: `student-view.ts` (`resolveStudentViewResult`, `StudentView`).
- Tutoring: `tutor-lesson-assignment.ts`, `exam-assignments.ts`, `session-metrics.ts`,
  `check-ins.ts`, `tutor-roster*.ts`, `tutor-pairings.ts`, `lesson-agenda.ts`,
  `tutor-exam-library.ts`, `tutor-exam-preview.ts`, `esl-placement.ts` (+ the client-safe
  `esl-placement-score.ts`).
- Lesson and practice grading: `lesson-answers.ts`, `lesson-progress.ts`, `spaced-repetition.ts`,
  `study.ts`, `worksheet.ts`, `resumable-work.ts`.
- Math practice engine: `math.ts` (skills ladder, problem generation, mastery updates, mistake
  classification).
- Exams: `math-exams.ts`, `ela-exams.ts`, `exam-sections.ts`, `regents-progress.ts`, and the
  access predicates `math-exam-access.ts`, `ela-exam-access.ts`, `regents-exam-access.ts`.

### `content/`: curriculum

- `content/modules/`: one file per lesson, each exporting a `Module` (`types/index.ts`).
  `index.ts` exports `ALL_MODULES` (the teaching order) and `getModule(slug)`. A module's `track`
  is `esl` or `ela`; math has no modules.
- `content/math-skills.ts`: skill metadata for the math practice track.
- `content/esl-placement.ts`: the ESL placement test (two tutor-led stages) and the three levels,
  each mapped to the ESL lesson a student at that level starts with.
- `content/math-exams/`, `content/ela-exams/`: NYSED Grade 3–8 released multiple-choice catalogs.
  - `generated/catalog.json` is importer output.
  - `catalog-runtime.ts` holds answer-bearing records and is marked `server-only`.
  - `index.ts` exposes course metadata safe for any Server Component.
  - `explanations/`, `accessibility/` and `transcripts/` are reviewed, hash-pinned sidecars.
  - Each directory's `README.md` explains its provenance rules.
- `content/regents/`: Regents catalogs (`math/`, `ela/`), with `types.ts` and a `server-only`
  `index.ts`. A question is shown only when `isRegentsQuestionReady` passes; `readiness` must be
  `reviewed`.
- `content/nysed-*.json`: review/repair ledgers consumed by the importers.

Curriculum changes are owned jointly. Content is updated periodically, with no fixed schedule for
refreshing the exam catalogs.

### `scripts/`, `public/nysed/`, `evals/`

- `scripts/import_nysed_{math,ela}_mc.py`, `scripts/regents_*_import.py` and their helpers
  rebuild the generated catalogs and the WebP question crops under `public/nysed/`. They need
  Python with `scripts/requirements-nysed.txt` (and Tesseract for scanned editions).
- `scripts/seed.ts` loads demo users through `lib/demo-seed.ts`.
- `evals/`: offline quality evaluations of the ESL lessons (`summary.md`, a `lesson_NN.json` per
  lesson, and `postcheck.py`). They are not used at runtime.

### `components/`, `types/`, `tests/`

- `components/`: shared UI. `ModuleSlideDeck` and `TrackedTutorDeck` are the lesson deck;
  `components/regents/` holds Regents passage, attribution and progress cards.
- `types/index.ts`: `Role`, `Track`, `Module` and the lesson content types.
- `tests/`: `node:test` suites (`*.test.ts`) for the `lib/` modules and content catalogs, plus
  Python `unittest` suites (`test_*.py`) for the importers. The full list is in the `test` script
  in `package.json`; some suites run with `--conditions=react-server` so they can import
  `server-only` modules.

## Data model

The full schema, including in-place migrations, is in `lib/db.ts`. A few tables are defined next
to their owning module and imported by it: `lib/exam-assignments.ts`, `lib/regents-courses.ts`,
`lib/tutor-approvals.ts`, `lib/session-metrics.ts` and `lib/esl-placement.ts`. The core entities and how they relate:

```
users (role: student | tutor | parent | admin)
 ├─ student ── user_tracks (esl | ela | math)
 │          ── student_settings (grade_level 3–8, high_school_grade_level 9–12, Spanish)
 │          ── student_regents_courses
 │          ── student_tutors ──▶ tutor
 │          ◀── parent_students ── parent ── parent_settings
 │
 ├─ tutoring, per student per calendar date
 │    sessions (student × date × module_slug, tutor_id) ── session_wrap_ups (1:1)
 │    exam_assignments (student × date × exam section, tutor_id)
 │    attendance (student × date)      tutor_check_ins (tutor × date)
 │    lesson_deck_progress (tutor × date × module_slug)   tutor_notes
 │    esl_placements (student × test, tutor_id; latest row is the student's ESL level)
 │
 └─ learner progress
      module_progress (student × module), vocab_progress (student × word), activity_log (daily counts)
      math_progress / math_attempts / math_sessions        (adaptive math practice)
      {math,ela}_exam_attempts ──▶ {math,ela}_exam_section_progress  (best + latest score)
```

Things that are not obvious from the table names:

- **Content is referenced by string keys.** `module_slug`, `exam_id` and `section_slug` point
  into `content/`; the database has no foreign keys and no copy of the content.
- **`sessions` is a scheduled lesson, not a login session.** Login state is a cookie (see below).
- **Regents attempts reuse the exam tables.** English Regents writes to the `ela_exam_*` tables,
  and the math courses write to `math_exam_*`.
- **One `users` table for all roles.** Admins are identified by `email`, which is required for
  them. Pending tutors are not in `users` at all; they wait in `tutor_signup_requests`.
- **Legacy tables can linger.** Older databases may still contain an unused `teaching_sessions`
  table. The code no longer creates or reads it, and it was left in place rather than dropped.
- **Presence is three-valued.** In `attendance` and `tutor_check_ins`, nobody marked means
  `present: null`, which is not the same as absent.

## Key flows

### Sign-in

1. The landing page links to `/login?role=…`. The client posts `{ name, pin, role }` to
   `app/api/auth/login/route.ts`. Admins post `{ email, emailCode, pin }` instead, after
   `app/api/auth/admin-email` has emailed them a code through Resend (`lib/email-verification.ts`).
2. The handler looks the user up by role and name (by email for admins) and checks the bcrypt
   PIN hash.
3. Missing accounts are never created at the PIN pad, except for admins
   (`loginCanCreateMissingAccount`):
   - Students and parents must already have been created by an admin.
   - An unknown tutor becomes a `tutor_signup_requests` row and gets `tutor_pending_approval`.
     An admin approves the request (`app/api/admin/tutor-requests`) before a `users` row exists.
   - The first admin can sign up freely. After that, a new admin's email must be on
     `admin_email_allowlist`, and new admins store their email as their display name.
4. On success the handler sets the `vine_session` cookie: a signed JWT holding `{ userId, name,
   role }`, created by `createSession` in `lib/auth.ts` and read back by `getSession()`. A student
   with no tracks is sent to `/tracks`.

### A tutor runs a lesson

1. **Plan.** On `/tutor/[studentId]` or `/tutor/lessons/[slug]`, the tutor assigns a module to one
   or more students for today. `POST /api/tutor/session` calls `assignTutorLesson`
   (`lib/tutor-lesson-assignment.ts`), which writes `sessions` rows. If a student isn't enrolled in
   the module's track, or already has lessons today, it returns `confirmation_required` (HTTP 409)
   and asks the tutor before enrolling the student or replacing those lessons. Exam sections are
   assigned the same way, through `/api/tutor/exam-assignment` into `exam_assignments`.
2. **Teach.** `/tutor/lessons/[slug]` renders `TrackedTutorDeck`, which wraps `ModuleSlideDeck`.
   While the deck is visible it posts the furthest slide reached and the active on-screen time to
   `/api/tutor/deck-progress` (using `sendBeacon` when the tab is hidden). `recordDeckProgress`
   merges these reports into `lesson_deck_progress`, keeping the furthest slide and capping the
   time counted per report.
3. **Record.** The tutor marks attendance (`/api/tutor/attendance`, through `lib/check-ins.ts`),
   checks themself in, can mark homework (`/api/tutor/session/homework`), and files a short
   wrap-up (finished?, where they stopped, quiz score, 1–5 rating, note). The wrap-up is saved
   through `/api/tutor/session/wrap-up` into `session_wrap_ups`. Admins read the aggregates via
   `/api/admin/session-metrics`.

### A student's lesson work is saved

1. Lesson pages are Server Components. They read the `Module` from `content/modules` and the
   student's `module_progress` / `vocab_progress` rows.
2. A client component (`QuizClient`, `WorksheetClient`, …) posts raw answers to
   `POST /api/progress` with a `type` (`vocab_viewed`, `practice_completed`,
   `homework_completed`). The handler requires `role === 'student'` and checks that the module's
   track is one of the student's tracks.
3. The server grades the answers itself (`gradeQuiz` / `gradeHomework` in `lib/lesson-answers.ts`)
   and stores the score plus the graded answers (as JSON) in `module_progress`. It also increments
   the day's `activity_log` row, keyed by the program-local date.
4. Vocab review goes through `/api/practice`, which schedules the next review with
   `lib/spaced-repetition.ts` and updates `vocab_progress`. Math practice goes through
   `/api/math/attempt`: the server generates the problems, stores them in `math_attempts` with an
   expiry, sends the browser only the public fields, and updates `math_progress` mastery when the
   student finishes.

### A student takes an exam section

The NYSED Grade 3–8 runners (`/api/math/exam-attempt`, `/api/ela/exam-attempt`) and the Regents
runner (`/api/regents/attempt`) share one shape:

1. **`start`.** Re-check access with the access predicate: the student has the track, and either
   `student_settings.grade_level` equals the exam's grade, or the Regents course is assigned.
   Spanish Math also requires `math_spanish_enabled` and an official Spanish edition. Then create an
   attempt row with an expiry, or resume an unexpired one. Questions go out only through
   `toPublic*Question`, which strips the grading data.
2. **`check`.** Re-check access and expiry, grade one answer on the server, and append it to the
   attempt's `responses`.
3. **`finish`.** In a single write transaction, mark the attempt finished and upsert
   `*_exam_section_progress`: `attempts` + 1, latest score, and best score (compared as a ratio).
   Then bump `activity_log`.

Tutors can open the same content read-only at `/tutor/exams/…`. Previewing never creates attempts.

### Parent view

`app/(parent)/family/**` renders the same page components as the student routes.
`lib/student-view.ts` decides whose data they show. For a student, it is their own, with
`readOnly: false`. For a parent, it is the linked child selected by a cookie (the switcher in
`ParentChildSwitcher`), with `readOnly: true`, which renders interactive links as plain markup. The
parent's Spanish toggle (`parent_settings.spanish_enabled`) is deliberately separate from the
student's setting.

## Invariants and boundaries

- **Answer keys never reach the browser.** Answer-bearing catalogs (`content/*/catalog-runtime.ts`,
  `content/regents/index.ts`) import `server-only`. Client-bound questions go through
  `toPublicMathExamQuestion` and its ELA/Regents equivalents. Grading happens only in route
  handlers.
- **Every access check happens on the server.** Each route group's layout redirects other roles,
  and API handlers check the session themselves. The learner write APIs for lessons, tracks,
  math practice and exams (`/api/progress`, `/api/student/tracks`, `/api/math/*`, `/api/ela/*`,
  `/api/regents/*`) require `role === 'student'`. Parents never write a child's data; their view is
  read-only by construction. Exam access is re-checked at each of `start`, `check` and `finish`,
  not only when the page loads.
- **Grade and course placement belong to admins.** Students choose their own tracks
  (`/api/student/tracks`). `grade_level`, `high_school_grade_level`, Regents courses, Spanish access
  and tutor links are set only via `app/api/admin/*`.
- **Accounts are provisioned, not self-created.** The PIN pad never creates students or parents.
  Tutors wait for approval. After the first admin, new admins need an allowlisted email.
- **Admin PINs cannot be reset** by another admin (`lib/pin-reset.ts`). An admin PIN is only half
  of the admin sign-in, so resetting it would amount to taking over the account.
- **Daily records use the program's calendar date** (`PROGRAM_TIME_ZONE`, default
  `America/New_York`), never the server's UTC date.
- **Exam IDs are immutable content versions.** If an exam's question membership or point totals
  change, it gets a new ID, so stored best/latest scores stay comparable.
- **Generated content is rebuilt, never hand-edited.** `generated/catalog.json` and
  `public/nysed/**` come from the importers, which fail closed when sidecars are stale.
- **NYSED material keeps its attribution.** Every page that shows released questions renders the
  NYSED attribution and disclaimer components. Third-party passages keep their printed credits.
  `docs/DATA.md` has the full rules.
- **Schema changes are additive and idempotent.** `initSchema` runs on the first `getDb()` call in
  every process. It uses `CREATE TABLE IF NOT EXISTS`, `ensureColumn`, and named one-off
  migrations recorded in `schema_migrations`, and it must tolerate several instances racing.

Things that are deliberately **not** done:

- No constructed-response or short-answer exam items. Only released multiple-choice questions are
  imported.
- No unofficial translations of NYSED questions. Spanish appears only where NYSED published it.
- No NYSED scoring-guide rubrics, sample responses or answer annotations in assets or feedback.
- No curriculum stored in the database, and no content-authoring UI. Content changes are code
  changes.
- No self-service student or parent sign-up.

## Deployment and environments

**Hosting is Vercel.** The project's deployments are at
https://vercel.com/harvestnycavs-projects/vine-app/deployments. Vercel's GitHub integration deploys
automatically (all deployments recorded on GitHub are `vercel[bot]`):

- **Production** is deployed on every push to `main`. That includes PR merges, and also commits
  pushed straight to `main`.
- **Preview** is deployed on every push to any other branch, whether or not a PR is open yet. The PR
  shows the preview link as the `Vercel` check.

**The production database is Turso**, at https://app.turso.tech/harvestnycav/databases/vine-app.
The app connects through `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. The schema migrates itself on
the first request that touches the database in each new server instance (see *Invariants*), so a
deploy that changes the schema also migrates production Turso.

Here is what each piece of configuration in the repo covers:

| File | Covers |
| --- | --- |
| `package.json` | `dev`, `build` (`next build`) and `start` (`next start -p ${PORT:-3000}`); the `test` and `typecheck` scripts. |
| `next.config.ts` | `basePath: '/vine-app'`. Client-side `fetch` calls and NYSED asset URLs include this prefix (for example `TrackedTutorDeck`). |
| `.github/workflows/maintenance-smoke.yml` | CI (`smoke`) on every pull request: Node 22 + Python 3.12, `npm ci`, the NYSED Python requirements, `npm test`. It does not deploy. |
| `lib/db.ts` | The database: libSQL at `TURSO_DATABASE_URL`, falling back to a local file `data/vine.db` (gitignored). The fallback is for local development only; Vercel's filesystem is read-only. |
| `railway.toml`, `nixpacks.toml` | A Railway build (nixpacks, Node.js 20, `npm start`, healthcheck `/`). Production deploys through Vercel, not Railway. |

The repo has no `vercel.json`. Vercel's settings, including environment variables, live in the
Vercel dashboard.

Environment variables read by the code:

- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`: the remote database. Without them, the app uses a
  local SQLite file.
- `JWT_SECRET`: signs session cookies. Set it in every deployed environment.
- `RESEND_API_KEY`, `ADMIN_EMAIL_FROM`: admin email verification codes.
- `PROGRAM_TIME_ZONE`: optional, IANA zone, default `America/New_York`.
- `NODE_ENV`: cookies are marked `secure` in `production`.

Local development: `npm install`, `npm run dev`, then optionally `npx tsx scripts/seed.ts` for demo
accounts. Without the Turso variables, local runs use `data/vine.db`, so they never touch
production. Before a PR, run `npm run typecheck`, `npm test` and `npm run build`. `docs/` has more
notes on environment variables, dependencies and release.
