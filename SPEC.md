## Project: Survey Experiment Website
Build a web-based survey experiment for a research study on data sharing preferences. The survey will be hosted on Railway and participants will be recruited via Prolific.
Tech Stack

Frontend: HTML/CSS/JS (vanilla or lightweight framework), Tailwind CSS for styling
Backend: Node.js with Express
Database: PostgreSQL (Railway provides this as an add-on)
Hosting: Railway

### Prolific Integration

Participants arrive via Prolific with URL parameters: ?PROLIFIC_PID={pid}&STUDY_ID={sid}&SESSION_ID={ssid}
Store all three parameters with the response data
On survey completion, redirect to Prolific's completion URL: https://app.prolific.com/submissions/complete?cc={COMPLETION_CODE} (completion code set via env var)
On consent refusal or failed comprehension checks, redirect to Prolific's "return" URL

**TODO (before go-live): add a Prolific screen-out completion code.** Currently consent refusals and second-attempt comprehension failures are sent to the "return" URL (unpaid return). Instead, create a second Prolific completion code designated as a screen-out, expose it as a new env var (e.g. `PROLIFIC_SCREENOUT_CODE`), and redirect those participants to https://app.prolific.com/submissions/complete?cc={SCREENOUT_CODE} so they are recorded as screened out (and can be paid a small screen-out fee). Implementation is ~10 lines in server/routes/screen.js; make it opt-in — fall back to the current return-URL behavior when the env var is unset.

### Randomization
Each participant is randomly assigned to one cell at the start of the session. Two between-subjects factors:

Data type (16 levels — assign one per participant)
Use case (2 levels — assign one per participant)

Also randomize:

Order of Scenarios 1 and 2
Order of the 14 post-scenario items (Block A + Block B + one attention check), randomized together; each shown on its own screen

Target N = 3,200 — block-randomized to 100 participants per cell across the 16 × 2 = 32 cells.

Store all assignments in the database row for this participant.

### Data Types (16)
Each data type belongs to one of six data categories and has both a short description and a longer description (with examples). The short description is shown as the data type's definition when it is introduced (Screen 4) and in the comprehension check; the longer description is shown in the "Learn more" expansion on Screen 4. The data category is internal and never shown to participants:

| Data Type | Short Description | Longer Description | Category |
| --- | --- | --- | --- |
| Demographic info | Name, age, gender, ZIP code, marital status | Basic identifying and demographic information such as your full name, date of birth, sex or gender, home ZIP code, and marital status. | Demographic/Identity |
| Social security number | Your 9-digit SSN | Your Social Security number, used for tax reporting, credit checks, and identity verification. | Demographic/Identity |
| Fingerprint and voice recording data | Biometric data from your body | Your stored fingerprints, such as from unlocking your phone, and recordings of your voice, such as from voice assistants or phone calls. | Demographic/Identity |
| Health information | Medical records and prescriptions | Information about your health, including doctor's appointments, lab and test results, diagnosed conditions, and prescription medications. | Sensitive Personal |
| Financial information | Bank statements, taxes, transactions | Your financial records, including bank and credit card statements, tax documents, and transaction history. | Sensitive Personal |
| Password and login credential data | Passwords, PINs, and security keys | The passwords, PINs, and security credentials you use to log in to websites, apps, and accounts. | Sensitive Personal |
| Text message and email content | Content of your private communications | The actual content of your text messages, emails, and direct messages — what you wrote and what you received. | Relational/Communicative |
| Contact info of friends and family | Names, numbers, and emails of people you know | The names, phone numbers, email addresses, and other contact details of people stored in your phone or email contacts. | Relational/Communicative |
| Location history | A record of where you've been | A log of your physical locations over time, based on GPS, Wi-Fi, or cell tower data from your phone or other devices. | Behavioral/Preference |
| Browsing and search history | Websites visited and searches made | A record of the websites you've visited, links you've clicked, and queries you've typed into search engines. | Behavioral/Preference |
| Shopping and purchase history | What you've bought and where | A record of your purchases — what you bought, when, where, and how much you paid — across online and in-store transactions. | Behavioral/Preference |
| Document, note, and report data | Files you've written for work or school | Documents, notes, essays, reports, and other files you've created for professional or academic purposes. | Expressive |
| Photo and video data | Images and recordings from your camera | Photos and videos you've personally captured and stored on your device or uploaded to cloud services. | Expressive |
| Email triage behavior | How you sort, flag, and manage your inbox | Behavioral patterns in how you manage email — the order you open messages, what you archive versus flag versus defer, and how you edit drafts before sending, but not the content of the emails themselves. | Process |
| Search and decision trajectory data | How you research and make decisions online | The sequence of steps you take when researching a decision online, such as the tabs you open, options you compare, filters you apply, and how long you spend before choosing when booking flights, shopping, or comparing services. | Process |
| Writing and editing process | How you draft, revise, and re-write | The sequence of keystrokes, deletions, rewrites, and pauses as you compose a document or message, including what you typed and then deleted, how long you paused between sentences, and how many times you revised a paragraph, but not the final version itself. | Process |

### Use Case Conditions (2)

B1 (Personalization): "AppX uses this data to personalize your experience — showing you better recommendations, more relevant search results, and targeted ads."
B2 (GenAI Training): "AppX uses this data to train and improve a generative AI system (like a chatbot, writing assistant, or image generator)."

Each use case also has a `[DATA USE]` noun form, used by the post-scenario questions (Block B) that read "…was used for [DATA USE]":

B1 [DATA USE]: "personalizing your experience — better recommendations, more relevant search results, and targeted ads"
B2 [DATA USE]: "training and improving a generative AI system (like a chatbot, writing assistant, or image generator)"

### Survey Flow
Screen 1: Consent
Display the consent information (I'll provide the full text separately). Three checkboxes at the bottom, all must be Yes to proceed:

"I am age 18 or older"
"I have read and understand the information above"
"I want to participate in this research and continue with the survey"

If any checkbox is No, show a message and redirect to Prolific return URL.
Screen 2: Welcome
"Welcome!"
"This survey has multiple-choice and checkbox questions, with one open-ended response question. Once you advance, you will not be able to return to previous places, so please consider each question carefully before clicking next."
"Click "Continue" when you are ready to begin."
Screen 3: Scenario Introduction (AppX setup)
"You use an online service, called AppX! You currently pay $20 per month to use it."
"By default, AppX does not record, store, or sell any of your information beyond what is strictly necessary to operate the service. AppX also deletes any data it holds after one year."
(The use case is NOT shown here — it is introduced on Screen 4 alongside the data type.)
Screen 4: Data Type Introduction (data type + use case)
Introduce the assigned data type and use case together, e.g.:
"Earlier this year, AppX became interested in collecting [DATA TYPE], which is [short description]."
"AppX would like to use your [DATA TYPE] for [DATA USE]."
Between those two lines, include a "Learn more about the data in question" expandable/collapsible with the type's longer description (with examples). Track whether the participant clicks this (learn_more_clicked boolean + timestamp).
Screen 5: Comprehension Check
"Based on the scenario you just read, indicate whether each statement is True or False." Three True/False statements (see COMPREHENSION.md):
- (data type — TRUE) "The data you would share with AppX is: [assigned data type's short description]."
- (use case — TRUE) "AppX would use your data to [assigned use case verbatim]."
- (FALSE — same for everyone) "AppX guarantees that your data will be permanently deleted after 30 days."
Recorded as comp_check_1/2/3_correct. If the participant misses any statement: show the AppX setup and data-type info again, let them retry once. If they fail again on the retry, end the survey and redirect to Prolific return URL. Log the failure (comp_check_retry).
Screens 6–7: Scenarios 1 and 2 (order randomized)
(The "Scenario 1 / Scenario 2" labels below are internal identifiers only. Because the order is randomized, each is shown to participants with a neutral, unnumbered "Scenario" heading — no copy may imply that one comes before another.)
Scenario 1 — Discount valuation:
"AppX offers you a discount on your $20/month subscription if you agree to share your [DATA TYPE] to [USE CASE VERBATIM]."
"What is the least you would accept in exchange for sharing your data?"
Single-select — the participant picks ONE radio (the least discount they would accept), or the standalone "would not share" option. Stored in s1_min_share as the tier code ('1off'…'20off') or 'none'.

$1 off / month ($19/mo)
$3 off / month ($17/mo)
$5 off / month ($15/mo)
$8 off / month ($12/mo)
$12 off / month ($8/mo)
$20 off / month (Free)
"I would not share at any price" (standalone option at bottom)

Scenario 2 — Data marketplace:
(The intro line and the next two lines are shown as plain paragraphs; the three "if you opt in" lines below are shown as a bulleted list.)
"Imagine the following arrangement with AppX."
"You pay $20 per month for AppX. By default, AppX does not record, store, or sell your [DATA TYPE]."
"AppX offers you the option to join a data marketplace program. If you opt in:"

"AppX will sell your [DATA TYPE] to third-party companies on your behalf."
"You will receive a percentage of the selling price back as a discount on your monthly subscription."
"You can opt out at any time, but data that has already been sold cannot be taken back."

"What is the least revenue share you would accept to sell your data?"
Single-select — the participant picks ONE radio (the least revenue share they would accept), or "I would not participate at any revenue share." Stored in s2_min_share as '10' / '50' / '90' or 'none'.

◯ You receive 10% of the selling price
◯ You receive 50% of the selling price
◯ You receive 90% of the selling price
◯ I would not participate at any revenue share (standalone option)
If they select "I would not participate," show follow-up: "What is the main reason you chose not to participate?"

◯ I don't want my data sold at any price
◯ I don't trust AppX to handle this correctly
◯ I'm uncomfortable with third-party buyers
◯ The data cannot be taken back once sold
◯ Something else [text field]

Screens 8–21: Post-Scenario Questions
Fourteen items — the 13 questions below plus one attention check — each shown on its own screen. All 14 are pooled and randomized together into one random screen order. [DATA TYPE] = the assigned data type's label; [DATA USE] = the assigned use case's [DATA USE] form (see Use Case Conditions). Response options appear in the order listed (no within-question option randomization). For Likert (1–5) items, each endpoint label is shown prefixed with its scale number — e.g., "1: Not at all" … "5: Extremely".

Block A — about the data type

A1: "Is [DATA TYPE] important to you?" (1–5, labeled "not important to me at all" to "extremely important to me")
A2: "Do you consider [DATA TYPE] sensitive data?" (1–5, labeled "not sensitive at all" to "extremely sensitive")
A3: "Do you feel ownership over [DATA TYPE]?" (1–5, labeled "I do not feel ownership over this type of data" to "I feel strong ownership over it")
A4: "Would you ever share your [DATA TYPE] publicly – for example with a room of people you have never met before? Choose the option that best describes how far you'd be willing to go:"
  - No — I would never share it publicly. (0)
  - Maybe — it would depend on the situation. (1)
  - Yes, but only without my name attached (anonymously). (2)
  - Yes, including with my name attached. (3)
A5: "Is it appropriate to buy and sell your [DATA TYPE]?" (1–5, labeled "Completely inappropriate" to "Completely appropriate")
A6: "If you found out your [DATA TYPE] had been released publicly without your knowledge, how upset would you be?" (1–5, labeled "not at all" to "Extremely")

Block B — about compensation for the use case

B1: "Assuming your [DATA TYPE] was used for [DATA USE], should you be compensated based on how much of your data was used?" (Yes / No / Unsure)
B2: "Assuming your [DATA TYPE] was used for [DATA USE], should you be compensated each time it's used?" (Yes / No / Unsure)
B3: "Assuming your [DATA TYPE] was used for [DATA USE], should you be compensated based on how hard it was to generate the data?" (Yes / No / Unsure)
B4: "Assuming your [DATA TYPE] was used for [DATA USE], should you be compensated for how original your data is relative to others'?" (Yes / No / Unsure)
B5: "Assuming a coworker got a hold of your [DATA TYPE] and managed to sell it to a company using it for [DATA USE], how would you feel?" (Very upset / A little upset / Confused / Don't care at all / Happy for them)
B6: "Should you receive credit or acknowledgement for [DATA TYPE] when your data is used for [DATA USE]?" (1–5, labeled "Not at all" to "Completely")
B7: "What is/are your main concern(s) about sharing your [DATA TYPE] for [DATA USE]? (Please check all that apply)" (checkboxes, multi-select): I'm not concerned / It's too personal or sensitive / It could be used to manipulate me / It could be used to impersonate or represent me / I don't trust the company to protect it / I'm not sure

Attention check (pooled and randomized together with A1–B7)

AC: "This is an attention check. To show you are reading carefully, please select the lowest option, 'not important to me at all' (1)." (1–5, labeled "not important to me at all" to "extremely important to me"; correct response = 1)
Record whether the participant selected the instructed response (attention_check_pass, boolean). Failing is recorded but does not end the survey.

Screen 22: Open-Ended Response
Its own screen, after the post-scenario battery and before AI usage. Optional free-text box (stored in open_data_revenue; blank allowed).
"A lot of companies rely on user data. Sometimes, selling user data is a major revenue stream. Or user data may be critical to their main product so that their revenue stream indirectly depends on user data. How do you feel about your online data being a source of revenue for companies? Does your answer change if your data is being used to train AI tools?"
[Open-ended response text box]

Screen 23: AI Usage & Literacy
How often do you use AI tools (where AI is the core feature), such as AI chatbots, AI email composition, AI writing assistants, AI schedulers, or AI image generators? ◯ More than once a day ◯ Daily ◯ A few times a week ◯ Weekly ◯ Between weekly and monthly ◯ Tried once or twice ◯ Never

How often do you use social media apps, like Instagram, Facebook, TikTok, Reddit, Snapchat, Retro, and others? ◯ More than once a day ◯ Daily ◯ A few times a week ◯ Weekly ◯ Between weekly and monthly ◯ Tried once or twice ◯ Never

How often do you use search engines, like Google, Bing, DuckDuckGo, Baidu, Ecosia, and Yahoo search? ◯ More than once a day ◯ Daily ◯ A few times a week ◯ Weekly ◯ Between weekly and monthly ◯ Tried once or twice ◯ Never

Do you currently work in the technology sector? ◯ Yes ◯ No ◯ Prefer not to answer

Have you ever worked in the technology sector? ◯ Yes ◯ No ◯ Prefer not to answer

Screen 24: Demographics
All questions include "Prefer not to answer" as an option.

Age: 18–24 / 25–34 / 35–44 / 45–54 / 55–64 / 65+ / Prefer not to answer
Gender: Man / Woman / Non-binary / Other [text] / Prefer not to answer
Education: Less than high school / High school / Some college / Bachelor's degree / Graduate degree / Prefer not to answer

Screen 25: Debrief
"Thank you for completing this study."
"The purpose of this study is to understand how people value different types of personal data, and whether their preferences change depending on what the data will be used for—particularly when it is used to train generative AI systems versus more traditional uses like advertising and recommendations.
The "AppX" service in this survey was hypothetical. No company called AppX collected any of your information, and your responses to the scenarios will not be shared with any third party."
"Your responses will help inform policy discussions about data governance in the age of AI. If you have questions, please contact Sarah Cen at sarah.cen@gmail.com."
"IRB Protocol: STUDY2026_00000225 — Carnegie Mellon University"
[Button: "Complete study" → redirects to Prolific completion URL]

### Security
- On first visit, validate that PROLIFIC_PID is present and not 
  already in the database. Generate a server-side session token 
  (UUID) and store it with the participant record. Use this token 
  to authenticate all subsequent requests.
- Condition assignments (data type, use case) are stored 
  server-side only. The client never receives or transmits 
  condition identifiers.
- Reject duplicate PROLIFIC_PIDs.
- Rate limit: per-PID deduplication plus a soft IP throttle (max 15 new sessions per IP per hour). IPs are never persisted (hashed with a daily salt).

### Data Tracking Requirements
For every screen/question, record:

participant_id (Prolific PID)
screen_id (which screen)
timestamp_shown (when the screen was displayed)
timestamp_submitted (when the participant clicked Continue/submitted)
response_latency_ms (difference between shown and submitted)

Additional tracking:

learn_more_clicked (boolean, Screen 4)
learn_more_click_timestamp (if clicked)
comprehension_check_1_correct, comprehension_check_2_correct, comprehension_check_3_correct (boolean)
comprehension_retry (boolean — did they need a retry)
scenario_order (array, e.g., [2,1])
post_question_order (array giving the randomized order of the 14 post-scenario items: the 13 questions + attention check)
attention_check_pass (boolean — did they select the instructed response)

### Database Schema
Two tables:
participants — one row per participant:

id (primary key)
prolific_pid, study_id, session_id
data_type (1–16)
use_case (B1 or B2)
scenario_order (Postgres integer array, INT[])
post_question_order (Postgres integer array, INT[])
learn_more_clicked (boolean)
learn_more_click_ts (timestamp)
comp_check_1_correct, comp_check_2_correct, comp_check_3_correct (boolean)
comp_check_retry (boolean)
completed (boolean)
created_at, completed_at (timestamps)
All response fields (Scenario 1 least-acceptable discount (s1_min_share); Scenario 2 least-acceptable revenue share (s2_min_share) + follow-up reason; the 13 post-scenario responses — Block A A1–A6 and Block B B1–B7, with B7 stored as a multi-select; the attention-check response + attention_check_pass flag; the open-ended response (open_data_revenue); the Screen 23 AI/social-media/search usage-frequency items plus the two tech-sector employment items; all demographics)

events — one row per screen view, for latency tracking:

id (primary key)
participant_id (foreign key)
screen_id (string)
timestamp_shown, timestamp_submitted (timestamps)
latency_ms (integer)

### Design Guidelines

Clean, professional, minimal design. This is an academic survey, not a product.
One question or scenario per screen. Clear "Continue" button at the bottom.
Progress bar at the top showing completion percentage.
Mobile-responsive (some Prolific participants use phones).
No back button — participants cannot revisit previous screens.
All radio buttons must be selected before "Continue" is enabled (except optional text fields).

### Environment Variables

DATABASE_URL (Railway Postgres)
PROLIFIC_COMPLETION_CODE
PORT