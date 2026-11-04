/* ===== Config ===== */
const SHEET_ID = '1cj7N1ZqR4D6po2vCwceE3QlzN-0ysEXC0zOGd3r1Q4Y';
const SEMESTERS = { '3.2': ['A', 'B', 'C', 'D'], '4.1': ['A', 'B', 'C', 'D'] };
const REFRESH_MS = 10000;    // checks the sheet every 10 seconds
const FEE = 10000;           // collected from each student (7,000 + 3,000)

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

/* "2026-11-04 14:35:12" (written by the entry form / stamp.gs) -> ms */
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

async function fetchTab(sem, sec) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(`${sem}(${sec})`)}&headers=1&_=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const text = await res.text();
  if (text.trim().startsWith('<')) throw new Error('Sheet is not public');
  return toStudents(parseCSV(text), sem, sec);
}

function demoTab(sem, sec) {
  const seed = (sem + sec).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const names = ['Ayaan', 'Nabila', 'Rafi', 'Tasnim', 'Sami', 'Mim', 'Arif', 'Sadia', 'Tanvir', 'Nusrat', 'Fahim', 'Riya'];
  const base = new Date(2026, 10, 4, 9, 0).getTime();
  return Array.from({ length: 45 }, (_, i) => {
    const r = Math.sin(seed * 31 + i * 7) * 10000, k = r - Math.floor(r);
    if (k > .85) return { sem, sec, slr: i + 1, name: '', id: '', first: 0, second: 0, got: 0, paid: false, full: false, due: FEE, pct: 0, firstAt: null, secondAt: null };
    const p1 = k < .55, full = k < .12;
    const first = p1 ? 7000 : 0, second = full ? 3000 : 0;
    return {
      sem, sec, slr: i + 1,
      name: names[(i + seed) % names.length] + ' ' + String.fromCharCode(65 + (i % 26)) + '.',
      id: '5' + sem.replace('.', '') + sec.charCodeAt(0) + String(100 + i),
      first, second, got: first + second, paid: p1, full, due: FEE - first - second,
      pct: Math.floor((first + second) / FEE * 100),
      firstAt: p1 ? base + k * 6e7 : null, secondAt: full ? base + (1 - k) * 9e7 : null
    };
  });
}

async function loadAll(demo) {
  const jobs = [];
  for (const sem of Object.keys(SEMESTERS))
    for (const sec of SEMESTERS[sem])
      jobs.push(demo ? Promise.resolve(demoTab(sem, sec)) : fetchTab(sem, sec));
  return (await Promise.all(jobs)).flat();
}

/* ===== Ranking =====
   1) Fully paid first, ordered by the time of the 2nd installment —
      whoever paid it earliest is on top, even if their 1st installment came late.
   2) Part-paid next: higher % first, then whoever paid earlier.
   Anyone with nothing paid is not ranked — they show under "Interested". */
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
const rowHtml = (s, n) => `
  <div class="row ${s.full ? 'done' : ''} ${s.paid ? '' : 'dim'}">
    <div class="rk ${n && n <= 3 ? 'top3' : ''}">${n || '·'}</div>
    <div class="who">
      <div class="nm"><b>${esc(label(s))}</b><span class="tag">${s.sem} · ${s.sec}</span></div>
      <div class="pb"><i style="width:${s.pct}%"></i></div>
    </div>
    <div class="pc">${s.pct}%${s.full ? ' ✓' : ''}</div>
  </div>`;

function renderLeaderboard(list) {
  const ranked = rankList(list).filter(s => s.paid);
  const full = ranked.filter(s => s.full).length;
  $('#lbsub').textContent = ranked.length ? `${ranked.length} paid · ${full} fully paid` : 'Nobody has paid yet.';
  $('#lbl').innerHTML = ranked.length ? ranked.map((s, i) => rowHtml(s, i + 1)).join('') : '<div class="empty">No payments recorded yet.</div>';
}

function renderInterested(list) {
  const wait = list.filter(s => entered(s) && !s.paid)
    .sort((a, b) => a.sem.localeCompare(b.sem) || a.sec.localeCompare(b.sec) || a.slr - b.slr);
  $('#insub').textContent = wait.length ? `${wait.length} ${wait.length > 1 ? 'people have' : 'person has'} signed up and not paid yet.` : 'Everyone who signed up has paid.';
  $('#inl').innerHTML = wait.length ? wait.map(s => rowHtml(s, 0)).join('') : '<div class="empty">No one waiting.</div>';
}

/* ===== Search: is my entry submitted? what do I owe? ===== */
let STUDENTS = [];

function statusOf(s) {
  if (s.full) return { chip: 'c', text: '🎉 Fully paid', line: `100% complete · nothing due<br>${timesText(s)}` };
  if (s.paid) return { chip: 's', text: `${s.pct}% paid`, line: `<b>Due: ${taka(s.due)}</b><br>${timesText(s)}` };
  return { chip: 'o', text: 'Interested · not paid yet', line: `1st installment not recorded yet · <b>Due: ${taka(s.due)}</b>` };
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
      <div class="who"><b>${esc(s.name || 'Unnamed')}</b><small>${s.id ? esc(s.id) + ' · ' : ''}${s.sem}(${s.sec})</small>
      <div class="hl">${st.line}</div></div>
      <span class="chip ${st.chip}">${st.text}</span></div>`;
  }).join('');
}

function showMsg(html, err) {
  const m = $('#msg'); m.className = 'glass msg show' + (err ? ' err' : ''); m.innerHTML = html;
}

/* ===== Run ===== */
const DEMO = new URLSearchParams(location.search).has('demo');
let busy = false, prev = null;

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
    else if (n) toast(`📝 ${n} new sign-up${n > 1 ? 's' : ''}`);
  }
  prev = cur;
}

async function refresh() {
  if (busy) return;
  busy = true;
  if (!prev) $('#mode').textContent = 'Loading…';
  try {
    STUDENTS = await loadAll(DEMO);
    detectChanges(STUDENTS);
    renderSearch();
    renderLeaderboard(STUDENTS);
    renderInterested(STUDENTS);
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

$('#q').addEventListener('input', renderSearch);
$('#rf').onclick = refresh;
refresh();
setInterval(() => { if (!document.hidden) refresh(); }, REFRESH_MS);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
