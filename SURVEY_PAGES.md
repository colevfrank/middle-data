# Survey pages (participant-facing copy)

Page-by-page text as currently assembled from `server/content.js` and `server/screenContent.js`.

**Placeholders** (curly braces) mark text that varies by assigned condition. Under each page that uses them, possible values are listed.

- `{definition}` — second-person definition, shown as “By `{inline}`, we mean `{definition}`” (first letter lower-cased) in the intro, scenarios, and Block A/B headers
- `{inline}` — short mid-sentence data-type name (intro, scenarios, …)
- `{inline_b}` — Block A/B short name (same as `{inline}` except where noted, e.g. streaming preferences data)
- `{data_use}` — use-case phrase (same wording as `comp_use` / `scenario_use` in code)

Scenario order (Subscription Discount vs Data Sharing Program) is randomized. Block B questions are randomized within Block B; Block A questions (plus the attention check) are randomized within Block A. Block B is always shown before Block A.

**Optional slider follow-ups:** When `ENABLE_SCENARIO_SLIDER_FOLLOWUPS` is `true` in `server/surveyFeatures.js`, each scenario is immediately followed by an identical page that asks for a minimum acceptable amount via a slider instead of checkboxes. Set that flag to `false` to remove both pages.

---

## Page 1 — Consent

**Heading:** Informed Consent

*(Full consent text from `CONSENT.md`:)*

This survey is part of a research study conducted by Cole Frank and Sarah Cen at Carnegie Mellon University.

#### Purpose
This study examines how people feel and think about their digital information.

#### Procedures
You will be shown a survey of questions. The survey takes approximately 10-15 minutes.

#### Participant Requirements
Participation in this study is limited to individuals age 18 and older who are U.S. residents and fluent in English.

#### Risks
Risks are minimal. Some questions ask you to consider your choices in a hypothetical world. You may exit at any time without penalty.

#### Benefits
There are no direct benefits to you. The research aims to inform academic and policy discussions.

#### Compensation & Costs
You will receive $4 through CloudResearch upon completion of the survey. Partial completions are not compensated; if you believe you should be compensated but were not due to an error, you may contact the research team.

#### Future Use of Information
We may release, share, or reuse the data. Any released or shared data will be first de-identified so that no responses can be traced back to you. Such release, sharing, and reuse will not require further consent from you.

#### Confidentiality
Your responses are anonymous. We collect only your CloudResearch participant ID for the purpose of issuing payment and preventing duplicate participation. This ID will be removed before any data analysis. We will collect your responses to our questions and your interaction with our interface. We will not collect further information (e.g., we will not collect your browsing history).

#### Right to Ask Questions & Contact Information
If you have any questions about this study, you should feel free to ask them by contacting the Principal Investigator at:
Sarah Cen
Engineering and Public Policy
sarahcen@andrew.cmu.edu
If you have questions later, desire additional information, or wish to withdraw your participation please contact the Principal Investigator by e-mail in accordance with the contact information listed above.

If you have questions pertaining to your rights as a research participant; or to report concerns to this study, you should contact the Office of Research Integrity and Compliance at Carnegie Mellon University (email: irb-review@andrew.cmu.edu; phone: 412-268-4721).

#### Voluntary Participation
Your participation in this research is voluntary.  You may discontinue participation at any time during the research activity by closing the browser window.  You may print a copy of this consent form for your records.

**Checkboxes** (each Yes / No; all must be Yes to continue):

- I am age 18 or older.
- I have read and understand the information above.
- I want to participate in this research and continue with the survey.

**Button:** Continue

---

## Page 2 — Welcome

**Heading:** Welcome!

In the following pages, you’ll answer some questions. Then, you’ll be redirected back to CloudResearch once you complete the survey. 

Once you advance, you will not be able to return to previous pages, so please consider each question carefully before clicking next.

Click "Continue" when you are ready to begin.


**Button:** Continue

---

## Page 3 — Intro (App Z setup + recent change + comprehension)

**Heading:** Imagine you're a frequent user of App Z!

App Z is an online service that you use often.

**Pricing**

You currently pay $20 per month for App Z.

**Privacy**

By default, App Z does not record or store any of your information beyond what is strictly necessary to operate the service. App Z does not sell your information, and App Z also deletes any data it holds after one year.

**But there has been a recent change**

Earlier this year, App Z became interested in its users' `{inline}`. By `{inline}`, we mean `{definition}`
*(“users' `{inline}`” is bold + underlined.)*

App Z would like to use your `{inline}` to `{data_use}`.

`{definition}`:

1. Basic facts about who you are, such as your age, gender, race, level of education, marital status, income level, occupation, and state of residence.
2. Government-issued identification, such as your driver's license, passport, or visa.
3. Recordings of your voice, such as voice messages you've sent, voice recordings you've dictated, and conversations with voice assistants.
4. Records of your bank accounts, balances, and statements as well as your investments, income, credit history, and credit score.
5. Emails, text messages, and direct messages on social media apps.
6. The list of people in your phone contacts and your connections on social media (friends, followers, followed accounts).
7. A record of where you travel and when, such as your path to work, home, and other places.
8. A record of the URLs you visit online and timestamps of these visits.
9. The photos and videos stored on your phone or in your cloud account, including pictures of you, other people, and places.
10. A record of how you manage your email inbox, such as when and how you open, archive, delete, label, or reply to emails.
11. Screen recordings of how you carry out errands on the computer, such as booking flights, filling out forms, filing documents, and managing your calendar (personal data can be redacted).
12. A record of changes to your documents, presentations, or code, such as how Google/Word Docs or Google/PowerPoint Slides are drafted and revised.
13. Screen or video recordings of your computer as you do work, showing the steps you take to complete a task from start to finish.
14. A record of what you watch and listen to on streaming platforms, such as the shows, movies, and music you choose, how you interact with them, and how you rate them.
15. A record of how you use your device, such as which apps you open, how long you spend in each, and how you move between them — not the specifics of what is shown on your screen.
16. Readings from your phone's motion sensors that capture how you physically move and handle your device, such as when walking, driving, or picking it up.


`{inline}`:

1. demographic information
2. government IDs
3. voice data
4. financial information
5. personal communications data
6. contacts and social media connections
7. location history
8. web browsing history
9. photo library
10. email management data
11. errand-related screen recordings
12. document editing history
13. work-related screen recordings
14. streaming preferences
15. screen usage data
16. phone motion sensor data

`{data_use}`:

1. improve App Z's services
2. train App Z's AI models and AI agents to improve its services

**Comprehension check**

Based on the information above, indicate whether each statement is True or False.

1. App Z would like to use its users' `{inline}`. *(True)*
2. App Z would use your data to `{data_use}`. *(True)*
3. App Z guarantees that your data will be permanently deleted after 30 days. *(False)*

`{inline}`: *(same list as above)*

`{data_use}`: *(same list as above)*

**Button:** Continue *(gated until answers are T, T, F)*

---

## Page 4 / 6 — Scenario: Subscription Discount

*(Order of this page vs. Data Sharing Program is randomized; a transition page sits between them.)*

**Heading:**

👉 We’d like you to imagine that you open App Z one day and you see the window below. App Z is offering you the option to receive a Subscription Discount: *(program name underlined)*

**Settings frame — Subscription**

You currently pay $20 per month for our app. By default, we do not record or store your information; we do not sell your information; and we delete all information after one year.

We are now offering you the option to receive a Subscription Discount. If you agree:

We will access or walk you through instructions on how to provide your `{inline}`. By `{inline}`, we mean `{definition}`

Example: We will access or walk you through instructions on how to provide your financial information. By financial information, we mean records of your bank accounts, balances, and statements as well as your investments, income, credit history, and credit score.

We will use this information to `{data_use}` *(data use underlined)*

We would like to offer you a monthly discount on your subscription for sharing this data.

☐ I agree   [ ____ ] $ / month discount
☐ I do not agree
*(decorative settings UI, red-tinted; agree + amount on one line, disagree on the next)*

`{inline}`:

1. demographic information
2. government IDs
3. voice data
4. financial information
5. personal communications data
6. contacts and social media connections
7. location history
8. web browsing history
9. photo library
10. email management data
11. errand-related screen recordings
12. document editing history
13. work-related screen recordings
14. streaming preferences
15. screen usage data
16. phone motion sensor data

`{data_use}`:

1. improve App Z's services
2. train App Z's AI models and AI agents to improve its services

**Question:** Please select what discount you would be willing to accept (select all that apply):

- I would accept if I receive $1 off / month (which means my subscription is $19/mo)
- I would accept if I receive $3 off / month (which means my subscription is $17/mo)
- I would accept if I receive $5 off / month (which means my subscription is $15/mo)
- I would accept if I receive $8 off / month (which means my subscription is $12/mo)
- I would accept if I receive $12 off / month (which means my subscription is $8/mo)
- I would accept if I receive $20 off / month (which means my subscription is Free)
- I would not share this data regardless of the discount amount *(mutually exclusive)*

**Button:** Continue

---

## Page 4b / 6b — Scenario slider follow-up *(optional)*

*Shown only when `ENABLE_SCENARIO_SLIDER_FOLLOWUPS` is true. Same settings frame and lead-in as the scenario above; only the response control differs.*

**Subscription Discount slider**

**Question:** Using the slider, indicate the minimum monthly discount that you would be willing to accept or indicate that you would not accept any discount:

- Slider: $0 – $20 / month off (step $1)
- I would not share this data regardless of the discount amount *(mutually exclusive)*

Stored: `s1_slider_value` (0–20) + `s1_slider_none` (boolean)

**Data Sharing Program slider**

**Question:** Using the slider, indicate the minimum percentage of revenue that you would be willing to accept or indicate that you would not accept any percentage:

- Slider: 0% – 99% (step 1)
- I would not share this data regardless of the percentage *(mutually exclusive)*

Stored: `s2_slider_value` (0–99) + `s2_slider_none` (boolean)

**Button:** Continue

---

## Page 5 — Scenario transition

**Heading:** Now we'd like you to imagine that App Z took a different approach.

**Button:** See this approach on the next page

---

## Page 4 / 6 — Scenario: Data Sharing Program

*(Same randomization note as Subscription Discount.)*

**Heading:**

👉 We’d like you to imagine that you open App Z one day and you see the window below. App Z is offering you the option to join a Data Sharing Program: *(program name underlined)*

**Settings frame — Data Sharing Program**

You currently pay $20 per month for our app. By default, we do not record or store your information; we do not sell your information; and we delete all information after one year.

We are now offering you the option to join a Data Sharing Program. If you opt in:

We will access or walk you through instructions on how to provide your `{inline}`. By `{inline}`, we mean `{definition}`

Example: We will access or walk you through instructions on how to provide your financial information. By financial information, we mean records of your bank accounts, balances, and statements as well as your investments, income, credit history, and credit score.

We will use this information to `{data_use}` *(data use underlined)*

Because your data will increase our revenue, we would like to offer to pay you a percentage of the revenue attributed to your data for sharing this data.

☐ I agree   [ ____ ] % of revenue
☐ I do not agree
*(decorative settings UI, red-tinted; agree + amount on one line, disagree on the next)*

`{inline}`:

1. demographic information
2. government IDs
3. voice data
4. financial information
5. personal communications data
6. contacts and social media connections
7. location history
8. web browsing history
9. photo library
10. email management data
11. errand-related screen recordings
12. document editing history
13. work-related screen recordings
14. streaming preferences
15. screen usage data
16. phone motion sensor data

`{data_use}`:

1. improve App Z's services
2. train App Z's AI models and AI agents to improve its services

**Question:** Please select which percentages of the revenue attributed to your data you would be willing to accept (select all that apply):

- I would agree if I receive 1% of the revenue attributed to my data
- I would agree if I receive 10% of the revenue attributed to my data
- I would agree if I receive 25% of the revenue attributed to my data
- I would agree if I receive 50% of the revenue attributed to my data
- I would agree if I receive 75% of the revenue attributed to my data
- I would agree if I receive 99% of the revenue attributed to my data
- I would not share this data regardless of the percentage *(mutually exclusive)*

**Button:** Continue

---

## Page 7 — Post-scenario intro

Now, we'd like to understand how you feel about App Z accessing or asking you to provide your `{inline}` to `{data_use}`.

On the following pages, we'll ask you a series of questions.

`{inline}`:

1. demographic information
2. government IDs
3. voice data
4. financial information
5. personal communications data
6. contacts and social media connections
7. location history
8. web browsing history
9. photo library
10. email management data
11. errand-related screen recordings
12. document editing history
13. work-related screen recordings
14. streaming preferences
15. screen usage data
16. phone motion sensor data

`{data_use}`:

1. improve App Z's services
2. train App Z's AI models and AI agents to improve its services

**Button:** Continue

---

## Pages 8–14 — Block B (compensation / use-case questions)

*Each question is its own page. Order randomized within Block B. Every Block B page shows the same header.*

**Header + question (same paragraph; question bold + blue):**

Suppose App Z collects your `{inline_b}` to `{data_use}`. By `{inline_b}`, we mean `{definition}` **`{question}`**

Example: Suppose App Z wants to collect your email management data to improve App Z's services. By email management data, we mean a record of how you manage your email inbox, such as when and how you open, archive, delete, label, or reply to emails. **What is/are your main concern(s) about sharing your email management data with App Z? (Please check all that apply)**

`{inline_b}` *(Block A and Block B; intro/scenarios use `{inline}`)*:

1. demographic information
2. government IDs
3. voice data
4. financial information
5. personal communications data
6. contacts and social media connections
7. location history
8. web browsing history
9. photo library
10. email management data
11. errand-related screen recordings
12. document editing history
13. work-related screen recordings
14. streaming preferences data
15. screen usage data
16. phone motion sensor data

`{data_use}`:

1. improve App Z's services
2. train App Z's AI models and AI agents to improve its services

### B1 — Compensated by amount

Should you be compensated based on how much of your `{inline_b}` `{is/are}` used by App Z?

Exceptions (government IDs; contacts and social media connections):

Should you be compensated based on how much information from your `{inline_b}` is used by App Z?

- Yes
- No
- Unsure
- I don't care

### B2 — Compensated per use

Should you be compensated each time your `{inline_b}` `{is/are}` used by App Z?

- Yes
- No
- Unsure
- I don't care

### B3 — Compensated by effort

Should you be compensated based on how much effort it took for you to generate or provide your `{inline_b}` to App Z?

- Yes
- No
- Unsure
- I don't care

### B4 — Compensated by originality

Should you be compensated for how unique or original your `{inline_b}` `{is/are}` relative to others' on App Z?

- Yes
- No
- Unsure
- I don't care

### B5 — Phone manufacturer sells data

*(Header uses “wants to collect” instead of “collects”.)*

Suppose your phone manufacturer collected your `{inline_b}` and sold `{it/them}` to App Z. How would you feel?

- Very upset
- A little upset
- Confused
- Don't care at all
- Happy for them

### B6 — Credit / acknowledgement

Should you receive credit or acknowledgement for your `{inline_b}` when `{it is/they are}` used by App Z?

- 1: I definitely do not want to receive credit
- 2: I do not need to receive credit
- 3: I am neutral
- 4: I would like to receive credit
- 5: I absolutely should receive credit

### B7 — Main concerns

*(Header uses “wants to collect” instead of “collects”.)*

What is/are your main concern(s) about sharing your `{inline_b}` with App Z? (Please check all that apply)

*(Options randomized per participant/load; Other always last.)*

- I'm not concerned
- I don't understand why App Z wants it
- It's too personal or sensitive
- It could be used to manipulate me
- It could be used to impersonate or represent me
- It could be used to harm me
- I don't trust App Z
- Other [text box]

---

## Page 15 — Block A intro

Now, we'd like to understand how you feel about `{inline_b}`, regardless of `{its/their}` use.

On the following pages, we'll ask you a series of questions.

`{inline_b}`: *(same list as Block B)*

**Button:** Continue

---

## Pages 16–26 — Block A (data-type questions + attention check)

*Each question is its own page. Order randomized within Block A (attention check pooled in). No use-case header.*

**Header + question (same paragraph; question bold + blue; not shown on attention check):**

By `{inline_b}`, we mean `{definition}` **`{question}`**

Example: By financial information, we mean records of your bank accounts, balances, and statements as well as your investments, income, credit history, and credit score. **Do you consider your financial information to be important?**

### A1 — Importance

Do you consider your `{inline_b}` to be important?

*(1–5 Likert)* 1: not important to me at all … 5: extremely important to me

`{inline_b}`: *(same list as Block B)*

### A2 — Sensitivity

Do you consider your `{inline_b}` to be sensitive?

*(1–5 Likert)* 1: not sensitive at all … 5: extremely sensitive

`{inline_b}`: *(same list as Block B)*

### A3 — Ownership

Do you feel ownership over your `{inline_b}`?

*(1–5 Likert)* 1: I do not feel ownership over this type of data … 5: I feel strong ownership over it

`{inline_b}`: *(same list as Block B)*

### A4 — Share publicly

Would you ever share your `{inline_b}` publicly? For example, would you share `{it/them}` with a person or group of people you have never met before? Choose the option that best describes your answer:

- No — I would never share this publicly.
- Maybe — it would depend on the situation.
- Yes, but only without my name attached (anonymously).
- Yes, including with my name attached.

`{inline_b}`: *(same list as Block B)*

### A5 — Buy / sell appropriate

Is it appropriate to buy and sell your `{inline_b}`?

*(1–5 Likert)* 1: Completely inappropriate … 5: Completely appropriate

`{inline_b}`: *(same list as Block B)*

### A6 — Upset if leaked

If you found out your `{inline_b}` had been released publicly without your knowledge, which best describes how you would feel?

- I would not be upset, whether or not my name was attached.
- I would be a little uncomfortable.
- I would be upset only if my name was attached.
- I would be upset even if the data was released anonymously (without my name).
- I would be very upset either way.
- I'm not sure.

`{inline_b}`: *(same list as Block B)*

### A7 — Identifiability

How identifiable (traceable to you) do you think your `{inline_b}` `{is/are}`?

*(1–5 Likert)* 1: not identifiable at all … 5: extremely identifiable

`{inline_b}`: *(same list as Block B)*

### A8 — Usefulness to companies

How useful do you think your `{inline_b}` `{is/are}` to companies?

*(1–5 Likert)* 1: not useful at all … 5: extremely useful

`{inline_b}`: *(same list as Block B)*

### A9 — Replaceability / commonness

How common or replaceable do you think your `{inline_b}` `{is/are}` across people? In other words, if you didn't provide `{it/them}`, could someone else easily provide similar data?

*(1–5 Likert)* 1: unique to me / hard to replace … 5: very common / easily replaceable

`{inline_b}`: *(same list as Block B)*

### A10 — Control

How much control do you feel you have over your `{inline_b}` in general?

*(1–5 Likert)* 1: no control at all … 5: complete control

`{inline_b}`: *(same list as Block B)*

### Attention check

This is an attention check. To show you are reading carefully, please select the lowest option, 'not important to me at all'.

*(1–5 Likert)* 1: not important to me at all … 5: extremely important to me

---

## Page 27 — Open response

Many companies rely on user data to improve their services or sell user data as a source of revenue. How do you feel about companies using your data?

*(Required free-text field)*

Does your answer change if your data is being used to train AI models or AI agents?

*(Required free-text field)*

**Button:** Continue

---

## Page 28 — About you intro

In the last part of this survey, we have a few questions about you.

**Button:** Next

---

## Page 29 — AI usage & literacy

A few questions about the tools you use.

**How often do you use AI tools (where AI is the core feature), such as AI chatbots, AI email composition, AI writing assistants, AI schedulers, or AI image generators?**

- More than once a day
- Daily
- A few times a week
- Weekly
- Between weekly and monthly
- Tried once or twice
- Never

**How often do you use social media apps, like Instagram, Facebook, TikTok, Reddit, Snapchat, Retro, and others?**

*(same frequency options)*

**How often do you use search engines, like Google, Bing, DuckDuckGo, Baidu, Ecosia, and Yahoo search?**

*(same frequency options)*

**Do you currently work in the technology sector?**

- Yes
- No
- Prefer not to answer

**Have you ever worked in the technology sector?**

- Yes
- No
- Prefer not to answer

**Button:** Continue

---

## Page 30 — Demographics

**Age**

- 18–24
- 25–34
- 35–44
- 45–54
- 55–64
- 65+
- Prefer not to answer

**Gender**

- Man
- Woman
- Non-binary
- Other *(text field if selected)*
- Prefer not to answer

**Education**

- Less than high school
- High school
- Some college
- Bachelor's degree
- Graduate degree
- Prefer not to answer

**Button:** Continue

---

## Page 31 — Debrief

Thank you for completing this study.

The purpose of this study is to understand how people value different types of personal data, and whether their preferences change depending on what the data will be used for—particularly when it is used to train AI models or AI agents versus to improve a company's services more generally.

The "App Z" service in this survey was hypothetical. No company called App Z accessed or collected any of your information, and your responses to the scenarios will not be shared with any third party.

Your responses will help inform policy discussions about data governance in the age of AI. If you have questions, please contact Sarah Cen at sarahcen@andrew.cmu.edu.

IRB Protocol: STUDY2026_00000225 — Carnegie Mellon University

**Button:** *(completes study / redirects to CloudResearch)*

---

## Appendix — client-side chrome

Participant-facing strings that live in `public/app.js` (and `server/routes/start.js`) rather than
in the screen payload, so they don't appear page-by-page above.

**Page headings and framing added by the client**

- Consent: heading **Informed Consent**; each statement is answered with Yes / No radios.
- Intro: the opener ("Imagine you're a frequent user of App Z!") is rendered as the page heading; the comprehension section is introduced by the heading **Comprehension check**.
- Intro, on a failed comprehension attempt: *One or more answers are incorrect. Please review the information above and try again.*
- Welcome: "you will not be able to return to previous pages" is bolded.
- Scenario pages: the data-type name in "We will access or walk you through instructions on how to provide your …" is bold + underlined; the program name is bold + underlined in both the lead-in and "We are now offering you the option to …".
- Block A / Block B pages: header and question share one paragraph; the question is bold + blue. The attention check has no header and uses plain bold.
- Demographics: heading **About you**; *These questions help us describe the participant pool.*
- Debrief: heading **Thank you**; button **Complete study**.

**Settings frame (default presentation; `?mode=plain` drops the frame and keeps the copy)**

- Fake URL bar: `appz.com/settings/subscription` · `appz.com/settings/data-sharing`
- Sidebar brand **App Z**, nav items: Account · Subscription · Premium features · Privacy · Data Sharing Program · Notifications · Billing (the scenario's own row is highlighted).

**Terminal / error states**

- After the final submit: *Thank you — your responses have been recorded.* (shown only if the CloudResearch redirect is unavailable).
- After consent refusal: *Survey ended.* (likewise).
- Session could not be restored: *Your session could not be loaded. Please return to CloudResearch and re-enter the study using the original link.*
- Bad or missing `participantId`: *Invalid or missing participant ID. Please return to CloudResearch and try again.*
- Returning after finishing: *You have already completed this study. Thank you.*
- IP throttle tripped: *Too many sessions started recently. Please return to CloudResearch and try again later.*
