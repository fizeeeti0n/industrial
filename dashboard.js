/* ===== Config ===== */
const SHEET_ID = '1cj7N1ZqR4D6po2vCwceE3QlzN-0ysEXC0zOGd3r1Q4Y';
const SEMESTERS = { '3.2': ['A', 'B', 'C', 'D'], '4.1': ['A', 'B', 'C', 'D'] };
const REFRESH_MS = 10000;    // checks the sheet every 10 seconds
const TOP_N = 10;            // rows shown per semester leaderboard
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

/* ===== Data ===== */
// Columns: A Slr, B Name, C ID, D 1st Instalment, ... H "1st Instalment Paid"
function toStudents(rows, sem, sec) {
  return rows.slice(1)
    .filter(r => /^\d+$/.test((r[0] || '').trim()))
    .map(r => {
      const first = money(r[3]), second = money(r[4]);
      const dueRaw = (r[5] || '').trim();
      const due = money(dueRaw);                       // "Due" cell, sign stripped
      const flag1 = /^true$/i.test((r[7] || '').trim());
      const flagF = /^true$/i.test((r[9] || '').trim());
      const paid = first > 0 || flag1;
      return {
        sem, sec, slr: +r[0],
        name: (r[1] || '').trim(), id: (r[2] || '').trim(),
        first, second, due, paid,
        full: flagF || (paid && dueRaw !== '' && due === 0)
      };
    });
}

async function fetchTab(sem, sec) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(`${sem}(${sec})`)}`;
  const res = await fetch(url + '&_=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const text = await res.text();
  if (text.trim().startsWith('<')) throw new Error('Sheet is not public');
  return toStudents(parseCSV(text), sem, sec);
}

function demoTab(sem, sec) {
  const seed = (sem + sec).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const first = ['Ayaan', 'Nabila', 'Rafi', 'Tasnim', 'Sami', 'Mim', 'Arif', 'Sadia', 'Tanvir', 'Nusrat', 'Fahim', 'Riya'];
  return Array.from({ length: 45 }, (_, i) => {
    const r = Math.sin(seed * 31 + i * 7) * 10000, k = r - Math.floor(r);
    const paid = k < .45, full = k < .08;
    const f = full ? 5000 : paid ? [2000, 3000, 4000, 5000][Math.floor(k * 100) % 4] : 0;
    return {
      sem, sec, slr: i + 1,
      name: first[(i + seed) % first.length] + ' ' + String.fromCharCode(65 + (i % 26)) + '.',
      id: '5' + sem.replace('.', '') + sec.charCodeAt(0) + String(100 + i),
      first: f, second: full ? 5000 : 0, due: full ? 0 : 10000 - f, paid, full
    };
  });
}

async function loadAll(demo) {
  const jobs = [];
  for (const sem of Object.keys(SEMESTERS))
    for (const sec of SEMESTERS[sem])
      jobs.push(demo ? Promise.resolve(demoTab(sem, sec)) : fetchTab(sem, sec));
  const out = await Promise.all(jobs);
  const data = {}; let k = 0;
  for (const sem of Object.keys(SEMESTERS))
    for (const sec of SEMESTERS[sem]) data[`${sem}(${sec})`] = out[k++];
  return data;
}

/* ===== Ranking: most 1st-installment paid wins; ties go to lower serial ===== */
const rank = list => list.filter(s => s.paid)
  .sort((a, b) => b.first - a.first || a.slr - b.slr);

const label = s => s.name || `Student #${s.slr}`;

/* ===== Rendering ===== */
function renderStats(data) {
  const all = Object.values(data).flat();
  const paid = all.filter(s => s.paid);
  const total = all.length, collected = paid.reduce((a, s) => a + s.first, 0);
  const pct = total ? Math.round(paid.length / total * 100) : 0;
  const by = sem => Object.entries(data).filter(([k]) => k.startsWith(sem + '(')).flatMap(e => e[1]).filter(s => s.paid).length;
  $('#stats').innerHTML = [
    [paid.length, '1st installments paid', `${pct}% of ${total} students`],
    [by('3.2'), 'Semester 3.2', 'paid 1st installment'],
    [by('4.1'), 'Semester 4.1', 'paid 1st installment'],
    [taka(collected), 'Collected so far', '1st installment total']
  ].map(([n, l, s]) => `<div class="glass stat"><div class="n">${n}</div><div class="l">${l}</div><div class="s">${s}</div></div>`).join('');
}

function renderLeaderboard(sem, data) {
  const all = Object.entries(data).filter(([k]) => k.startsWith(sem + '(')).flatMap(e => e[1]);
  const ranked = rank(all), top = ranked.slice(0, TOP_N);
  const cls = ['r1', 'r2', 'r3'];
  const rows = top.length ? top.map((s, i) => `
    <div class="row ${cls[i] || ''}">
      <div class="rk">${i + 1}</div>
      <div class="who"><b>${esc(label(s))}</b><small>Section ${s.sec}${SHOW_IDS && s.id ? ' · ' + esc(s.id) : ''}</small></div>
      <div class="amt">${s.first ? taka(s.first) : 'Paid'}</div>
    </div>`).join('') : '<div class="empty">No 1st installments recorded yet.</div>';
  $(sem === '3.2' ? '#lb32' : '#lb41').innerHTML = `
    <p class="eyebrow">Semester ${sem}</p>
    <h2>Top payers</h2>
    <p class="sub">${ranked.length} paid across sections A–D · ranked by 1st installment amount</p>${rows}`;
}

function renderTabs(data) {
  $('#tabs').innerHTML = Object.entries(data).map(([name, list]) => {
    const r = rank(list), pct = list.length ? Math.round(r.length / list.length * 100) : 0;
    const sum = r.reduce((a, s) => a + s.first, 0);
    const t = r[0];
    return `<div class="glass card tc">
      <div class="t"><h3>${esc(name)}</h3><span class="chip ${r.length ? 'c' : ''}">${r.length} paid</span></div>
      <div class="prog"><i style="width:${pct}%"></i></div>
      <div class="meta2"><span>${r.length} / ${list.length} students (${pct}%)</span><span>${taka(sum)}</span></div>
      <div class="top1"><small>Top payer</small>${t ? `<b>${esc(label(t))}</b> · ${t.first ? taka(t.first) : 'Paid'}` : '<span style="color:rgba(255,255,255,.5)">No payments yet</span>'}</div>
    </div>`;
  }).join('');
}

/* ===== Search: is my entry submitted? what do I owe? ===== */
let STUDENTS = [];

function statusOf(s) {
  if (s.full) return { chip: 'c', text: '🎉 Fully paid', line: 'Everything is paid. Nothing due.' };
  if (s.paid) return { chip: 's', text: '1st installment paid', line: `Paid ${taka(s.first)} · <b>Due: ${taka(s.due)}</b>` };
  return { chip: 'o', text: 'Entry submitted · not paid yet', line: `1st installment not recorded yet${s.due ? ` · <b>Due: ${taka(s.due)}</b>` : ''}` };
}

function renderSearch() {
  const q = $('#q').value.trim().toLowerCase(), out = $('#sr');
  if (q.length < 2) { out.innerHTML = '<div class="empty">Type at least 2 letters of your name, or your ID.</div>'; return; }
  const hits = STUDENTS.filter(s => (s.name || s.id) &&
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

/* ===== Fully paid club ===== */
function renderFull(list) {
  const f = list.filter(s => s.full && (s.name || s.id));
  $('#fullcount').textContent = f.length;
  $('#fullgrid').innerHTML = f.length ? f.map(s => `
    <div class="fp">
      <span class="sp s1">✦</span><span class="sp s2">✦</span><span class="sp s3">✦</span>
      <div class="medal">🏅</div>
      <b>${esc(s.name || 'Unnamed')}</b>
      <small>${s.sem}(${s.sec})${SHOW_IDS && s.id ? ' · ' + esc(s.id) : ''}</small>
      <div class="fpt">Fully paid</div>
    </div>`).join('') : '<div class="empty" style="grid-column:1/-1">Nobody has completed full payment yet — be the first! 🚀</div>';
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
      else if ((s.name || s.id) && !(o.name || o.id)) n++;
    });
    if (f) toast(`🎉 ${f} student${f > 1 ? 's' : ''} just completed full payment!`);
    else if (p) toast(`💸 ${p} new 1st installment${p > 1 ? 's' : ''} recorded`);
    else if (n) toast(`📝 ${n} new entr${n > 1 ? 'ies' : 'y'} submitted`);
  }
  prev = cur;
}

async function refresh() {
  if (busy) return;
  busy = true;
  if (!prev) $('#mode').textContent = 'Loading…';
  try {
    const data = await loadAll(DEMO);
    STUDENTS = Object.values(data).flat();
    detectChanges(STUDENTS);
    renderStats(data);
    renderSearch();
    renderFull(STUDENTS);
    renderLeaderboard('3.2', data);
    renderLeaderboard('4.1', data);
    renderTabs(data);
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