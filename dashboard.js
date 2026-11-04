
/* =========================================================
   UAP CSE INDUSTRIAL TOUR — PAYMENT LEADERBOARD
   Complete fixed dashboard.js
========================================================= */

/* ===== CONFIG ===== */

const SHEET_ID = '1cj7N1ZqR4D6po2vCwceE3QlzN-0ysEXC0zOGd3r1Q4Y';

const SEMESTERS = {
    '3.2': ['A', 'B', 'C', 'D'],
    '4.1': ['A', 'B', 'C', 'D']
};

const REFRESH_MS = 10000;
const FEE = 10000;


/* ===== DOM HELPERS ===== */

const $ = selector => document.querySelector(selector);

const esc = value =>
    String(value ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));

const taka = n =>
    '৳' + Math.round(n).toLocaleString('en-US');


/* ===== CSV PARSING ===== */

function parseCSV(text) {

    const rows = [];
    let row = [];
    let cur = '';
    let q = false;

    for (let i = 0; i < text.length; i++) {

        const c = text[i];

        if (q) {

            if (c === '"' && text[i + 1] === '"') {
                cur += '"';
                i++;
            }

            else if (c === '"') {
                q = false;
            }

            else {
                cur += c;
            }

        }

        else if (c === '"') {
            q = true;
        }

        else if (c === ',') {
            row.push(cur);
            cur = '';
        }

        else if (c === '\n') {
            row.push(cur);
            rows.push(row);
            row = [];
            cur = '';
        }

        else if (c !== '\r') {
            cur += c;
        }
    }

    if (cur !== '' || row.length) {
        row.push(cur);
        rows.push(row);
    }

    return rows;
}


const money = value =>
    parseFloat(String(value || '').replace(/[^0-9.]/g, '')) || 0;


/* ===== DATE PARSING ===== */

function parseT(value) {

    const s = String(value || '').trim();

    if (!s) return null;

    // Supports:
    // 2026-11-04 14:35:12
    // 2026-11-04T14:35:12
    // 2026-11-04 14:35

    const m = s.match(
        /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/
    );

    if (m) {

        return new Date(
            +m[1],
            +m[2] - 1,
            +m[3],
            +m[4],
            +m[5],
            +(m[6] || 0)
        ).getTime();

    }

    const t = Date.parse(s);

    return isNaN(t) ? null : t;
}


const fmtT = ms => {

    return new Date(ms).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

};


/* ===== GOOGLE SHEET DATA PROCESSING ===== */

/*
    Tab layout:

    A = Slr
    B = Name
    C = ID
    D = 1st Instalment
    E = 1st Paid At
    F = 2nd Installment
    G = 2nd Paid At
    H = Due
    I = Balance
    J = 1st Instalment Paid
    K = 2nd Instalment Paid
    L = Full Paid

    Columns are identified by headers.
    Default column positions are used as fallback.
*/

function toStudents(rows, sem, sec) {

    if (!rows || !rows.length) {
        return [];
    }

    const h = (rows[0] || []).map(x =>
        String(x || '').trim().toLowerCase()
    );

    const find = (regex, fallback) => {

        const index = h.findIndex(x => regex.test(x));

        return index >= 0 ? index : fallback;
    };

    const c = {

        slr: find(/^slr$/, 0),

        name: find(/^name$/, 1),

        id: find(/^id$/, 2),

        first: find(/^1st instal+ment$/, 3),

        firstAt: find(/^1st paid at$/, 4),

        second: find(/^2nd instal+ment$/, 5),

        secondAt: find(/^2nd paid at$/, 6),

        flag1: find(/^1st instal+ment paid$/, 9),

        flag2: find(/^2nd instal+ment paid$/, 10),

        full: find(/^ful+ paid$/, 11)

    };


    return rows.slice(1)

        .filter(r =>
            /^\d+$/.test(String(r[c.slr] || '').trim())
        )

        .map(r => {

            const first = money(r[c.first]);

            const second = money(r[c.second]);

            const got = first + second;

            const flag1 =
                /^true$/i.test(String(r[c.flag1] || '').trim());

            const flag2 =
                /^true$/i.test(String(r[c.flag2] || '').trim());

            const flagF =
                /^true$/i.test(String(r[c.full] || '').trim());


            // Payment status

            const paid =
                got > 0 || flag1 || flag2 || flagF;

            const full =
                flagF || got >= FEE;


            return {

                sem,
                sec,

                slr: +r[c.slr],

                name: String(r[c.name] || '').trim(),

                id: String(r[c.id] || '').trim(),

                first,
                second,

                got,

                paid,
                full,

                due: full ? 0 : Math.max(0, FEE - got),

                pct: full
                    ? 100
                    : Math.min(99, Math.floor(got / FEE * 100)),

                firstAt: parseT(r[c.firstAt]),

                secondAt: parseT(r[c.secondAt])

            };

        });

}


/* ===== FETCH GOOGLE SHEET ===== */

async function fetchTab(sem, sec) {

    const sheetName = `${sem}(${sec})`;

    const url =
        `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq` +
        `?tqx=out:csv` +
        `&sheet=${encodeURIComponent(sheetName)}` +
        `&headers=1` +
        `&_=${Date.now()}`;

    const res = await fetch(url, {
        cache: 'no-store'
    });

    if (!res.ok) {
        throw new Error(`HTTP ${res.status} while loading ${sheetName}`);
    }

    const text = await res.text();

    if (
        text.trim().startsWith('<') ||
        /accounts\.google\.com|sign in to continue/i.test(text)
    ) {
        throw new Error(
            `Cannot access sheet "${sheetName}". Check sharing permissions.`
        );
    }

    const rows = parseCSV(text);

    if (!rows.length) {
        throw new Error(`Sheet "${sheetName}" is empty.`);
    }

    return toStudents(rows, sem, sec);
}


/* ===== DEMO DATA ===== */

function demoTab(sem, sec) {

    const seed = (sem + sec)
        .split('')
        .reduce((a, c) => a + c.charCodeAt(0), 0);

    const names = [
        'Ayaan', 'Nabila', 'Rafi', 'Tasnim',
        'Sami', 'Mim', 'Arif', 'Sadia',
        'Tanvir', 'Nusrat', 'Fahim', 'Riya'
    ];

    const base = new Date(2026, 10, 4, 9, 0).getTime();

    return Array.from({ length: 45 }, (_, i) => {

        const r = Math.sin(seed * 31 + i * 7) * 10000;

        const k = r - Math.floor(r);

        if (k > .85) {

            return {
                sem, sec,
                slr: i + 1,
                name: '',
                id: '',
                first: 0,
                second: 0,
                got: 0,
                paid: false,
                full: false,
                due: FEE,
                pct: 0,
                firstAt: null,
                secondAt: null
            };

        }

        const p1 = k < .55;

        const full = k < .12;

        const first = p1 ? 7000 : 0;

        const second = full ? 3000 : 0;

        return {

            sem,
            sec,

            slr: i + 1,

            name:
                names[(i + seed) % names.length] +
                ' ' +
                String.fromCharCode(65 + (i % 26)) +
                '.',

            id:
                '5' +
                sem.replace('.', '') +
                sec.charCodeAt(0) +
                String(100 + i),

            first,
            second,

            got: first + second,

            paid: p1 || full,

            full,

            due: FEE - first - second,

            pct: Math.floor(
                (first + second) / FEE * 100
            ),

            firstAt: p1
                ? base + k * 6e7
                : null,

            secondAt: full
                ? base + (1 - k) * 9e7
                : null

        };

    });

}


/* ===== LOAD ALL SEMESTERS ===== */

async function loadAll(demo) {

    const jobs = [];

    for (const sem of Object.keys(SEMESTERS)) {

        for (const sec of SEMESTERS[sem]) {

            jobs.push(
                demo
                    ? Promise.resolve(demoTab(sem, sec))
                    : fetchTab(sem, sec)
            );

        }

    }

    const results = await Promise.all(jobs);

    return results.flat();
}


/* ===== LEADERBOARD RANKING ===== */

/*
    Ranking rules:

    1. Fully paid students appear first.
       Earlier second-installment payment gets priority.

    2. Partially paid students appear next.
       Higher payment percentage gets priority.

    3. Students with no payments are not ranked.
       They appear under Interested.
*/

const entered = s => !!(s.name || s.id);

const T = t => t == null ? Infinity : t;

const earliest = s =>
    Math.min(T(s.firstAt), T(s.secondAt));


function rankList(list) {

    const grp = s =>
        s.full ? 0 : s.paid ? 1 : 2;

    return list

        .filter(entered)

        .sort((a, b) => {

            const g = grp(a) - grp(b);

            if (g) return g;

            if (a.full) {

                const d =
                    (T(a.secondAt) - T(b.secondAt)) ||
                    (T(a.firstAt) - T(b.firstAt));

                if (d && !isNaN(d)) return d;

            }

            else if (a.paid) {

                const d =
                    (b.pct - a.pct) ||
                    (earliest(a) - earliest(b));

                if (d && !isNaN(d)) return d;

            }

            return (
                a.sem.localeCompare(b.sem) ||
                a.sec.localeCompare(b.sec) ||
                a.slr - b.slr
            );

        });

}


const label = s =>
    s.name || `Student #${s.slr}`;


const timesText = s => {

    if (!s.paid) {
        return 'No payment yet';
    }

    const a = s.firstAt
        ? fmtT(s.firstAt)
        : '—';

    const b = s.secondAt
        ? fmtT(s.secondAt)
        : '—';

    return `1st: ${a} · 2nd: ${b}`;

};


/* ===== LEADERBOARD ROW HTML ===== */

const rowHtml = (s, n) => `

    <div class="row ${s.full ? 'done' : ''} ${s.paid ? '' : 'dim'}">

        <div class="rk ${n && n <= 3 ? 'top3' : ''}">
            ${n || '·'}
        </div>

        <div class="who">

            <div class="nm">

                <b>${esc(label(s))}</b>

                <span class="tag">
                    ${s.sem} · ${s.sec}
                </span>

            </div>

            <div class="pb">
                <i style="width:${s.pct}%"></i>
            </div>

        </div>

        <div class="pc">
            ${s.pct}%${s.full ? ' ✓' : ''}
        </div>

    </div>

`;


/* ===== RENDER LEADERBOARD ===== */

function renderLeaderboard(list) {

    const sub = $('#lbsub');
    const container = $('#lbl');

    if (!sub || !container) {
        console.error('Leaderboard HTML elements missing.');
        return;
    }

    const ranked = rankList(list).filter(s => s.paid);

    const full = ranked.filter(s => s.full).length;

    sub.textContent = ranked.length
        ? `${ranked.length} paid · ${full} fully paid`
        : 'Nobody has paid yet.';

    container.innerHTML = ranked.length
        ? ranked.map((s, i) => rowHtml(s, i + 1)).join('')
        : '<div class="empty">No payments recorded yet.</div>';

}


/* ===== RENDER INTERESTED STUDENTS ===== */

function renderInterested(list) {

    const sub = $('#insub');
    const container = $('#inl');

    if (!sub || !container) {
        console.error('Interested section HTML elements missing.');
        return;
    }

    const wait = list

        .filter(s => entered(s) && !s.paid)

        .sort((a, b) =>
            a.sem.localeCompare(b.sem) ||
            a.sec.localeCompare(b.sec) ||
            a.slr - b.slr
        );

    sub.textContent = wait.length

        ? `${wait.length} ${wait.length > 1
            ? 'people have'
            : 'person has'} signed up and not paid yet.`

        : 'Everyone who signed up has paid.';

    container.innerHTML = wait.length

        ? wait.map(s => rowHtml(s, 0)).join('')

        : '<div class="empty">No one waiting.</div>';

}


/* ===== SEARCH ===== */

let STUDENTS = [];


function statusOf(s) {

    if (s.full) {

        return {
            chip: 'c',
            text: '🎉 Fully paid',
            line:
                `100% complete · nothing due<br>${timesText(s)}`
        };

    }

    if (s.paid) {

        return {
            chip: 's',
            text: `${s.pct}% paid`,
            line:
                `<b>Due: ${taka(s.due)}</b><br>${timesText(s)}`
        };

    }

    return {

        chip: 'o',

        text: 'Interested · not paid yet',

        line:
            `1st installment not recorded yet · <b>Due: ${taka(s.due)}</b>`

    };

}


function renderSearch() {

    const input = $('#q');
    const out = $('#sr');

    if (!input || !out) {
        console.error('Search HTML elements missing.');
        return;
    }

    const original = input.value.trim();

    const q = original.toLowerCase();

    if (q.length < 2) {

        out.innerHTML =
            '<div class="empty">Type at least 2 letters of your name, or your ID.</div>';

        return;
    }

    const hits = STUDENTS

        .filter(s =>
            entered(s) &&
            (
                s.name.toLowerCase().includes(q) ||
                s.id.toLowerCase().includes(q)
            )
        )

        .slice(0, 6);


    if (!hits.length) {

        out.innerHTML = `

            <div class="empty">

                No entry found for “${esc(original)}”.

                Check the spelling or ID — if it’s correct,
                your entry hasn’t been submitted yet.

            </div>

        `;

        return;
    }


    out.innerHTML = hits.map(s => {

        const st = statusOf(s);

        return `

            <div class="hit ${s.full ? 'fullhit' : ''}">

                <div class="who">

                    <b>${esc(s.name || 'Unnamed')}</b>

                    <small>
                        ${s.id ? esc(s.id) + ' · ' : ''}
                        ${s.sem}(${s.sec})
                    </small>

                    <div class="hl">
                        ${st.line}
                    </div>

                </div>

                <span class="chip ${st.chip}">
                    ${st.text}
                </span>

            </div>

        `;

    }).join('');

}


/* ===== MESSAGE DISPLAY ===== */

function showMsg(html, err) {

    const m = $('#msg');

    if (!m) {
        console.error('Missing HTML element: #msg');
        return;
    }

    m.className =
        'glass msg show' + (err ? ' err' : '');

    m.innerHTML = html;

}


/* ===== TOAST NOTIFICATIONS ===== */

function toast(msg) {

    const t = $('#toast');

    if (!t) {
        console.error('Missing HTML element: #toast');
        return;
    }

    t.textContent = msg;

    t.classList.add('show');

    clearTimeout(toast.t);

    toast.t = setTimeout(() => {
        t.classList.remove('show');
    }, 5000);

}


/* ===== CHANGE DETECTION ===== */

let prev = null;


function detectChanges(list) {

    const cur = new Map(
        list.map(s => [
            `${s.sem}${s.sec}-${s.slr}`,
            s
        ])
    );

    if (prev) {

        let p = 0;
        let f = 0;
        let n = 0;

        cur.forEach((s, k) => {

            const o = prev.get(k);

            if (!o) return;

            if (s.full && !o.full) {
                f++;
            }

            else if (s.paid && !o.paid) {
                p++;
            }

            else if (entered(s) && !entered(o)) {
                n++;
            }

        });


        if (f) {

            toast(
                `🎉 ${f} student${f > 1 ? 's' : ''} just reached 100%!`
            );

        }

        else if (p) {

            toast(
                `💸 ${p} new payment${p > 1 ? 's' : ''} recorded`
            );

        }

        else if (n) {

            toast(
                `📝 ${n} new sign-up${n > 1 ? 's' : ''}`
            );

        }

    }

    prev = cur;

}


/* ===== APPLICATION STATE ===== */

const DEMO =
    new URLSearchParams(location.search).has('demo');

let busy = false;


/* ===== REFRESH DASHBOARD ===== */

async function refresh() {

    if (busy) return;

    busy = true;

    const mode = $('#mode');

    try {

        if (!prev && mode) {
            mode.textContent = 'Loading…';
        }

        // Load all semester and section data

        const data = await loadAll(DEMO);

        STUDENTS = data;

        // Render dashboard

        detectChanges(STUDENTS);

        renderSearch();

        renderLeaderboard(STUDENTS);

        renderInterested(STUDENTS);


        // Clear previous error

        const msg = $('#msg');

        if (msg) {
            msg.className = 'glass msg';
            msg.innerHTML = '';
        }


        // Update connection status

        if (mode) {

            mode.textContent = DEMO
                ? 'Demo data'
                : '● Live from sheet';

            mode.className =
                'chip ' + (DEMO ? 'o' : 'c');

        }


        // Update last refresh time

        const upd = $('#upd');

        if (upd) {

            upd.textContent =
                'Updated ' +
                new Date().toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

        }

    }

    catch (e) {

        console.error('Dashboard refresh failed:', e);

        if (mode) {

            mode.textContent = 'Could not load';

            mode.className = 'chip o';

        }

        showMsg(

            `Couldn’t load dashboard: <b>${esc(e.message)}</b>.<br><br>` +

            (
                DEMO
                    ? 'Please check your browser console for the error.'
                    : 'Check Google Sheets sharing permissions: Anyone with the link → Viewer. You can also add <code>?demo</code> to preview with sample data.'
            ),

            true

        );

    }

    finally {

        busy = false;

    }

}


/* ===== INITIALIZE DASHBOARD ===== */

function initDashboard() {

    console.log('Payment Dashboard initialized.');

    console.log('Mode:', DEMO ? 'DEMO' : 'LIVE');

    // Verify required HTML elements

    const required = [
        '#mode',
        '#upd',
        '#msg',
        '#q',
        '#sr',
        '#rf',
        '#lbsub',
        '#lbl',
        '#insub',
        '#inl',
        '#toast'
    ];

    const missing = required.filter(selector => !$(selector));

    if (missing.length) {

        console.error(
            'Missing HTML elements:',
            missing
        );

    }


    // Search listener

    const search = $('#q');

    if (search) {
        search.addEventListener('input', renderSearch);
    }


    // Manual refresh button

    const refreshButton = $('#rf');

    if (refreshButton) {
        refreshButton.addEventListener('click', refresh);
    }


    // Initial load

    refresh();


    // Automatic refresh every 10 seconds

    setInterval(() => {

        if (!document.hidden) {
            refresh();
        }

    }, REFRESH_MS);


    // Refresh when user returns to the tab

    document.addEventListener(
        'visibilitychange',
        () => {

            if (!document.hidden) {
                refresh();
            }

        }
    );

}


/* ===== START APPLICATION ===== */

// Works whether the script loads before or after DOMContentLoaded.

if (document.readyState === 'loading') {

    document.addEventListener(
        'DOMContentLoaded',
        initDashboard,
        { once: true }
    );

}

else {

    initDashboard();

}
