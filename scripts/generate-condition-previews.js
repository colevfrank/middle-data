#!/usr/bin/env node
/**
 * Generate condition-previews/*.md — one full page playthrough per
 * data-type × use-case cell (20 × 2 = 40), from live survey content.
 *
 * Usage: node scripts/generate-condition-previews.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const content = require('../server/content');
const { screenPayload } = require('../server/screenContent');
const { ENABLE_SCENARIO_SLIDER_FOLLOWUPS } = require('../server/surveyFeatures');

const { DATA_TYPES, USE_CASES, POST_QUESTIONS, forBlockB } = content;

const outDir = path.join(__dirname, '..', 'condition-previews');

function slug(dt, uc) {
  const name = dt.inline.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  return `${String(dt.id).padStart(2, '0')}_${uc}_${name}`;
}

function fakeParticipant(dtId, uc) {
  const blockB = POST_QUESTIONS.filter(q => q.block === 'B').map(q => q.id).sort((a, b) => a - b);
  const blockA = POST_QUESTIONS.filter(q => q.block === 'A' || q.block === 'AC')
    .map(q => q.id).sort((a, b) => a - b);
  return {
    data_type: dtId,
    use_case: uc,
    scenario_order: [1, 2],
    block_b_order: blockB,
    block_a_order: blockA
  };
}

function renderOptions(opts) {
  return (opts || []).map(o => `- ${o.label}`).join('\n');
}

function renderAnchors(anchors) {
  if (!anchors) return '';
  return `*(1–5 Likert)* 1: ${anchors.low} … 5: ${anchors.high}`;
}

function section(title, body) {
  return `## ${title}\n\n${String(body).trim()}\n\n---\n\n`;
}

function renderScreen(participant, sid) {
  const pay = screenPayload(participant, sid);
  let body = '';

  if (sid === 'welcome') {
    if (pay.heading) body += `**${pay.heading}**\n\n`;
    body += (pay.body || []).join('\n\n');
    body += `\n\n**Button:** Continue`;
    return body;
  }

  if (sid === 'intro') {
    const setup = pay.setup || {};
    if (setup.heading) body += `**${setup.heading}**\n\n`;
    if (setup.lead) body += `${setup.lead}\n\n`;
    for (const section of setup.sections || []) {
      body += `**${section.heading}**\n\n${section.body}\n\n`;
    }
    body += `**${pay.change_heading}**\n\n`;
    body += (pay.change || []).join('\n\n') + '\n\n';
    body += '**Comprehension check**\n\n';
    for (const s of pay.comprehension.statements) {
      body += `${s.id}. ${s.text}\n\n- True\n- False\n\n`;
    }
    body += '**Button:** Continue *(gated until all correct)*';
    return body;
  }

  if (sid === 'scenario_1' || sid === 'scenario_2'
      || sid === 'scenario_1_slider' || sid === 'scenario_2_slider') {
    body += (pay.lead_in || []).map(l => `**${l}**`).join('\n\n') + '\n\n';
    body += `**Settings frame — ${pay.heading}**\n\n`;
    body += (pay.intro || []).join('\n\n') + '\n\n';
    body += `${pay.intro_offer}\n\n`;
    body += `- ${pay.collect_line}\n`;
    body += `- ${pay.use_line}\n\n`;
    body += `${pay.offer_line}\n\n`;
    if (pay.offer_agree) {
      const oa = pay.offer_agree;
      body += `- ${oa.checkbox_label}  \`${oa.blank_prefix || ''}____${oa.blank_suffix || ''}\`\n`;
      body += `- ${oa.disagree_label}\n\n`;
    }
    body += `**${pay.question}**\n\n`;
    if (pay.response_format === 'slider' && pay.slider) {
      const lo = pay.slider.format === 'percent' ? `${pay.slider.min}%` : `$${pay.slider.min}`;
      const hi = pay.slider.format === 'percent' ? `${pay.slider.max}%` : `$${pay.slider.max}`;
      body += `- Slider: ${lo} – ${hi}\n`;
    } else {
      body += (pay.tiers || []).map(t => `- ${t.label}`).join('\n') + '\n';
    }
    body += `- ${pay.none_label}\n\n`;
    body += '**Button:** Continue';
    return body;
  }

  if (sid === 'scenario_transition' || sid === 'post_scenario_intro'
      || sid === 'block_a_intro' || sid === 'about_you_intro') {
    if (pay.heading) body += `**${pay.heading}**\n\n`;
    body += (pay.body || []).join('\n\n') + '\n\n';
    body += `**Button:** ${pay.button || 'Continue'}`;
    return body;
  }

  if (/^postq_/.test(sid)) {
    if (pay.item.header) body += `${pay.item.header} `;
    body += `**${pay.item.prompt}**\n\n`;
    if (pay.item.anchors) body += `${renderAnchors(pay.item.anchors)}\n\n`;
    if (pay.item.options) body += `${renderOptions(pay.item.options)}\n\n`;
    body += '**Button:** Continue';
    return body;
  }

  if (sid === 'open_response') {
    body += `**${pay.prompt}**\n\n*(required free text)*\n\n**Button:** Continue`;
    return body;
  }

  if (sid === 'ai_usage') {
    if (pay.intro) body += `${pay.intro}\n\n`;
    for (const q of pay.items || []) {
      body += `**${q.prompt}**\n\n${renderOptions(q.options)}\n\n`;
    }
    body += '**Button:** Continue';
    return body;
  }

  if (sid === 'demographics') {
    for (const q of pay.items || []) {
      body += `**${q.prompt}**\n\n${renderOptions(q.options)}\n\n`;
    }
    body += '**Button:** Continue';
    return body;
  }

  if (sid === 'debrief') {
    body += (pay.body || []).join('\n\n') + '\n\n';
    body += `**Button:** ${pay.button || 'Finish'}`;
    return body;
  }

  return '```json\n' + JSON.stringify(pay, null, 2) + '\n```';
}

function buildFile(dt, uc) {
  const participant = fakeParticipant(dt.id, uc);
  const dtB = forBlockB(dt);
  const ucObj = USE_CASES[uc];

  let md = '';
  md += `# Condition ${dt.id} × ${uc}\n\n`;
  md += '| Field | Value |\n|---|---|\n';
  md += `| Data type id | ${dt.id} |\n`;
  md += `| Category | ${dt.category} |\n`;
  md += `| Use case | **${uc}** — ${ucObj.data_use} |\n`;
  md += `| \`inline\` (intro / scenarios) | ${dt.inline} |\n`;
  md += `| \`inline_b\` (Blocks A & B) | ${dtB.inline} |\n`;
  md += `| Number (A/B prompts) | ${dtB.plural ? 'plural (are / them / their)' : 'singular (is / it / its)'} |\n\n`;
  md += '**Note:** In the live survey, scenario order and Block A/B question order are randomized. ';
  md += 'This preview uses a fixed order: Subscription Discount → Data Sharing Program; ';
  md += 'Block B then Block A questions by ascending id (attention check pooled in Block A).\n\n';
  md += '---\n\n';

  md += section('Consent', '*(Same for all conditions — see [`CONSENT.md`](../CONSENT.md).)*');

  const flow = [
    ['welcome', 'Welcome'],
    ['intro', 'Intro (App Z setup + recent change + comprehension)'],
    ['scenario_1', 'Scenario 1 — Subscription Discount']
  ];
  if (ENABLE_SCENARIO_SLIDER_FOLLOWUPS) {
    flow.push(['scenario_1_slider', 'Scenario 1 slider follow-up']);
  }
  flow.push(
    ['scenario_transition', 'Scenario transition'],
    ['scenario_2', 'Scenario 2 — Data Sharing Program']
  );
  if (ENABLE_SCENARIO_SLIDER_FOLLOWUPS) {
    flow.push(['scenario_2_slider', 'Scenario 2 slider follow-up']);
  }
  flow.push(['post_scenario_intro', 'Post-scenario intro (→ Block B)']);
  for (const qid of participant.block_b_order) {
    const q = POST_QUESTIONS.find(x => x.id === qid);
    flow.push([`postq_${qid}`, `Block B — ${q.key} (id ${qid})`]);
  }
  flow.push(['block_a_intro', 'Block A intro']);
  for (const qid of participant.block_a_order) {
    const q = POST_QUESTIONS.find(x => x.id === qid);
    const label = q.type === 'attention'
      ? `Attention check (id ${qid})`
      : `Block A — ${q.key} (id ${qid})`;
    flow.push([`postq_${qid}`, label]);
  }
  flow.push(
    ['open_response', 'Open response'],
    ['about_you_intro', 'About you intro'],
    ['ai_usage', 'AI usage / literacy'],
    ['demographics', 'Demographics'],
    ['debrief', 'Debrief']
  );

  for (const [sid, title] of flow) {
    md += section(title, renderScreen(participant, sid));
  }
  return md;
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) {
    if (f.endsWith('.md')) fs.unlinkSync(path.join(outDir, f));
  }

  let index = '# Condition previews (20 × 2)\n\n';
  index += 'Generated from live `server/content.js` + `server/screenContent.js`.\n\n';
  index += 'Each file is a full page-by-page playthrough for one cell of the factorial design ';
  index += '(**20 data types × 2 use cases = 40 conditions**).\n\n';
  index += 'Regenerate with:\n\n```bash\nnode scripts/generate-condition-previews.js\n```\n\n';
  index += 'Within a cell, scenario order and Block A/B question order are randomized for participants; ';
  index += 'these previews use a **fixed representative order** ';
  index += '(Scenario 1 then 2; questions by ascending id).\n\n';
  index += '| # | Use case | Data type | File |\n|---|---|---|---|\n';

  let n = 0;
  for (const dt of DATA_TYPES) {
    for (const uc of ['B1', 'B2']) {
      const name = `${slug(dt, uc)}.md`;
      fs.writeFileSync(path.join(outDir, name), buildFile(dt, uc));
      index += `| ${dt.id} | ${uc} | ${dt.inline} | [${name}](./${name}) |\n`;
      n += 1;
    }
  }
  index += `\n_Total condition files: ${n}_\n`;
  fs.writeFileSync(path.join(outDir, 'README.md'), index);
  console.log(`Wrote ${n} condition files + README.md → ${outDir}`);
}

main();
