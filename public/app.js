(function () {
  'use strict';

  const root = document.getElementById('screen-root');
  const errBanner = document.getElementById('error-banner');
  const progressBar = document.getElementById('progress-bar');

  let csrfToken = null;
  let timestampShown = 0;
  let inputEvents = [];

  // ===== Presentation mode (plain | settings) =====
  // The settings-style scenario UI is the DEFAULT; `?mode=plain` opts out to the
  // plain academic card. Persisted to sessionStorage so reloads keep the mode.
  function detectMode() {
    try {
      const urlMode = new URLSearchParams(location.search).get('mode');
      if (urlMode === 'settings' || urlMode === 'plain') sessionStorage.setItem('appx_mode', urlMode);
      return sessionStorage.getItem('appx_mode') || 'settings';
    } catch (e) {
      return 'settings';
    }
  }
  const MODE = detectMode();

  // ===== Scenario voice (researcher | appx) =====
  // `?voice=appx` opts into the App-Z product-team voice scenario copy. The
  // server selects which copy bundle to send, so the client just needs to
  // forward the param on every /screen request. Orthogonal to MODE.
  function detectVoice() {
    try {
      const urlVoice = new URLSearchParams(location.search).get('voice');
      if (urlVoice === 'appx') sessionStorage.setItem('appx_voice', 'appx');
      return sessionStorage.getItem('appx_voice') || 'researcher';
    } catch (e) {
      return 'researcher';
    }
  }
  const VOICE = detectVoice();
  function voiceQs(url) {
    if (VOICE !== 'appx') return url;
    return url + (url.includes('?') ? '&' : '?') + 'voice=appx';
  }

  // ===== Back-button interception =====
  history.pushState({ survey: true }, '', location.href);
  window.addEventListener('popstate', () => {
    history.pushState({ survey: true }, '', location.href);
  });
  window.addEventListener('beforeunload', (e) => {
    // Don't prompt; let the participant leave. Resume works on return.
  });

  // ===== Utilities =====
  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (v === true) e.setAttribute(k, '');
      else if (v !== false && v != null) e.setAttribute(k, v);
    }
    for (const c of [].concat(children)) {
      if (c == null) continue;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return e;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function showError(msg) {
    errBanner.textContent = msg || 'Please complete all questions before continuing.';
    errBanner.classList.remove('hidden');
  }
  function clearError() {
    errBanner.classList.add('hidden');
    errBanner.textContent = '';
  }

  function setProgress(pct) {
    progressBar.style.width = (pct || 0) + '%';
  }

  function recordInput(name, value) {
    inputEvents.push({ name, value, ts_ms_from_shown: Date.now() - timestampShown });
  }

  function attachInputTracking(scope) {
    scope.addEventListener('change', (e) => {
      const t = e.target;
      if (!t || !t.name) return;
      let v = t.value;
      if (t.type === 'checkbox') v = t.checked;
      if (t.type === 'radio' && !t.checked) return;
      recordInput(t.name, v);
    });
  }

  // ===== Fetch wrapper =====
  async function getJson(url) {
    const r = await fetch(url, { credentials: 'same-origin' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  async function postJson(url, body) {
    const r = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': csrfToken
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      let detail = '';
      try { detail = JSON.stringify(await r.json()); } catch (e) {}
      throw new Error('HTTP ' + r.status + ' ' + detail);
    }
    return r.json();
  }

  // ===== Screen submission =====
  async function submit(screenId, body) {
    const payload = Object.assign({}, body, {
      timestamp_shown: timestampShown,
      timestamp_submitted: Date.now(),
      input_events: inputEvents
    });
    clearError();
    try {
      const next = await postJson(voiceQs('/screen/' + screenId), payload);
      if (next.redirect) {
        window.location.href = next.redirect;
        return;
      }
      render(next);
    } catch (e) {
      showError('Could not submit — please check your connection and try again.');
      console.error(e);
    }
  }

  // ===== Render dispatcher =====
  function render(payload) {
    timestampShown = Date.now();
    inputEvents = [];
    clearError();
    setProgress(payload.progress || 0);
    clear(root);
    // Post-scenario questions all share one renderer keyed by 'post_question'
    // (the screen id itself is postq_<n>, used as the submit target).
    const screenKey = payload.kind === 'post_question' ? 'post_question' : payload.screen;
    const useSettings = MODE === 'settings' && SETTINGS_RENDERERS[screenKey];
    // Settings-mode scenarios render their own browser-frame container; drop the
    // outer card wrapper for those screens so the frame stands alone.
    root.className = useSettings ? '' : 'card';
    const renderer = useSettings ? SETTINGS_RENDERERS[screenKey] : RENDERERS[screenKey];
    if (!renderer) {
      root.appendChild(el('p', { class: 'text-slate-700' }, 'Unknown screen: ' + payload.screen));
      return;
    }
    renderer(payload);
    attachInputTracking(root);
    window.scrollTo(0, 0);
  }

  // ===== Helpers for question UI =====
  function likert5(name) {
    const container = el('div', { class: 'flex flex-wrap items-center gap-2 sm:gap-4 mt-2' });
    for (let i = 1; i <= 5; i++) {
      container.appendChild(el('label', { class: 'label-radio' }, [
        el('input', { type: 'radio', name, value: i }),
        el('span', {}, String(i))
      ]));
    }
    return container;
  }

  // When lowNum/highNum are given, the scale endpoints are prefixed with their
  // number, e.g. "1: Not at all" … "5: Extremely".
  function anchorRow(anchors, lowNum, highNum) {
    const lowText = lowNum != null ? lowNum + ': ' + anchors.low : anchors.low;
    const highText = highNum != null ? highNum + ': ' + anchors.high : anchors.high;
    return el('div', { class: 'flex justify-between text-xs text-slate-500 mt-1' }, [
      el('span', {}, lowText),
      el('span', {}, highText)
    ]);
  }

  function continueBtn(onClick, label) {
    const btn = el('button', { type: 'button', class: 'btn-primary mt-6', disabled: true, id: 'continue-btn' }, label || 'Continue');
    btn.addEventListener('click', onClick);
    return btn;
  }

  function refreshContinueEnabled(form, predicate) {
    const btn = document.getElementById('continue-btn');
    if (!btn) return;
    const ok = predicate();
    btn.disabled = !ok;
  }

  function watchForCompletion(form, predicate) {
    const handler = () => refreshContinueEnabled(form, predicate);
    form.addEventListener('change', handler);
    form.addEventListener('input', handler);
    handler();
  }

  // Split `text` into DOM nodes, wrapping any occurrence of a phrase in `phrases`
  // in a bold + underlined <strong>. Returns an array suitable as el() children.
  function emphasize(text, phrases) {
    const list = (phrases || []).filter(Boolean);
    if (!list.length) return [text];
    const escaped = list.slice().sort((a, b) => b.length - a.length)
      .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const re = new RegExp('(' + escaped.join('|') + ')', 'g');
    const nodes = [];
    let last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) nodes.push(text.slice(last, m.index));
      nodes.push(el('strong', { class: 'font-bold underline' }, m[0]));
      last = m.index + m[0].length;
    }
    if (last < text.length) nodes.push(text.slice(last));
    return nodes.length ? nodes : [text];
  }

  // ===== Renderers =====
  const RENDERERS = {};

  // Minimal Markdown for the consent form: ATX headings (#..######) become
  // heading elements; consecutive non-blank lines become one paragraph (line
  // breaks preserved); blank lines separate paragraphs. CONSENT.md is a trusted
  // repo file and nodes are built via the DOM (no innerHTML).
  function consentNodes(text) {
    const lines = String(text).replace(/\r\n/g, '\n').split('\n');
    const nodes = [];
    let para = [];
    function flushPara() {
      if (!para.length) return;
      const children = [];
      para.forEach((ln, i) => { if (i > 0) children.push(el('br')); children.push(ln); });
      nodes.push(el('p', { class: 'mb-3' }, children));
      para = [];
    }
    for (const raw of lines) {
      const line = raw.replace(/\s+$/, '');
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        flushPara();
        nodes.push(el('h4', { class: 'font-semibold text-slate-900 mt-4 mb-1' }, h[2]));
      } else if (line.trim() === '') {
        flushPara();
      } else {
        para.push(line);
      }
    }
    flushPara();
    return nodes;
  }

  RENDERERS.consent = function (p) {
    root.appendChild(el('h2', { class: 'text-xl font-semibold mb-4' }, 'Informed Consent'));
    const consentBox = el('div', {
      class: 'max-w-none border border-slate-200 rounded p-4 max-h-96 overflow-y-auto text-slate-700 text-sm leading-relaxed'
    });
    consentNodes(p.consent_text || '').forEach(n => consentBox.appendChild(n));
    root.appendChild(consentBox);

    const form = el('div', { class: 'mt-6 space-y-3' });
    const items = [
      { key: 'consent_age_ok',      text: 'I am age 18 or older.' },
      { key: 'consent_read',        text: 'I have read and understand the information above.' },
      { key: 'consent_participate', text: 'I want to participate in this research and continue with the survey.' }
    ];
    for (const it of items) {
      const row = el('div', { class: 'flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4' }, [
        el('span', { class: 'text-slate-800 flex-1' }, it.text),
        el('div', { class: 'flex gap-4' }, [
          el('label', { class: 'label-radio' }, [
            el('input', { type: 'radio', name: it.key, value: 'yes' }),
            el('span', {}, 'Yes')
          ]),
          el('label', { class: 'label-radio' }, [
            el('input', { type: 'radio', name: it.key, value: 'no' }),
            el('span', {}, 'No')
          ])
        ])
      ]);
      form.appendChild(row);
    }
    root.appendChild(form);

    const btn = continueBtn(() => {
      const body = {};
      let allYes = true;
      for (const it of items) {
        const v = form.querySelector(`input[name="${it.key}"]:checked`);
        const val = v ? v.value === 'yes' : null;
        body[it.key] = val;
        if (val !== true) allYes = false;
      }
      submit('consent', body);
    }, 'Continue');
    root.appendChild(btn);

    watchForCompletion(form, () => items.every(it => !!form.querySelector(`input[name="${it.key}"]:checked`)));
  };

  RENDERERS.welcome = function (p) {
    root.appendChild(el('h2', { class: 'text-xl font-semibold mb-4' }, 'Welcome!'));
    for (const para of p.body) {
      root.appendChild(el('p', { class: 'text-slate-800 mb-3' }, para));
    }
    const btn = continueBtn(() => submit('welcome', {}), 'Continue');
    btn.disabled = false;
    root.appendChild(btn);
  };

  // Merged intro screen: App Z setup → the "recent change" (data type + use case)
  // → comprehension check. The comprehension gates Continue until all three items
  // are correct, counting wrong submissions per item.
  RENDERERS.intro = function (p) {
    const em = p.emphasis || [];
    // First setup line is a larger, bold opener; the rest are body paragraphs.
    root.appendChild(el('h2', { class: 'text-xl font-bold text-slate-900 mb-4' }, p.setup[0]));
    for (const para of p.setup.slice(1)) {
      root.appendChild(el('p', { class: 'text-slate-800 mb-3' }, emphasize(para, em)));
    }
    root.appendChild(el('h3', { class: 'text-xl font-bold text-slate-900 mt-5 mb-2' }, p.change_heading));
    for (const para of p.change) {
      root.appendChild(el('p', { class: 'text-slate-800 mb-3' }, emphasize(para, em)));
    }

    root.appendChild(el('div', { class: 'border-t border-slate-200 mt-5 mb-5' }));
    root.appendChild(el('h3', { class: 'text-xl font-bold text-slate-900 mb-2' }, 'Comprehension check'));
    root.appendChild(el('p', { class: 'text-slate-700 mb-4' }, p.comprehension.instruction));

    const statements = p.comprehension.statements;
    const form = el('div', { class: 'space-y-5' });
    for (const s of statements) {
      form.appendChild(el('div', {}, [
        el('p', { class: 'text-slate-800 mb-2' }, s.text),
        el('div', { class: 'flex gap-6' }, [
          el('label', { class: 'label-radio' }, [
            el('input', { type: 'radio', name: 'answer_' + s.id, value: 'true' }),
            el('span', {}, 'True')
          ]),
          el('label', { class: 'label-radio' }, [
            el('input', { type: 'radio', name: 'answer_' + s.id, value: 'false' }),
            el('span', {}, 'False')
          ])
        ])
      ]));
    }
    root.appendChild(form);

    const errMsg = el('p', { class: 'text-sm text-red-600 mt-3 hidden' },
      'One or more answers are incorrect. Please review the information above and try again.');
    root.appendChild(errMsg);

    // Correct answers: 1 = True, 2 = True, 3 = False
    const correct = { 1: true, 2: true, 3: false };
    const wrong = { 1: 0, 2: 0, 3: 0 };

    const btn = continueBtn(() => {
      const chosen = {};
      for (const s of statements) {
        const sel = form.querySelector(`input[name="answer_${s.id}"]:checked`);
        chosen[s.id] = sel ? (sel.value === 'true') : null;
      }
      let allCorrect = true;
      for (const s of statements) {
        if (chosen[s.id] !== correct[s.id]) { wrong[s.id] += 1; allCorrect = false; }
      }
      if (!allCorrect) {
        errMsg.classList.remove('hidden');
        return; // stay on the screen — unlimited retries
      }
      errMsg.classList.add('hidden');
      submit('intro', {
        answer_1: chosen[1], answer_2: chosen[2], answer_3: chosen[3],
        comp_check_1_wrong_count: wrong[1],
        comp_check_2_wrong_count: wrong[2],
        comp_check_3_wrong_count: wrong[3]
      });
    }, 'Continue');
    root.appendChild(btn);
    watchForCompletion(form, () => statements.every(s => !!form.querySelector(`input[name="answer_${s.id}"]:checked`)));
  };

  RENDERERS.scenario_1 = function (p) {
    root.appendChild(el('h2', { class: 'text-xl font-semibold mb-3' }, 'Scenario'));
    root.appendChild(el('p', { class: 'text-slate-800 mb-3' }, p.prompt));
    root.appendChild(el('p', { class: 'text-slate-700 mb-4 font-medium' }, p.instruction));

    const form = el('div', { class: 'space-y-1' });
    for (const t of p.tiers) {
      form.appendChild(el('label', { class: 'label-radio' }, [
        el('input', { type: 'radio', name: 's1_min_share', value: t.value }),
        el('span', {}, t.label)
      ]));
    }
    form.appendChild(el('label', { class: 'label-radio' }, [
      el('input', { type: 'radio', name: 's1_min_share', value: 'none' }),
      el('span', {}, p.none_label)
    ]));
    root.appendChild(form);

    const btn = continueBtn(() => {
      const sel = form.querySelector('input[name="s1_min_share"]:checked');
      submit('scenario_1', { s1_min_share: sel ? sel.value : null });
    }, 'Continue');
    root.appendChild(btn);
    watchForCompletion(form, () => !!form.querySelector('input[name="s1_min_share"]:checked'));
  };

  RENDERERS.scenario_2 = function (p) {
    root.appendChild(el('h2', { class: 'text-xl font-semibold mb-3' }, 'Scenario'));
    root.appendChild(el('p', { class: 'text-slate-800 mb-3' }, p.intro));
    for (const para of p.lead) {
      root.appendChild(el('p', { class: 'text-slate-800 mb-3' }, para));
    }
    const setupList = el('ul', { class: 'list-disc list-inside text-slate-700 space-y-1 mb-4' });
    p.bullets.forEach(s => setupList.appendChild(el('li', {}, s)));
    root.appendChild(setupList);
    root.appendChild(el('p', { class: 'text-slate-800 font-medium mb-3' }, p.instruction));

    const form = el('div', { class: 'space-y-1' });
    for (const t of p.tiers) {
      form.appendChild(el('label', { class: 'label-radio' }, [
        el('input', { type: 'radio', name: 's2_min_share', value: t.value }),
        el('span', {}, t.label)
      ]));
    }
    form.appendChild(el('label', { class: 'label-radio' }, [
      el('input', { type: 'radio', name: 's2_min_share', value: 'none' }),
      el('span', {}, p.none_label)
    ]));
    root.appendChild(form);

    // Follow-up section (shown when they decline)
    const followup = el('div', { class: 'mt-5 pt-5 border-t border-slate-200 hidden', id: 'followup' });
    followup.appendChild(el('p', { class: 'text-slate-800 font-medium mb-3' }, p.followup_prompt));
    for (const o of p.followup_options) {
      followup.appendChild(el('label', { class: 'label-radio' }, [
        el('input', { type: 'radio', name: 's2_reason', value: o.value }),
        el('span', {}, o.label)
      ]));
    }
    const otherInput = el('input', { type: 'text', name: 's2_reason_other', placeholder: 'Please describe', class: 'input-text mt-2 hidden', maxlength: 500 });
    followup.appendChild(otherInput);
    root.appendChild(followup);

    const btn = continueBtn(() => {
      const sel = form.querySelector('input[name="s2_min_share"]:checked');
      const body = { s2_min_share: sel ? sel.value : null };
      if (followup.classList.contains('hidden') === false) {
        const reasonSel = followup.querySelector('input[name="s2_reason"]:checked');
        body.s2_reason = reasonSel ? reasonSel.value : null;
        if (body.s2_reason === 'other') {
          body.s2_reason_other = otherInput.value.trim();
        }
      }
      submit('scenario_2', body);
    }, 'Continue');
    root.appendChild(btn);

    form.addEventListener('change', refresh);
    followup.addEventListener('change', refresh);
    followup.addEventListener('input', refresh);

    function refresh() {
      const sel = form.querySelector('input[name="s2_min_share"]:checked');
      const declined = !!sel && sel.value === 'none';
      followup.classList.toggle('hidden', !declined);
      const reasonSel = followup.querySelector('input[name="s2_reason"]:checked');
      otherInput.classList.toggle('hidden', !reasonSel || reasonSel.value !== 'other');
      const reasonOk = !declined || (
        !!reasonSel && (reasonSel.value !== 'other' || otherInput.value.trim().length > 0)
      );
      btn.disabled = !(sel && reasonOk);
    }
    refresh();
  };

  // One post-scenario question per screen. `p.item` carries the question; the
  // screen id (postq_<n>) in p.screen is the submit target. The attention check
  // is just an item of type 'attention' and renders like a likert5.
  RENDERERS.post_question = function (p) {
    const it = p.item;
    root.appendChild(el('p', { class: 'text-slate-500 text-xs mb-3' }, 'About: ' + p.data_label));
    root.appendChild(el('p', { class: 'text-slate-800 font-medium mb-1' }, it.prompt));

    const form = el('div', {});
    let getValue;
    let isComplete;

    if (it.type === 'likert5' || it.type === 'attention') {
      form.appendChild(likert5(it.key));
      form.appendChild(anchorRow(it.anchors, 1, 5));
      getValue = () => {
        const sel = form.querySelector(`input[name="${it.key}"]:checked`);
        return sel ? parseInt(sel.value, 10) : null;
      };
      isComplete = () => !!form.querySelector(`input[name="${it.key}"]:checked`);
    } else if (it.type === 'multiselect') {
      const opts = el('div', { class: 'mt-2 space-y-1' });
      for (const o of it.options) {
        opts.appendChild(el('label', { class: 'label-radio' }, [
          el('input', { type: 'checkbox', name: it.key, value: o.value }),
          el('span', {}, o.label)
        ]));
      }
      form.appendChild(opts);
      getValue = () => Array.from(form.querySelectorAll(`input[name="${it.key}"]:checked`)).map(i => i.value);
      isComplete = () => form.querySelectorAll(`input[name="${it.key}"]:checked`).length > 0;
    } else {
      // choice / choice_num — radio list
      const numeric = it.type === 'choice_num';
      const opts = el('div', { class: 'mt-2 space-y-1' });
      for (const o of it.options) {
        opts.appendChild(el('label', { class: 'label-radio' }, [
          el('input', { type: 'radio', name: it.key, value: o.value }),
          el('span', {}, o.label)
        ]));
      }
      form.appendChild(opts);
      getValue = () => {
        const sel = form.querySelector(`input[name="${it.key}"]:checked`);
        if (!sel) return null;
        return numeric ? parseInt(sel.value, 10) : sel.value;
      };
      isComplete = () => !!form.querySelector(`input[name="${it.key}"]:checked`);
    }

    root.appendChild(form);

    const btn = continueBtn(() => {
      submit(p.screen, { [it.key]: getValue() });
    }, 'Continue');
    root.appendChild(btn);
    watchForCompletion(form, isComplete);
  };

  RENDERERS.open_response = function (p) {
    root.appendChild(el('h2', { class: 'text-xl font-semibold mb-3' }, 'In your own words'));
    root.appendChild(el('p', { class: 'text-slate-800 mb-3' }, p.prompt));
    const ta = el('textarea', {
      name: p.field, class: 'input-text', rows: 6, maxlength: 5000,
      placeholder: 'Type your response here…'
    });
    root.appendChild(ta);
    root.appendChild(el('p', { class: 'text-xs text-slate-500 mt-1' }, 'This question is optional.'));
    const btn = continueBtn(() => submit('open_response', { [p.field]: ta.value.trim() }), 'Continue');
    btn.disabled = false; // optional — no gating
    root.appendChild(btn);
  };

  RENDERERS.ai_usage = function (p) {
    root.appendChild(el('h2', { class: 'text-xl font-semibold mb-3' }, 'AI & technology use'));
    if (p.intro) root.appendChild(el('p', { class: 'text-slate-700 mb-5 text-sm' }, p.intro));

    const form = el('div', { class: 'space-y-6' });
    for (const q of p.items) {
      const block = el('div', { class: 'border-b border-slate-100 pb-4' });
      block.appendChild(el('p', { class: 'text-slate-800 font-medium mb-2' }, q.prompt));
      const opts = el('div', { class: 'space-y-1' });
      for (const o of q.options) {
        opts.appendChild(el('label', { class: 'label-radio' }, [
          el('input', { type: 'radio', name: q.key, value: o.value }),
          el('span', {}, o.label)
        ]));
      }
      block.appendChild(opts);
      form.appendChild(block);
    }
    root.appendChild(form);

    const btn = continueBtn(() => {
      const body = {};
      for (const q of p.items) {
        const sel = form.querySelector(`input[name="${q.key}"]:checked`);
        body[q.key] = sel ? sel.value : null;
      }
      submit('ai_usage', body);
    }, 'Continue');
    root.appendChild(btn);
    watchForCompletion(form, () => p.items.every(q => !!form.querySelector(`input[name="${q.key}"]:checked`)));
  };

  RENDERERS.demographics = function (p) {
    root.appendChild(el('h2', { class: 'text-xl font-semibold mb-3' }, 'About you'));
    root.appendChild(el('p', { class: 'text-slate-700 mb-5 text-sm' }, 'These questions help us describe the participant pool.'));

    const form = el('div', { class: 'space-y-6' });
    for (const d of p.items) {
      const block = el('div', { class: 'border-b border-slate-100 pb-4' });
      block.appendChild(el('p', { class: 'text-slate-800 font-medium mb-2' }, d.prompt));
      const opts = el('div', { class: 'space-y-1' });
      for (const o of d.options) {
        opts.appendChild(el('label', { class: 'label-radio' }, [
          el('input', { type: 'radio', name: d.key, value: o.value, 'data-has-other': o.has_other ? '1' : '0' }),
          el('span', {}, o.label)
        ]));
      }
      block.appendChild(opts);
      if (d.key === 'gender') {
        const otherInput = el('input', { type: 'text', name: 'gender_other', placeholder: 'Please specify', class: 'input-text mt-2 hidden', maxlength: 100 });
        block.appendChild(otherInput);
        block.addEventListener('change', () => {
          const sel = block.querySelector('input[name="gender"]:checked');
          otherInput.classList.toggle('hidden', !sel || sel.value !== 'other');
        });
        block.addEventListener('input', () => refresh());
      }
      form.appendChild(block);
    }
    root.appendChild(form);

    const btn = continueBtn(() => {
      const body = {};
      for (const d of p.items) {
        const sel = form.querySelector(`input[name="${d.key}"]:checked`);
        body[d.key] = sel ? sel.value : null;
      }
      if (body.gender === 'other') {
        const otherInput = form.querySelector('input[name="gender_other"]');
        body.gender_other = otherInput ? otherInput.value.trim() : '';
      }
      submit('demographics', body);
    }, 'Continue');
    root.appendChild(btn);

    function refresh() {
      let ok = true;
      for (const d of p.items) {
        const sel = form.querySelector(`input[name="${d.key}"]:checked`);
        if (!sel) { ok = false; break; }
        if (d.key === 'gender' && sel.value === 'other') {
          const otherInput = form.querySelector('input[name="gender_other"]');
          if (!otherInput || otherInput.value.trim().length === 0) ok = false;
        }
      }
      btn.disabled = !ok;
    }
    form.addEventListener('change', refresh);
    form.addEventListener('input', refresh);
    refresh();
  };

  RENDERERS.debrief = function (p) {
    root.appendChild(el('h2', { class: 'text-xl font-semibold mb-4' }, 'Thank you'));
    for (const para of p.body) {
      root.appendChild(el('p', { class: 'text-slate-800 mb-3' }, para));
    }
    const btn = continueBtn(() => submit('debrief', {}), 'Complete study');
    btn.disabled = false;
    root.appendChild(btn);
  };

  RENDERERS.complete = function (p) {
    if (p.redirect) window.location.href = p.redirect;
    else root.appendChild(el('p', {}, 'Thank you — your responses have been recorded.'));
  };

  RENDERERS.returned = function (p) {
    if (p.redirect) window.location.href = p.redirect;
    else root.appendChild(el('p', {}, 'Survey ended.'));
  };

  // ===== Settings-mode renderers (pilot, opt-in via ?mode=settings) =====
  // These mirror the data shape of the plain renderers exactly — they read the
  // same server payload and submit the same body — but present the scenarios
  // inside a desktop-web-app settings page (browser chrome + sidebar + rows).
  const SETTINGS_RENDERERS = {};

  function browserChrome(urlText) {
    return el('div', { class: 'browser-chrome' }, [
      el('div', { class: 'browser-dot bg-red-400' }),
      el('div', { class: 'browser-dot bg-yellow-400' }),
      el('div', { class: 'browser-dot bg-green-400' }),
      el('div', { class: 'browser-url' }, urlText)
    ]);
  }

  function settingsSidebar(activeKey) {
    const items = [
      { key: 'account',      label: 'Account' },
      { key: 'subscription', label: 'Subscription' },
      { key: 'premium',      label: 'Premium features' },
      { key: 'privacy',      label: 'Privacy' },
      { key: 'marketplace',  label: 'Data Marketplace' },
      { key: 'notifications',label: 'Notifications' },
      { key: 'billing',      label: 'Billing' }
    ];
    const nav = el('div', { class: 'settings-nav' });
    for (const it of items) {
      const cls = 'settings-nav-item' + (it.key === activeKey ? ' settings-nav-item-active' : '');
      nav.appendChild(el('div', { class: cls }, it.label));
    }
    return el('div', { class: 'settings-sidebar' }, [
      el('div', { class: 'settings-brand' }, 'App Z'),
      nav
    ]);
  }

  function settingsFooter(saveBtn, noteText) {
    const footer = el('div', { class: 'settings-footer' }, [
      noteText ? el('span', { class: 'settings-footer-note' }, noteText) : null,
      saveBtn
    ]);
    return footer;
  }

  function settingsSaveBtn(onClick, label) {
    const btn = el('button', { type: 'button', class: 'settings-save-btn', disabled: true, id: 'continue-btn' }, label || 'Save changes');
    btn.addEventListener('click', onClick);
    return btn;
  }

  // ===== Scenario 1 (subscription discount, settings mode) =====
  SETTINGS_RENDERERS.scenario_1 = function (p) {
    const frame = el('div', { class: 'browser-frame' });
    frame.appendChild(browserChrome('appz.com/settings/subscription'));

    const body = el('div', { class: 'browser-body' });
    body.appendChild(settingsSidebar('subscription'));

    const content = el('div', { class: 'settings-content' });
    content.appendChild(el('h2', { class: 'settings-section-title' }, 'Subscription'));
    content.appendChild(el('p', { class: 'settings-section-helper' }, 'Manage your App Z plan and data-sharing preferences.'));
    content.appendChild(el('div', { class: 'settings-divider' }));

    // Current plan info row (read-only)
    content.appendChild(el('div', { class: 'settings-row' }, [
      el('div', { class: 'settings-row-text' }, [
        el('div', { class: 'settings-row-label' }, 'Current plan'),
        el('div', { class: 'settings-row-description' }, 'App Z Premium — $20 / month')
      ])
    ]));

    // Section: discount offer (single-select — smallest acceptable discount)
    content.appendChild(el('h3', { class: 'mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500' }, 'Save with data sharing'));
    content.appendChild(el('p', { class: 'settings-section-helper' }, p.prompt));
    content.appendChild(el('p', { class: 'settings-section-helper mt-1' }, p.instruction));

    const form = el('div', { class: 'mt-3 space-y-1' });
    for (const t of p.tiers) {
      form.appendChild(el('label', { class: 'label-radio' }, [
        el('input', { type: 'radio', name: 's1_min_share', value: t.value }),
        el('span', {}, t.label)
      ]));
    }
    form.appendChild(el('label', { class: 'label-radio' }, [
      el('input', { type: 'radio', name: 's1_min_share', value: 'none' }),
      el('span', {}, p.none_label)
    ]));
    content.appendChild(form);

    const btn = settingsSaveBtn(() => {
      const sel = form.querySelector('input[name="s1_min_share"]:checked');
      submit('scenario_1', { s1_min_share: sel ? sel.value : null });
    });
    content.appendChild(settingsFooter(btn, 'Changes are saved automatically.'));

    body.appendChild(content);
    frame.appendChild(body);
    root.appendChild(frame);

    form.addEventListener('change', () => {
      btn.disabled = !form.querySelector('input[name="s1_min_share"]:checked');
    });
  };

  // ===== Scenario 2 (data marketplace, settings mode) =====
  SETTINGS_RENDERERS.scenario_2 = function (p) {
    const frame = el('div', { class: 'browser-frame' });
    frame.appendChild(browserChrome('appz.com/settings/marketplace'));

    const body = el('div', { class: 'browser-body' });
    body.appendChild(settingsSidebar('marketplace'));

    const content = el('div', { class: 'settings-content' });
    content.appendChild(el('h2', { class: 'settings-section-title' }, 'Data Marketplace'));
    content.appendChild(el('p', { class: 'settings-section-helper' }, p.intro));
    for (const para of p.lead) {
      content.appendChild(el('p', { class: 'settings-section-helper' }, para));
    }

    const bullets = el('ul', { class: 'list-disc list-outside ml-5 mt-2 text-sm text-slate-600 space-y-1' });
    p.bullets.forEach(s => bullets.appendChild(el('li', {}, s)));
    content.appendChild(bullets);

    content.appendChild(el('div', { class: 'settings-divider' }));
    content.appendChild(el('h3', { class: 'text-sm font-semibold uppercase tracking-wide text-slate-500' }, 'Revenue share'));
    content.appendChild(el('p', { class: 'settings-section-helper' }, p.instruction));

    const form = el('div', { class: 'mt-3 space-y-1' });
    for (const t of p.tiers) {
      form.appendChild(el('label', { class: 'label-radio' }, [
        el('input', { type: 'radio', name: 's2_min_share', value: t.value }),
        el('span', {}, t.label)
      ]));
    }
    form.appendChild(el('label', { class: 'label-radio' }, [
      el('input', { type: 'radio', name: 's2_min_share', value: 'none' }),
      el('span', {}, p.none_label)
    ]));
    content.appendChild(form);

    // Follow-up panel (shown when they decline)
    const followup = el('div', { class: 'mt-5 pt-4 border-t border-slate-200 hidden', id: 'followup' });
    followup.appendChild(el('p', { class: 'text-slate-800 font-medium mb-2' }, p.followup_prompt));
    for (const o of p.followup_options) {
      followup.appendChild(el('label', { class: 'flex items-center gap-3 py-1 cursor-pointer text-slate-800' }, [
        el('input', { type: 'radio', name: 's2_reason', value: o.value, class: 'h-4 w-4' }),
        el('span', {}, o.label)
      ]));
    }
    const otherInput = el('input', { type: 'text', name: 's2_reason_other', placeholder: 'Please describe', class: 'input-text mt-2 hidden', maxlength: 500 });
    followup.appendChild(otherInput);
    content.appendChild(followup);

    const btn = settingsSaveBtn(() => {
      const sel = form.querySelector('input[name="s2_min_share"]:checked');
      const out = { s2_min_share: sel ? sel.value : null };
      if (!followup.classList.contains('hidden')) {
        const reasonSel = followup.querySelector('input[name="s2_reason"]:checked');
        out.s2_reason = reasonSel ? reasonSel.value : null;
        if (out.s2_reason === 'other') {
          out.s2_reason_other = otherInput.value.trim();
        }
      }
      submit('scenario_2', out);
    });
    content.appendChild(settingsFooter(btn));

    body.appendChild(content);
    frame.appendChild(body);
    root.appendChild(frame);

    function refresh() {
      const sel = form.querySelector('input[name="s2_min_share"]:checked');
      const declined = !!sel && sel.value === 'none';
      followup.classList.toggle('hidden', !declined);
      const reasonSel = followup.querySelector('input[name="s2_reason"]:checked');
      otherInput.classList.toggle('hidden', !reasonSel || reasonSel.value !== 'other');
      const reasonOk = !declined || (
        !!reasonSel && (reasonSel.value !== 'other' || otherInput.value.trim().length > 0)
      );
      btn.disabled = !(sel && reasonOk);
    }
    form.addEventListener('change', refresh);
    followup.addEventListener('change', refresh);
    followup.addEventListener('input', refresh);
    refresh();
  };

  // ===== Boot =====
  async function boot() {
    try {
      const tok = await getJson('/session-token');
      csrfToken = tok.token;
      const screen = await getJson(voiceQs('/screen'));
      if (screen.redirect) {
        window.location.href = screen.redirect;
        return;
      }
      render(screen);
    } catch (e) {
      console.error(e);
      root.innerHTML = '<p class="text-slate-800">Your session could not be loaded. Please return to Prolific and re-enter the study using the original link.</p>';
    }
  }
  boot();
})();
