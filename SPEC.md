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

### Randomization
Each participant is randomly assigned to one cell at the start of the session. Two between-subjects factors:

Data type (11 levels — assign one per participant)
Use case (2 levels — assign one per participant)

Also randomize:

Order of Scenarios 1, 2, 3
Order of supplementary questions (S1–S9)

Store all assignments in the database row for this participant.

### Data Types (11)
Each has a short label and a full definition shown to participants:

Biometric identifiers — "Your biometric data, such as fingerprints, facial scans, and iris patterns."
Health/wearable data — "Data from health and fitness tracking, such as sleep patterns, heart rate, exercise activity, and step counts."
Financial transactions — "Your financial transaction history, including purchase records, bank statements, and payment activity."
Location history — "A record of your physical locations over time, based on GPS, Wi-Fi, or cell tower data."
Browsing/search history — "Your web browsing history, search queries, and media consumption (e.g., what you watch, listen to, or read online)."
Private messages — "The content of your private messages, including texts, emails, and direct messages."
Contacts/social graph — "Your contacts list and social connections — who you communicate with and how frequently."
Photos/videos — "Photos and videos stored on your device or uploaded to online services."
Personal documents/notes — "Personal documents, notes, and files you have created or stored digitally."
App interaction patterns — "Behavioral data about how you use apps — including what you click, how long you spend on different screens, and which features you use."
AI conversations — "The full text of your conversations with AI chatbots — including your questions, prompts, instructions, and the AI's responses, as well as any edits or regenerations you made."

### Use Case Conditions (2)

B1 (Personalization): "AppX uses this data to personalize your experience — showing you better recommendations, more relevant search results, and targeted ads."
B2 (GenAI Training): "AppX uses this data to train and improve a generative AI system (like a chatbot, writing assistant, or image generator)."

### Survey Flow
Screen 1: Consent
Display the consent information (I'll provide the full text separately). Three checkboxes at the bottom, all must be Yes to proceed:

"I am age 18 or older"
"I have read and understand the information above"
"I want to participate in this research and continue with the survey"

If any checkbox is No, show a message and redirect to Prolific return URL.
Screen 2: Scenario Introduction
"Imagine you subscribe to AppX, an online service from a technology company. You currently pay $20/month for this service."
Then show the assigned use case condition text (B1 or B2).
Screen 3: Data Type Introduction
Show the assigned data type label and full definition.
Include a "Learn more" expandable/collapsible section with a slightly longer explanation of the data type. Track whether the participant clicks this (boolean) and timestamp the click.
Screen 4: Comprehension Check
Two multiple-choice questions (4 options each). One verifies the data type, one verifies the use case. Correct answers depend on the assigned condition.
If participant fails either question: show the scenario and data type info again, let them retry once. If they fail again on the retry, end the survey and redirect to Prolific return URL. Log the failure.
Screens 5–7: Scenarios 1, 2, and 3 (order randomized)
Scenario 1 — Discount valuation:
"AppX offers you a discount on your $20/month subscription if you agree to share your [DATA TYPE] to [USE CASE VERBATIM]."
"For each discount amount below, would you share your data?"
Display a table with rows for each discount level. Each row has the discount amount and Yes/No radio buttons:

$1 off / month ($19/mo)
$3 off / month ($17/mo)
$5 off / month ($15/mo)
$8 off / month ($12/mo)
$12 off / month ($8/mo)
$20 off / month (Free)
"I would not share at any price" (standalone option at bottom)

Scenario 2 — Feature tradeoff:
"Reminder: AppX would use your [DATA TYPE] to [USE CASE VERBATIM]."
"Instead of a discount, AppX offers you an additional feature in exchange for sharing your [DATA TYPE]."
"The feature is: Premium features — priority access to new features, additional storage, and an ad-free experience."
"Would you share your [DATA TYPE] in exchange for this feature?"

◯ Yes
◯ No
◯ Not sure

Scenario 3 — Data marketplace:
"Now imagine a different arrangement."
"You pay $20 per month for AppX. By default, AppX does not record, store, or sell your [DATA TYPE]."
"AppX offers you the option to join a data marketplace program. If you opt in:"

"AppX will sell your [DATA TYPE] to third-party companies on your behalf."
"You will receive a percentage of the selling price back as a discount on your monthly subscription."
"You can opt out at any time, but data that has already been sold cannot be taken back."

"For each revenue share below, would you participate?"
Revenue shareParticipate?You receive 10% of the selling price◯ Yes ◯ NoYou receive 50% of the selling price◯ Yes ◯ NoYou receive 90% of the selling price◯ Yes ◯ NoI would not participate at any revenue share◯ (standalone checkbox)
If all responses are "No" (or the standalone option is checked), show follow-up: "What is the main reason you chose not to participate?"

◯ I don't want my data sold at any price
◯ I don't trust AppX to handle this correctly
◯ I'm uncomfortable with third-party buyers
◯ The data cannot be taken back once sold
◯ Something else [text field]

Screen 8: Supplementary Questions (order randomized)
All questions reference the assigned data type by name. Present on one page or paginated — either is fine. Randomize order.

S1: "How sensitive do you consider this data?" (1–5, labeled "Not at all sensitive" to "Extremely sensitive")
S2: "How much harm could result if this data were misused?" (1–5, labeled "No harm" to "Severe harm")
S3: "How do you feel about sharing this data for compensation?" (Comfortable / Willing but uneasy / Reluctant / Unwilling at any price)
S4: "What is your primary concern about sharing this data?" (Not concerned / Too personal / Could manipulate me / Could impersonate me / Don't trust company / Not sure)
S5: "How much would sharing this data improve the service you receive?" (1–5, labeled "Not at all" to "Very much")
S6: "How well do you understand what this data reveals about you?" (1–5, labeled "Not at all" to "Very well")
S7: "If you shared this data, could you effectively take it back?" (Yes / Partially / No)
S8: "How valuable do you think this data is to companies?" (1–5, labeled "Not at all valuable" to "Extremely valuable")
S9: "Do you currently share this type of data with any app or service?" (Yes / No / Unsure)

Screen 9: Compensation Model Preferences
"If companies were to compensate you for using your data, which model would you prefer? Rank from most to least preferred."
Implement as a drag-and-drop ranking or numbered dropdown:

Per-transaction payment — "Paid each time your data is accessed or used"
Royalty model — "Ongoing percentage of revenue generated from your data"
Subscription discount — "Reduced price on services in exchange for data sharing"
Data dividend — "Periodic lump-sum payment from company profits"
Wage-like compensation — "Regular payments treating data contribution as labor"

After ranking, for each model show:

"How fair is this model?" (1–5)
"How practical is this model?" (1–5)

Screen 10: AI Usage & Literacy
"How often do you use AI tools (such as ChatGPT, Claude, Gemini, Copilot, etc.)?"

Never / Tried once or twice / Monthly / Weekly / Daily

Screen 11: Attitude Battery
"Please indicate how much you agree or disagree with each statement." (1–7, Strongly Disagree to Strongly Agree, order of items randomized)

"I am comfortable with companies using my data to improve AI systems."
"AI companies should compensate users whose data trains their models."
"I trust technology companies to handle my data responsibly."
"Data I generate through AI interactions belongs to me, not the AI company."
"I would rather pay more for a service than share my personal data."
"The benefits of AI development outweigh concerns about data collection."

Screen 12: Demographics
All questions include "Prefer not to answer" as an option.

Age: 18–24 / 25–34 / 35–44 / 45–54 / 55–64 / 65+ / Prefer not to answer
Gender: Man / Woman / Non-binary / Other [text] / Prefer not to answer
Education: Less than high school / High school / Some college / Bachelor's degree / Graduate degree / Prefer not to answer
Household income: Less than $25,000 / $25,000–$49,999 / $50,000–$74,999 / $75,000–$99,999 / $100,000–$149,999 / $150,000+ / Prefer not to answer
Employment: Full-time / Part-time / Self-employed / Student / Unemployed / Retired / Prefer not to answer
"Do you work in the technology industry?" Yes / No / Prefer not to answer

Screen 13: Debrief
"Thank you for completing this study."
"This research examines how people value different types of personal data under different conditions of use. Some participants were told data would be used for personalization, while others were told it would train generative AI. We are studying whether the purpose of data collection changes how people think about sharing their data."
"Your responses will help inform policy discussions about data governance in the age of AI. If you have questions, please contact Cole Frank at colefran@andrew.cmu.edu."
"IRB Protocol: [Number] — Carnegie Mellon University"
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
- Rate limit: max 1 submission per IP per hour.

### Data Tracking Requirements
For every screen/question, record:

participant_id (Prolific PID)
screen_id (which screen)
timestamp_shown (when the screen was displayed)
timestamp_submitted (when the participant clicked Continue/submitted)
response_latency_ms (difference between shown and submitted)

Additional tracking:

learn_more_clicked (boolean, Screen 3)
learn_more_click_timestamp (if clicked)
comprehension_check_1_correct (boolean)
comprehension_check_2_correct (boolean)
comprehension_retry (boolean — did they need a retry)
scenario_order (array, e.g., [2,1,3])
supplementary_question_order (array of S1–S9 order shown)
attitude_item_order (array of attitude items order shown)

### Database Schema
Two tables:
participants — one row per participant:

id (primary key)
prolific_pid, study_id, session_id
data_type (1–11)
use_case (B1 or B2)
scenario_order (JSON array)
supp_question_order (JSON array)
attitude_item_order (JSON array)
learn_more_clicked (boolean)
learn_more_click_ts (timestamp)
comp_check_1_correct, comp_check_2_correct (boolean)
comp_check_retry (boolean)
completed (boolean)
created_at, completed_at (timestamps)
All response fields (scenario 1 price list responses, scenario 2 response, scenario 3 response, scenario 3 follow-up reason, S1–S9, compensation rankings, fairness/practicality ratings, AI usage, attitude items 1–6, all demographics)

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