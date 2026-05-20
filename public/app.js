(function () {
  'use strict';

  const root = document.getElementById('screen-root');
  const errBanner = document.getElementById('error-banner');
  const progressBar = document.getElementById('progress-bar');

  let csrfToken = null;
  let timestampShown = 0;
  let inputEvents = [];

  // ===== Presentation mode (plain | settings) =====
  // `?mode=settings` opts a participant into the settings-style scenario UI.
  // Persisted to sessionStorage so reloads within the tab keep the mode.
  function detectMode() {
    try {
      const urlMode = new URLSearchParams(location.search).get('mode');
      if (urlMode === 'settings') sessionStorage.setItem('appx_mode', 'settings');
      return sessionStorage.getItem('appx_mode') || 'plain';
    } catch (e) {
      return 'plain';
    }
  }
  const MODE = detectMode();

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
      const next = await postJson('/screen/' + screenId, payload);
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
    const useSettings = MODE === 'settings' && SETTINGS_RENDERERS[payload.screen];
    // Settings-mode scenarios render their own browser-frame container; drop the
    // outer card wrapper for those screens so the frame stands alone.
    root.className = useSettings ? '' : 'card';
    const renderer = useSettings ? SETTINGS_RENDERERS[payload.screen] : RENDERERS[payload.screen];
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

  function likert7(name) {
    const container = el('div', { class: 'flex flex-wrap items-center gap-2 sm:gap-3 mt-2' });
    for (let i = 1; i <= 7; i++) {
      container.appendChild(el('label', { class: 'label-radio' }, [
        el('input', { type: 'radio', name, value: i }),
        el('span', {}, String(i))
      ]));
    }
    return container;
  }

  function anchorRow(anchors) {
    return el('div', { class: 'flex justify-between text-xs text-slate-500 mt-1' }, [
      el('span', {}, anchors.low),
      el('span', {}, anchors.high)
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

  // ===== Renderers =====
  const RENDERERS = {};

  RENDERERS.consent = function (p) {
    root.appendChild(el('h2', { class: 'text-xl font-semibold mb-4' }, 'Informed Consent'));
    const consentBox = el('div', {
      class: 'prose prose-sm max-w-none border border-slate-200 rounded p-4 max-h-96 overflow-y-auto whitespace-pre-wrap text-slate-700 text-sm leading-relaxed'
    }, p.consent_text || '');
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

  RENDERERS.scenario_intro = function (p) {
    if (p.retry) {
      root.appendChild(el('div', { class: 'mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800' },
        'Some of your answers on the comprehension check were incorrect. Please review the scenario below carefully — this is your final attempt.'));
    }
    root.appendChild(el('h2', { class: 'text-xl font-semibold mb-4' }, 'Scenario'));
    root.appendChild(el('p', { class: 'text-slate-800 mb-3' }, p.intro));
    root.appendChild(el('p', { class: 'text-slate-800' }, p.use_case_text));
    const btn = continueBtn(() => submit('scenario_intro', {}), 'Continue');
    btn.disabled = false;
    root.appendChild(btn);
  };

  RENDERERS.data_type_intro = function (p) {
    root.appendChild(el('h2', { class: 'text-xl font-semibold mb-1' }, 'Data type'));
    root.appendChild(el('p', { class: 'text-slate-600 mb-3 text-sm' }, 'The data in this scenario is:'));
    root.appendChild(el('div', { class: 'p-4 bg-slate-50 border border-slate-200 rounded mb-4' }, [
      el('div', { class: 'font-semibold text-slate-900 mb-1' }, p.data_label),
      el('div', { class: 'text-slate-700' }, p.data_definition)
    ]));

    let learnMoreClicked = false;
    let learnMoreClickTs = null;
    const details = el('details', { class: 'mb-2' });
    const summary = el('summary', { class: 'cursor-pointer text-slate-700 underline text-sm' }, 'Learn more');
    details.appendChild(summary);
    details.appendChild(el('div', { class: 'mt-2 text-sm text-slate-600' }, p.learn_more_text));
    details.addEventListener('toggle', () => {
      if (details.open && !learnMoreClicked) {
        learnMoreClicked = true;
        learnMoreClickTs = Date.now();
        recordInput('learn_more_open', true);
      }
    });
    root.appendChild(details);

    const btn = continueBtn(() => submit('data_type_intro', {
      learn_more_clicked: learnMoreClicked,
      learn_more_click_ts: learnMoreClickTs
    }), 'Continue');
    btn.disabled = false;
    root.appendChild(btn);
  };

  RENDERERS.comprehension = function (p) {
    if (p.retry) {
      root.appendChild(el('div', { class: 'mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800' },
        'Please answer carefully — if you miss any items, you will be unable to continue.'));
    }
    root.appendChild(el('h2', { class: 'text-xl font-semibold mb-2' }, 'Comprehension check'));
    root.appendChild(el('p', { class: 'text-slate-700 mb-4' },
      'Based on the scenario you just read, indicate whether each statement is True or False.'));

    const form = el('div', { class: 'space-y-5' });
    for (const s of p.statements) {
      const row = el('div', {}, [
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
      ]);
      form.appendChild(row);
    }
    root.appendChild(form);

    const btn = continueBtn(() => {
      const body = {};
      for (const s of p.statements) {
        const sel = form.querySelector(`input[name="answer_${s.id}"]:checked`);
        body['answer_' + s.id] = sel ? (sel.value === 'true') : null;
      }
      submit('comprehension', body);
    }, 'Continue');
    root.appendChild(btn);
    watchForCompletion(form, () => p.statements.every(s => !!form.querySelector(`input[name="answer_${s.id}"]:checked`)));
  };

  RENDERERS.scenario_1 = function (p) {
    root.appendChild(el('h2', { class: 'text-xl font-semibold mb-3' }, 'Scenario 1'));
    root.appendChild(el('p', { class: 'text-slate-800 mb-3' }, p.prompt));
    root.appendChild(el('p', { class: 'text-slate-700 mb-4 font-medium' }, p.instruction));

    const form = el('div', { class: 'space-y-3' });
    for (const t of p.tiers) {
      const row = el('div', { class: 'flex items-center justify-between border-b border-slate-100 py-2' }, [
        el('span', { class: 'text-slate-800' }, t.label),
        el('div', { class: 'flex gap-4 tier-radios', 'data-key': t.key }, [
          el('label', { class: 'label-radio' }, [
            el('input', { type: 'radio', name: t.key, value: 'yes', 'data-tier': '1' }),
            el('span', {}, 'Yes')
          ]),
          el('label', { class: 'label-radio' }, [
            el('input', { type: 'radio', name: t.key, value: 'no', 'data-tier': '1' }),
            el('span', {}, 'No')
          ])
        ])
      ]);
      form.appendChild(row);
    }
    // Standalone none option
    const noneRow = el('label', { class: 'flex items-center gap-3 pt-3 cursor-pointer' }, [
      el('input', { type: 'checkbox', name: 's1_none', id: 's1_none' }),
      el('span', { class: 'text-slate-800' }, p.none_label)
    ]);
    form.appendChild(noneRow);
    root.appendChild(form);

    const noneBox = form.querySelector('#s1_none');
    const tierInputs = form.querySelectorAll('input[data-tier]');
    noneBox.addEventListener('change', () => {
      tierInputs.forEach(inp => {
        inp.disabled = noneBox.checked;
        if (noneBox.checked) inp.checked = false;
      });
      refresh();
    });
    tierInputs.forEach(inp => inp.addEventListener('change', () => { if (inp.checked) { /* tier selected */ } refresh(); }));

    const btn = continueBtn(() => {
      const body = {};
      if (noneBox.checked) {
        body.s1_none = true;
      } else {
        body.s1_none = false;
        for (const t of p.tiers) {
          const sel = form.querySelector(`input[name="${t.key}"]:checked`);
          body[t.key] = sel ? (sel.value === 'yes') : null;
        }
      }
      submit('scenario_1', body);
    }, 'Continue');
    root.appendChild(btn);

    function refresh() {
      const complete = noneBox.checked || p.tiers.every(t => !!form.querySelector(`input[name="${t.key}"]:checked`));
      btn.disabled = !complete;
    }
    refresh();
  };

  RENDERERS.scenario_2 = function (p) {
    root.appendChild(el('h2', { class: 'text-xl font-semibold mb-3' }, 'Scenario 2'));
    root.appendChild(el('p', { class: 'text-slate-700 italic mb-3' }, p.reminder));
    root.appendChild(el('p', { class: 'text-slate-800 mb-2' }, p.intro));
    root.appendChild(el('p', { class: 'text-slate-800 mb-3' }, p.feature));
    root.appendChild(el('p', { class: 'text-slate-800 font-medium mb-3' }, p.prompt));

    const form = el('div', { class: 'space-y-2' });
    for (const o of p.options) {
      form.appendChild(el('label', { class: 'label-radio' }, [
        el('input', { type: 'radio', name: 's2_response', value: o.value }),
        el('span', {}, o.label)
      ]));
    }
    root.appendChild(form);

    const btn = continueBtn(() => {
      const sel = form.querySelector('input[name="s2_response"]:checked');
      submit('scenario_2', { s2_response: sel ? sel.value : null });
    }, 'Continue');
    root.appendChild(btn);
    watchForCompletion(form, () => !!form.querySelector('input[name="s2_response"]:checked'));
  };

  RENDERERS.scenario_3 = function (p) {
    root.appendChild(el('h2', { class: 'text-xl font-semibold mb-3' }, 'Scenario 3'));
    root.appendChild(el('p', { class: 'text-slate-800 mb-3' }, p.intro));
    const setupList = el('ul', { class: 'list-disc list-inside text-slate-700 space-y-1 mb-4' });
    p.setup.forEach(s => setupList.appendChild(el('li', {}, s)));
    root.appendChild(setupList);
    root.appendChild(el('p', { class: 'text-slate-800 font-medium mb-3' }, p.instruction));

    const form = el('div', { class: 'space-y-3' });
    for (const t of p.tiers) {
      form.appendChild(el('div', { class: 'flex items-center justify-between border-b border-slate-100 py-2' }, [
        el('span', { class: 'text-slate-800' }, t.label),
        el('div', { class: 'flex gap-4' }, [
          el('label', { class: 'label-radio' }, [
            el('input', { type: 'radio', name: t.key, value: 'yes', 'data-tier': '1' }),
            el('span', {}, 'Yes')
          ]),
          el('label', { class: 'label-radio' }, [
            el('input', { type: 'radio', name: t.key, value: 'no', 'data-tier': '1' }),
            el('span', {}, 'No')
          ])
        ])
      ]));
    }
    form.appendChild(el('label', { class: 'flex items-center gap-3 pt-3 cursor-pointer' }, [
      el('input', { type: 'checkbox', name: 's3_none', id: 's3_none' }),
      el('span', { class: 'text-slate-800' }, p.none_label)
    ]));
    root.appendChild(form);

    // Follow-up section (hidden until triggered)
    const followup = el('div', { class: 'mt-5 pt-5 border-t border-slate-200 hidden', id: 'followup' });
    followup.appendChild(el('p', { class: 'text-slate-800 font-medium mb-3' }, p.followup_prompt));
    for (const o of p.followup_options) {
      followup.appendChild(el('label', { class: 'label-radio' }, [
        el('input', { type: 'radio', name: 's3_reason', value: o.value }),
        el('span', {}, o.label)
      ]));
    }
    const otherInput = el('input', { type: 'text', name: 's3_reason_other', placeholder: 'Please describe', class: 'input-text mt-2 hidden', maxlength: 500 });
    followup.appendChild(otherInput);
    root.appendChild(followup);

    const btn = continueBtn(() => {
      const body = {};
      if (noneBox.checked) {
        body.s3_none = true;
      } else {
        body.s3_none = false;
        for (const t of p.tiers) {
          const sel = form.querySelector(`input[name="${t.key}"]:checked`);
          body[t.key] = sel ? (sel.value === 'yes') : null;
        }
      }
      if (followup.classList.contains('hidden') === false) {
        const reasonSel = followup.querySelector('input[name="s3_reason"]:checked');
        body.s3_reason = reasonSel ? reasonSel.value : null;
        if (body.s3_reason === 'other') {
          body.s3_reason_other = otherInput.value.trim();
        }
      }
      submit('scenario_3', body);
    }, 'Continue');
    root.appendChild(btn);

    const noneBox = form.querySelector('#s3_none');
    const tierInputs = form.querySelectorAll('input[data-tier]');
    noneBox.addEventListener('change', () => {
      tierInputs.forEach(inp => {
        inp.disabled = noneBox.checked;
        if (noneBox.checked) inp.checked = false;
      });
      refresh();
    });
    form.addEventListener('change', refresh);
    followup.addEventListener('change', refresh);
    followup.addEventListener('input', refresh);

    function refresh() {
      const tiersComplete = p.tiers.every(t => !!form.querySelector(`input[name="${t.key}"]:checked`));
      const allNo = !noneBox.checked && p.tiers.every(t => {
        const sel = form.querySelector(`input[name="${t.key}"]:checked`);
        return sel && sel.value === 'no';
      });
      const showFollowup = noneBox.checked || allNo;
      followup.classList.toggle('hidden', !showFollowup);

      const baseComplete = noneBox.checked || tiersComplete;
      const reasonSel = followup.querySelector('input[name="s3_reason"]:checked');
      const reasonOk = !showFollowup || (
        !!reasonSel && (reasonSel.value !== 'other' || otherInput.value.trim().length > 0)
      );
      otherInput.classList.toggle('hidden', !reasonSel || reasonSel.value !== 'other');
      btn.disabled = !(baseComplete && reasonOk);
    }
    refresh();
  };

  RENDERERS.supplementary = function (p) {
    root.appendChild(el('h2', { class: 'text-xl font-semibold mb-2' }, 'A few more questions'));
    root.appendChild(el('p', { class: 'text-slate-700 mb-5 text-sm' }, p.context_line));

    const form = el('div', { class: 'space-y-6' });
    for (const it of p.items) {
      const block = el('div', { class: 'border-b border-slate-100 pb-4' });
      block.appendChild(el('p', { class: 'text-slate-800 font-medium' }, it.prompt));
      if (it.type === 'likert5') {
        block.appendChild(likert5(it.key));
        block.appendChild(anchorRow(it.anchors));
      } else {
        const opts = el('div', { class: 'mt-2 space-y-1' });
        for (const o of it.options) {
          opts.appendChild(el('label', { class: 'label-radio' }, [
            el('input', { type: 'radio', name: it.key, value: o.value }),
            el('span', {}, o.label)
          ]));
        }
        block.appendChild(opts);
      }
      form.appendChild(block);
    }
    root.appendChild(form);

    const btn = continueBtn(() => {
      const body = {};
      for (const it of p.items) {
        const sel = form.querySelector(`input[name="${it.key}"]:checked`);
        if (!sel) { body[it.key] = null; continue; }
        body[it.key] = it.type === 'likert5' ? parseInt(sel.value, 10) : sel.value;
      }
      submit('supplementary', body);
    }, 'Continue');
    root.appendChild(btn);
    watchForCompletion(form, () => p.items.every(it => !!form.querySelector(`input[name="${it.key}"]:checked`)));
  };

  RENDERERS.compensation = function (p) {
    root.appendChild(el('h2', { class: 'text-xl font-semibold mb-3' }, 'Compensation models'));
    root.appendChild(el('p', { class: 'text-slate-800 mb-4' }, p.ranking_prompt));

    const ranks = el('div', { class: 'space-y-3 mb-6' });
    for (const m of p.items) {
      const row = el('div', { class: 'flex items-start gap-3 border-b border-slate-100 pb-3' }, [
        el('select', {
          class: 'select-rank shrink-0',
          name: 'rank_' + m.key,
          'data-rank-select': '1'
        }, [
          el('option', { value: '' }, '—'),
          el('option', { value: '1' }, '1'),
          el('option', { value: '2' }, '2'),
          el('option', { value: '3' }, '3'),
          el('option', { value: '4' }, '4'),
          el('option', { value: '5' }, '5')
        ]),
        el('div', {}, [
          el('div', { class: 'font-medium text-slate-900' }, m.label),
          el('div', { class: 'text-sm text-slate-600' }, m.description)
        ])
      ]);
      ranks.appendChild(row);
    }
    root.appendChild(ranks);

    // Rating section
    root.appendChild(el('p', { class: 'text-slate-800 font-medium mb-3' }, p.rating_intro));
    const ratings = el('div', { class: 'space-y-6' });
    for (const m of p.items) {
      const block = el('div', { class: 'border border-slate-200 rounded p-3' });
      block.appendChild(el('div', { class: 'font-medium text-slate-900 mb-2' }, m.label));
      block.appendChild(el('div', { class: 'text-sm text-slate-700 mb-1' }, 'How fair is this model?'));
      block.appendChild(likert5('fair_' + m.key));
      block.appendChild(anchorRow({ low: 'Not fair', high: 'Very fair' }));
      block.appendChild(el('div', { class: 'text-sm text-slate-700 mb-1 mt-3' }, 'How practical is this model?'));
      block.appendChild(likert5('practical_' + m.key));
      block.appendChild(anchorRow({ low: 'Not practical', high: 'Very practical' }));
      ratings.appendChild(block);
    }
    root.appendChild(ratings);

    const btn = continueBtn(() => {
      const body = {};
      for (const m of p.items) {
        const sel = ranks.querySelector(`select[name="rank_${m.key}"]`);
        body['rank_' + m.key] = sel.value ? parseInt(sel.value, 10) : null;
      }
      for (const m of p.items) {
        const fSel = ratings.querySelector(`input[name="fair_${m.key}"]:checked`);
        const pSel = ratings.querySelector(`input[name="practical_${m.key}"]:checked`);
        body['fair_' + m.key] = fSel ? parseInt(fSel.value, 10) : null;
        body['practical_' + m.key] = pSel ? parseInt(pSel.value, 10) : null;
      }
      submit('compensation', body);
    }, 'Continue');
    root.appendChild(btn);

    function refresh() {
      const rankVals = [];
      let rankErr = '';
      for (const m of p.items) {
        const v = ranks.querySelector(`select[name="rank_${m.key}"]`).value;
        if (!v) { rankErr = 'incomplete'; break; }
        rankVals.push(v);
      }
      if (!rankErr) {
        const uniq = new Set(rankVals);
        if (uniq.size !== 5) rankErr = 'duplicate';
      }
      const fairOk = p.items.every(m => !!ratings.querySelector(`input[name="fair_${m.key}"]:checked`));
      const pracOk = p.items.every(m => !!ratings.querySelector(`input[name="practical_${m.key}"]:checked`));
      btn.disabled = !!rankErr || !fairOk || !pracOk;
      if (rankErr === 'duplicate') {
        showError('Each compensation model must have a unique rank from 1 to 5.');
      } else {
        clearError();
      }
    }
    ranks.addEventListener('change', refresh);
    ratings.addEventListener('change', refresh);
    refresh();
  };

  RENDERERS.ai_usage = function (p) {
    root.appendChild(el('h2', { class: 'text-xl font-semibold mb-3' }, 'AI tool usage'));
    root.appendChild(el('p', { class: 'text-slate-800 mb-3' }, p.prompt));
    const form = el('div', { class: 'space-y-2' });
    for (const o of p.options) {
      form.appendChild(el('label', { class: 'label-radio' }, [
        el('input', { type: 'radio', name: 'ai_usage', value: o.value }),
        el('span', {}, o.label)
      ]));
    }
    root.appendChild(form);
    const btn = continueBtn(() => {
      const sel = form.querySelector('input[name="ai_usage"]:checked');
      submit('ai_usage', { ai_usage: sel ? sel.value : null });
    }, 'Continue');
    root.appendChild(btn);
    watchForCompletion(form, () => !!form.querySelector('input[name="ai_usage"]:checked'));
  };

  RENDERERS.attitudes = function (p) {
    root.appendChild(el('h2', { class: 'text-xl font-semibold mb-3' }, 'Your views'));
    root.appendChild(el('p', { class: 'text-slate-800 mb-1' }, p.instruction));
    root.appendChild(el('p', { class: 'text-xs text-slate-500 mb-5' }, '1 = Strongly Disagree, 7 = Strongly Agree'));

    const form = el('div', { class: 'space-y-6' });
    for (const it of p.items) {
      const block = el('div', { class: 'border-b border-slate-100 pb-4' });
      block.appendChild(el('p', { class: 'text-slate-800' }, it.text));
      block.appendChild(likert7(it.key));
      block.appendChild(anchorRow(p.anchors));
      form.appendChild(block);
    }
    root.appendChild(form);

    const btn = continueBtn(() => {
      const body = {};
      for (const it of p.items) {
        const sel = form.querySelector(`input[name="${it.key}"]:checked`);
        const v = sel ? parseInt(sel.value, 10) : null;
        body[it.key] = v;
      }
      submit('attitudes', body);
    }, 'Continue');
    root.appendChild(btn);
    watchForCompletion(form, () => p.items.every(it => !!form.querySelector(`input[name="${it.key}"]:checked`)));
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
      el('div', { class: 'settings-brand' }, 'AppX'),
      nav
    ]);
  }

  // Inline Yes/No (or Yes/No/Not sure) segmented control. Stores chosen value
  // on `wrap.dataset.value`; records an input event on each click.
  function segmented(name, options) {
    const wrap = el('div', { class: 'settings-segmented', 'data-name': name, role: 'radiogroup' });
    for (const o of options) {
      const btn = el('button', { type: 'button', 'data-val': o.value }, o.label);
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        wrap.querySelectorAll('button').forEach(b => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        wrap.dataset.value = o.value;
        recordInput(name, o.value);
        wrap.dispatchEvent(new CustomEvent('seg-change', { bubbles: true }));
      });
      wrap.appendChild(btn);
    }
    return wrap;
  }
  function segGet(wrap) { return wrap.dataset.value || null; }
  function segSetDisabled(wrap, disabled) {
    wrap.classList.toggle('settings-disabled', disabled);
    wrap.querySelectorAll('button').forEach(b => { b.disabled = disabled; });
    if (disabled) {
      wrap.querySelectorAll('button').forEach(b => b.classList.remove('is-selected'));
      delete wrap.dataset.value;
    }
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
    frame.appendChild(browserChrome('appx.com/settings/subscription'));

    const body = el('div', { class: 'browser-body' });
    body.appendChild(settingsSidebar('subscription'));

    const content = el('div', { class: 'settings-content' });
    content.appendChild(el('h2', { class: 'settings-section-title' }, 'Subscription'));
    content.appendChild(el('p', { class: 'settings-section-helper' }, 'Manage your AppX plan and data-sharing preferences.'));
    content.appendChild(el('div', { class: 'settings-divider' }));

    // Current plan info row (read-only)
    content.appendChild(el('div', { class: 'settings-row' }, [
      el('div', { class: 'settings-row-text' }, [
        el('div', { class: 'settings-row-label' }, 'Current plan'),
        el('div', { class: 'settings-row-description' }, 'AppX Premium — $20 / month')
      ])
    ]));

    // Section: discount offers
    content.appendChild(el('h3', { class: 'mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500' }, 'Save with data sharing'));
    content.appendChild(el('p', { class: 'settings-section-helper' }, p.prompt));
    content.appendChild(el('p', { class: 'settings-section-helper mt-1' }, 'Choose the discount offers you would accept:'));

    const rowsBox = el('div', { class: 'mt-3' });
    const segs = {};
    for (const t of p.tiers) {
      const seg = segmented(t.key, [
        { value: 'yes', label: 'Yes' },
        { value: 'no',  label: 'No'  }
      ]);
      segs[t.key] = seg;
      const row = el('div', { class: 'settings-row' }, [
        el('div', { class: 'settings-row-text' }, [
          el('div', { class: 'settings-row-label' }, t.label),
          el('div', { class: 'settings-row-description' }, 'Share data to receive this discount')
        ]),
        seg
      ]);
      rowsBox.appendChild(row);
    }
    content.appendChild(rowsBox);

    // Decline-all row
    const declineLabel = el('label', { class: 'settings-decline-row' }, [
      el('input', { type: 'checkbox', name: 's1_none', id: 's1_none', class: 'h-4 w-4' }),
      el('span', {}, p.none_label)
    ]);
    content.appendChild(declineLabel);

    // Save footer
    const btn = settingsSaveBtn(() => {
      const body = {};
      const declined = declineLabel.querySelector('#s1_none').checked;
      if (declined) {
        body.s1_none = true;
      } else {
        body.s1_none = false;
        for (const t of p.tiers) {
          const v = segGet(segs[t.key]);
          body[t.key] = v === 'yes';
        }
      }
      submit('scenario_1', body);
    });
    content.appendChild(settingsFooter(btn, 'Changes are saved automatically.'));

    body.appendChild(content);
    frame.appendChild(body);
    root.appendChild(frame);

    // Wire up disable behavior + Continue gating
    const declineBox = declineLabel.querySelector('#s1_none');
    function refresh() {
      const declined = declineBox.checked;
      for (const t of p.tiers) segSetDisabled(segs[t.key], declined);
      const allAnswered = declined || p.tiers.every(t => segGet(segs[t.key]) != null);
      btn.disabled = !allAnswered;
    }
    declineBox.addEventListener('change', () => {
      recordInput('s1_none', declineBox.checked);
      refresh();
    });
    frame.addEventListener('seg-change', refresh);
    refresh();
  };

  // ===== Scenario 2 (feature tradeoff, settings mode) =====
  SETTINGS_RENDERERS.scenario_2 = function (p) {
    const frame = el('div', { class: 'browser-frame' });
    frame.appendChild(browserChrome('appx.com/settings/premium'));

    const body = el('div', { class: 'browser-body' });
    body.appendChild(settingsSidebar('premium'));

    const content = el('div', { class: 'settings-content' });
    content.appendChild(el('h2', { class: 'settings-section-title' }, 'Premium features'));
    content.appendChild(el('p', { class: 'settings-section-helper' }, p.intro));
    content.appendChild(el('div', { class: 'settings-callout' }, p.reminder));
    content.appendChild(el('div', { class: 'settings-divider' }));

    const seg = segmented('s2_response', [
      { value: 'yes',      label: 'Yes' },
      { value: 'no',       label: 'No' },
      { value: 'not_sure', label: 'Not sure' }
    ]);
    content.appendChild(el('div', { class: 'settings-row' }, [
      el('div', { class: 'settings-row-text' }, [
        el('div', { class: 'settings-row-label' }, p.prompt),
        el('div', { class: 'settings-row-description' }, p.feature)
      ]),
      seg
    ]));

    const btn = settingsSaveBtn(() => {
      submit('scenario_2', { s2_response: segGet(seg) });
    });
    content.appendChild(settingsFooter(btn));

    body.appendChild(content);
    frame.appendChild(body);
    root.appendChild(frame);

    frame.addEventListener('seg-change', () => {
      btn.disabled = segGet(seg) == null;
    });
  };

  // ===== Scenario 3 (data marketplace, settings mode) =====
  SETTINGS_RENDERERS.scenario_3 = function (p) {
    const frame = el('div', { class: 'browser-frame' });
    frame.appendChild(browserChrome('appx.com/settings/marketplace'));

    const body = el('div', { class: 'browser-body' });
    body.appendChild(settingsSidebar('marketplace'));

    const content = el('div', { class: 'settings-content' });
    content.appendChild(el('h2', { class: 'settings-section-title' }, 'Data Marketplace'));
    content.appendChild(el('p', { class: 'settings-section-helper' }, p.intro));

    const bullets = el('ul', { class: 'list-disc list-outside ml-5 mt-2 text-sm text-slate-600 space-y-1' });
    p.setup.forEach(s => bullets.appendChild(el('li', {}, s)));
    content.appendChild(bullets);

    content.appendChild(el('div', { class: 'settings-divider' }));
    content.appendChild(el('h3', { class: 'text-sm font-semibold uppercase tracking-wide text-slate-500' }, 'Revenue share'));
    content.appendChild(el('p', { class: 'settings-section-helper' }, p.instruction));

    const segs = {};
    const rowsBox = el('div', { class: 'mt-3' });
    for (const t of p.tiers) {
      const seg = segmented(t.key, [
        { value: 'yes', label: 'Yes' },
        { value: 'no',  label: 'No'  }
      ]);
      segs[t.key] = seg;
      rowsBox.appendChild(el('div', { class: 'settings-row' }, [
        el('div', { class: 'settings-row-text' }, [
          el('div', { class: 'settings-row-label' }, t.label),
          el('div', { class: 'settings-row-description' }, 'Allow AppX to sell at this revenue share')
        ]),
        seg
      ]));
    }
    content.appendChild(rowsBox);

    // Decline-all row
    const declineLabel = el('label', { class: 'settings-decline-row' }, [
      el('input', { type: 'checkbox', name: 's3_none', id: 's3_none', class: 'h-4 w-4' }),
      el('span', {}, p.none_label)
    ]);
    content.appendChild(declineLabel);

    // Follow-up panel (hidden until triggered)
    const followup = el('div', { class: 'mt-5 pt-4 border-t border-slate-200 hidden', id: 'followup' });
    followup.appendChild(el('p', { class: 'text-slate-800 font-medium mb-2' }, p.followup_prompt));
    for (const o of p.followup_options) {
      followup.appendChild(el('label', { class: 'flex items-center gap-3 py-1 cursor-pointer text-slate-800' }, [
        el('input', { type: 'radio', name: 's3_reason', value: o.value, class: 'h-4 w-4' }),
        el('span', {}, o.label)
      ]));
    }
    const otherInput = el('input', { type: 'text', name: 's3_reason_other', placeholder: 'Please describe', class: 'input-text mt-2 hidden', maxlength: 500 });
    followup.appendChild(otherInput);
    content.appendChild(followup);

    const btn = settingsSaveBtn(() => {
      const out = {};
      const declined = declineLabel.querySelector('#s3_none').checked;
      if (declined) {
        out.s3_none = true;
      } else {
        out.s3_none = false;
        for (const t of p.tiers) {
          const v = segGet(segs[t.key]);
          out[t.key] = v === 'yes';
        }
      }
      if (!followup.classList.contains('hidden')) {
        const reasonSel = followup.querySelector('input[name="s3_reason"]:checked');
        out.s3_reason = reasonSel ? reasonSel.value : null;
        if (out.s3_reason === 'other') {
          out.s3_reason_other = otherInput.value.trim();
        }
      }
      submit('scenario_3', out);
    });
    content.appendChild(settingsFooter(btn));

    body.appendChild(content);
    frame.appendChild(body);
    root.appendChild(frame);

    const declineBox = declineLabel.querySelector('#s3_none');
    function refresh() {
      const declined = declineBox.checked;
      for (const t of p.tiers) segSetDisabled(segs[t.key], declined);

      const tiersAnswered = p.tiers.every(t => segGet(segs[t.key]) != null);
      const allNo = !declined && tiersAnswered && p.tiers.every(t => segGet(segs[t.key]) === 'no');
      const showFollowup = declined || allNo;
      followup.classList.toggle('hidden', !showFollowup);

      const baseComplete = declined || tiersAnswered;
      const reasonSel = followup.querySelector('input[name="s3_reason"]:checked');
      otherInput.classList.toggle('hidden', !reasonSel || reasonSel.value !== 'other');
      const reasonOk = !showFollowup || (
        !!reasonSel && (reasonSel.value !== 'other' || otherInput.value.trim().length > 0)
      );
      btn.disabled = !(baseComplete && reasonOk);
    }
    declineBox.addEventListener('change', () => {
      recordInput('s3_none', declineBox.checked);
      refresh();
    });
    frame.addEventListener('seg-change', refresh);
    followup.addEventListener('change', refresh);
    followup.addEventListener('input', refresh);
    refresh();
  };

  // ===== Boot =====
  async function boot() {
    try {
      const tok = await getJson('/session-token');
      csrfToken = tok.token;
      const screen = await getJson('/screen');
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
