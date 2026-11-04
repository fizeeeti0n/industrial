/* ===== Config ===== */
const SHEET_ID = '1cj7N1ZqR4D6po2vCwceE3QlzN-0ysEXC0zOGd3r1Q4Y';
const SEMESTERS = { '3.2': ['A', 'B', 'C', 'D'], '4.1': ['A', 'B', 'C', 'D'] };
const REFRESH_MS = 10000;    // checks the sheet every 10 seconds
const FEE = 10000;           // collected from each student (7,000 + 3,000)
const AGENCY_FALLBACK = 13000; // used only if the Dashboard tab can't be read
const SHOW_IDS = true;       // set false to hide student IDs on the public page

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const taka = n => '৳' + Math.round(n).toLocaleString('en-US');

/* ===== CSV parsing ===== */
function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
const money = s => parseFloat(String(s || '').replace(/[^0-9.]/g, '')) || 0;

/* "2026-11-04 14:35:12" (written by stamp.gs) -> ms; falls back to Date.parse */
function parseT(s) {
  s = (s || '').trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (m) return new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)).getTime();
  const t = Date.parse(s);
  return isNaN(t) ? null : t;
}
const fmtT = ms => new Date(ms).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });

/* ===== Data =====
   Tab layout: A Slr · B Name · C ID · D 1st Instalment · E 1st Paid At ·
   F 2nd Installment · G 2nd Paid At · H Due · I Balance · J/K/L paid flags.
   Columns are found by header name, with these positions as the fallback. */
function toStudents(rows, sem, sec) {
  const h = (rows[0] || []).map(x => (x || '').trim().toLowerCase());
  const find = (re, dflt) => { const i = h.findIndex(x => re.test(x)); return i >= 0 ? i : dflt; };
  const c = {
    slr: find(/^slr$/, 0), name: find(/^name$/, 1), id: find(/^id$/, 2),
    first: find(/^1st instal+ment$/, 3), firstAt: find(/^1st paid at$/, 4),
    second: find(/^2nd instal+ment$/, 5), secondAt: find(/^2nd paid at$/, 6),
    flag1: find(/^1st instal+ment paid$/, 9), full: find(/^ful+ paid$/, 11)
  };
  return rows.slice(1)
    .filter(r => /^\d+$/.test((r[c.slr] || '').trim()))
    .map(r => {
      const first = money(r[c.first]), second = money(r[c.second]);
      const got = first + second;
      const flag1 = /^true$/i.test((r[c.flag1] || '').trim());
      const flagF = /^true$/i.test((r[c.full] || '').trim());
      const paid = got > 0 || flag1;
      const full = flagF || got >= FEE;
      return {
        sem, sec, slr: +r[c.slr],
        name: (r[c.name] || '').trim(), id: (r[c.id] || '').trim(),
        first, second, got, paid, full,
        due: full ? 0 : Math.max(0, FEE - got),
        pct: full ? 100 : Math.min(99, Math.floor(got / FEE * 100)),
        firstAt: parseT(r[c.firstAt]), secondAt: parseT(r[c.secondAt])
      };
    });
}

async function gviz(sheet, extra) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}${extra || ''}&_=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const text = await res.text();
  if (text.trim().startsWith('<')) throw new Error('Sheet is not public');
  return parseCSV(text);
}

const fetchTab = async (sem, sec) => toStudents(await gviz(`${sem}(${sec})`, '&headers=1'), sem, sec);

/* Agency cost per person, read from the Dashboard tab ("Per Person Tour cost") */
async function fetchAgency() {
  try {
    const rows = await gviz('Dashboard', '&headers=0');
    for (let r = 0; r < rows.length; r++) for (let k = 0; k < rows[r].length; k++) {
      if (/per person tour cost/i.test(rows[r][k] || '')) {
        for (let d = r + 1; d < Math.min(rows.length, r + 6); d++) {
          const v = money(rows[d][k]); if (v > 0) return { perPerson: v, live: true };
        }
      }
    }
  } catch (e) { /* fall through */ }
  return { perPerson: AGENCY_FALLBACK, live: false };
}

function demoTab(sem, sec) {
  const seed = (sem + sec).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const names = ['Ayaan', 'Nabila', 'Rafi', 'Tasnim', 'Sami', 'Mim', 'Arif', 'Sadia', 'Tanvir', 'Nusrat', 'Fahim', 'Riya'];
  const base = new Date(2026, 10, 4, 9, 0).getTime();
  return Array.from({ length: 45 }, (_, i) => {
    const r = Math.sin(seed * 31 + i * 7) * 10000, k = r - Math.floor(r);
    if (k > .8) return { sem, sec, slr: i + 1, name: '', id: '', first: 0, second: 0, got: 0, paid: false, full: false, due: FEE, pct: 0, firstAt: null, secondAt: null };
    const paid = k < .5, full = k < .12, p1 = paid || full;
    const first = p1 ? 7000 : 0, second = full ? 3000 : 0;
    const t1 = base + k * 6e7, t2 = base + (1 - k) * 9e7;     // 2nd can be before 1st
    return {
      sem, sec, slr: i + 1,
      name: names[(i + seed) % names.length] + ' ' + String.fromCharCode(65 + (i % 26)) + '.',
      id: '5' + sem.replace('.', '') + sec.charCodeAt(0) + String(100 + i),
      first, second, got: first + second, paid: p1, full, due: FEE - first - second,
      pct: Math.floor((first + second) / FEE * 100),
      firstAt: p1 ? t1 : null, secondAt: full ? t2 : null
    };
  });
}

async function loadAll(demo) {
  const jobs = [];
  for (const sem of Object.keys(SEMESTERS))
    for (const sec of SEMESTERS[sem])
      jobs.push(demo ? Promise.resolve(demoTab(sem, sec)) : fetchTab(sem, sec));
  const [out, agency] = await Promise.all([
    Promise.all(jobs), demo ? Promise.resolve({ perPerson: AGENCY_FALLBACK, live: true }) : fetchAgency()
  ]);
  const data = {}; let k = 0;
  for (const sem of Object.keys(SEMESTERS))
    for (const sec of SEMESTERS[sem]) data[`${sem}(${sec})`] = out[k++];
  return { data, agency };
}

/* ===== Ranking =====
   1) Fully paid come first, ordered by the time of the 2nd installment —
      whoever paid it earliest is on top, even if their 1st installment came late.
   2) Part-paid: higher % first, then whoever paid earlier.
   3) Nothing paid yet: bottom. */
const entered = s => !!(s.name || s.id);
const T = t => t == null ? Infinity : t;
const earliest = s => Math.min(T(s.firstAt), T(s.secondAt));
function rankList(list) {
  const grp = s => s.full ? 0 : s.paid ? 1 : 2;
  return list.filter(entered).sort((a, b) => {
    const g = grp(a) - grp(b); if (g) return g;
    if (a.full) {
      const d = (T(a.secondAt) - T(b.secondAt)) || (T(a.firstAt) - T(b.firstAt));
      if (d && !isNaN(d)) return d;
    } else if (a.paid) {
      const d = (b.pct - a.pct) || (earliest(a) - earliest(b));
      if (d && !isNaN(d)) return d;
    }
    return a.sem.localeCompare(b.sem) || a.sec.localeCompare(b.sec) || a.slr - b.slr;
  });
}
const label = s => s.name || `Student #${s.slr}`;
const timesText = s => {
  if (!s.paid) return 'No payment yet';
  const a = s.firstAt ? fmtT(s.firstAt) : '—', b = s.secondAt ? fmtT(s.secondAt) : '—';
  return `1st: ${a} · 2nd: ${b}`;
};

/* ===== Rendering ===== */
function renderStats(list) {
  const e = list.filter(entered);
  const paid = e.filter(s => s.paid).length, full = e.filter(s => s.full).length;
  const avg = e.length ? Math.round(e.reduce((a, s) => a + s.pct, 0) / e.length) : 0;
  $('#stats').innerHTML = [
    [e.length, 'Entries submitted', `of ${list.length} seats`],
    [paid, '1st installment paid', e.length ? `${Math.round(paid / e.length * 100)}% of entries` : '—'],
    [full, 'Fully paid · 100%', 'completed payment'],
    [avg + '%', 'Average completion', 'across all entries']
  ].map(([n, l, s]) => `<div class="glass stat"><div class="n">${n}</div><div class="l">${l}</div><div class="s">${s}</div></div>`).join('');
}

/* Agency: headcount = students who have paid the 1st installment */
function renderAgency(list, agency) {
  const conf = list.filter(s => entered(s) && s.paid);
  const head = conf.length;
  const payable = head * agency.perPerson;
  const collected = list.reduce((a, s) => a + s.got, 0);
  const cover = Math.max(0, payable - collected);
  const pending = conf.reduce((a, s) => a + s.due, 0);
  const pct = payable ? Math.min(100, Math.round(collected / payable * 100)) : 0;
  $('#agency').innerHTML = `
    <div class="ag">
      ${[
        [head, 'Confirmed headcount', 'paid the 1st installment'],
        [taka(agency.perPerson), 'Agency cost per person', agency.live ? 'from the Dashboard tab' : 'default — Dashboard tab not readable'],
        [taka(payable), 'Total payable to agency', `${head} × ${taka(agency.perPerson)}`],
        [taka(collected), 'Collected so far', 'all installments received'],
        [taka(cover), 'Still to cover', 'payable minus collected'],
        [taka(pending), 'Due from students', 'remaining installments']
      ].map(([n, l, s]) => `<div class="agt"><div class="n">${n}</div><div class="l">${l}</div><div class="s">${s}</div></div>`).join('')}
    </div>
    <div class="prog" style="margin-top:18px"><i style="width:${pct}%"></i></div>
    <div class="meta2"><span>Collected covers ${pct}% of the agency total</span><span>${taka(collected)} / ${taka(payable)}</span></div>`;
}

/* generic leaderboard panel */
const BOARDS = [
  { id: 'lbAll', el: '#lbAll', eyebrow: 'Whole batch · 3.2 + 4.1', title: 'Batch leaderboard', by: 'sem', opts: ['3.2', '4.1'], all: 'All batches', lbl: x => 'Sem ' + x },
  { id: 'lb32', el: '#lb32', eyebrow: 'Semester 3.2', title: 'Leaderboard 3.2', by: 'sec', sem: '3.2', opts: SEMESTERS['3.2'], all: 'All sections', lbl: x => 'Sec ' + x },
  { id: 'lb41', el: '#lb41', eyebrow: 'Semester 4.1', title: 'Leaderboard 4.1', by: 'sec', sem: '4.1', opts: SEMESTERS['4.1'], all: 'All sections', lbl: x => 'Sec ' + x }
];
const filt = { lbAll: 'All', lb32: 'All', lb41: 'All' };

function renderBoard(b, list) {
  const pool = list.filter(s => !b.sem || s.sem === b.sem);
  const view = rankList(pool).filter(s => filt[b.id] === 'All' || s[b.by] === filt[b.id]);
  const full = view.filter(s => s.full).length;
  const tabs = ['All', ...b.opts].map(x => `<button data-board="${b.id}" data-f="${x}" class="${filt[b.id] === x ? 'on' : ''}">${x === 'All' ? b.all : b.lbl(x)}</button>`).join('');
  const rows = view.length ? view.map((s, i) => `
    <div class="row ${s.full ? 'done' : ''} ${i < 3 && s.full ? 'r' + (i + 1) : ''}">
      <div class="rk">${i + 1}</div>
      <div class="who">
        <b>${esc(label(s))}${s.full ? ' <span class="tick">✓</span>' : ''}</b>
        <small>${s.sem}(${s.sec})${SHOW_IDS && s.id ? ' · ' + esc(s.id) : ''}</small>
        <div class="pb"><i style="width:${s.pct}%"></i></div>
        <small class="wh">${timesText(s)}</small>
      </div>
      <div class="pc">${s.pct}%</div>
    </div>`).join('') : '<div class="empty">No entries yet.</div>';
  $(b.el).innerHTML = `
    <p class="eyebrow">${b.eyebrow}</p>
    <h2>${b.title}</h2>
    <p class="sub">${view.length} listed · ${full} at 100% · earliest 2nd installment stays on top</p>
    <div class="tabs">${tabs}</div>
    <div class="scroll">${rows}</div>`;
}

function renderTabs(data) {
  $('#tabs').innerHTML = Object.entries(data).map(([name, list]) => {
    const e = list.filter(entered), r = rankList(list);
    const paid = e.filter(s => s.paid).length, full = e.filter(s => s.full).length;
    const avg = e.length ? Math.round(e.reduce((a, s) => a + s.pct, 0) / e.length) : 0;
    const t = r.find(s => s.full);
    return `<div class="glass card tc">
      <div class="t"><h3>${esc(name)}</h3><span class="chip ${full ? 'c' : ''}">${full} at 100%</span></div>
      <div class="prog"><i style="width:${avg}%"></i></div>
      <div class="meta2"><span>${e.length}/${list.length} entries · ${paid} paid 1st</span><span>${avg}% avg</span></div>
      <div class="top1"><small>First to 100%</small>${t ? `<b>${esc(label(t))}</b>${t.secondAt ? ' · ' + fmtT(t.secondAt) : ''}` : '<span style="color:rgba(255,255,255,.5)">Nobody yet</span>'}</div>
    </div>`;
  }).join('');
}

/* ===== Search: is my entry submitted? what do I owe? ===== */
let STUDENTS = [];

function statusOf(s) {
  if (s.full) return { chip: 'c', text: '🎉 Fully paid', line: `100% complete · nothing due<br>${timesText(s)}` };
  if (s.paid) return { chip: 's', text: `${s.pct}% paid`, line: `<b>Due: ${taka(s.due)}</b><br>${timesText(s)}` };
  return { chip: 'o', text: 'Entry submitted · not paid yet', line: `1st installment not recorded yet · <b>Due: ${taka(s.due)}</b>` };
}

function renderSearch() {
  const q = $('#q').value.trim().toLowerCase(), out = $('#sr');
  if (q.length < 2) { out.innerHTML = '<div class="empty">Type at least 2 letters of your name, or your ID.</div>'; return; }
  const hits = STUDENTS.filter(s => entered(s) &&
    (s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))).slice(0, 6);
  if (!hits.length) {
    out.innerHTML = `<div class="empty">No entry found for “${esc($('#q').value.trim())}”. Check the spelling or ID — if it’s correct, your entry hasn’t been submitted yet.</div>`;
    return;
  }
  out.innerHTML = hits.map(s => {
    const st = statusOf(s);
    return `<div class="hit ${s.full ? 'fullhit' : ''}">
      <div class="who"><b>${esc(s.name || 'Unnamed')}</b><small>${s.id ? esc(s.id) + ' · ' : ''}${s.sem}(${s.sec}) · Slr ${s.slr}</small>
      <div class="hl">${st.line}</div></div>
      <span class="chip ${st.chip}">${st.text}</span></div>`;
  }).join('');
}

/* ===== Fully paid club (in leaderboard order) ===== */
function renderFull(list) {
  const f = rankList(list).filter(s => s.full);
  $('#fullcount').textContent = f.length;
  $('#fullgrid').innerHTML = f.length ? f.map((s, i) => `
    <div class="fp">
      <span class="sp s1">✦</span><span class="sp s2">✦</span><span class="sp s3">✦</span>
      <div class="medal">${i === 0 ? '👑' : '🏅'}</div>
      <b>${esc(label(s))}</b>
      <small>${s.sem}(${s.sec})${SHOW_IDS && s.id ? ' · ' + esc(s.id) : ''}</small>
      <div class="fpt">${i === 0 ? 'First to finish' : '#' + (i + 1) + ' · 100%'}</div>
      <small class="ft">${s.secondAt ? '2nd paid ' + fmtT(s.secondAt) : 'time not recorded'}</small>
    </div>`).join('') : '<div class="empty" style="grid-column:1/-1">Nobody has completed full payment yet — be the first! 🚀</div>';
}

function showMsg(html, err) {
  const m = $('#msg'); m.className = 'glass msg show' + (err ? ' err' : ''); m.innerHTML = html;
}

/* ===== Run ===== */
const DEMO = new URLSearchParams(location.search).has('demo');
let busy = false, prev = null, last = null;

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 5000);
}

function detectChanges(list) {
  const cur = new Map(list.map(s => [`${s.sem}${s.sec}-${s.slr}`, s]));
  if (prev) {
    let p = 0, f = 0, n = 0;
    cur.forEach((s, k) => {
      const o = prev.get(k);
      if (!o) return;
      if (s.full && !o.full) f++;
      else if (s.paid && !o.paid) p++;
      else if (entered(s) && !entered(o)) n++;
    });
    if (f) toast(`🎉 ${f} student${f > 1 ? 's' : ''} just reached 100%!`);
    else if (p) toast(`💸 ${p} new payment${p > 1 ? 's' : ''} recorded`);
    else if (n) toast(`📝 ${n} new entr${n > 1 ? 'ies' : 'y'} submitted`);
  }
  prev = cur;
}

function renderAll({ data, agency }) {
  STUDENTS = Object.values(data).flat();
  renderStats(STUDENTS);
  renderAgency(STUDENTS, agency);
  renderSearch();
  renderFull(STUDENTS);
  BOARDS.forEach(b => renderBoard(b, STUDENTS));
  renderTabs(data);
}

async function refresh() {
  if (busy) return;
  busy = true;
  if (!prev) $('#mode').textContent = 'Loading…';
  try {
    last = await loadAll(DEMO);
    detectChanges(Object.values(last.data).flat());
    renderAll(last);
    $('#msg').className = 'glass msg';
    $('#mode').textContent = DEMO ? 'Demo data' : '● Live from sheet';
    $('#mode').className = 'chip ' + (DEMO ? 'o' : 'c');
    $('#upd').textContent = 'Updated ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    $('#mode').textContent = 'Could not load';
    $('#mode').className = 'chip o';
    showMsg(`Couldn’t read the Google Sheet (${esc(e.message)}). Make sure sharing is set to <b>Anyone with the link → Viewer</b>, then refresh. Add <code>?demo</code> to the URL to preview with sample data.`, true);
  } finally { busy = false; }
}

document.addEventListener('click', e => {
  const b = e.target.closest('button[data-board]');
  if (!b || !last) return;
  filt[b.dataset.board] = b.dataset.f;
  renderBoard(BOARDS.find(x => x.id === b.dataset.board), STUDENTS);
});
$('#q').addEventListener('input', renderSearch);
$('#rf').onclick = refresh;
refresh();
setInterval(() => { if (!document.hidden) refresh(); }, REFRESH_MS);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
