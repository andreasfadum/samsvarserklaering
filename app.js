// Samsvarserklæring — statisk app. Ingen server, ingen sporing.
// Utkastet lagres i localStorage på enheten. PDF lages i nettleseren med jsPDF.
(function () {
  'use strict';
  const TPL = SE.TEMPLATES.vatrom_flis;
  const KEY = 'samsvarserklaering-v1';
  const FONT_URL = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/';
  const app = document.getElementById('app');
  const open = new Set();        // åpne forklaringer
  let pdfUrl = null, pdfBlob = null, pdfName = '';
  let msg = null;                // {kind, html}

  // ---------- tilstand ----------
  const today = new Date().toISOString().slice(0, 10);
  const blank = () => ({
    lang: guessLang(), step: 1, bi: true,
    f: { room: '', date: today }, w: {}, dOff: {}, dev: 'none', att: {}, sig: ''
  });
  function guessLang() {
    const nav = (navigator.language || 'nb').slice(0, 2).toLowerCase();
    const map = { no: 'nb', nn: 'nb', nb: 'nb' };
    const c = map[nav] || nav;
    return SE.LANGS.some(l => l.code === c) ? c : 'nb';
  }
  // Firmaprofil: lagres for seg, så den overlever «Slett utkastet» og fyller ut nye erklæringer.
  const PKEY = 'samsvarserklaering-firma';
  const PFIELDS = ['firm', 'orgnr', 'person', 'contact', 'place'];
  let P = loadProfile();
  let PD = Object.assign({}, P || {});   // utkast på profilsiden
  let view = P ? 'form' : 'profile';
  function loadProfile() {
    try { const p = JSON.parse(localStorage.getItem(PKEY)); if (p && typeof p === 'object') return p; } catch (e) {}
    return null;
  }
  function applyProfile(s, force) {
    if (!P) return s;
    PFIELDS.forEach(k => { if (P[k] && (force || !s.f[k])) s.f[k] = P[k]; });
    if (P.person && (force || !s.f.signName)) s.f.signName = P.person.toUpperCase();
    return s;
  }
  let S = load();
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.f) return applyProfile(Object.assign(blank(), s)); } catch (e) {}
    return applyProfile(blank());
  }
  let saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(S)); flashSaved(); } catch (e) {}
    }, 300);
  }
  function flashSaved() {
    const el = document.querySelector('.saved');
    if (el) { el.textContent = '✓ ' + t('saved'); setTimeout(() => { el.textContent = ''; }, 1500); }
  }

  // ---------- tekst ----------
  function t(k, lang) {
    lang = lang || S.lang;
    const L = SE.T[lang] || {};
    return L[k] != null ? L[k] : (SE.T.nb[k] != null ? SE.T.nb[k] : k);
  }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Gjør {kilde} om til lenkede fotnoter og legger kildelista under.
  function withNotes(text) {
    const used = [];
    const html = esc(text).replace(/\{(\w+)\}/g, (m, k) => {
      const s = SE.SOURCES[k]; if (!s) return '';
      let n = used.indexOf(k); if (n < 0) { used.push(k); n = used.length - 1; }
      return `<sup><a href="${s.url}" target="_blank" rel="noopener">[${n + 1}]</a></sup>`;
    });
    const list = used.length ? `<ol>${used.map(k => `<li><a href="${SE.SOURCES[k].url}" target="_blank" rel="noopener">${esc(SE.SOURCES[k].title)}</a></li>`).join('')}</ol>` : '';
    return html + list;
  }
  const plain = s => String(s).replace(/\s*\{\w+\}/g, '');

  // ---------- byggeklosser ----------
  function infoBtn(x) {
    const on = open.has(x);
    return `<button type="button" class="info" data-x="${x}" aria-expanded="${on}" aria-label="${esc(t('more'))}" title="${esc(t('more'))}">i</button>`;
  }
  function expl(x) { return open.has(x) ? `<div class="expl">${withNotes(t(x))}</div>` : ''; }
  function field(k, o = {}) {
    const v = esc(S.f[k] || '');
    const x = o.info ? 'x_' + k : null;
    const ph = o.ph ? ` placeholder="${esc(o.ph)}"` : '';
    const input = o.area
      ? `<textarea data-k="${k}"${ph}>${v}</textarea>`
      : `<input type="${o.type || 'text'}" data-k="${k}" value="${v}"${ph}${o.mode ? ` inputmode="${o.mode}"` : ''} autocomplete="${o.ac || 'off'}">`;
    return `<label class="f${o.wide ? ' wide' : ''}"><span class="lab">${esc(t(o.label || k))}${x ? infoBtn(x) : ''}</span>${x ? expl(x) : ''}${input}</label>`;
  }

  // ---------- trinn ----------
  function profileView() {
    const pf = (k, o = {}) => `<label class="f${o.wide ? ' wide' : ''}"><span class="lab">${esc(t(k))}</span><input type="text" data-p="${k}" value="${esc(PD[k] || '')}"${o.mode ? ` inputmode="${o.mode}"` : ''} autocomplete="${o.ac || 'off'}"></label>`;
    return `
    <section class="card"><h2>${esc(t(P ? 'profileTitle' : 'welcome'))}</h2>
      <p class="note">${esc(t('welcomeText'))}</p>
      <div class="grid">
        ${pf('firm', { wide: 1, ac: 'organization' })}${pf('orgnr', { mode: 'numeric' })}${pf('contact', { ac: 'tel' })}
        ${pf('person', { wide: 1, ac: 'name' })}${pf('place')}
      </div>
      ${msg ? `<div class="msg ${msg.kind}">${msg.html}</div>` : ''}
      <p class="note" style="margin-top:12px">🔒 ${esc(t('privacy'))}</p>
    </section>`;
  }
  function step1() {
    return `
    <details class="card about"${S.f.firm ? '' : ' open'}><summary>${esc(t('about'))}</summary>
      <p>${withNotes(t('aboutText'))}</p><p>${withNotes(t('aboutDoc'))}</p><p>🔒 ${esc(t('privacy'))}</p></details>
    <section class="card"><div class="row"><h2 style="flex:1">${esc(t('q_ansvar'))}</h2>${infoBtn('x_ansvar')}</div>${expl('x_ansvar')}
      ${['no', 'yes', 'unsure'].map(v => `<div class="row"><label class="chk"><input type="radio" name="ans" data-ans="${v}"${S.ans === v ? ' checked' : ''}><span>${esc(t('ans_' + v))}</span></label></div>`).join('')}
      ${S.ans === 'yes' ? `<div class="msg warn">${withNotes(t('ansYesText'))}<p><a class="btn pri" style="display:block;text-align:center;text-decoration:none" href="${SE.SOURCES.dibk5148.url}" target="_blank" rel="noopener">${esc(t('openForm'))}</a></p></div>` : ''}
      ${S.ans === 'unsure' ? `<div class="expl" style="margin-left:0">${withNotes(t('ansUnsureText'))}</div>` : ''}
    </section>
    ${S.ans === 'yes' ? '' : `<section class="card"><h2>${esc(t('s1'))}</h2>
      <p class="note">${P && P.firm ? '✓ ' + esc(t('fromProfile')) + ' ' : ''}<button type="button" class="linkbtn" data-act="profile">${esc(t('editProfile'))}</button></p>
      <p class="note">${esc(t('tapHint'))}</p>
      <div class="grid">
        ${field('firm', { ac: 'organization' })}${field('orgnr', { info: 1, mode: 'numeric' })}
        ${field('person', { info: 1, ac: 'name' })}${field('contact', { ac: 'tel' })}
        ${field('customer', { wide: 1 })}
        ${field('address', { wide: 1, ph: 'Gate 1, 0123 Oslo' })}
        ${field('room', { ph: t('roomDefault') })}${field('ref')}
        ${field('from', { type: 'date' })}${field('to', { type: 'date' })}
      </div></section>`}`;
  }
  function item(id, extra) {
    const x = 'x_' + id;
    return `<div class="item"><div class="row"><label class="chk"><input type="checkbox" data-w="${id}"${S.w[id] ? ' checked' : ''}><span>${esc(t(id))}</span></label>${SE.T.nb[x] ? infoBtn(x) : ''}</div>${expl(x)}${S.w[id] && extra ? `<div class="sub">${extra}</div>` : ''}</div>`;
  }
  function step2() {
    const groups = TPL.groups.map(g => `<h3 class="group">${esc(t(g.id))}</h3>` + g.items.map(id => {
      let extra = (TPL.products[id] || []).map(p => field(p, { label: p })).join('');
      if (id === 'fall') extra += field('fallMeasured', { ph: '1:50' });
      return item(id, extra);
    }).join('')).join('');
    return `
    <section class="card"><h2>${esc(t('s2'))}</h2>
      <p class="note">${esc(t('tapHint'))}</p>
      ${groups}
      ${item('other', field('otherText', { area: 1, label: 'otherText' }))}
    </section>
    <section class="card">${field('others', { area: 1, info: 1, ph: t('othersPh') })}</section>`;
  }
  function activeDecl() { return TPL.declarations.filter(d => !d.when.length || d.when.some(w => S.w[w])); }
  function step3() {
    const decl = activeDecl().map(d => {
      const x = 'x_' + d.id;
      return `<div class="item"><div class="row"><label class="chk"><input type="checkbox" data-d="${d.id}"${S.dOff[d.id] ? '' : ' checked'}><span>… ${esc(t(d.id))}${d.ref ? `<span class="ref">${esc(d.ref)}</span>` : ''}</span></label>${infoBtn(x)}</div>${expl(x)}</div>`;
    }).join('');
    const att = TPL.attachments.map(a => {
      let extra = '';
      if (a === 'a_photos') extra = field('photoCount', { label: 'count', type: 'number', mode: 'numeric' });
      if (a === 'a_other') extra = field('attOther', { label: 'a_other' });
      return `<div class="item"><div class="row"><label class="chk"><input type="checkbox" data-a="${a}"${S.att[a] ? ' checked' : ''}><span>${esc(t(a))}</span></label></div>${S.att[a] && extra ? `<div class="sub">${extra}</div>` : ''}</div>`;
    }).join('');
    const bi = S.lang !== 'nb'
      ? `<div class="row"><label class="chk"><input type="checkbox" data-bi="1"${S.bi ? ' checked' : ''}><span>${esc(t('pdfBilingual'))}</span></label></div>` : '';
    return `
    <section class="card"><h2>${esc(t('s3'))}</h2>
      <p class="note">${esc(t('declHint'))}</p>
      <p><strong>${esc(t('declTitle'))}</strong></p>${decl}
    </section>
    <section class="card"><div class="row"><h2 style="flex:1">${esc(t('dev'))}</h2>${infoBtn('x_dev')}</div>${expl('x_dev')}
      <div class="row"><label class="chk"><input type="radio" name="dev" data-dev="none"${S.dev === 'none' ? ' checked' : ''}><span>${esc(t('devNone'))}</span></label></div>
      <div class="row"><label class="chk"><input type="radio" name="dev" data-dev="some"${S.dev === 'some' ? ' checked' : ''}><span>${esc(t('devSome'))}</span></label></div>
      ${S.dev === 'some' ? `<div class="sub">${field('devText', { area: 1, label: 'dev', ph: t('devPh') })}</div>` : ''}
    </section>
    <section class="card"><h2>${esc(t('att'))}</h2>${att}</section>
    <section class="card"><h2>${esc(t('sign'))}</h2>
      <div class="grid">${field('place')}${field('date', { type: 'date' })}${field('signName', { wide: 1 })}</div>
      <p class="note" style="margin-top:10px">${esc(t('signDraw'))}</p>
      <div class="sigwrap"><canvas id="sig"></canvas></div>
      <div class="sigbar"><span></span><button type="button" class="linkbtn" data-act="sigclear">${esc(t('clear'))}</button></div>
    </section>
    ${bi || msg || pdfUrl ? `<section class="card">${bi}
      ${msg ? `<div class="msg ${msg.kind}">${msg.html}</div>` : ''}
      ${pdfUrl ? `<div class="result"><a class="btn pri" href="${pdfUrl}" download="${esc(pdfName)}">${esc(t('download'))}</a>${canShare() ? `<button type="button" class="btn sec" data-act="share">${esc(t('share'))}</button>` : ''}</div>` : ''}
    </section>` : ''}`;
  }

  // ---------- tegning ----------
  function render() {
    document.documentElement.lang = S.lang;
    document.getElementById('appTitle').textContent = t('appTitle');
    document.getElementById('appSub').textContent = t('appSub');
    document.title = t('appTitle');
    const sel = document.getElementById('langSel');
    if (!sel.options.length) sel.innerHTML = SE.LANGS.map(l => `<option value="${l.code}">${l.name}</option>`).join('');
    sel.value = S.lang;
    const steps = [1, 2, 3].map(n => `<button type="button" data-step="${n}" class="${n === S.step ? 'on' : n < S.step ? 'done' : ''}" aria-current="${n === S.step}">${n}. ${esc(t('s' + n))}</button>`).join('');
    let bar = document.querySelector('.bar');
    if (!bar) { bar = document.createElement('div'); bar.className = 'bar'; document.body.appendChild(bar); }
    if (view === 'profile') {
      app.innerHTML = profileView();
      bar.innerHTML = `<div class="in">${P ? '' : `<button type="button" class="btn sec" data-act="skip">${esc(t('skip'))}</button>`}<button type="button" class="btn pri" data-act="saveprofile">${esc(t('saveProfile'))}</button></div>`;
      return;
    }
    const body = S.step === 1 ? step1() : S.step === 2 ? step2() : step3();
    app.innerHTML = `<nav class="steps">${steps}</nav><div class="saved"></div>${body}
      <p><button type="button" class="linkbtn" data-act="reset">${esc(t('reset'))}</button> · <button type="button" class="linkbtn" data-act="profile">${esc(t('editProfile'))}</button></p>`;
    const back = S.step > 1 ? `<button type="button" class="btn sec" data-act="back">${esc(t('back'))}</button>` : '';
    const fwd = S.step < 3 ? `<button type="button" class="btn pri" data-act="next"${S.ans === 'yes' ? ' disabled' : ''}>${esc(t('next'))}</button>`
      : `<button type="button" class="btn pri" data-act="pdf">${esc(t('makePdf'))}</button>`;
    bar.innerHTML = `<div class="in">${back}${fwd}</div>`;
    if (S.step === 3) initSig();
  }

  // ---------- hendelser ----------
  app.addEventListener('input', e => {
    if (e.target.dataset.p) { PD[e.target.dataset.p] = e.target.value; return; }
    const k = e.target.dataset.k;
    if (k) { S.f[k] = e.target.value; dropPdf(); save(); }
  });
  app.addEventListener('change', e => {
    const d = e.target.dataset;
    if (d.w) S.w[d.w] = e.target.checked;
    else if (d.d) { if (e.target.checked) delete S.dOff[d.d]; else S.dOff[d.d] = true; }
    else if (d.a) S.att[d.a] = e.target.checked;
    else if (d.dev) S.dev = d.dev;
    else if (d.bi) S.bi = e.target.checked;
    else if (d.ans) S.ans = d.ans;
    else return;
    dropPdf(); save(); keepScroll(render);
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.x) { const x = b.dataset.x; open.has(x) ? open.delete(x) : open.add(x); keepScroll(render); return; }
    if (b.dataset.step) { go(+b.dataset.step); return; }
    const a = b.dataset.act;
    if (a === 'next') go(S.step + 1);
    else if (a === 'back') go(S.step - 1);
    else if (a === 'pdf') makePdf();
    else if (a === 'share') share();
    else if (a === 'sigclear') { S.sig = ''; dropPdf(); save(); initSig(); }
    else if (a === 'profile') { PD = Object.assign({}, P || {}); view = 'profile'; msg = null; render(); window.scrollTo(0, 0); }
    else if (a === 'skip') { P = {}; try { localStorage.setItem(PKEY, '{}'); } catch (e2) {} view = 'form'; render(); }
    else if (a === 'saveprofile') {
      if (!(PD.firm || '').trim() || !(PD.person || '').trim()) { msg = { kind: 'warn', html: esc(t('profileNeed')) }; render(); return; }
      P = {}; PFIELDS.forEach(k => { P[k] = (PD[k] || '').trim(); });
      try { localStorage.setItem(PKEY, JSON.stringify(P)); } catch (e2) {}
      applyProfile(S, true); dropPdf(); save(); view = 'form'; msg = null; render(); window.scrollTo(0, 0);
    }
    else if (a === 'reset') { if (confirm(t('resetConfirm'))) { const l = S.lang; S = applyProfile(blank()); S.lang = l; open.clear(); msg = null; dropPdf(); try { localStorage.removeItem(KEY); } catch (e2) {} render(); } }
  });
  document.getElementById('langSel').addEventListener('change', e => { S.lang = e.target.value; msg = null; save(); keepScroll(render); });
  function go(n) { if (n > 1 && S.ans === 'yes') return; S.step = Math.max(1, Math.min(3, n)); msg = null; save(); render(); window.scrollTo(0, 0); }
  function keepScroll(fn) { const y = window.scrollY; fn(); window.scrollTo(0, y); }
  function dropPdf() { if (pdfUrl) { URL.revokeObjectURL(pdfUrl); pdfUrl = null; pdfBlob = null; const r = document.querySelector('.result'); if (r) r.remove(); } }

  // ---------- signatur ----------
  function initSig() {
    const c = document.getElementById('sig'); if (!c) return;
    const r = c.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr); g.lineWidth = 2.2; g.lineCap = g.lineJoin = 'round'; g.strokeStyle = '#111';
    g.clearRect(0, 0, r.width, r.height);
    if (S.sig) { const im = new Image(); im.onload = () => g.drawImage(im, 0, 0, r.width, r.height); im.src = S.sig; }
    let down = false, last = null;
    const pt = ev => { const b = c.getBoundingClientRect(); return [ev.clientX - b.left, ev.clientY - b.top]; };
    c.onpointerdown = ev => { down = true; last = pt(ev); c.setPointerCapture(ev.pointerId); ev.preventDefault(); };
    c.onpointermove = ev => { if (!down) return; const p = pt(ev); g.beginPath(); g.moveTo(last[0], last[1]); g.lineTo(p[0], p[1]); g.stroke(); last = p; ev.preventDefault(); };
    c.onpointerup = c.onpointercancel = () => { if (!down) return; down = false; S.sig = c.toDataURL('image/png'); dropPdf(); save(); };
  }

  // ---------- dokumentmodell (felles for PDF og utskrift) ----------
  const fmtDate = d => d ? d.split('-').reverse().join('.') : '';
  function missing() {
    const need = ['firm', 'person', 'customer', 'address', 'signName', 'date'].filter(k => !(S.f[k] || '').trim()).map(k => t(k));
    if (!Object.keys(S.w).some(k => S.w[k])) need.push(t('s2'));
    if (S.ans !== 'no') need.unshift(t('q_ansvar'));
    if (S.dev === 'some' && !(S.f.devText || '').trim()) need.push(t('dev'));
    return need;
  }
  function model() {
    const L2 = S.lang !== 'nb' && S.bi ? S.lang : null;
    const two = k => ({ a: plain(t(k, 'nb')), b: L2 ? plain(t(k, L2)) : null });
    const f = S.f, blocks = [];
    const srcUsed = [];
    const cite = keys => keys.map(k => { let i = srcUsed.indexOf(k); if (i < 0) { srcUsed.push(k); i = srcUsed.length - 1; } return i + 1; });

    blocks.push({ type: 'title', a: t('pdfTitle', 'nb'), b: L2 ? t('pdfTitle', L2) : null, sub: two('pdfSub') });
    const period = [fmtDate(f.from), fmtDate(f.to)].filter(Boolean).join(' – ');
    blocks.push({ type: 'h', ...two('pdfParties') });
    blocks.push({ type: 'kv', rows: [
      ['firm', f.firm], ['orgnr', f.orgnr], ['person', f.person], ['contact', f.contact],
      ['customer', f.customer], ['address', f.address], ['room', f.room || t('roomDefault', 'nb')],
      ['pdfPeriod', period], ['ref', f.ref]
    ].filter(r => (r[1] || '').trim()).map(r => ({ ...two(r[0]), v: r[1] })) });

    blocks.push({ type: 'h', ...two('pdfWork') });
    const work = [], prods = [];
    TPL.groups.forEach(g => g.items.forEach(id => {
      if (!S.w[id]) return;
      let v = '';
      if (id === 'fall' && f.fallMeasured) v = t('fallMeasured', 'nb').replace(/\s*\(.*\)/, '') + ': ' + f.fallMeasured;
      work.push({ ...two(id), v });
      (TPL.products[id] || []).forEach(p => { if ((f[p] || '').trim()) prods.push({ ...two(p), v: f[p] }); });
    }));
    if (S.w.other) work.push({ ...two('other'), v: f.otherText || '' });
    blocks.push({ type: 'list', mark: '✓', items: work });
    if (prods.length) { blocks.push({ type: 'h3', ...two('pdfProducts') }); blocks.push({ type: 'kv', rows: prods }); }
    if ((f.others || '').trim()) { blocks.push({ type: 'h3', ...two('pdfNotMine') }); blocks.push({ type: 'p', a: f.others }); }

    blocks.push({ type: 'h', ...two('pdfDecl') });
    blocks.push({ type: 'p', ...two('declTitle'), bold: true });
    const decl = activeDecl().filter(d => !S.dOff[d.id]).map(d => {
      const n = d.src.length ? ' [' + cite(d.src).join(', ') + ']' : '';
      return { ...two(d.id), ref: (d.ref ? d.ref : '') + n };
    });
    blocks.push({ type: 'list', mark: '#', items: decl });
    blocks.push({ type: 'h3', ...two('dev') });
    blocks.push(S.dev === 'some' ? { type: 'p', a: f.devText || '' } : { type: 'p', ...two('devNone') });

    const atts = TPL.attachments.filter(a => S.att[a]).map(a => {
      let v = ''; if (a === 'a_photos' && f.photoCount) v = t('count', 'nb') + ': ' + f.photoCount; if (a === 'a_other') v = f.attOther || '';
      return { ...two(a), v };
    });
    if (atts.length) { blocks.push({ type: 'h', ...two('pdfAtt') }); blocks.push({ type: 'list', mark: '•', items: atts }); }

    blocks.push({ type: 'h', ...two('pdfSign'), keep: 70 });
    blocks.push({ type: 'sig', img: S.sig, rows: [
      { ...two('place'), v: [f.place, fmtDate(f.date)].filter(Boolean).join(', ') },
      { ...two('signName'), v: f.signName || '' }
    ] });
    blocks.push({ type: 'note', ...two('pdfNoAnsvar') });
    blocks.push({ type: 'note', ...two('pdfNote') });
    blocks.push({ type: 'sources', title: two('sources'), items: srcUsed.map(k => SE.SOURCES[k]) });
    return blocks;
  }

  // ---------- PDF ----------
  let fonts = null;
  async function loadFonts() {
    if (fonts) return fonts;
    const get = async n => {
      const r = await fetch(FONT_URL + n); if (!r.ok) throw new Error('font');
      const u8 = new Uint8Array(await r.arrayBuffer()); let s = '';
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return btoa(s);
    };
    const [n, b] = await Promise.all([get('DejaVuSans.ttf'), get('DejaVuSans-Bold.ttf')]);
    return (fonts = { n, b });
  }
  async function makePdf() {
    const miss = missing();
    if (miss.length) { msg = { kind: 'warn', html: esc(t('missing')) + ' ' + miss.map(esc).join(', ') }; render(); scrollMsg(); return; }
    msg = { kind: 'ok', html: esc(t('makingPdf')) }; dropPdf(); render(); scrollMsg();
    try {
      const fnt = await loadFonts();
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      doc.addFileToVFS('DV.ttf', fnt.n); doc.addFont('DV.ttf', 'DV', 'normal');
      doc.addFileToVFS('DVB.ttf', fnt.b); doc.addFont('DVB.ttf', 'DV', 'bold');
      drawPdf(doc, model());
      pdfBlob = doc.output('blob');
      pdfUrl = URL.createObjectURL(pdfBlob);
      const slug = (S.f.address || 'arbeid').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 40);
      pdfName = `Samsvarserklaering-${slug}-${S.f.date || today}.pdf`;
      msg = { kind: 'ok', html: '✓ ' + esc(t('pdfReady')) };
    } catch (e) {
      console.error(e);
      msg = { kind: 'warn', html: esc(t('pdfFail')) + ` <button type="button" class="linkbtn" data-act="print">${esc(t('print'))}</button>` };
    }
    render(); scrollMsg();
  }
  function scrollMsg() { const m = document.querySelector('.msg'); if (m) m.scrollIntoView({ block: 'center' }); }
  document.addEventListener('click', e => { const b = e.target.closest('[data-act="print"]'); if (b) { printDoc(); } });
  function canShare() { try { return !!(navigator.canShare && pdfBlob && navigator.canShare({ files: [new File([pdfBlob], pdfName, { type: 'application/pdf' })] })); } catch (e) { return false; } }
  async function share() {
    try { await navigator.share({ files: [new File([pdfBlob], pdfName, { type: 'application/pdf' })], title: t('pdfTitle', 'nb') }); } catch (e) {}
  }

  function drawPdf(doc, blocks) {
    const M = 18, W = 210 - 2 * M, BOTTOM = 297 - 20, ACC = [15, 92, 99], GREY = [95, 95, 95];
    let y = M;
    const lh = s => s * 0.3528 * 1.3;
    const need = h => { if (y + h > BOTTOM) { doc.addPage(); y = M; } };
    function txt(str, o = {}) {
      if (!str) return;
      const size = o.size || 10, x = M + (o.x || 0), w = o.w || W - (o.x || 0);
      doc.setFont('DV', o.bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(...(o.color || [0, 0, 0]));
      doc.splitTextToSize(String(str), w).forEach(line => { need(lh(size)); doc.text(line, x, y + lh(size) * 0.78); y += lh(size); });
    }
    const pair = (a, b, o = {}) => { txt(a, o); if (b) txt(b, { ...o, size: (o.size || 10) - 1, bold: false, color: GREY }); };
    const kvRow = (r, labW) => {
      // Mål høyden før tegning så raden ikke deles over sider.
      doc.setFontSize(8.5); const la = doc.splitTextToSize(r.a + (r.b ? ' / ' + r.b : ''), labW - 3);
      doc.setFontSize(10); const va = doc.splitTextToSize(String(r.v || ''), W - labW);
      const h = Math.max(la.length * lh(8.5), va.length * lh(10)); need(h);
      const y0 = y;
      txt(r.a + (r.b ? ' / ' + r.b : ''), { size: 8.5, color: GREY, w: labW - 3 });
      const y1 = y; y = y0; txt(r.v, { x: labW, size: 10 }); y = Math.max(y, y1) + 1.2;
    };
    blocks.forEach(bl => {
      switch (bl.type) {
        case 'title':
          txt(bl.a, { size: 20, bold: true, color: ACC }); if (bl.b) txt(bl.b, { size: 13, color: GREY });
          pair(bl.sub.a, bl.sub.b, { size: 10.5 }); y += 2; break;
        case 'h':
          y += 4; need(bl.keep || 14); doc.setDrawColor(...ACC); doc.setLineWidth(0.4); doc.line(M, y, M + W, y); y += 1.5;
          pair(bl.a, bl.b, { size: 12, bold: true, color: ACC }); y += 1.5; break;
        case 'h3': y += 2; need(10); pair(bl.a, bl.b, { size: 10.5, bold: true }); y += 0.5; break;
        case 'kv': bl.rows.forEach(r => kvRow(r, 58)); break;
        case 'p': pair(bl.a, bl.b, { bold: bl.bold }); y += 1; break;
        case 'list':
          bl.items.forEach((it, i) => {
            need(lh(10) * 2);
            const mark = bl.mark === '#' ? (i + 1) + '.' : bl.mark;
            doc.setFont('DV', 'bold'); doc.setFontSize(10); doc.setTextColor(...ACC); doc.text(mark, M, y + lh(10) * 0.78);
            txt(it.a + (it.ref ? '  (' + it.ref + ')' : ''), { x: 7 });
            if (it.b) txt(it.b, { x: 7, size: 9, color: GREY });
            if (it.v) txt(it.v, { x: 7, size: 9.5 });
            y += 1.4;
          }); break;
        case 'sig':
          if (bl.img) { const ip0 = doc.getImageProperties(bl.img); need(24 + 75 * ip0.height / ip0.width); }
          bl.rows.forEach(r => kvRow(r, 58));
          if (bl.img) { const ip = doc.getImageProperties(bl.img), iw = 75, ih = iw * ip.height / ip.width; need(ih + 4); doc.addImage(bl.img, 'PNG', M + 58, y, iw, ih); y += ih; }
          doc.setDrawColor(150); doc.setLineWidth(0.2); doc.line(M + 58, y, M + 58 + 80, y); y += 4; break;
        case 'note':
          y += 3; pair(bl.a, bl.b, { size: 8.5, color: [60, 60, 60] }); break;
        case 'sources':
          if (!bl.items.length) break;
          y += 3; txt(bl.title.a + (bl.title.b ? ' / ' + bl.title.b : ''), { size: 8.5, bold: true });
          bl.items.forEach((s, i) => { txt(`[${i + 1}] ${s.title}`, { size: 8, x: 0 }); txt(s.url, { size: 7.5, x: 5, color: ACC }); }); break;
      }
    });
    const n = doc.getNumberOfPages();
    for (let p = 1; p <= n; p++) {
      doc.setPage(p); doc.setFont('DV', 'normal'); doc.setFontSize(7.5); doc.setTextColor(120);
      doc.text(`${t('pdfMade', 'nb')}   ${p}/${n}`, M, 297 - 10);
    }
  }

  // Reserve: utskrift til PDF via nettleserens dialog (fungerer uten nett).
  function printDoc() {
    const out = model().map(bl => {
      const b = s => s ? `<div class="b">${esc(s)}</div>` : '';
      switch (bl.type) {
        case 'title': return `<h1>${esc(bl.a)}</h1>${b(bl.b)}<p>${esc(bl.sub.a)}${b(bl.sub.b)}</p>`;
        case 'h': return `<h2>${esc(bl.a)}${bl.b ? ' / ' + esc(bl.b) : ''}</h2>`;
        case 'h3': return `<h3>${esc(bl.a)}${b(bl.b)}</h3>`;
        case 'kv': return `<table>${bl.rows.map(r => `<tr><td style="width:35%">${esc(r.a)}${b(r.b)}</td><td>${esc(r.v)}</td></tr>`).join('')}</table>`;
        case 'p': return `<p>${bl.bold ? '<strong>' : ''}${esc(bl.a)}${bl.bold ? '</strong>' : ''}${b(bl.b)}</p>`;
        case 'list': return `<ol${bl.mark === '#' ? '' : ' style="list-style:none;padding-left:0"'}>${bl.items.map(it => `<li>${bl.mark === '#' ? '' : esc(bl.mark) + ' '}${esc(it.a)}${it.ref ? ' (' + esc(it.ref) + ')' : ''}${b(it.b)}${it.v ? '<div>' + esc(it.v) + '</div>' : ''}</li>`).join('')}</ol>`;
        case 'sig': return `<table>${bl.rows.map(r => `<tr><td style="width:35%">${esc(r.a)}${b(r.b)}</td><td>${esc(r.v)}</td></tr>`).join('')}</table>${bl.img ? `<img src="${bl.img}" alt="">` : ''}`;
        case 'note': return `<p class="src">${esc(bl.a)}${b(bl.b)}</p>`;
        case 'sources': return `<div class="src"><strong>${esc(bl.title.a)}</strong><br>${bl.items.map((s, i) => `[${i + 1}] ${esc(s.title)}: ${esc(s.url)}`).join('<br>')}</div>`;
      }
      return '';
    }).join('');
    document.getElementById('printDoc').innerHTML = out;
    window.print();
  }

  render();
})();
