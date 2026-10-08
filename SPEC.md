# Survey Experiment — Design Spec

A web-based survey experiment on data-sharing preferences: how people value different
types of personal data, and whether that changes with what the data will be used for
(AI training vs. general service improvement). Hosted on Railway, participants recruited
via CloudResearch Connect.

This document covers **design, conditions, flow, instrumentation, and schema**.

**Exact participant-facing wording is not duplicated here** — it lives in one place:

| Document | Holds |
| --- | --- |
| `SURVEY_PAGES.md` | All participant-facing copy, page by page, with condition placeholders and their value lists; plus an appendix of client-side chrome. Source of truth for wording. |
| `CONSENT.md` | The consent text, read from disk at request time and rendered on Screen 1. |
| `COMPREHENSION.md` | The three comprehension items and their pass rule. |
| `RESOLVE.md` | Resolved methodology decisions (randomization, rate limiting, validation, latency granularity). Historical — where it conflicts with this spec, this spec is current. |
| `migrations/*.sql` | Authoritative column list. |

When copy changes, update `server/content.js` / `server/screenContent.js` and `SURVEY_PAGES.md`;
only update this file if the *design* changed (items added or removed, conditions, flow, schema).

## Tech stack

- Frontend: vanilla HTML/CSS/JS (`public/app.js` renders every screen from a JSON payload), Tailwind CSS
- Backend: Node.js + Express (`server/`)
- Database: PostgreSQL (Railway add-on); migrations applied by `server/migrate.js`, run as Railway's
  pre-deploy command (`npm run migrate` locally)
- Hosting: Railway (`Procfile`, `railway.json`)

## CloudResearch Connect integration

Participants arrive at `/start` with `?participantId={id}` (optionally `&assignmentId={aid}&projectId={pid}`).
`participantId` is the unique participant identifier; `assignmentId` / `projectId` are stored alongside
the response data when present.

- On completion, redirect to the study's CloudResearch end-of-study redirect URL — copied from the
  Create-a-Study wizard and set verbatim via `CLOUDRESEARCH_COMPLETE_URL`. Reaching this URL is what
  marks the participant complete in Connect.
- On consent refusal, redirect to `CLOUDRESEARCH_TERMINATE_URL` if set, otherwise fall back to
  `CLOUDRESEARCH_COMPLETE_URL`. Nothing else screens anyone out: the comprehension check is
  pass-required with unlimited retries, and a failed attention check is recorded but does not end the survey.

**TODO (before go-live): configure a dedicated screen-out landing URL.** Consent refusals currently
fall back to the completion redirect when `CLOUDRESEARCH_TERMINATE_URL` is unset. Point it at a Connect
termination landing URL so screened-out participants are recorded separately (and can be paid a
screen-out fee). Already wired in `server/routes/screen.js` and `server/routes/start.js` — only the
env var is missing.

## Experimental design

Two between-subjects factors, assigned once at session start and stored server-side only.

### Factor 1 — data type (16 levels)

Each data type carries:

- `inline` — the short mid-sentence name used in the intro, comprehension check and scenarios
- `inline_b` — an alternate short name for Blocks A and B, where the bare noun would read oddly
  as a possessive ("communications" → "communications data"). Falls back to `inline`.
- `plural` / `plural_b` — grammatical number, so is/are, it/them and its/their agree
- `definition` — a second-person definition, shown verbatim (first letter lower-cased) as
  "By [name], we mean [definition]" in the intro, both scenarios, and every Block A/B header.
  Blocks A/B use `inline_b` as the name.

| # | `inline` | `inline_b` (if different) |
| --- | --- | --- |
| 1 | demographic information | — |
| 2 | government IDs | government ID data |
| 3 | voice data | — |
| 4 | financial information | — |
| 5 | communications | communications data |
| 6 | contacts and social media connections | — |
| 7 | location history | location history data |
| 8 | web browsing history | web browsing history data |
| 9 | photo library | photo library data |
| 10 | email management behavior data | — |
| 11 | administrative task behavior data | — |
| 12 | document edit history | document edit history data |
| 13 | work process recordings | — |
| 14 | streaming preferences | streaming preferences data |
| 15 | screen usage patterns | screen usage data |
| 16 | device motion sensor data | — |

Full `definition` values: `SURVEY_PAGES.md`, Page 3.

Ids were renumbered when the design went from 20 back to 16 types (2026-10); any rows collected
before then use the old numbering.

### Factor 2 — use case (2 levels)

One phrase per condition, used identically everywhere the use case appears (intro sentence,
comprehension statement 2, scenario "We will use this information to …", Block B header,
post-scenario intro):

- **B1 — service improvement:** "improve App Z's services"
- **B2 — AI training:** "train App Z's AI models and AI agents to improve its services"

### Within-participant randomization

- Order of the two scenarios (Subscription Discount, Data Sharing Program) — `scenario_order`
- Order of the 7 Block B questions — `block_b_order`
- Order of the 11 Block A items (10 questions + the attention check, pooled) — `block_a_order`

Blocks are never interleaved: Block B is always shown in full before Block A.
Response options stay in their listed order, except the Block B concerns multi-select, whose
options are shuffled per render with "Other" pinned last.

### Sample size

Block randomization across 16 × 2 = **32 cells**, target **100 per cell** (`TARGET_N = 3200`).
`server/randomization.js` keeps a shuffled bag of the assignments still needed to reach the
per-cell target, refilling it from live counts under a Postgres advisory lock; once every cell
is full it falls back to uniform random assignment.

## Survey flow (31 screens)

One question or scenario per screen, no back button. `current_screen` on the participant row is
the screen they should see next, so a reload or a returning link resumes exactly where they left off.

| # | Screen id | Content | Recorded |
| --- | --- | --- | --- |
| 1 | `consent` | Consent text + three Yes/No statements | `consent_age_ok`, `consent_read`, `consent_participate` |
| 2 | `welcome` | Orientation; no back navigation warning | — |
| 3 | `intro` | App Z setup, the recent change (data type + use case), then the comprehension check on the same screen | `comp_check_1/2/3_wrong_count`, `comp_check_fail_count` |
| 4 | `scenario_1` \| `scenario_2` | First scenario (per `scenario_order`) | scenario response |
| 5 | `scenario_transition` | "App Z took a different approach" beat | — |
| 6 | `scenario_2` \| `scenario_1` | Second scenario | scenario response |
| 7 | `post_scenario_intro` | Frames the Block B battery (data type + use case) | — |
| 8–14 | `postq_<id>` | Block B, 7 questions in `block_b_order` | one column per question |
| 15 | `block_a_intro` | Frames Block A ("regardless of its use") | — |
| 16–26 | `postq_<id>` | Block A, 11 items in `block_a_order` (10 questions + attention check) | one column per question |
| 27 | `open_response` | Two required free-text boxes | `open_data_revenue`, `open_data_ai_training` |
| 28 | `about_you_intro` | Transition into the about-you section | — |
| 29 | `ai_usage` | AI / social media / search frequency + two tech-sector items | 5 columns |
| 30 | `demographics` | Age, gender (+ other), education | 4 columns |
| 31 | `debrief` | Debrief + IRB protocol; button completes the study | sets `completed`, `completed_at` |

Consent refusal sends `current_screen` to `returned` and redirects out; completion sends it to
`complete`. Both clear the session cookie.

## Items

### Scenarios

Both scenarios share one voice-neutral, first-person design: a bold lead-in naming the program,
a settings-page frame (browser chrome, App Z sidebar, program description), then a bold question
below the frame with multi-select checkboxes. Inside the frame: the current price and default
no-collection/no-sale/one-year-deletion policy (generic "your information", *not* the assigned
data type), then what would change — "We will access or ask you to provide your [DATA TYPE]"
plus the definition ("By [DATA TYPE], we mean …"), "We will use this information to [USE]", and the offer. The frame
also carries a decorative "I agree / I do not agree" row with a blank amount; it is settings-UI
mock, not the participant's response.

Because the order is randomized, neither scenario is ever numbered for participants — the
"Scenario 1 / 2" labels below are internal identifiers.

**Scenario 1 — Subscription Discount.** Tiers offered as "select all that apply":
$1 off ($19/mo) · $3 off ($17/mo) · $5 off ($15/mo) · $8 off ($12/mo) · $12 off ($8/mo) · $20 off (Free),
plus a mutually exclusive decline that clears the others.
Stored: `s1_accepted_discounts TEXT[]` of tier codes `1off`…`20off`, and `s1_none BOOLEAN`.

**Scenario 2 — Data Sharing Program.** Revenue shares offered as "select all that apply":
1% · 10% · 25% · 50% · 75% · 99%, plus a mutually exclusive decline.
Stored: `s2_accepted_shares TEXT[]` of `1`/`10`/`25`/`50`/`75`/`99`, and `s2_none BOOLEAN`.

At least one box (or the decline) is required; the server rejects a decline submitted together
with accepted tiers, duplicates, and unknown tier codes.

### Block B — compensation for the use case (7 questions)

Every Block B screen repeats the same header before the bolded question: "Suppose App Z
collects your [DATA TYPE] to [USE CASE]. By [DATA TYPE], we mean [definition]." Two items use "wants to
collect" instead of "collects", since they describe a hypothetical rather than the stipulated
collection: `postq_coworker_sells_feel` and `postq_concerns`.

| id | Column | Question | Options |
| --- | --- | --- | --- |
| 7 | `postq_comp_by_amount` | Compensation based on **how much** of the data was used | Yes / No / Unsure / I don't care |
| 8 | `postq_comp_per_use` | Compensation each time the data is used | Yes / No / Unsure / I don't care |
| 9 | `postq_comp_by_effort` | Compensation based on **how much effort** it took to generate or provide | Yes / No / Unsure / I don't care |
| 10 | `postq_comp_by_originality` | Compensation for **how unique or original** the data is relative to others' | Yes / No / Unsure / I don't care |
| 11 | `postq_coworker_sells_feel` | Phone manufacturer collected the data and sold it to App Z — how would you feel? | Very upset / A little upset / Confused / Don't care at all / Happy for them |
| 12 | `postq_credit_ack` | Should you receive **credit or acknowledgement** when it is used? | 1–5, each labeled ("1: I definitely do not want to receive credit" … "5: I absolutely should receive credit") |
| 13 | `postq_concerns` | Main concern(s) about sharing this data with App Z | Multi-select, 8 options incl. "Other" + free text; order shuffled, "Other" last. Also writes `postq_concerns_other` |

### Block A — about the data type (10 questions + attention check)

No use case is mentioned anywhere in Block A. Each screen shows a one-line reminder header
("By financial information, we mean records of your money and accounts, such as …") before the
bolded question. The attention check has no header.

| id | Column | Question | Scale |
| --- | --- | --- | --- |
| 1 | `postq_importance` | Is this data important? | 1–5: not important to me at all → extremely important to me |
| 2 | `postq_sensitivity` | Is this data sensitive? | 1–5: not sensitive at all → extremely sensitive |
| 3 | `postq_ownership` | Do you feel ownership over it? | 1–5: I do not feel ownership over this type of data → I feel strong ownership over it |
| 4 | `postq_share_public` | Would you ever share it publicly? | 4 options, stored 0–3 (never → yes, with my name attached) |
| 5 | `postq_buy_sell_appropriate` | Is it appropriate to buy and sell it? | 1–5: Completely inappropriate → Completely appropriate |
| 6 | `postq_upset_if_leaked` | Released publicly without your knowledge — how would you feel? | 6 categorical options (not upset · a little uncomfortable · upset if named · upset even if anonymous · very upset either way · not sure) |
| 15 | `postq_identifiability` | How identifiable (traceable to you) is it? | 1–5: not identifiable at all → extremely identifiable |
| 16 | `postq_usefulness` | How useful is it to companies? | 1–5: not useful at all → extremely useful |
| 17 | `postq_replaceability` | How common or replaceable is it across people? | 1–5: unique to me / hard to replace → very common / easily replaceable |
| 18 | `postq_control` | How much control do you feel you have over it? | 1–5: no control at all → complete control |
| 14 | `attention_check` | Instructed-response item: select the lowest option (1) | 1–5, same anchors as `postq_importance`; stored as `attention_check_value` + `attention_check_pass` |

Likert endpoints are prefixed with their scale number ("1: not sensitive at all" … "5: extremely sensitive");
the middle points are unlabeled.

### Other measures

- **Screen 27 — open response.** Two required free-text boxes (5,000 char cap each):
  - `open_data_revenue` — "Many companies rely on user data to improve their services or sell user
    data as a source of revenue. How do you feel about companies using your data?"
  - `open_data_ai_training` — "Does your answer change if your data is being used to train AI
    models or AI agents?"
- **Screen 29 — AI usage & literacy.** Frequency of AI tools, social media, and search engines
  (7-point: more than once a day → never), plus current and past tech-sector employment
  (Yes / No / Prefer not to answer). Columns: `ai_tools_freq`, `social_media_freq`,
  `search_engine_freq`, `tech_current`, `tech_ever`.
- **Screen 30 — demographics.** Age band, gender (with "Other" free text → `gender_other`),
  education. Every question offers "Prefer not to answer".

## Comprehension check (Screen 3)

Three True/False statements below the narrative, introduced by "Based on the information above,
indicate whether each statement is True or False.":

1. (TRUE) App Z would like to access its users' [DATA TYPE].
2. (TRUE) App Z would use your data to [USE CASE].
3. (FALSE, identical for everyone) App Z guarantees that your data will be permanently deleted after 30 days.

Continue does not advance until the pattern is T, T, F; retries are unlimited and an incorrect
attempt shows an inline error. Recorded per item: `comp_check_1/2/3_wrong_count`, plus
`comp_check_fail_count` — incremented once per Continue click with any wrong answer. The server
re-verifies the pattern on submit as a safety net. **No comprehension screen-out.**

## Instrumentation

Per screen, one `events` row: `screen_id`, `timestamp_shown`, `timestamp_submitted`,
`latency_ms` (the difference), and `input_events` — a JSONB log of individual input
selections timestamped client-side, for finer-grained response dynamics.

On the participant row: condition assignment, the three randomized orders, the comprehension
counts, `attention_check_pass`, and every response column.

## Database schema

Two tables (`migrations/0001_init.sql`, `migrations/0002_survey_copy_update.sql`,
`migrations/0004_open_ai_training.sql`, and related additive migrations).

**`participants`** — one row per participant, written incrementally on every Continue so
attrition still yields usable partial rows:

- Identity: `id`, `participant_id` (unique), `assignment_id`, `project_id`, `session_token` (UUID, unique)
- Condition (server-only): `data_type SMALLINT CHECK (1–16)`, `use_case CHAR(2) CHECK ('B1','B2')`
- Orders: `scenario_order INT[]`, `block_b_order INT[]`, `block_a_order INT[]`
- State: `current_screen TEXT`
- Comprehension: `comp_check_1/2/3_wrong_count`, `comp_check_fail_count` (SMALLINT)
- Consent: `consent_age_ok`, `consent_read`, `consent_participate`
- Scenarios: `s1_accepted_discounts TEXT[]`, `s1_none`, `s2_accepted_shares TEXT[]`, `s2_none`
- Block A: `postq_importance`, `postq_sensitivity`, `postq_ownership`, `postq_share_public`,
  `postq_buy_sell_appropriate`, `postq_upset_if_leaked`, `postq_identifiability`,
  `postq_usefulness`, `postq_replaceability`, `postq_control`
- Block B: `postq_comp_by_amount`, `postq_comp_per_use`, `postq_comp_by_effort`,
  `postq_comp_by_originality`, `postq_coworker_sells_feel`, `postq_credit_ack`,
  `postq_concerns TEXT[]`, `postq_concerns_other`
- Attention check: `attention_check_value`, `attention_check_pass`
- Open response: `open_data_revenue`, `open_data_ai_training`
- AI usage: `ai_tools_freq`, `social_media_freq`, `search_engine_freq`, `tech_current`, `tech_ever`
- Demographics: `age_band`, `gender`, `gender_other`, `education`
- Lifecycle: `completed`, `created_at`, `completed_at`

**`events`** — one row per screen submission: `id`, `participant_id` (FK, cascade),
`screen_id`, `timestamp_shown`, `timestamp_submitted`, `latency_ms`, `input_events JSONB`.

## Security

- On first visit, `participantId` is format-validated and rejected if already present in the
  database (no duplicate participation). A server-side UUID session token is generated, stored
  on the participant row, and set as an httpOnly, SameSite=Lax cookie (`sid`, Secure in production).
- Condition assignments never leave the server. The client receives only rendered strings —
  no data-type number, no use-case code. `server/screenContent.js` is the boundary.
- CSRF: POSTs must carry the session token in an `X-Session-Token` header matching the cookie;
  the client fetches it from `GET /session-token`.
- A POST whose screen id does not match the participant's `current_screen` is rejected (409), so
  responses cannot arrive for the wrong screen.
- Server-side validation on every submit: unexpected radio/checkbox values rejected, free text
  capped (100 chars for "other" fields, 5,000 for the open response), JSON body capped at 64kb.
- Rate limit: per-participant deduplication plus a soft IP throttle — 15 new sessions per IP per
  rolling hour. **IPs are never persisted**: they are SHA-256 hashed with an in-memory salt that
  rotates daily, and only the hash is held in memory.
- Response headers: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`,
  restrictive `Permissions-Policy`, and HSTS in production.

## Presentation

- Clean, professional, minimal — an academic survey, not a product.
- One question or scenario per screen, with a Continue button at the bottom, disabled until every
  required input on the screen is answered (optional text fields excepted).
- Progress bar at the top, computed from the participant's own expanded screen order.
- No back button; participants cannot revisit previous screens.
- Mobile-responsive (some CloudResearch participants use phones).
- The scenarios render inside a settings-page frame by default; `?mode=plain` shows the same copy
  in a plain academic card (persisted in `sessionStorage` for the session). `?voice=appx` is
  accepted and forwarded but no longer changes any copy.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Railway Postgres |
| `CLOUDRESEARCH_COMPLETE_URL` | Study's end-of-study redirect URL |
| `CLOUDRESEARCH_TERMINATE_URL` | Optional screen-out / consent-refusal landing URL (falls back to the completion URL) |
| `ADMIN_PASSWORD` | HTTP basic auth for the admin exports; unset disables them |
| `NODE_ENV` | `production` enables Secure cookies and HSTS |
| `PORT` | Server port (default 3000) |

`SESSION_SECRET` appears in `.env.example` but is not read by the application.

## Admin endpoints

Behind HTTP basic auth (`admin` / `ADMIN_PASSWORD`):
`GET /admin/export.csv` (participants), `GET /admin/events.csv` (events),
`GET /admin/stats` (started and completed counts per cell — use this to watch cell fill).
