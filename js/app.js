(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const KEY = 'materia.v1';
  const COLS = [
    { k: 'idn', label: 'ID No.', opt: 1 },
    { k: 'idv', label: 'ID Vol.', opt: 1 },
    { k: 'name', label: 'Name', sug: 1 },
    { k: 'cls', label: 'Class', sug: 1 },
    { k: 'bud', label: 'Budget class', sug: 1 },
    { k: 'price', label: 'Price', num: 1 },
    { k: 'stock', label: 'Stock', num: 1 },
    { k: 'exp', label: 'Expended', num: 1 }
  ];
  const REQ = COLS.filter(c => !c.opt).map(c => c.k);
  const DEF = { title: '', on: { idn: false, idv: false }, labels: {}, rows: [], print: { per: 25, mode: 'page', sum: ['stock', 'exp'] } };

  function load() {
    let d = {};
    try { d = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { d = {}; }
    return {
      title: d.title || '',
      on: { ...DEF.on, ...d.on },
      labels: { ...d.labels },
      rows: Array.isArray(d.rows) ? d.rows : [],
      print: { ...DEF.print, ...d.print, sum: Array.isArray(d.print?.sum) ? d.print.sum : [...DEF.print.sum] }
    };
  }

  const S = load();
  let saveT, markQ = 0, toastT, jump = -1, mute = false;
  let sort = { k: null, d: 1 };

  const flush = () => { clearTimeout(saveT); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  const save = () => { clearTimeout(saveT); saveT = setTimeout(flush, 200); };

  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const txt = v => String(v ?? '').trim();
  const norm = v => txt(v).toLowerCase().replace(/\s+/g, ' ');
  const num = v => {
    const n = parseFloat(txt(v).replace(/[٠-٩]/g, d => d.charCodeAt(0) - 1632).replace(/٫/g, '.').replace(/[٬،,\s]/g, ''));
    return isFinite(n) ? n : 0;
  };
  const r2 = n => Math.round(n * 100) / 100;
  const fmt = n => r2(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const hue = s => { let h = 0; for (const ch of s) h = (h * 31 + ch.codePointAt(0)) % 360; return h; };
  const plural = (n, w) => `${w}${n === 1 ? '' : 's'}`;
  const col = k => COLS.find(c => c.k === k);
  const label = c => txt(S.labels[c.k]) || c.label;
  const active = () => COLS.filter(c => !c.opt || S.on[c.k]);
  const full = r => REQ.every(k => txt(r[k]));
  const sig = r => COLS.map(c => (c.num ? num(r[c.k]) : norm(r[c.k]))).join('\u0001');
  const blank = base => ({ id: uid(), idn: '', idv: '', name: '', cls: '', bud: '', price: '', stock: '', exp: '', ...base });

  const I = {
    dup: '<svg viewBox="0 0 16 16"><rect x="5.5" y="5.5" width="8" height="8" rx="2"/><path d="M10.5 3.5v-.2a1.8 1.8 0 0 0-1.8-1.8H4.3a1.8 1.8 0 0 0-1.8 1.8v4.4a1.8 1.8 0 0 0 1.8 1.8h.2"/></svg>',
    del: '<svg viewBox="0 0 16 16"><path d="m4 4 8 8m0-8-8 8"/></svg>'
  };

  const thead = $('#tbl thead'), tbody = $('#tbl tbody'), tfoot = $('#tbl tfoot');
  const qName = $('#qName'), qCopies = $('#qCopies'), find = $('#find'), sug = $('#sug');

  function rowHTML(r, cols) {
    const cells = cols.map(c => `<td class="${c.num ? 'n' : 't'} c-${c.k}"><input data-k="${c.k}" value="${esc(r[c.k])}" ${c.num ? 'inputmode="decimal"' : 'dir="auto"'} autocomplete="off" spellcheck="false" aria-label="${esc(label(c))}">${c.k === 'name' ? '<span class="grp"></span>' : ''}</td>`).join('');
    return `<tr data-id="${r.id}"><td class="g"><span class="ix"></span></td>${cells}<td class="a"><button data-act="dup" tabindex="-1" aria-label="Duplicate row">${I.dup}</button><button data-act="del" tabindex="-1" aria-label="Remove row">${I.del}</button></td></tr>`;
  }

  function render() {
    const cols = active();
    thead.innerHTML = `<tr><th class="g"></th>${cols.map(c => `<th class="${c.num ? 'n' : 't'} c-${c.k}"><button class="hd${sort.k === c.k ? ' on' : ''}" data-sort="${c.k}" data-d="${sort.d}">${esc(label(c))}<i></i></button></th>`).join('')}<th class="a"></th></tr>`;
    tbody.innerHTML = S.rows.map(r => rowHTML(r, cols)).join('');
    tfoot.innerHTML = `<tr><td class="g"></td>${cols.map(c => `<td class="${c.num ? 'n' : 't'}"${c.num ? ` data-sum="${c.k}"` : ''}>${c.k === 'name' ? 'Total' : ''}</td>`).join('')}<td class="a"></td></tr>`;
    marks();
  }

  const queue = () => { if (!markQ) markQ = requestAnimationFrame(() => { markQ = 0; marks(); }); };

  function marks() {
    const cols = active(), q = norm(find.value);
    const names = new Map(), sigs = new Map(), seen = new Map(), sums = {};
    for (const r of S.rows) {
      const n = norm(r.name);
      if (n) names.set(n, (names.get(n) || 0) + 1);
      if (full(r)) { const s = sig(r); sigs.set(s, (sigs.get(s) || 0) + 1); }
    }
    let twins = 0, shown = 0;
    const trs = tbody.children;
    S.rows.forEach((r, i) => {
      const tr = trs[i];
      if (!tr) return;
      const n = norm(r.name), cnt = names.get(n) || 0;
      const tw = full(r) && sigs.get(sig(r)) > 1;
      const hit = !q || cols.some(c => norm(r[c.k]).includes(q));
      const any = cols.some(c => txt(r[c.k]));
      tr.hidden = !hit && !tr.contains(document.activeElement);
      tr.classList.toggle('twin', tw);
      tr.classList.toggle('multi', cnt > 1);
      tr.style.setProperty('--h', n ? hue(n) : 90);
      for (const td of tr.children) {
        const k = td.firstElementChild?.dataset.k;
        if (k) td.classList.toggle('miss', any && REQ.includes(k) && !txt(r[k]));
      }
      const g = tr.querySelector('.grp');
      if (g) {
        const o = (seen.get(n) || 0) + 1;
        seen.set(n, o);
        g.textContent = tw ? 'identical' : cnt > 1 ? `${o}/${cnt}` : '';
      }
      if (tw) twins++;
      if (hit) {
        shown++;
        cols.forEach(c => { if (c.num) sums[c.k] = (sums[c.k] || 0) + num(r[c.k]); });
      }
    });
    $$('[data-sum]', tfoot).forEach(td => { td.textContent = fmt(sums[td.dataset.sum] || 0); });
    const total = S.rows.length;
    tfoot.hidden = !total;
    $('#empty').hidden = total > 0;
    $('#status').innerHTML = total
      ? `<span><b>${q ? shown + ' / ' : ''}${total}</b> ${plural(total, 'record')}</span><span><b>${names.size}</b> ${plural(names.size, 'drug')}</span>${twins ? `<button class="warn" data-jump>${twins} identical rows</button>` : '<span class="ok">No identical rows</span>'}<span class="keys"><kbd>↵</kbd> next row <kbd>Ctrl</kbd><kbd>D</kbd> duplicate</span>`
      : '';
  }

  function patch() {
    const trs = tbody.children;
    S.rows.forEach((r, i) => {
      const tr = trs[i];
      if (!tr) return;
      for (const el of tr.querySelectorAll('input')) {
        const v = String(r[el.dataset.k] ?? '');
        if (el !== document.activeElement && el.value !== v) el.value = v;
      }
    });
    queue();
  }

  const rowOf = el => { const tr = el.closest('tr'); return tr && S.rows.find(r => r.id === tr.dataset.id); };
  const trOf = id => tbody.querySelector(`tr[data-id="${id}"]`);

  function focusCell(id, k) {
    const tr = trOf(id);
    if (!tr) return;
    if (tr.hidden) { find.value = ''; marks(); }
    const ins = [...tr.querySelectorAll('input')];
    const t = (k && ins.find(i => i.dataset.k === k)) || ins.find(i => !i.value.trim()) || ins.find(i => i.dataset.k === 'name');
    tr.scrollIntoView({ block: 'nearest' });
    if (t) t.focus();
  }

  function flash(ids) {
    ids.forEach(id => {
      const tr = trOf(id);
      if (!tr) return;
      tr.classList.add('new');
      setTimeout(() => tr.classList.remove('new'), 1300);
    });
  }

  function settle(r, k) {
    const n = norm(r.name);
    if (!n) return;
    const sib = S.rows.filter(x => x !== r && norm(x.name) === n);
    let touched = false;
    if (k === 'name') {
      for (const f of ['cls', 'bud']) {
        if (txt(r[f])) continue;
        const src = sib.find(x => txt(x[f]));
        if (src) { r[f] = src[f]; touched = true; }
      }
    } else if ((k === 'cls' || k === 'bud') && txt(r[k])) {
      for (const x of sib) if (!txt(x[k])) { x[k] = r[k]; touched = true; }
    }
    if (touched) { save(); patch(); }
  }

  function hideSug() { sug.hidden = true; sug._for = null; }

  function suggest(el, k) {
    if (mute) return;
    const q = norm(el.value), map = new Map();
    if (q) {
      for (const r of S.rows) {
        const v = txt(r[k]), n = norm(v);
        if (n && n !== q && n.includes(q) && !map.has(n)) map.set(n, { v, r });
      }
    }
    const list = [...map].sort((a, b) => a[0].indexOf(q) - b[0].indexOf(q) || a[0].localeCompare(b[0])).slice(0, 6);
    if (!list.length) return hideSug();
    sug._for = el;
    sug._ix = -1;
    sug.innerHTML = list.map(([, o]) => `<button role="option" tabindex="-1" data-v="${esc(o.v)}"><span dir="auto">${esc(o.v)}</span>${k === 'name' ? `<small>${esc([o.r.cls, o.r.bud].map(txt).filter(Boolean).join(' · '))}</small>` : ''}</button>`).join('');
    sug.hidden = false;
    const b = el.getBoundingClientRect(), h = sug.offsetHeight;
    sug.style.minWidth = Math.min(b.width, 420) + 'px';
    sug.style.left = Math.max(8, Math.min(b.left, innerWidth - sug.offsetWidth - 8)) + 'px';
    sug.style.top = (b.bottom + 4 + h > innerHeight ? b.top - 4 - h : b.bottom + 4) + 'px';
  }

  function pick(b) {
    const el = sug._for;
    if (!el || !b) return;
    el.value = b.dataset.v;
    hideSug();
    mute = true;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    mute = false;
  }

  function sugKey(e) {
    const items = [...sug.children];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      sug._ix = e.key === 'ArrowDown' ? (sug._ix + 1) % items.length : (sug._ix <= 0 ? items.length : sug._ix) - 1;
      items.forEach((b, i) => b.classList.toggle('on', i === sug._ix));
      return true;
    }
    if (e.key === 'Enter' && sug._ix >= 0) { e.preventDefault(); pick(items[sug._ix]); return true; }
    if (e.key === 'Escape') { e.stopPropagation(); hideSug(); return true; }
    return false;
  }

  sug.addEventListener('mousedown', e => { e.preventDefault(); pick(e.target.closest('button')); });
  document.addEventListener('focusout', e => { if (e.target === sug._for) hideSug(); });
  $('#grid').addEventListener('scroll', hideSug, { passive: true });

  tbody.addEventListener('input', e => {
    const el = e.target, k = el.dataset.k, r = k && rowOf(el);
    if (!r) return;
    r[k] = el.value;
    save();
    queue();
    if (col(k).sug) suggest(el, k);
  });

  tbody.addEventListener('change', e => {
    const el = e.target, k = el.dataset.k, r = k && rowOf(el);
    if (r) settle(r, k);
  });

  tbody.addEventListener('keydown', e => {
    const el = e.target, k = el.dataset.k;
    if (!k) return;
    if (!sug.hidden && sugKey(e)) return;
    const tr = el.closest('tr');
    const next = d => { let t = tr; do t = d > 0 ? t.nextElementSibling : t.previousElementSibling; while (t && t.hidden); return t; };
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); dupRow(tr.dataset.id); return; }
    if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const d = e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey) ? -1 : 1;
      const t = next(d)?.querySelector(`input[data-k="${k}"]`);
      if (t) { t.focus(); t.select(); } else if (e.key === 'Enter' && d > 0) qName.focus();
      return;
    }
    if (e.key === 'Tab' && !e.shiftKey && el === [...tr.querySelectorAll('input')].pop()) {
      const nx = next(1);
      const t = nx ? [...nx.querySelectorAll('input')].find(i => !i.value.trim()) : qName;
      if (t) { e.preventDefault(); t.focus(); }
    }
  });

  tbody.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const id = b.closest('tr').dataset.id;
    if (b.dataset.act === 'dup') dupRow(id); else delRow(id);
  });

  thead.addEventListener('click', e => {
    const b = e.target.closest('[data-sort]');
    if (!b) return;
    const k = b.dataset.sort, c = col(k);
    sort = { k, d: sort.k === k ? -sort.d : 1 };
    S.rows.sort((x, y) => sort.d * (c.num ? num(x[k]) - num(y[k]) : norm(x[k]).localeCompare(norm(y[k]), undefined, { numeric: true })));
    save();
    render();
  });

  function dupRow(id) {
    const i = S.rows.findIndex(r => r.id === id);
    if (i < 0) return;
    const c = { ...S.rows[i], id: uid(), price: '', stock: '', exp: '' };
    S.rows.splice(i + 1, 0, c);
    sort.k = null;
    save();
    render();
    focusCell(c.id, 'price');
    flash([c.id]);
  }

  function delRow(id) {
    const i = S.rows.findIndex(r => r.id === id);
    if (i < 0) return;
    const [r] = S.rows.splice(i, 1);
    save();
    render();
    toast(`Removed ${txt(r.name) || 'empty row'}`, 'Undo', () => {
      S.rows.splice(Math.min(i, S.rows.length), 0, r);
      save();
      render();
      focusCell(r.id, 'name');
    });
  }

  function toast(msg, act, fn) {
    const t = $('#toast');
    t.innerHTML = `<span>${esc(msg)}</span>${act ? `<button>${esc(act)}</button>` : ''}`;
    t.classList.add('open');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('open'), 6000);
    const b = $('button', t);
    if (b) b.onclick = () => { t.classList.remove('open'); fn(); };
  }

  const clamp = (el, v) => Math.max(+el.dataset.min, Math.min(+el.dataset.max, v));
  const stepVal = el => clamp(el, Math.round(num($('input', el).value)) || +el.dataset.min);
  const setStep = (el, v) => { $('input', el).value = clamp(el, v); el.dispatchEvent(new CustomEvent('step', { detail: clamp(el, v) })); };
  const bump = (el, d) => setStep(el, stepVal(el) + d);

  $$('.step').forEach(el => {
    const inp = $('input', el);
    el.addEventListener('click', e => { const b = e.target.closest('button'); if (b) bump(el, +b.dataset.d); });
    inp.addEventListener('change', () => setStep(el, stepVal(el)));
    inp.addEventListener('focus', () => inp.select());
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); bump(el, e.key === 'ArrowUp' ? 1 : -1); }
    });
  });

  function hint() {
    const n = norm(qName.value), c = stepVal(qCopies);
    const ex = n ? S.rows.filter(r => norm(r.name) === n) : [];
    const meta = ex.length ? [ex.find(r => txt(r.cls))?.cls, ex.find(r => txt(r.bud))?.bud].map(txt).filter(Boolean).join(' · ') : '';
    $('#qHint').innerHTML = !n
      ? 'Type a name, set <b>×</b> to how many prices you hold, press <kbd>↵</kbd> — <kbd>↑</kbd> <kbd>↓</kbd> change ×'
      : ex.length
        ? `<i style="--h:${hue(n)}"></i>Known · ${ex.length} ${plural(ex.length, 'row')}${meta ? ' · ' + esc(meta) : ''} — <b>${c}</b> more will join ${ex.length > 1 ? 'them' : 'it'}`
        : `<i style="--h:${hue(n)}"></i>New drug — <b>${c}</b> ${plural(c, 'row')} will be created`;
  }

  function addBatch() {
    const name = txt(qName.value);
    if (!name) return qName.focus();
    const n = norm(name), c = stepVal(qCopies);
    const ex = S.rows.filter(r => norm(r.name) === n);
    const take = f => txt(ex.find(r => txt(r[f]))?.[f]);
    const base = { name: ex[0] ? ex[0].name : name, cls: take('cls'), bud: take('bud') };
    const fresh = Array.from({ length: c }, () => blank(base));
    const at = ex.length ? S.rows.lastIndexOf(ex[ex.length - 1]) + 1 : S.rows.length;
    S.rows.splice(at, 0, ...fresh);
    sort.k = null;
    hideSug();
    qName.value = '';
    find.value = '';
    setStep(qCopies, 1);
    save();
    render();
    focusCell(fresh[0].id);
    flash(fresh.map(r => r.id));
  }

  qName.addEventListener('input', () => { suggest(qName, 'name'); hint(); });
  qName.addEventListener('keydown', e => {
    if (!sug.hidden && sugKey(e)) return;
    if (e.key === 'Enter') { e.preventDefault(); addBatch(); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); bump(qCopies, e.key === 'ArrowUp' ? 1 : -1); }
  });
  qCopies.addEventListener('step', hint);
  $('input', qCopies).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); setStep(qCopies, stepVal(qCopies)); addBatch(); } });
  $('#qAdd').addEventListener('click', addBatch);

  $('#empty').addEventListener('click', e => {
    if (!e.target.closest('button')) return;
    const mk = (name, cls, bud, price, stock, exp) => blank({ name, cls, bud, price, stock, exp });
    S.rows = [
      mk('Amoxicillin 500 mg caps', 'Antibiotic', 'Essential', '0.12', '2400', '860'),
      mk('Amoxicillin 500 mg caps', 'Antibiotic', 'Essential', '0.14', '1200', '300'),
      mk('Amoxicillin 500 mg caps', 'Antibiotic', 'Essential', '0.17', '600', '0'),
      mk('Paracetamol 500 mg tabs', 'Analgesic', 'Essential', '0.03', '9000', '4100'),
      mk('Paracetamol 500 mg tabs', 'Analgesic', 'Essential', '0.03', '9000', '4100'),
      mk('Insulin glargine 100 IU/ml', 'Antidiabetic', 'Special', '18.5', '140', '62'),
      mk('Omeprazole 20 mg caps', 'Gastrointestinal', 'General', '0.09', '3100', '1250')
    ];
    save();
    render();
  });

  $('#status').addEventListener('click', e => {
    if (!e.target.closest('[data-jump]')) return;
    const tw = $$('tr.twin', tbody).filter(t => !t.hidden);
    if (!tw.length) return;
    jump = (jump + 1) % tw.length;
    tw[jump].scrollIntoView({ block: 'center' });
    tw[jump].querySelector('input[data-k="name"]').focus();
  });

  const docTitle = () => { document.title = (txt(S.title) || 'Materia') + ' — drug ledger'; };
  find.addEventListener('input', queue);
  tbody.addEventListener('focusout', queue);
  $('#title').value = S.title;
  docTitle();
  $('#title').addEventListener('input', e => { S.title = e.target.value; docTitle(); save(); });

  const colsPop = $('#cols');
  function colsRender() {
    colsPop.innerHTML = '<h3>Columns</h3>' + COLS.map(c => `<div class="crow"><input data-lab="${c.k}" value="${esc(label(c))}" placeholder="${esc(c.label)}" dir="auto" autocomplete="off" spellcheck="false" aria-label="Rename ${esc(c.label)}">${c.opt ? `<button class="sw" role="switch" aria-checked="${!!S.on[c.k]}" data-on="${c.k}" aria-label="Show ${esc(c.label)}"></button>` : '<span class="lock">always</span>'}</div>`).join('');
  }
  $('#colsBtn').addEventListener('click', e => {
    if (!colsPop.hidden) { colsPop.hidden = true; return; }
    colsRender();
    const b = e.currentTarget.getBoundingClientRect();
    colsPop.style.top = b.bottom + 8 + 'px';
    colsPop.style.left = Math.max(12, Math.min(b.right - 290, innerWidth - 302)) + 'px';
    colsPop.hidden = false;
  });
  colsPop.addEventListener('click', e => {
    const b = e.target.closest('[data-on]');
    if (!b) return;
    const k = b.dataset.on;
    S.on[k] = !S.on[k];
    b.setAttribute('aria-checked', S.on[k]);
    save();
    render();
  });
  colsPop.addEventListener('input', e => {
    const k = e.target.dataset.lab;
    if (!k) return;
    S.labels[k] = e.target.value;
    save();
    render();
  });
  document.addEventListener('pointerdown', e => { if (!e.target.closest('#cols,#colsBtn')) colsPop.hidden = true; });

  function shownRows() {
    const cols = active(), q = norm(find.value);
    return S.rows.filter(r => cols.some(c => txt(r[c.k])) && (!q || cols.some(c => norm(r[c.k]).includes(q))));
  }

  function layout() {
    const cols = active(), p = S.print, run = p.mode === 'run', pe = p.mode === 'page';
    const per = Math.max(1, p.per | 0);
    const sumK = p.mode === 'none' ? [] : cols.filter(c => c.num && p.sum.includes(c.k)).map(c => c.k);
    const rows = shownRows();
    const head = [{ v: '#', n: 1 }];
    cols.forEach(c => {
      head.push({ v: label(c), n: c.num });
      if (run && sumK.includes(c.k)) head.push({ v: 'Σ ' + label(c), n: 1, s: 1 });
    });
    const acc = {};
    sumK.forEach(k => { acc[k] = 0; });
    const pages = [];
    for (let i = 0; i < rows.length; i += per) {
      const sub = {};
      sumK.forEach(k => { sub[k] = 0; });
      const body = rows.slice(i, i + per).map((r, j) => {
        const line = [{ v: i + j + 1, n: 1 }];
        cols.forEach(c => {
          const raw = txt(r[c.k]);
          line.push(c.num ? { v: raw === '' ? '' : r2(num(raw)), n: 1 } : { v: raw });
          if (c.k in acc) {
            acc[c.k] += num(raw);
            sub[c.k] += num(raw);
            if (run) line.push({ v: r2(acc[c.k]), n: 1, s: 1 });
          }
        });
        return line;
      });
      const foot = [];
      if (pe && sumK.length) {
        const mk = (t, src) => [{ v: '' }, ...cols.map(c => (c.k === 'name' ? { v: t } : c.k in src ? { v: r2(src[c.k]), n: 1 } : { v: '', n: c.num }))];
        foot.push(mk('Page total', sub), mk('Cumulative', acc));
      }
      pages.push({ body, foot });
    }
    return { head, pages, count: rows.length };
  }

  const cellH = (c, tag) => `<${tag} class="${c.n ? 'n' : ''}${c.s ? ' s' : ''}">${typeof c.v === 'number' ? fmt(c.v) : esc(c.v)}</${tag}>`;

  function pageHTML(L, i) {
    const pg = L.pages[i];
    if (!pg) return '';
    const line = r => `<tr>${r.map(c => cellH(c, 'td')).join('')}</tr>`;
    const date = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    return `<section class="pg"><header><h1 dir="auto">${esc(txt(S.title) || 'Drug ledger')}</h1><p>${date}<b>${i + 1} / ${L.pages.length}</b></p></header><table><thead><tr>${L.head.map(c => cellH(c, 'th')).join('')}</tr></thead><tbody>${pg.body.map(line).join('')}</tbody>${pg.foot.length ? `<tfoot>${pg.foot.map(line).join('')}</tfoot>` : ''}</table></section>`;
  }

  function outRefresh() {
    const p = S.print, nums = active().filter(c => c.num);
    $('#pPer input').value = p.per;
    $('#pPre').innerHTML = [15, 20, 25, 30, 40].map(n => `<button class="chip" aria-pressed="${p.per === n}" data-per="${n}">${n}</button>`).join('');
    $$('#pMode button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === p.mode));
    $('#pModeHint').textContent = {
      none: 'No totals are added.',
      run: 'A running Σ column follows each chosen column, row by row.',
      page: 'Every page closes with its own total and the cumulative total so far.'
    }[p.mode];
    $('#pSumF').classList.toggle('off', p.mode === 'none');
    $('#pSum').innerHTML = nums.map(c => `<button class="chip" aria-pressed="${p.sum.includes(c.k)}" data-col="${c.k}">${esc(label(c))}</button>`).join('');
    const L = layout();
    $('#pInfo').innerHTML = L.count
      ? `<b>${L.count}</b> ${plural(L.count, 'row')} on <b>${L.pages.length}</b> ${plural(L.pages.length, 'page')}${norm(find.value) ? ' · filter applied' : ''}`
      : 'Nothing to print yet.';
    const pv = $('#pv');
    pv.innerHTML = pageHTML(L, 0);
    pv.style.setProperty('--z', pv.clientWidth / 794);
  }

  const openOut = on => {
    $('#sheet').classList.toggle('open', on);
    $('#scrim').classList.toggle('open', on);
    if (on) outRefresh();
  };

  $('#sheet').addEventListener('click', e => {
    const b = e.target.closest('button'), p = S.print;
    if (!b) return;
    if (b.dataset.per) p.per = +b.dataset.per;
    else if (b.dataset.v) p.mode = b.dataset.v;
    else if (b.dataset.col) p.sum = p.sum.includes(b.dataset.col) ? p.sum.filter(k => k !== b.dataset.col) : [...p.sum, b.dataset.col];
    else return;
    save();
    outRefresh();
  });
  $('#pPer').addEventListener('step', e => { S.print.per = e.detail; save(); outRefresh(); });
  $('#outBtn').addEventListener('click', () => openOut(true));
  $('#sheetX').addEventListener('click', () => openOut(false));
  $('#scrim').addEventListener('click', () => openOut(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { openOut(false); colsPop.hidden = true; } });

  function fillPrint() {
    const L = layout();
    $('#print').innerHTML = L.pages.map((_, i) => pageHTML(L, i)).join('');
    return L.count;
  }
  addEventListener('beforeprint', fillPrint);
  $('#printBtn').addEventListener('click', () => {
    if (!fillPrint()) return toast('Nothing to print yet.');
    print();
  });

  $('#xlsxBtn').addEventListener('click', () => {
    if (!window.XLSX) return toast('The spreadsheet engine could not load — check your connection.');
    const L = layout();
    if (!L.count) return toast('Nothing to export yet.');
    const aoa = [L.head.map(c => c.v)];
    L.pages.forEach(pg => [...pg.body, ...pg.foot].forEach(r => aoa.push(r.map(c => c.v))));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = L.head.map((_, i) => ({ wch: Math.min(42, aoa.reduce((m, r) => Math.max(m, String(r[i] ?? '').length), 5) + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
    XLSX.writeFile(wb, (txt(S.title) || 'drug-ledger').replace(/[\\/:*?"<>|]+/g, ' ') + '.xlsx');
  });

  /* ---------- theme: system default / light / dark ---------- */
  const TKEY = 'materia.theme', mq = matchMedia('(prefers-color-scheme: dark)'), themeBtn = $('#themeBtn');
  const TH = {
    system: ['System default', '<svg viewBox="0 0 16 16"><rect x="2" y="3" width="12" height="8" rx="1.5"/><path d="M6 13.5h4M8 11v2.5"/></svg>'],
    light: ['Light', '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="2.8"/><path d="M8 1.8v1.4M8 12.8v1.4M1.8 8h1.4M12.8 8h1.4M3.6 3.6l1 1M11.4 11.4l1 1M3.6 12.4l1-1M11.4 4.6l1-1"/></svg>'],
    dark: ['Dark', '<svg viewBox="0 0 16 16"><path d="M13.5 9.3A5.8 5.8 0 0 1 6.7 2.5a5.8 5.8 0 1 0 6.8 6.8Z"/></svg>']
  };
  let pref = 'system';
  try { pref = localStorage.getItem(TKEY) || 'system'; } catch {}
  function applyTheme() {
    if (!TH[pref]) pref = 'system';
    document.documentElement.dataset.theme = pref === 'dark' || (pref === 'system' && mq.matches) ? 'dark' : 'light';
    themeBtn.innerHTML = TH[pref][1];
    themeBtn.title = `Theme: ${TH[pref][0]}`;
    themeBtn.setAttribute('aria-label', `Theme: ${TH[pref][0]}. Click to change`);
  }
  mq.addEventListener('change', applyTheme);
  addEventListener('storage', e => { if (e.key === TKEY) { pref = e.newValue; applyTheme(); } });
  themeBtn.addEventListener('click', () => {
    const o = Object.keys(TH);
    pref = o[(o.indexOf(pref) + 1) % o.length];
    try { localStorage.setItem(TKEY, pref); } catch {}
    applyTheme();
    toast(`Theme: ${TH[pref][0]}`);
  });
  applyTheme();

  /* ---------- smart workbook import ---------- */
  const SYN = {
    idn: ['id no', 'id number', 'id', 'no', 'number', 'item no', 'item number', 'code', 'item code', 'drug code', 'serial', 'serial no', 'sn', 'رقم', 'الرقم', 'رقم الصنف', 'التسلسل', 'رمز', 'الرمز', 'كود'],
    idv: ['id vol', 'vol', 'volume', 'id volume', 'book', 'page', 'folio', 'المجلد', 'مجلد', 'رقم المجلد', 'الصفحة', 'صفحة'],
    name: ['name', 'drug', 'drug name', 'item', 'item name', 'medicine', 'medicine name', 'medication', 'product', 'product name', 'description', 'generic name', 'trade name', 'material', 'الاسم', 'اسم', 'اسم الدواء', 'الدواء', 'المادة', 'اسم المادة', 'الصنف', 'اسم الصنف', 'البيان'],
    cls: ['class', 'category', 'drug class', 'therapeutic class', 'group', 'type', 'الفئة', 'التصنيف', 'الصنف الدوائي', 'المجموعة', 'النوع'],
    bud: ['budget class', 'budget', 'budget category', 'budget line', 'budget type', 'fund', 'account', 'الميزانية', 'بند الميزانية', 'تصنيف الميزانية', 'الموازنة', 'البند'],
    price: ['price', 'unit price', 'cost', 'unit cost', 'rate', 'السعر', 'سعر', 'سعر الوحدة', 'التكلفة', 'الكلفة'],
    stock: ['stock', 'qty', 'quantity', 'balance', 'on hand', 'in stock', 'available', 'inventory', 'الرصيد', 'المخزون', 'الكمية', 'المتوفر'],
    exp: ['expended', 'expenditure', 'consumed', 'consumption', 'used', 'issued', 'dispensed', 'spent', 'المصروف', 'الصرف', 'المنصرف', 'المستهلك', 'الاستهلاك']
  };
  const hn = s => norm(s).replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const isNum = v => typeof v === 'number' || /^-?[\d٠-٩][\d٠-٩.,٫٬\s]*$/.test(txt(v).replace(/^[^\d٠-٩-]{1,4}|[^\d٠-٩]{1,4}$/g, ''));
  const TOT = /^((grand|sub|page) ?)?totals?$|^cumulative$|^(ال)?(مجموع|اجمالي)/;
  const fields = () => COLS.map(c => ({ k: c.k, top: [...new Set([hn(c.label), hn(S.labels[c.k])])].filter(Boolean), alt: SYN[c.k].map(hn) }));
  const imp = $('#imp'), X = { sheets: [], si: 0, best: 0, mode: 'append', dedupe: true, carry: false, out: [], file: '', F: [] };
  const cur = () => X.sheets[X.si];
  const noXLSX = () => !window.XLSX && (toast('The spreadsheet engine could not load — check your connection.'), true);

  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    let p = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const c = [i];
      for (let j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] !== b[j - 1]));
      p = c;
    }
    return p[b.length];
  }

  // 110 = the ledger's own label, 100 = exact synonym, 55–95 = synonym inside a longer header, 70 = typo
  function hScore(h, f) {
    if (!h) return 0;
    if (f.top.includes(h)) return 110;
    let best = 0;
    for (const s of f.alt) {
      const v = h === s ? 100 : ` ${h} `.includes(` ${s} `) ? 55 + 40 * s.length / h.length : s.length > 4 && h.length > 4 && lev(h, s) <= (s.length > 7 ? 2 : 1) ? 70 : 0;
      if (v > best) best = v;
    }
    return best;
  }

  function stats(aoa, from, nc) {
    const st = Array.from({ length: nc }, () => ({ n: 0, num: 0, dec: 0, seq: 0, len: 0, set: new Set(), ex: '' }));
    for (let i = from; i < Math.min(aoa.length, from + 300); i++) {
      for (let c = 0; c < nc; c++) {
        const v = aoa[i][c], t = txt(v);
        if (!t) continue;
        const s = st[c];
        if (!s.ex) s.ex = t;
        s.n++; s.len += t.length; s.set.add(norm(t));
        if (isNum(v)) { const x = num(v); s.num++; if (x % 1) s.dec++; if (x === s.prev + 1) s.seq++; s.prev = x; }
      }
    }
    return st;
  }

  function mapCols(head, st, F) {
    const cand = [];
    head.forEach((h, c) => {
      const raw = txt(h);
      if (!raw || raw[0] === 'Σ') return;
      const n = hn(raw), s = st && st[c] && st[c].n ? st[c] : null;
      for (const f of F) {
        let v = hScore(n, f);
        if (v && s) {
          const nr = s.num / s.n, cn = col(f.k).num;
          if (cn ? nr < .5 : nr > .6 && f.k[0] !== 'i') v -= 60;
          if (f.k === 'idn' && v < 110 && s.n > 2 && s.seq >= (s.n - 1) * .9) v -= 60;
        }
        if (v >= 50) cand.push({ k: f.k, c, v });
      }
    });
    cand.sort((a, b) => b.v - a.v || a.c - b.c);
    const map = {}, conf = {}, used = new Set();
    const take = (k, c, v) => { map[k] = c; conf[k] = v; used.add(c); };
    for (const x of cand) if (!(x.k in map) && !used.has(x.c)) take(x.k, x.c, x.v);
    if (st) {
      const bestOf = fn => { let b = -1, bv = 0; st.forEach((s, c) => { const v = s.n && !used.has(c) ? fn(s) : 0; if (v > bv) { bv = v; b = c; } }); return b; };
      if (!('name' in map)) { const c = bestOf(s => (s.num / s.n < .3 && s.len / s.n > 2 ? Math.min(40, s.len / s.n) * s.set.size / s.n : 0)); if (c >= 0) take('name', c, 30); }
      if (!('price' in map)) { const c = bestOf(s => (s.num / s.n > .8 && s.dec / s.num > .3 ? s.dec / s.num : 0)); if (c >= 0) take('price', c, 30); }
    }
    return { map, conf, total: Object.values(conf).reduce((a, b) => a + b, 0) };
  }

  function analyze(sh, force) {
    const a = sh.aoa, F = X.F;
    let hdr = force;
    if (hdr == null) {
      let bv = 0;
      hdr = 0;
      for (let i = 0; i < Math.min(a.length, 30); i++) {
        const m = mapCols(a[i], null, F), cs = Object.values(m.conf);
        if (cs.length < 2 && !(cs[0] >= 100)) continue;
        const v = m.total + ('name' in m.map ? 40 : 0);
        if (v > bv) { bv = v; hdr = i + 1; }
      }
    }
    hdr = Math.min(hdr, a.length);
    sh.hdr = hdr;
    sh.nc = a.slice(0, 300).reduce((m, r) => Math.max(m, r.length), 0);
    sh.st = stats(a, hdr, sh.nc);
    const m = mapCols(hdr ? a[hdr - 1] : [], sh.st, F);
    sh.map = m.map;
    sh.conf = m.conf;
    let n = 0, gaps = 0;
    for (let i = hdr; i < a.length; i++) if (a[i].some(v => txt(v))) { n++; if (m.map.name != null && !txt(a[i][m.map.name])) gaps++; }
    sh.n = n;
    sh.gaps = gaps;
    sh.score = n ? m.total + Math.min(n, 100) * .3 + (/ledger|drug|stock|inventor|item|medic|pharm|data|دواء|دوي|مخزون|صنف|صناف/i.test(sh.name) ? 10 : 0) - (/\bhow\b|help|read ?me|instruction|notes?\b|guide|summary|pivot|chart|cover|تعليمات|ملاحظات/i.test(sh.name) ? 25 : 0) - (sh.hidden ? 40 : 0) : -1;
  }

  const cell = (v, n) => {
    if (typeof v === 'number') return String(+v.toPrecision(12));
    const t = txt(v);
    if (!n || !t) return t;
    const m = t.replace(/[^\d٠-٩.,٫٬-]/g, '');
    return /[\d٠-٩]/.test(m) ? m : t;
  };

  function build(sh) {
    const m = sh.map, out = [], skip = { dup: 0, noname: 0, total: 0 };
    if (m.name == null) return { out, skip };
    const ks = COLS.filter(c => m[c.k] != null);
    const have = X.dedupe && X.mode === 'append' ? new Set(S.rows.map(sig)) : null;
    const hname = sh.hdr ? hn(sh.aoa[sh.hdr - 1][m.name]) : '';
    let last = '';
    for (let i = sh.hdr; i < sh.aoa.length; i++) {
      const src = sh.aoa[i], r = {};
      let any = false;
      for (const c of ks) if ((r[c.k] = cell(src[m[c.k]], c.num))) any = true;
      if (!any || (hname && hn(r.name) === hname)) continue;
      if (TOT.test(hn(r.name || src.find(v => txt(v) && !isNum(v))))) { skip.total++; continue; }
      if (r.name) last = r.name;
      else if (X.carry && last) r.name = last;
      else { skip.noname++; continue; }
      const row = blank(r);
      if (have && have.has(sig(row))) { skip.dup++; continue; }
      out.push(row);
    }
    return { out, skip };
  }

  const colName = (sh, c) => {
    const h = sh.hdr ? txt(sh.aoa[sh.hdr - 1][c]) : '';
    return XLSX.utils.encode_col(c + sh.c0) + (h ? ' · ' + h : '');
  };
  const pickSheet = i => { X.si = i; const s = cur(); X.carry = !!s && s.gaps > s.n * .1; };

  function impRender() {
    const sh = cur(), go = $('#impGo');
    $('#impBody').hidden = !sh;
    $('#impName').textContent = sh ? `${X.file} · ${X.sheets.length} ${plural(X.sheets.length, 'sheet')} — choose another file` : 'or drop it anywhere on the page — .xlsx, .xls, .ods, .csv';
    if (!sh) { go.disabled = true; go.textContent = 'Import'; return; }
    $('#impSheets').innerHTML = X.sheets.map((s, i) => `<button class="chip" aria-pressed="${i === X.si}" data-si="${i}"${s.n ? '' : ' disabled'}><span dir="auto">${esc(s.name)}</span><small>${s.n ? s.n + ' ' + plural(s.n, 'row') : 'empty'}${i === X.best && X.sheets.length > 1 ? ' · best match' : ''}</small></button>`).join('');
    $('#impHdr input').value = sh.hdr;
    $('#impHdrHint').textContent = sh.hdr ? `Row ${sh.hdr} holds the column names; data starts on row ${sh.hdr + 1}.` : 'No header row — every row is treated as data.';
    $('#impMap').innerHTML = COLS.map(c => {
      const m = sh.map[c.k], cf = sh.conf[c.k];
      const cl = m == null ? '' : cf === 'u' ? 'cu' : cf >= 100 ? 'c3' : cf >= 50 ? 'c2' : 'c1';
      const opts = Array.from({ length: sh.nc }, (_, i) => `<option value="${i}"${m === i ? ' selected' : ''}>${esc(colName(sh, i))}</option>`).join('');
      return `<label for="im-${c.k}"><i class="${cl}"></i>${esc(label(c))}${c.k === 'name' ? ' *' : ''}</label><select id="im-${c.k}" data-map="${c.k}"><option value="">— not in this file —</option>${opts}</select><small dir="auto">${m == null ? '' : esc(sh.st[m].ex || 'empty column')}</small>`;
    }).join('');
    $$('#impMode button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === X.mode));
    $('#impDup').checked = X.dedupe;
    $('#impDup').disabled = X.mode !== 'append';
    $('#impCarry').checked = X.carry;
    const { out, skip } = build(sh);
    X.out = out;
    const ks = COLS.filter(c => sh.map[c.k] != null);
    $('#impPv').innerHTML = out.length
      ? `<table><thead><tr>${ks.map(c => `<th class="${c.num ? 'n' : ''}">${esc(label(c))}</th>`).join('')}</tr></thead><tbody>${out.slice(0, 6).map(r => `<tr>${ks.map(c => `<td class="${c.num ? 'n' : ''}">${esc(r[c.k])}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      : '<p class="hint">No rows to import with these settings.</p>';
    const notes = [[skip.dup, 'already in the ledger'], [skip.noname, 'without a name'], [skip.total, plural(skip.total, 'total line')]].filter(x => x[0]).map(x => `${x[0]} ${x[1]}`);
    $('#impInfo').innerHTML = sh.map.name == null
      ? 'Choose which column holds the <b>name</b> to continue.'
      : `<b>${out.length}</b> ${plural(out.length, 'row')} ready${notes.length ? ' · skipped: ' + notes.join(', ') : ''}${X.mode === 'replace' && S.rows.length ? ` · replaces the current <b>${S.rows.length}</b>` : ''}`;
    go.disabled = !out.length;
    go.textContent = out.length ? `Import ${out.length} ${plural(out.length, 'row')}` : 'Import';
  }

  async function readFile(f) {
    if (!f || noXLSX()) return;
    let wb;
    try {
      wb = /\.(csv|tsv|txt)$/i.test(f.name) ? XLSX.read(await f.text(), { type: 'string' }) : XLSX.read(await f.arrayBuffer(), { type: 'array' });
    } catch {
      X.sheets = [];
      impRender();
      $('#impName').textContent = `${f.name} could not be read as a spreadsheet — try another file`;
      return;
    }
    X.F = fields();
    X.file = f.name;
    X.sheets = wb.SheetNames.map((name, i) => {
      const ws = wb.Sheets[name] || {};
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: true, range: 0 });
      while (aoa.length && !aoa[aoa.length - 1].some(v => txt(v))) aoa.pop();
      const sh = { name, aoa, c0: ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']).s.c : 0, hidden: !!wb.Workbook?.Sheets?.[i]?.Hidden };
      analyze(sh);
      return sh;
    });
    X.best = X.sheets.reduce((b, s, i, a) => (s.score > a[b].score ? i : b), 0);
    pickSheet(X.best);
    impRender();
  }

  const openImp = () => { if (!imp.open) { impRender(); imp.showModal(); } };
  $('#impBtn').addEventListener('click', openImp);
  $('#impX').addEventListener('click', () => imp.close());
  $('#impCancel').addEventListener('click', () => imp.close());
  $('#impDrop').addEventListener('click', () => $('#impFile').click());
  $('#impFile').addEventListener('change', e => { readFile(e.target.files[0]); e.target.value = ''; });
  addEventListener('dragover', e => { if ([...(e.dataTransfer?.types || [])].includes('Files')) e.preventDefault(); });
  addEventListener('drop', e => {
    const f = e.dataTransfer?.files?.[0];
    if (!f) return;
    e.preventDefault();
    openImp();
    readFile(f);
  });
  imp.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) { if (e.target === imp) imp.close(); return; }
    if (b.dataset.si) pickSheet(+b.dataset.si);
    else if (b.dataset.m) X.mode = b.dataset.m;
    else return;
    impRender();
  });
  imp.addEventListener('change', e => {
    const el = e.target, k = el.dataset.map, sh = cur();
    if (!sh) return;
    if (k) {
      const c = el.value === '' ? null : +el.value;
      for (const o of Object.keys(sh.map)) if (o === k || sh.map[o] === c) { delete sh.map[o]; delete sh.conf[o]; }
      if (c != null) { sh.map[k] = c; sh.conf[k] = 'u'; }
    } else if (el.id === 'impDup') X.dedupe = el.checked;
    else if (el.id === 'impCarry') X.carry = el.checked;
    else return;
    impRender();
  });
  $('#impHdr').addEventListener('step', e => { const sh = cur(); if (sh) { analyze(sh, e.detail); impRender(); } });

  $('#impGo').addEventListener('click', () => {
    const out = X.out, sh = cur();
    if (!sh || !out.length) return;
    const snap = { rows: S.rows, on: { ...S.on } }, rep = X.mode === 'replace';
    S.rows = rep ? out.slice() : S.rows.concat(out);
    const by = new Map();
    for (const r of S.rows) {
      const n = norm(r.name);
      if (!by.has(n)) by.set(n, {});
      for (const f of ['cls', 'bud']) if (!by.get(n)[f] && txt(r[f])) by.get(n)[f] = r[f];
    }
    for (const r of out) for (const f of ['cls', 'bud']) if (!txt(r[f])) r[f] = by.get(norm(r.name))[f] || '';
    for (const k of ['idn', 'idv']) if (out.some(r => txt(r[k]))) S.on[k] = true;
    sort.k = null;
    find.value = '';
    save();
    render();
    imp.close();
    X.sheets = [];
    X.out = [];
    const tr = trOf(out[0].id);
    if (tr) tr.scrollIntoView({ block: 'center' });
    flash(out.slice(0, 80).map(r => r.id));
    toast(`${rep ? 'Replaced the ledger with' : 'Imported'} ${out.length} ${plural(out.length, 'row')} from “${sh.name}”`, 'Undo', () => { S.rows = snap.rows; S.on = snap.on; save(); render(); });
  });

  $('#tplBtn').addEventListener('click', () => {
    if (noXLSX()) return;
    const ex = (price, stock, used) => ['', '', 'Amoxicillin 500 mg caps', 'Antibiotic', 'Essential', price, stock, used];
    const ws = XLSX.utils.aoa_to_sheet([COLS.map(c => label(c)), ex(0.12, 2400, 860), ex(0.14, 1200, 300)]);
    ws['!cols'] = COLS.map(c => ({ wch: c.k === 'name' ? 34 : c.num ? 12 : 16 }));
    const how = XLSX.utils.aoa_to_sheet([
      'Materia import template',
      '',
      '1. Fill the "Ledger" sheet: one row per price. Repeat the name for every price you hold of the same drug.',
      '2. Replace the two example rows with your own records.',
      `3. ${label(COLS[0])} and ${label(COLS[1])} are optional — leave them empty or delete those columns.`,
      '4. Column order and extra columns do not matter. Headers are matched by name (English or Arabic).',
      '5. In Materia press Import, choose this file, review the sheet, the column matches and the preview, then import.'
    ].map(t => [t]));
    how['!cols'] = [{ wch: 110 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
    XLSX.utils.book_append_sheet(wb, how, 'How to');
    XLSX.writeFile(wb, 'materia-template.xlsx');
  });

  addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

  render();
  hint();
  qName.focus();
})();
