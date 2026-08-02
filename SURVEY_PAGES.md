# Survey pages (participant-facing copy)

Page-by-page text as currently assembled from `server/content.js` and `server/screenContent.js`.

**Placeholders** (curly braces) mark text that varies by assigned condition. Under each page that uses them, possible values are listed.

- `{data_type_description}` — fuller phrase (intro first sentence only)
- `{inline}` — short mid-sentence data-type name (intro, scenarios, …)
- `{inline_b}` — Block A/B short name (same as `{inline}` except where noted, e.g. communications data)
- `{data_use}` — use-case phrase (same wording as `comp_use` / `scenario_use` in code)

Scenario order (Subscription Discount vs Data Sharing Program) is randomized. Block B questions are randomized within Block B; Block A questions (plus the attention check) are randomized within Block A. Block B is always shown before Block A.

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
You will receive $4 through Prolific upon completion of the survey. Partial completions are not compensated; if you believe you should be compensated but were not due to an error, you may contact the research team.

#### Future Use of Information
We may release, share, or reuse the data. Any released or shared data will be first de-identified so that no responses can be traced back to you. Such release, sharing, and reuse will not require further consent from you.

#### Confidentiality
Your responses are anonymous. We collect only your Prolific ID for the purpose of issuing payment and preventing duplicate participation. This ID will be removed before any data analysis. We will collect your responses to our questions and your interaction with our interface. We will not collect further information (e.g., we will not collect your browsing history).

#### Right to Ask Questions & Contact Information
If you have any questions about this study, you should feel free to ask them by contacting the Principal Investigator at:
Sarah Cen
Engineering and Public Policy
sarahcen@andrew.cmu.edu
If you have questions later, desire additional information, or wish to withdraw your participation please contact the Principal Investigator by e-mail in accordance with the contact information listed above.

If you have questions pertaining to your rights as a research participant; or to report concerns to this study, you should contact the Office of Research integrity and Compliance at Carnegie Mellon University (email: irb-review@andrew.cmu.edu. phone: 412-268-4721).

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

In the following pages, you’ll answer some questions. Then, you’ll be redirected back to Prolific once you complete the survey. 

Once you advance, you will not be able to return to previous pages, so please consider each question carefully before clicking next.

Click "Continue" when you are ready to begin.


**Button:** Continue

---

## Page 3 — Intro (App Z setup + recent change + comprehension)

**Heading:** Imagine you're a frequent user of App Z!

App Z is an online service that you use often. You currently pay $20 per month for App Z.

By default, App Z does not record or store any of your information beyond what is strictly necessary to operate the service. App Z does not sell your information, and App Z also deletes any data it holds after one year.

**But there has been a recent change**

Earlier this year, App Z became interested in `{data_type_description}`.
*(Core data-type phrase before “including …” is bold + underlined — e.g. “how its users cook”.)*

App Z would like to access your `{inline}` to `{data_use}`.

`{data_type_description}`:

1. its users' demographic information, including their age, gender, race, zip code, marital status, income, and level of education
2. its users' government IDs, including their driver's license or passport information
3. its users' voice data, including voice notes, recordings, and voice-to-text commands
4. its users' health information and medical records, including doctors' visit notes, test results, prescribed medication, and vaccination history
5. its users' financial information, including bank statements and investment portfolios
6. its users' communications, including text messages, social media messages, and emails
7. its users' social network, including the names of friends, coworkers, and family members
8. its users' contacts, including the names, emails, and phone numbers of contacts on a user's device
9. its users' location history, including where users go and at what times
10. its users' web browsing history, including websites users visit and the timestamps of each visit
11. its users' purchase history, including what users purchase from which vendors and at what times
12. its users' professional or educational documents, including notes, essays, and reports used for work or education but not including financial, government, or otherwise sensitive documents
13. its users' photos library, including photo or video data stored on their device
14. how its users manage their emails, including detailed behavioral data of how users respond, sort, delete, and search their email
15. how its users perform basic administrative tasks, including detailed behavioral data of how users book flights, pay bills, search for restaurants, or plan a party
16. how its users cook, including detailed behavioral data of what users cook, what ingredients they use, whether they follow recipes, and how long they spend cooking
17. its users' music preferences, including the songs and artists users listen to as well as users' rating, like, and skip behaviors
18. its users' streaming preferences, including the shows and movies users watch, whether users finish each video, and how users rate the videos
19. its users' screen usage, including when and how long users open their devices and use each application
20. its users' exercise activities, including what forms of exercise users engage in and when they exercise


`{inline}`:

1. demographic information
2. government IDs
3. voice data
4. health information and medical records
5. financial information
6. communications
7. social network
8. contacts
9. location history
10. web browsing history
11. purchase history
12. professional or educational documents
13. photos library
14. email management behavior data
15. administrative task behavior data
16. cooking behavior data
17. music preferences
18. streaming preferences
19. screen usage data
20. exercise activities data

`{data_use}`:

1. improve App Z's services
2. train App Z's AI models and AI agents to improve its services

**Comprehension check**

1. App Z would like to access its users' `{inline}`. *(True)*
2. App Z would use your data to `{data_use}`. *(True)*
3. App Z guarantees that your data will be permanently deleted after 30 days. *(False)*

`{inline}`: *(same list as above)*

`{data_use}`: *(same list as above)*

**Button:** Continue *(gated until answers are T, T, F)*

---

## Page 4 / 6 — Scenario: Subscription Discount

*(Order of this page vs. Data Sharing Program is randomized; a transition page sits between them.)*

**Heading:** We’d like you to imagine: You open App Z and it offers you the option to receive a Subscription Discount *(program name underlined)*

**Settings frame — Subscription**

You currently pay $20 per month for our app. By default, we do not record or store your information; we do not sell your information; and we delete all information after one year.

We are now offering you the option to receive a Subscription Discount. If you agree:

We will access or ask you to provide your `{inline}`. This includes `{examples}`.

Example: We will access or ask you to provide your health information and medical records. This includes doctors' visit notes, test results, prescribed medication, and vaccination history.

We will use this information to `{data_use}` *(data use underlined)*

We would like to offer you a monthly discount on your subscription for sharing this data.

☐ I agree   [ ____ ] $ / month discount
☐ I do not agree
*(decorative settings UI, red-tinted; agree + amount on one line, disagree on the next)*

`{inline}`:

1. demographic information
2. government IDs
3. voice data
4. health information and medical records
5. financial information
6. communications
7. social network
8. contacts
9. location history
10. web browsing history
11. purchase history
12. professional or educational documents
13. photos library
14. email management behavior data
15. administrative task behavior data
16. cooking behavior data
17. music preferences
18. streaming preferences
19. screen usage data
20. exercise activities data

`{data_use}`:

1. improve App Z's services
2. train App Z's AI models and AI agents to improve its services

**Question:** Please select what discount you would be willing to accept (select all that apply):

- $1 off / month ($19/mo)
- $3 off / month ($17/mo)
- $5 off / month ($15/mo)
- $8 off / month ($12/mo)
- $12 off / month ($8/mo)
- $20 off / month (Free)
- I will not share this data regardless of the discount amount *(mutually exclusive)*

**Button:** Continue

---

## Page 5 — Scenario transition

**Heading:** Now we'd like you to imagine that App Z took a different approach.

**Button:** See this approach on the next page

---

## Page 4 / 6 — Scenario: Data Sharing Program

*(Same randomization note as Subscription Discount.)*

**Heading:** We’d like you to imagine: You open App Z and it offers you the option to join a Data Sharing Program *(program name underlined)*

**Settings frame — Data Sharing Program**

You currently pay $20 per month for our app. By default, we do not record or store your information; we do not sell your information; and we delete all information after one year.

We are now offering you the option to join a Data Sharing Program. If you opt in:

We will access or ask you to provide your `{inline}`. This includes `{examples}`.

Example: We will access or ask you to provide your health information and medical records. This includes doctors' visit notes, test results, prescribed medication, and vaccination history.

We will use this information to `{data_use}` *(data use underlined)*

Because your data will increase our revenue, we would like to offer to pay you a percentage of the revenue attributed to your data for sharing this data.

☐ I agree   [ ____ ] % of revenue
☐ I do not agree
*(decorative settings UI, red-tinted; agree + amount on one line, disagree on the next)*

`{inline}`:

1. demographic information
2. government IDs
3. voice data
4. health information and medical records
5. financial information
6. communications
7. social network
8. contacts
9. location history
10. web browsing history
11. purchase history
12. professional or educational documents
13. photos library
14. email management behavior data
15. administrative task behavior data
16. cooking behavior data
17. music preferences
18. streaming preferences
19. screen usage data
20. exercise activities data

`{data_use}`:

1. improve App Z's services
2. train App Z's AI models and AI agents to improve its services

**Question:** Please select which percentages of the revenue attributed to your data you would be willing to accept (select all that apply):

- 1%
- 10%
- 25%
- 50%
- 75%
- 99%
- I will not share this data regardless of the percentage *(mutually exclusive)*

**Button:** Continue

---

## Page 7 — Post-scenario intro

Now, we'd like to understand how you feel about App Z accessing your `{inline}` to `{data_use}`.

On the following pages, we'll ask you a series of questions.

`{inline}`:

1. demographic information
2. government IDs
3. voice data
4. health information and medical records
5. financial information
6. communications
7. social network
8. contacts
9. location history
10. web browsing history
11. purchase history
12. professional or educational documents
13. photos library
14. email management behavior data
15. administrative task behavior data
16. cooking behavior data
17. music preferences
18. streaming preferences
19. screen usage data
20. exercise activities data

`{data_use}`:

1. improve App Z's services
2. train App Z's AI models and AI agents to improve its services

**Button:** Continue

---

## Pages 8–14 — Block B (compensation / use-case questions)

*Each question is its own page. Order randomized within Block B. Every Block B page shows the same header.*

**Header + question (same paragraph; question bold + blue):**

Suppose App Z collects your `{inline_b}`, to `{data_use}.` This includes `{examples}.` **`{question}`**

Example: Suppose App Z wants to collect your email management behavior data, to improve App Z's services. This includes detailed behavioral data of how users respond, sort, delete, and search their email. **What is/are your main concern(s) about sharing your email management behavior data with App Z? (Please check all that apply)**

`{inline_b}` *(Block A and Block B; intro/scenarios use `{inline}`)*:

1. demographic information
2. government ID data
3. voice data
4. health information and medical records
5. financial information
6. communications data
7. social network data
8. contacts data
9. location history data
10. web browsing history data
11. purchase history data
12. professional or educational documents
13. photos library data
14. email management behavior data
15. administrative task behavior data
16. cooking behavior data
17. music preferences data
18. streaming preferences data
19. screen usage data
20. exercise activities data

`{data_use}`:

1. improve App Z's services
2. train App Z's AI models and AI agents to improve its services

### B1 — Compensated by amount

Should you be compensated based on how much of your `{inline_b}` `{is/are}` used by App Z?

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

Now, we'd like to understand how you feel about `{inline_b}`, regardless of its use.

On the following pages, we'll ask you a series of questions.

`{inline_b}`: *(same list as Block B)*

**Button:** Continue

---

## Pages 16–26 — Block A (data-type questions + attention check)

*Each question is its own page. Order randomized within Block A (attention check pooled in). No use-case header.*

**Header + question (same paragraph; question bold + blue; not shown on attention check):**

`{Inline_b capitalized} includes {examples from data_type_description}.` **`{question}`**

Example: Financial information includes bank statements and investment portfolios. **Do you consider financial information to be important?**

### A1 — Importance

Do you consider `{inline_b}` to be important?

*(1–5 Likert)* 1: not important to me at all … 5: extremely important to me

`{inline_b}`: *(same list as Block B)*

### A2 — Sensitivity

Do you consider `{inline_b}` to be sensitive?

*(1–5 Likert)* 1: not sensitive at all … 5: extremely sensitive

`{inline_b}`: *(same list as Block B)*

### A3 — Ownership

Do you feel ownership over `{inline_b}`?

*(1–5 Likert)* 1: I do not feel ownership over this type of data … 5: I feel strong ownership over it

`{inline_b}`: *(same list as Block B)*

### A4 — Share publicly

Would you ever share your `{inline_b}` publicly? For example, would you share `{it/them}` with a person or group of people you have never met before? Choose the option that best describes your answer:

- No — I would never share it publicly.
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
- I would be upset even if it was released anonymously (without my name).
- I would be very upset either way.
- I'm not sure.

`{inline_b}`: *(same list as Block B)*

### A7 — Identifiability

How identifiable (traceable to you) do you think `{inline_b}` `{is/are}`?

*(1–5 Likert)* 1: not identifiable at all … 5: extremely identifiable

`{inline_b}`: *(same list as Block B)*

### A8 — Usefulness to companies

How useful do you think `{inline_b}` `{is/are}` to companies?

*(1–5 Likert)* 1: not useful at all … 5: extremely useful

`{inline_b}`: *(same list as Block B)*

### A9 — Replaceability / commonness

How common or replaceable do you think `{inline_b}` `{is/are}` across people? In other words, if you didn't provide `{it/them}`, could someone else easily provide similar data?

*(1–5 Likert)* 1: unique to me / hard to replace … 5: very common / easily replaceable

`{inline_b}`: *(same list as Block B)*

### A10 — Control

How much control do you feel you have over your `{inline_b}` in general?

*(1–5 Likert)* 1: no control at all … 5: complete control

`{inline_b}`: *(same list as Block B)*

### Attention check

This is an attention check. To show you are reading carefully, please select the lowest option, 'not important to me at all' (1).

*(1–5 Likert)* 1: not important to me at all … 5: extremely important to me

---

## Page 27 — Open response

Many companies rely on user data to improve their services or sell user data as a source of revenue. How do you feel about companies using your data? Does your answer change if your data is being used to train AI models or AI agents?

*(Optional free-text field)*

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

The purpose of this study is to understand how people value different types of personal data, and whether their preferences change depending on what the data will be used for, particularly when it is used to train AI models or AI agents versus to improve a company's services more generally.

The "App Z" service in this survey was hypothetical. No company called App Z accessed or collected any of your information, and your responses to the scenarios will not be shared with any third party.

Your responses will help inform policy discussions about data governance in the age of AI. If you have questions, please contact Sarah Cen at sarahcen@andrew.cmu.edu.

IRB Protocol: STUDY2026_00000225 — Carnegie Mellon University

**Button:** *(completes study / redirects to Prolific)*
