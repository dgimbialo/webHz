// ── Device log: WiFi/boot events + crash reports + live device status ──────
// A click (or Enter) on an event opens a dialog with its details and
// context. Crash reports (device_crash_log) are attached to the BOOT event
// they explain; reports that match no BOOT event get their own CRASH row.

// ── i18n ──────────────────────────────────────────────────────────────────
const LOG_I18N = {
    en: {
        brand:        'Frequency Monitor',
        title:        'Device Log',
        subtitle:     'WiFi, boot & crash events · esp32_01',
        refresh:      '↻ Refresh',
        back:         '⇦',
        hint:         'Click an event for details',
        noData:       'No events found.',
        loadErr:      'Failed to load data.',
        colTime:      'Time',
        colEvent:     'Event',
        colDetails:   'Details',
        boot_reason:  'Reset reason',
        disc_uptime:  'Uptime',
        disc_sent:    'Sent',
        conn_outage:  'Outage',
        conn_backlog: 'Backlog sent',
        pending:      'pending…',
        smpl:         'samples',
        reportTag:    'crash report',
        noNtp:        'time unknown',
        // status card
        stTitle:      'Device status',
        stOnline:     'online',
        stOffline:    'offline',
        stUpdated:    'updated',
        stAgo:        'ago',
        stNoData:     'No status reported yet.',
        stFw:         'Firmware',
        stUptime:     'Uptime',
        stRssi:       'WiFi signal',
        stHeap:       'Free heap',
        stHeapMin:    'min',
        stBacklog:    'Unsent samples',
        stFlash:      'Flash queue',
        stLost:       'Lost / rejected',
        stHttp:       'Last HTTP',
        stLastOk:     'Last upload',
        stNtp:        'Clock',
        stNtpOk:      'synced',
        stNtpNo:      'not synced',
        stTls:        'TLS',
        stTlsOk:      'verified',
        stTlsBad:     'UNVERIFIED',
        never:        'never',
        // dialog
        dlgClose:     'Close',
        secEvent:     'Event',
        secContext:   'Context',
        secCrash:     'Crash report',
        secState:     'State 1 s before the crash',
        secDecode:    'Decode',
        fTimeLocal:   'Time (Kyiv)',
        fTimeUtc:     'Time (UTC)',
        fType:        'Type',
        fSlot:        'Log slot',
        fReason:      'Reset reason',
        fMeaning:     'Meaning',
        fPrevBoot:    'Previous boot',
        fRunLen:      'Previous run lasted',
        fSession:     'WiFi session',
        fSent:        'Samples sent',
        fOutage:      'Outage',
        fReconnect:   'Reconnected',
        fDisconnect:  'Disconnected',
        fBacklog:     'Backlog sent after reconnect',
        fReceived:    'Report received',
        fReportedBy:  'Reported by firmware',
        fCrashedFw:   'Crashed firmware',
        fTask:        'Crashed task',
        fException:   'Exception',
        fPc:          'Program counter',
        fFaultAddr:   'Fault address',
        fBacktrace:   'Backtrace',
        fBtCorrupt:   'corrupted',
        fRestartWhy:  'Planned restart reason',
        fDump:        'Core dump',
        fDumpYes:     'found in flash',
        fDumpNo:      'none (no backtrace)',
        fUptime:      'Uptime',
        fHeapFree:    'Free heap',
        fHeapMin:     'Lowest free heap',
        fLargest:     'Largest free block',
        fPending:     'Unsent samples',
        fDropped:     'Lost samples',
        fLastHttp:    'Last HTTP code',
        fStage:       'Network task was doing',
        fKnown:       'Known cause',
        noCrumbs:     'Not available: the crashed firmware did not record its state.',
        noReport:     'No crash report. Firmware before 2026-10-02 did not send reports; the device keeps only the latest core dump.',
        neighbors:    'Nearby events',
        copy:         'Copy',
        copied:       'Copied',
        decodeHint:   'Run in the firmware folder (the ELF is in elf_archive/):',
        bytes:        'bytes',
        none:         '—',
        thisEvent:    'this event',
        disclaimer:   'Disclaimer: The data displayed may differ significantly from actual grid frequency values. The measuring instruments and methods used are neither certified nor professionally calibrated. This website is a concept demonstration of IoT data transmission and real-time visualisation only, and is not intended for professional, metrological, or regulatory use.',
    },
    ua: {
        brand:        'Монітор частоти',
        title:        'Лог Пристрою',
        subtitle:     'WiFi, перезапуски та падіння · esp32_01',
        refresh:      '↻ Оновити',
        back:         '⇦',
        hint:         'Клік по події: деталі',
        noData:       'Подій не знайдено.',
        loadErr:      'Помилка завантаження даних.',
        colTime:      'Час',
        colEvent:     'Подія',
        colDetails:   'Деталі',
        boot_reason:  'Причина перезапуску',
        disc_uptime:  'Аптайм',
        disc_sent:    'Надіслано',
        conn_outage:  'Тривалість відключення',
        conn_backlog: 'Беклог надіслано',
        pending:      'очікує…',
        smpl:         'зразків',
        reportTag:    'звіт про падіння',
        noNtp:        'час невідомий',
        stTitle:      'Стан пристрою',
        stOnline:     'онлайн',
        stOffline:    'офлайн',
        stUpdated:    'оновлено',
        stAgo:        'тому',
        stNoData:     'Пристрій ще не надсилав стан.',
        stFw:         'Прошивка',
        stUptime:     'Аптайм',
        stRssi:       'Сигнал WiFi',
        stHeap:       'Вільна пам\'ять',
        stHeapMin:    'мін',
        stBacklog:    'Невідправлені зразки',
        stFlash:      'Черга у flash',
        stLost:       'Втрачено / відхилено',
        stHttp:       'Останній HTTP',
        stLastOk:     'Остання відправка',
        stNtp:        'Годинник',
        stNtpOk:      'синхронізовано',
        stNtpNo:      'не синхронізовано',
        stTls:        'TLS',
        stTlsOk:      'перевірено',
        stTlsBad:     'БЕЗ ПЕРЕВІРКИ',
        never:        'ще не було',
        dlgClose:     'Закрити',
        secEvent:     'Подія',
        secContext:   'Контекст',
        secCrash:     'Звіт про падіння',
        secState:     'Стан за 1 с до падіння',
        secDecode:    'Розшифровка',
        fTimeLocal:   'Час (Київ)',
        fTimeUtc:     'Час (UTC)',
        fType:        'Тип',
        fSlot:        'Слот журналу',
        fReason:      'Причина перезапуску',
        fMeaning:     'Що це означає',
        fPrevBoot:    'Попередній запуск',
        fRunLen:      'Попередній запуск пропрацював',
        fSession:     'Сесія WiFi',
        fSent:        'Надіслано зразків',
        fOutage:      'Відключення',
        fReconnect:   'Підключився знову',
        fDisconnect:  'Відключився',
        fBacklog:     'Беклог надіслано після підключення',
        fReceived:    'Звіт отримано',
        fReportedBy:  'Надіслала прошивка',
        fCrashedFw:   'Прошивка, що впала',
        fTask:        'Задача, що впала',
        fException:   'Виняток',
        fPc:          'Лічильник команд (PC)',
        fFaultAddr:   'Адреса звернення',
        fBacktrace:   'Backtrace',
        fBtCorrupt:   'пошкоджений',
        fRestartWhy:  'Причина планового перезапуску',
        fDump:        'Дамп ядра',
        fDumpYes:     'знайдено у flash',
        fDumpNo:      'немає (без backtrace)',
        fUptime:      'Аптайм',
        fHeapFree:    'Вільна пам\'ять',
        fHeapMin:     'Мінімум вільної пам\'яті',
        fLargest:     'Найбільший вільний блок',
        fPending:     'Невідправлені зразки',
        fDropped:     'Втрачені зразки',
        fLastHttp:    'Останній HTTP-код',
        fStage:       'Мережева задача виконувала',
        fKnown:       'Відома причина',
        noCrumbs:     'Немає: прошивка, що впала, не записувала свій стан.',
        noReport:     'Звіту немає. Прошивка до 2026-10-02 не надсилала звітів; пристрій зберігає лише останній дамп.',
        neighbors:    'Сусідні події',
        copy:         'Копіювати',
        copied:       'Скопійовано',
        decodeHint:   'Виконати в папці прошивки (ELF лежить в elf_archive/):',
        bytes:        'байт',
        none:         '—',
        thisEvent:    'ця подія',
        disclaimer:   'Відмова від відповідальності: Відображені дані можуть суттєво відрізнятися від реальних значень частоти електромережі. Вимірювальні прилади та методи, що використовуються, не є сертифікованими або професійно каліброваними. Цей сайт є виключно демонстрацією концепції передачі IoT-даних і їх відображення в реальному часі та не призначений для професійного, метрологічного або регуляторного використання.',
    },
};

let currentLang = 'en';
let cache = null;   // { items, status }

// ── Reference data ─────────────────────────────────────────────────────────
const RESET_REASONS = {
    1:'POWERON', 2:'EXT_PIN', 3:'SW_RESTART', 4:'PANIC/CRASH',
    5:'INT_WDT',  6:'TASK_WDT', 7:'WDT', 8:'DEEPSLEEP', 9:'BROWNOUT',
};
const CRASH_CODES = new Set([4, 5, 6, 7, 9]);

const RESET_MEANING = {
    en: {
        1: 'Power was applied (or the board was reset over USB / flashed).',
        2: 'Reset by the external EN pin / reset button.',
        3: 'Software restart: the firmware called ESP.restart() (e.g. the supervisor).',
        4: 'Firmware crashed (exception or abort). A core dump was written to flash.',
        5: 'Interrupt watchdog: an interrupt or critical section blocked the CPU too long.',
        6: 'Task watchdog: a task kept a CPU busy for more than 5 s.',
        7: 'Other watchdog reset.',
        8: 'Wake-up from deep sleep.',
        9: 'Brownout: supply voltage dropped too low.',
    },
    ua: {
        1: 'Подано живлення (або плату скинуто через USB / прошито).',
        2: 'Скидання зовнішнім виводом EN / кнопкою reset.',
        3: 'Програмний перезапуск: прошивка викликала ESP.restart() (наприклад, наглядач).',
        4: 'Прошивка впала (виняток або abort). Дамп ядра записано у flash.',
        5: 'Watchdog переривань: переривання або критична секція надто довго блокували процесор.',
        6: 'Watchdog задач: задача тримала ядро процесора зайнятим понад 5 с.',
        7: 'Інше скидання watchdog.',
        8: 'Пробудження з глибокого сну.',
        9: 'Brownout: напруга живлення просіла надто низько.',
    },
};

// Xtensa EXCCAUSE values that show up in ESP32 crashes
const EXC_CAUSE = {
    0:  { name: 'IllegalInstruction',    en: 'invalid instruction (corrupted code or jump to garbage)', ua: 'недійсна інструкція (пошкоджений код або перехід у сміття)' },
    2:  { name: 'InstructionFetchError', en: 'could not fetch the next instruction', ua: 'не вдалося прочитати наступну інструкцію' },
    3:  { name: 'LoadStoreError',        en: 'invalid memory access width/region', ua: 'недопустимий доступ до пам\'яті' },
    6:  { name: 'IntegerDivideByZero',   en: 'integer division by zero', ua: 'цілочисельне ділення на нуль' },
    9:  { name: 'LoadStoreAlignment',    en: 'unaligned memory access', ua: 'невирівняний доступ до пам\'яті' },
    20: { name: 'InstFetchProhibited',   en: 'jump to an invalid address (bad function pointer)', ua: 'перехід за недійсною адресою (поганий вказівник на функцію)' },
    28: { name: 'LoadProhibited',        en: 'read from an invalid address (e.g. a NULL pointer)', ua: 'читання з недійсної адреси (наприклад, NULL-вказівник)' },
    29: { name: 'StoreProhibited',       en: 'write to an invalid address (e.g. a NULL pointer)', ua: 'запис за недійсною адресою (наприклад, NULL-вказівник)' },
};

// Backtraces already decoded offline with the matching ELF (key: firmware sha + PC)
const KNOWN_DECODES = {
    'f4d685499e6d2438:0x400ff8dc': {
        en: 'lwIP DNS retry timer: udp_sendto() in dns_send() ← dns_check_entry() ← dns_tmr() ← tcpip_thread. '
          + 'A crash inside the ESP-IDF network stack while a DNS query was being retransmitted. The old firmware '
          + 'did a DNS lookup every minute (NTPClient) and opened a new HTTPS connection every 5 s; the new one does '
          + 'about 100x fewer lookups.',
        ua: 'Таймер повторного DNS-запиту в lwIP: udp_sendto() у dns_send() ← dns_check_entry() ← dns_tmr() ← tcpip_thread. '
          + 'Падіння всередині мережевого стека ESP-IDF під час повторної відправки DNS-запиту. Стара прошивка робила '
          + 'DNS-запит щохвилини (NTPClient) і нове HTTPS-з\'єднання кожні 5 с; нова робить таких запитів приблизно у 100 разів менше.',
    },
};

const STAGES = {
    en: { idle: 'idle', crash_report: 'sending a crash report', wlog: 'sending the WiFi log', status: 'sending device status', upload: 'uploading samples' },
    ua: { idle: 'нічого (очікування)', crash_report: 'відправку звіту про падіння', wlog: 'відправку журналу WiFi', status: 'відправку стану пристрою', upload: 'відправку зразків' },
};

// ── Helpers ────────────────────────────────────────────────────────────────
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmtDuration(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const parts = [];
    if (d) parts.push(d + 'd');
    if (h) parts.push(h + 'h');
    if (m) parts.push(m + 'm');
    if (s || !parts.length) parts.push(s + 's');
    return parts.slice(0, 3).join(' ');
}

const KYIV_TZ = (() => {
    for (const tz of ['Europe/Kyiv', 'Europe/Kiev']) {
        try { new Intl.DateTimeFormat('en', { timeZone: tz }); return tz; } catch { /* try next */ }
    }
    return 'UTC';
})();

function fmtKyiv(ms) {
    if (!ms) return LOG_I18N[currentLang].noNtp;
    const d = new Date(ms);
    const base = d.toLocaleString('sv-SE', { timeZone: KYIV_TZ, hour12: false });
    let off = '';
    try {
        off = new Intl.DateTimeFormat('en-US', { timeZone: KYIV_TZ, timeZoneName: 'shortOffset' })
            .formatToParts(d).find(p => p.type === 'timeZoneName')?.value || '';
    } catch { /* older browsers */ }
    return `${base} ${off}`.trim();
}

const fmtUtc   = ms => ms ? new Date(ms).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC') : '';
const fmtNum   = n => (n ?? 0).toLocaleString();
const fmtBytes = n => n >= 1024 ? (n / 1024).toFixed(1) + ' KB' : (n ?? 0) + ' B';

function reasonName(code) { return RESET_REASONS[code] || ('code ' + code); }

function kv(label, value) {
    return `<div class="dl-kv"><span class="dl-k">${esc(label)}</span><span class="dl-v">${value}</span></div>`;
}

// ── Data model ─────────────────────────────────────────────────────────────
// items: newest first, each { kind: 'BOOT'|'DISC'|'CONN'|'CRASH', ts (ms|0), e?, c? }
function buildItems(events, crashes) {
    const items = events.map(e => ({
        kind: (e.event_type || '').toUpperCase(),
        ts:   e.event_epoch ? e.event_epoch * 1000 : 0,
        e,
    }));
    items.sort((a, b) => b.ts - a.ts);

    // Attach each crash report to the BOOT it explains: the latest boot with a
    // crash (or, for planned restarts, software) reset reason at or before the
    // moment the report arrived. A stale dump reported after a later POWERON
    // still lands on the PANIC boot it came from.
    const boots = items.filter(it => it.kind === 'BOOT' && it.ts);
    const sortedCrashes = [...crashes].sort((a, b) => Date.parse(b.received_at) - Date.parse(a.received_at));
    for (const c of sortedCrashes) {
        const rcv = Date.parse(c.received_at);
        const wanted = c.restart_why ? new Set([3]) : CRASH_CODES;
        const boot = boots.find(b => !b.c && b.ts <= rcv && wanted.has(b.e.duration_sec));
        if (boot) boot.c = c;
        else items.push({ kind: 'CRASH', ts: rcv, c });
    }
    items.sort((a, b) => b.ts - a.ts);
    return items;
}

// ── Status card ────────────────────────────────────────────────────────────
function renderStatus(st) {
    const t = LOG_I18N[currentLang];
    const el = document.getElementById('status-card');
    if (!st) { el.innerHTML = `<div class="dl-status-empty">${t.stNoData}</div>`; return; }

    const ageSec  = (Date.now() - Date.parse(st.updated_at)) / 1000;
    const online  = ageSec < 180;
    const lastOk  = st.last_ok_age_sec == null || st.last_ok_age_sec < 0
        ? t.never : `${fmtDuration(st.last_ok_age_sec)} ${t.stAgo}`;
    const cells = [
        [t.stFw,      `<code>${esc(st.fw)}</code>`],
        [t.stUptime,  fmtDuration(st.uptime_sec)],
        [t.stRssi,    `${esc(st.rssi)} dBm`],
        [t.stHeap,    `${fmtBytes(st.free_heap)} <span class="dl-dim">(${t.stHeapMin} ${fmtBytes(st.min_free_heap)})</span>`],
        [t.stBacklog, fmtNum(st.backlog)],
        [t.stFlash,   st.flash_ok === false ? '<span class="dl-bad">FAILED</span>' : fmtBytes(st.flash_bytes)],
        [t.stLost,    `${fmtNum(st.dropped)} / ${fmtNum(st.rejected)}`],
        [t.stHttp,    `<span class="${st.last_http === 201 || st.last_http === 200 ? 'dl-ok' : 'dl-bad'}">${esc(st.last_http)}</span>`],
        [t.stLastOk,  lastOk],
        [t.stNtp,     st.time_synced ? t.stNtpOk : `<span class="dl-bad">${t.stNtpNo}</span>`],
        [t.stTls,     st.tls_insecure ? `<span class="dl-bad">${t.stTlsBad}</span>` : t.stTlsOk],
    ];
    el.innerHTML = `
        <div class="dl-status-head">
            <span class="dl-status-title">${t.stTitle}</span>
            <span class="dl-pill ${online ? 'dl-pill-on' : 'dl-pill-off'}">${online ? t.stOnline : t.stOffline}</span>
            <span class="dl-dim">${t.stUpdated} ${fmtDuration(ageSec)} ${t.stAgo}</span>
        </div>
        <div class="dl-status-grid">
            ${cells.map(([k, v]) => `<div class="dl-cell"><span class="dl-k">${esc(k)}</span><span class="dl-v">${v}</span></div>`).join('')}
        </div>`;
}

// ── Table ──────────────────────────────────────────────────────────────────
function rowDetail(it, t) {
    const e = it.e;
    if (it.kind === 'BOOT') {
        const tag = it.c ? ` <span class="dl-report-tag">🩺 ${t.reportTag}</span>` : '';
        return `${t.boot_reason}: <strong>${esc(reasonName(e.duration_sec))}</strong>${tag}`;
    }
    if (it.kind === 'DISC') {
        return `${t.disc_uptime}: <strong>${fmtDuration(e.duration_sec)}</strong> &nbsp;·&nbsp;
                ${t.disc_sent}: <strong>${fmtNum(e.samples_sent)} ${t.smpl}</strong>`;
    }
    if (it.kind === 'CONN') {
        const bl = e.samples_sent > 0 ? `<strong>${fmtNum(e.samples_sent)} ${t.smpl}</strong>` : `<em>${t.pending}</em>`;
        return `${t.conn_outage}: <strong>${fmtDuration(e.duration_sec)}</strong> &nbsp;·&nbsp; ${t.conn_backlog}: ${bl}`;
    }
    // standalone crash report
    const c = it.c;
    const cause = EXC_CAUSE[c.exc_cause];
    return `${t.fTask}: <strong>${esc(c.exc_task || '?')}</strong>`
         + (c.dump_found ? ` &nbsp;·&nbsp; <strong>${esc(cause ? cause.name : 'EXCCAUSE ' + c.exc_cause)}</strong>` : '')
         + (c.restart_why ? ` &nbsp;·&nbsp; ${esc(c.restart_why)}` : '');
}

function badgeClass(kind) {
    return { BOOT: 'evt-boot', CONN: 'evt-conn', DISC: 'evt-disc', CRASH: 'evt-crash' }[kind] || 'evt-boot';
}

function renderTable() {
    const t = LOG_I18N[currentLang];
    const items = cache.items;
    const container = document.getElementById('log-container');
    if (!items.length) { container.innerHTML = `<div class="log-status">${t.noData}</div>`; return; }

    container.innerHTML = `
        <div class="log-table-wrap">
            <table class="log-table">
                <thead><tr><th>${t.colTime}</th><th>${t.colEvent}</th><th>${t.colDetails}</th></tr></thead>
                <tbody>
                    ${items.map((it, i) => {
                        const crashed = it.kind === 'CRASH' || (it.kind === 'BOOT' && CRASH_CODES.has(it.e.duration_sec));
                        return `<tr class="dl-row${crashed ? ' dl-row-crash' : ''}" tabindex="0" data-idx="${i}">
                            <td class="log-ts">${esc(fmtKyiv(it.ts))}</td>
                            <td><span class="evt-badge ${badgeClass(it.kind)}">${it.kind}</span></td>
                            <td><span class="log-detail">${rowDetail(it, t)}</span></td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
}

// ── Dialog ─────────────────────────────────────────────────────────────────
function neighborsHtml(idx, t) {
    const items = cache.items;
    const from = Math.max(0, idx - 3), to = Math.min(items.length, idx + 4);
    const rows = [];
    for (let i = from; i < to; i++) {
        const it = items[i];
        const self = i === idx;
        rows.push(`<button type="button" class="dl-nb${self ? ' dl-nb-self' : ''}" data-idx="${i}" ${self ? 'disabled' : ''}>
            <span class="evt-badge ${badgeClass(it.kind)}">${it.kind}</span>
            <span class="dl-nb-time">${esc(fmtKyiv(it.ts))}</span>
            <span class="dl-dim">${self ? t.thisEvent : ''}</span>
        </button>`);
    }
    return `<div class="dl-nbs">${rows.join('')}</div>`;
}

// Closest older / newer item of a kind, relative to idx (items are newest first)
function findOlder(idx, kind)  { for (let i = idx + 1; i < cache.items.length; i++) if (cache.items[i].kind === kind) return cache.items[i]; return null; }
function findNewer(idx, kind)  { for (let i = idx - 1; i >= 0; i--) if (cache.items[i].kind === kind) return cache.items[i]; return null; }

function eventSection(it, idx, t) {
    const e = it.e;
    let html = kv(t.fTimeLocal, esc(fmtKyiv(it.ts))) + kv(t.fTimeUtc, esc(fmtUtc(it.ts) || t.none));
    if (!e) return html;
    html += kv(t.fSlot, esc(e.slot));

    if (it.kind === 'BOOT') {
        const code = e.duration_sec;
        html += kv(t.fReason, `<strong>${esc(reasonName(code))}</strong> <span class="dl-dim">(${esc(code)})</span>`);
        html += kv(t.fMeaning, esc(RESET_MEANING[currentLang][code] || t.none));
        const prev = findOlder(idx, 'BOOT');
        if (prev) {
            html += kv(t.fPrevBoot, `${esc(fmtKyiv(prev.ts))} · ${esc(reasonName(prev.e.duration_sec))}`);
            if (prev.ts && it.ts) html += kv(t.fRunLen, fmtDuration((it.ts - prev.ts) / 1000));
        }
    } else if (it.kind === 'DISC') {
        html += kv(t.fSession, fmtDuration(e.duration_sec));
        html += kv(t.fSent, `${fmtNum(e.samples_sent)} ${t.smpl}`);
        const conn = findNewer(idx, 'CONN');
        if (conn) html += kv(t.fReconnect, `${esc(fmtKyiv(conn.ts))} · ${t.fOutage} ${fmtDuration(conn.e.duration_sec)}`);
    } else if (it.kind === 'CONN') {
        html += kv(t.fOutage, fmtDuration(e.duration_sec));
        html += kv(t.fBacklog, e.samples_sent > 0 ? `${fmtNum(e.samples_sent)} ${t.smpl}` : t.pending);
        const disc = findOlder(idx, 'DISC');
        if (disc) html += kv(t.fDisconnect, `${esc(fmtKyiv(disc.ts))} · ${t.fSession} ${fmtDuration(disc.e.duration_sec)}`);
    }
    return html;
}

function crashSection(c, t) {
    const cause = EXC_CAUSE[c.exc_cause];
    const known = KNOWN_DECODES[`${c.app_elf_sha}:${c.exc_pc}`];
    let html = kv(t.fReceived, esc(fmtKyiv(Date.parse(c.received_at))));
    if (c.restart_why) html += kv(t.fRestartWhy, `<strong>${esc(c.restart_why)}</strong>`);
    html += kv(t.fDump, c.dump_found ? t.fDumpYes : t.fDumpNo);
    if (c.dump_found) {
        html += kv(t.fTask, `<code>${esc(c.exc_task)}</code>`);
        html += kv(t.fException, cause
            ? `<strong>${esc(cause.name)}</strong> <span class="dl-dim">(${esc(c.exc_cause)})</span>: ${esc(cause[currentLang])}`
            : `EXCCAUSE ${esc(c.exc_cause)}`);
        html += kv(t.fPc, `<code>${esc(c.exc_pc)}</code>`);
        html += kv(t.fFaultAddr, `<code>${esc(c.exc_vaddr)}</code>`);
        html += kv(t.fBacktrace, `<code class="dl-bt">${esc(c.backtrace)}</code>`
            + (c.bt_corrupted ? ` <span class="dl-bad">${t.fBtCorrupt}</span>` : ''));
        if (known) html += kv(t.fKnown, esc(known[currentLang]));
    }
    html += kv(t.fCrashedFw, `<code>${esc(c.app_elf_sha || t.none)}</code>`);
    html += kv(t.fReportedBy, `<code>${esc(c.running_fw || t.none)}</code>`);
    return html;
}

function stateSection(c, t) {
    if (!c.crumbs_valid) return `<p class="dl-dim">${t.noCrumbs}</p>`;
    return kv(t.fUptime, fmtDuration(c.uptime_sec))
         + kv(t.fHeapFree, `${fmtNum(c.free_heap)} ${t.bytes}`)
         + kv(t.fHeapMin, `${fmtNum(c.min_free_heap)} ${t.bytes}`)
         + kv(t.fLargest, `${fmtNum(c.largest_block)} ${t.bytes}`)
         + kv(t.fPending, fmtNum(c.pending))
         + kv(t.fDropped, fmtNum(c.dropped))
         + kv(t.fLastHttp, esc(c.last_http))
         + kv(t.fStage, esc(STAGES[currentLang][c.stage] || c.stage || t.none));
}

function decodeSection(c, t) {
    const cmd = `~/.platformio/packages/toolchain-xtensa-esp32/bin/xtensa-esp32-elf-addr2line -pfiaC -e elf_archive/${c.app_elf_sha}.elf ${c.backtrace}`;
    return `<p class="dl-dim">${t.decodeHint}</p>
            <div class="dl-cmd"><code>${esc(cmd)}</code>
            <button type="button" class="dl-copy" data-copy="${esc(cmd)}">${t.copy}</button></div>`;
}

function openDetails(idx) {
    const t = LOG_I18N[currentLang];
    const it = cache.items[idx];
    if (!it) return;
    const c = it.c;

    let body = `<section><h3>${t.secEvent}</h3>${eventSection(it, idx, t)}</section>`;
    if (c) {
        body += `<section><h3>${t.secCrash}</h3>${crashSection(c, t)}</section>`;
        body += `<section><h3>${t.secState}</h3>${stateSection(c, t)}</section>`;
        if (c.dump_found && c.backtrace) body += `<section><h3>${t.secDecode}</h3>${decodeSection(c, t)}</section>`;
    } else if (it.kind === 'BOOT' && CRASH_CODES.has(it.e.duration_sec)) {
        body += `<section><h3>${t.secCrash}</h3><p class="dl-dim">${t.noReport}</p></section>`;
    }
    body += `<section><h3>${t.secContext}</h3><p class="dl-dim">${t.neighbors}</p>${neighborsHtml(idx, t)}</section>`;

    const dlg = document.getElementById('evt-dialog');
    dlg.querySelector('.dl-dlg-title').innerHTML =
        `<span class="evt-badge ${badgeClass(it.kind)}">${it.kind}</span> <span>${esc(fmtKyiv(it.ts))}</span>`;
    dlg.querySelector('.dl-dlg-body').innerHTML = body;
    dlg.querySelector('.dl-dlg-close').setAttribute('aria-label', t.dlgClose);
    dlg.querySelector('.dl-dlg-body').scrollTop = 0;
    if (!dlg.open) dlg.showModal();
}

// ── Data fetch ─────────────────────────────────────────────────────────────
async function sbGet(path) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON },
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return resp.json();
}

async function loadLog() {
    document.getElementById('log-container').innerHTML = `<div class="log-status">Loading…</div>`;
    try {
        // Crash log and status are optional: the event log still renders without them
        const [events, crashes, status] = await Promise.all([
            sbGet('wifi_event_log?order=event_epoch.desc&limit=200'),
            sbGet('device_crash_log?order=received_at.desc&limit=100').catch(() => []),
            sbGet('device_status?device_id=eq.esp32_01').catch(() => []),
        ]);
        cache = { items: buildItems(events, crashes), status: status[0] || null };
        renderStatus(cache.status);
        renderTable();
    } catch (err) {
        document.getElementById('log-container').innerHTML =
            `<div class="log-status">${LOG_I18N[currentLang].loadErr} ${esc(err.message)}</div>`;
        console.error('Device log fetch failed:', err);
    }
}

// ── i18n apply ─────────────────────────────────────────────────────────────
function applyLang(lang) {
    currentLang = LOG_I18N[lang] ? lang : 'en';
    const t = LOG_I18N[currentLang];
    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    set('log-title', t.title);
    set('log-subtitle', t.subtitle);
    set('refresh-btn', t.refresh);
    set('brand-text', t.brand);
    set('log-hint', t.hint);
    const backArrow = document.querySelector('.back-arrow-symbol');
    if (backArrow) backArrow.textContent = t.back;

    document.querySelectorAll('.lang-toggle button').forEach(b => {
        const on = b.dataset.lang === currentLang;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.classList.toggle('active', on);
    });
    const disc = document.getElementById('footer-disclaimer');
    if (disc) disc.textContent = t.disclaimer;

    if (cache) {
        renderStatus(cache.status);
        renderTable();
        const dlg = document.getElementById('evt-dialog');
        if (dlg.open && dlg.dataset.idx) openDetails(Number(dlg.dataset.idx));
    }
}

// ── Boot ───────────────────────────────────────────────────────────────────
(function init() {
    let saved = 'en';
    try { saved = localStorage.getItem('lang') || 'en'; } catch { /* storage blocked */ }
    applyLang(saved);
    loadLog();

    document.getElementById('refresh-btn').addEventListener('click', loadLog);
    document.querySelectorAll('.lang-toggle button').forEach(btn =>
        btn.addEventListener('click', () => {
            try { localStorage.setItem('lang', btn.dataset.lang); } catch { /* ignore */ }
            applyLang(btn.dataset.lang);
        }));

    // Rows: a click or Enter opens the details dialog
    const container = document.getElementById('log-container');
    let openedAt = 0;
    const open = row => {
        const idx = Number(row.dataset.idx);
        const dlg = document.getElementById('evt-dialog');
        if (!dlg.open) openedAt = performance.now();
        dlg.dataset.idx = idx;
        openDetails(idx);
    };
    container.addEventListener('click', ev => {
        const row = ev.target.closest('tr.dl-row');
        if (row) open(row);
    });
    container.addEventListener('keydown', ev => {
        const row = ev.target.closest('tr.dl-row');
        if (row && ev.key === 'Enter') open(row);
    });

    // Dialog: close button, backdrop click, neighbor navigation, copy buttons
    const dlg = document.getElementById('evt-dialog');
    dlg.querySelector('.dl-dlg-close').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', ev => {
        if (ev.target === dlg) {                                  // backdrop
            // A habitual double-click on a row: its 2nd click lands here, keep it open
            if (performance.now() - openedAt > 400) dlg.close();
            return;
        }
        const nb = ev.target.closest('.dl-nb');
        if (nb && !nb.disabled) {
            dlg.dataset.idx = nb.dataset.idx;
            openDetails(Number(nb.dataset.idx));
            return;
        }
        const cp = ev.target.closest('.dl-copy');
        if (cp) {
            navigator.clipboard?.writeText(cp.dataset.copy).then(() => {
                cp.textContent = LOG_I18N[currentLang].copied;
                setTimeout(() => { cp.textContent = LOG_I18N[currentLang].copy; }, 1500);
            });
        }
    });
}());
