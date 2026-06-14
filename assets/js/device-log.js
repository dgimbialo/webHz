// ── i18n ──────────────────────────────────────────────────────────────────
const LOG_I18N = {
    en: {
        title:      'Device Log',
        subtitle:   'WiFi & Boot events · esp32_01',
        refresh:    '↻ Refresh',
        back:       '⇦',
        noData:     'No events found.',
        loadErr:    'Failed to load data.',
        colTime:    'Time',
        colEvent:   'Event',
        colDetails: 'Details',
        boot_reason: 'Reset reason',
        disc_uptime: 'Uptime',
        disc_sent:   'Sent',
        conn_outage: 'Outage',
        conn_backlog:'Backlog sent',
        pending:     'pending…',
        smpl:        'samples',
        disclaimer:  'Disclaimer: The data displayed may differ significantly from actual grid frequency values. The measuring instruments and methods used are neither certified nor professionally calibrated. This website is a concept demonstration of IoT data transmission and real-time visualisation only, and is not intended for professional, metrological, or regulatory use.',
    },
    ua: {
        title:      'Лог Пристрою',
        subtitle:   'WiFi & Boot події · esp32_01',
        refresh:    '↻ Оновити',
        back:       '⇦',
        noData:     'Подій не знайдено.',
        loadErr:    'Помилка завантаження даних.',
        colTime:    'Час',
        colEvent:   'Подія',
        colDetails: 'Деталі',
        boot_reason: 'Причина перезапуску',
        disc_uptime: 'Аптайм',
        disc_sent:   'Надіслано',
        conn_outage: 'Тривалість відключення',
        conn_backlog:'Бекло надіслано',
        pending:     'очікує…',
        smpl:        'зразків',
        disclaimer:  'Відмова від відповідальності: Відображені дані можуть суттєво відрізнятися від реальних значень частоти електромережі. Вимірювальні прилади та методи, що використовуються, не є сертифікованими або професійно каліброваними. Цей сайт є виключно демонстрацією концепції передачі IoT-даних і їх відображення в реальному часі та не призначений для професійного, метрологічного або регуляторного використання.',
    },
};

let currentLang = 'en';
let cachedRows  = null;

// ── Helpers ────────────────────────────────────────────────────────────────
const RESET_REASONS = {
    1:'POWERON', 2:'EXT_PIN', 3:'SW_RESTART', 4:'PANIC/CRASH',
    5:'INT_WDT',  6:'TASK_WDT', 7:'WDT', 8:'DEEPSLEEP', 9:'BROWNOUT',
};

function fmtDuration(sec) {
    if (!sec) return '0s';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const parts = [];
    if (h) parts.push(h + 'h');
    if (m) parts.push(m + 'm');
    if (s || !parts.length) parts.push(s + 's');
    return parts.join(' ');
}

function epochToKyiv(epochSec) {
    if (!epochSec) return 'no NTP';
    const d = new Date(epochSec * 1000);
    try {
        return d.toLocaleString('sv-SE', { timeZone: 'Europe/Kiev' })
                .replace('T', ' ') + ' EET';
    } catch {
        return d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    }
}

function buildRow(e, t) {
    const type = (e.event_type || '').toUpperCase();
    let badgeCls = 'evt-boot';
    if (type === 'CONN') badgeCls = 'evt-conn';
    if (type === 'DISC') badgeCls = 'evt-disc';

    let detail = '';
    if (type === 'BOOT') {
        const reason = RESET_REASONS[e.duration_sec] || ('code ' + e.duration_sec);
        detail = `<span class="log-detail">${t.boot_reason}: <strong>${reason}</strong></span>`;
    } else if (type === 'DISC') {
        detail = `<span class="log-detail">
            ${t.disc_uptime}: <strong>${fmtDuration(e.duration_sec)}</strong>
            &nbsp;·&nbsp;
            ${t.disc_sent}: <strong>${(e.samples_sent || 0).toLocaleString()} ${t.smpl}</strong>
        </span>`;
    } else if (type === 'CONN') {
        const bl = e.samples_sent > 0
            ? `<strong>${e.samples_sent.toLocaleString()} ${t.smpl}</strong>`
            : `<em>${t.pending}</em>`;
        detail = `<span class="log-detail">
            ${t.conn_outage}: <strong>${fmtDuration(e.duration_sec)}</strong>
            &nbsp;·&nbsp;
            ${t.conn_backlog}: ${bl}
        </span>`;
    }

    return `<tr>
        <td class="log-ts">${epochToKyiv(e.event_epoch)}</td>
        <td><span class="evt-badge ${badgeCls}">${type}</span></td>
        <td>${detail}</td>
    </tr>`;
}

function renderTable(rows) {
    const t = LOG_I18N[currentLang];
    if (!rows.length) {
        document.getElementById('log-container').innerHTML =
            `<div class="log-status">${t.noData}</div>`;
        return;
    }
    document.getElementById('log-container').innerHTML = `
        <div class="log-table-wrap">
            <table class="log-table">
                <thead>
                    <tr>
                        <th>${t.colTime}</th>
                        <th>${t.colEvent}</th>
                        <th>${t.colDetails}</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(r => buildRow(r, t)).join('')}
                </tbody>
            </table>
        </div>`;
}

// ── Data fetch ─────────────────────────────────────────────────────────────
async function loadLog() {
    document.getElementById('log-container').innerHTML =
        `<div class="log-status" id="log-status">Loading…</div>`;

    try {
        const url = `${SUPABASE_URL}/rest/v1/wifi_event_log?order=event_epoch.desc&limit=200`;
        const resp = await fetch(url, {
            headers: {
                'apikey':        SUPABASE_ANON,
                'Authorization': 'Bearer ' + SUPABASE_ANON,
            }
        });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const rows = await resp.json();
        cachedRows = rows;
        renderTable(rows);
    } catch (err) {
        document.getElementById('log-container').innerHTML =
            `<div class="log-status">${LOG_I18N[currentLang].loadErr} ${err.message}</div>`;
        console.error('Device log fetch failed:', err);
    }
}

// ── i18n apply ─────────────────────────────────────────────────────────────
function applyLang(lang) {
    currentLang = lang;
    const t = LOG_I18N[lang];
    const titleEl = document.getElementById('log-title');
    const subEl   = document.getElementById('log-subtitle');
    const refBtn  = document.getElementById('refresh-btn');
    const backBtn = document.querySelector('.log-back-btn');
    if (titleEl) titleEl.textContent = t.title;
    if (subEl)   subEl.textContent   = t.subtitle;
    if (refBtn)  refBtn.textContent  = t.refresh;
    if (backBtn) backBtn.textContent = t.back;

    document.querySelectorAll('.lang-toggle button').forEach(b =>
        b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false'));
    document.querySelectorAll('.lang-toggle button.active').forEach(b => b.classList.remove('active'));
    const active = document.querySelector(`.lang-toggle button[data-lang="${lang}"]`);
    if (active) active.classList.add('active');

    const disc = document.getElementById('footer-disclaimer');
    if (disc) disc.textContent = t.disclaimer;

    if (cachedRows) renderTable(cachedRows);
}

// ── Boot ───────────────────────────────────────────────────────────────────
(function init() {
    const saved = localStorage.getItem('lang') || 'en';
    applyLang(saved);
    loadLog();

    document.getElementById('refresh-btn').addEventListener('click', loadLog);

    document.querySelectorAll('.lang-toggle button').forEach(btn =>
        btn.addEventListener('click', () => {
            localStorage.setItem('lang', btn.dataset.lang);
            applyLang(btn.dataset.lang);
        })
    );
}());
