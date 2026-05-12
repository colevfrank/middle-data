Regarding the blocking content gaps (consent text, comprehension items, learn-more copy, IRB
  number) 
- Consent text: the full consent text is in the file CONSENT.md
- IRB protocol number is to be determined (under review)
- Comprehension check items are in the file COMPREHENSION.md
- For now use lorem ipsum for the "Learn more" expandable copy

Regarding the design/methodological gaps:
- Randomization: do block randomization
- Add an attention check--specifically an instructed-response item (e.g.,
 "select 'Agree' to confirm you're reading") inside the attitude battery.
- Within-screen randomization:
    - Randomize S4 ("primary concern") options but pin "Not sure" last since it's the catch-all
    - Randomize compensation model items
    - Do not randomize demographic options
    - Generally anything ordinal (S1–S2 Likert scales, S3 sellability, S7 reversibility) stays in its natural order. Anything categorical or unordered (S4 concerns, compensation models, attitude battery items) gets randomized.
- Mutually-exclusive option behavior: For Scenarios 1 and 3 when the "would not share/participate at any price" standalone is selected, the per-row radios should be disabled. Same when "all No" answers on scenario 3.
- Rate Limit: Implement per-PID deduplication and a softer IP throttle  (15 submissions per IP per hour).
- Target N is 6,600

Regarding implementation details:
- Session continuity: Save partial progress per screen (POST on every Continue) rather than batching client-side, so attrition still yields usable rows. Use the server-side session token (already in spec) to resume to the next unanswered screen.
- Schema shape for response fields: explicit columns for each Scenario 1 price tier (s1_share_1off … s1_share_20off, s1_none), Scenario 3 tiers, ranking (5 integer columns or int[]), fairness/practicality (5 + 5), and S1–S9
- Array columns: Postgres native int[] or text[] for scenario_order, supp_question_order, attitude_item_order
- Ranking UI: Instead of drag-and-drop, use numbered dropdowns (1–5, must be unique)
- server-side validation: Reject unexpected radio values; cap free-text length (S3 "something else", gender "other"); reject responses that arrive for the wrong screen given the participant's current state
- CSRF: With session-token auth on POSTs, include the token in a header (not just a cookie) and validate per request.
- Latency granularity: timestamp each individual radio button selection client-side and submit the array with the screen. implementation should be lightweight, just an event listener on each input.
