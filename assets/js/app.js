// ── App — state, chart, drip queue, event handlers, boot ─────────────────

// ── Constants ──────────────────────────────────────────────────────────────
const LIVE_POLL_MS          = 2000;          // poll Supabase every 2 s
const DRIP_MS               = 1000;          // release 1 queued point per second
const DATA_WINDOW_MS        = 25 * 3600000;  // 25 h in-memory buffer
const INITIAL_RANGE_MINUTES = 1440;          // show last 24 h on startup
const Y_DEFAULT             = { min: 49.5, max: 50.5 };

// ── App State ──────────────────────────────────────────────────────────────
const state = {
    lang:           'en',
    rangeMinutes:   INITIAL_RANGE_MINUTES,
    allData:        [],       // [{x: epoch_ms, y: hz|null}]
    lastFetched:    null,     // ISO string of newest fetched timestamp
    lastFetchedMs:  null,     // epoch_ms of newest fetched point
    xRange:         null,     // {min, max} epoch_ms  — current viewport
    yRange:         { ...Y_DEFAULT },
    userPanned:     false,    // true = user navigated away from live tail
    userAdjustedY:  false,    // true = keep Y zoom until Reset is pressed
    liveTimer:      null,
};

// ── Drip Queue ─────────────────────────────────────────────────────────────
// Smart drip: if queue is large (backlog) → flush all at once to catch up.
// If queue is small (live) → release one point per second for smooth animation.
const DRIP_CATCHUP_THRESHOLD = 10; // points; above this → instant flush

let dripQueue = [];
let dripTimer = null;

function flushToAllData(pts) {
    for (const pt of pts) state.allData.push(pt);
    // Trim buffer to DATA_WINDOW_MS
    const cutoff = Date.now() - DATA_WINDOW_MS;
    if (state.allData.length > 3000 && state.allData[0].x < cutoff)
        state.allData = state.allData.filter(p => p.x >= cutoff);
}

function dripNextPoint() {
    dripTimer = null;
    if (!dripQueue.length) return;

    if (dripQueue.length > DRIP_CATCHUP_THRESHOLD) {
        // Backlog detected — flush everything at once so chart catches up instantly
        flushToAllData(dripQueue.splice(0));
    } else {
        // Live mode — release one point per second
        flushToAllData([dripQueue.shift()]);
    }

    updateChart({ scaleY: !state.userPanned });

    if (dripQueue.length > 0)
        dripTimer = setTimeout(dripNextPoint, dripQueue.length > DRIP_CATCHUP_THRESHOLD ? 50 : DRIP_MS);
}

function enqueueDrip(points) {
    for (const p of points)
        if (!dripQueue.some(q => q.x === p.x)) dripQueue.push(p);
    if (dripTimer === null && dripQueue.length > 0)
        dripTimer = setTimeout(dripNextPoint, dripQueue.length > DRIP_CATCHUP_THRESHOLD ? 50 : DRIP_MS);
}

// ── Data helpers ───────────────────────────────────────────────────────────
function rowToPoint(r) {
    return {
        x: new Date(r.timestamp).getTime(),
        y: (r.frequency !== null && r.frequency !== undefined)
            ? Number(r.frequency) : null,
    };
}

/** Insert null break-points wherever there is a gap > maxGapMs.
 *  Default: 12 s — catches 2+ missed MCU sends (send interval = 5 s). */
function insertGapNulls(data, maxGapMs = 12000) {
    if (data.length < 2) return data;
    const out = [];
    for (let i = 0; i < data.length; i++) {
        out.push(data[i]);
        if (i < data.length - 1 && (data[i + 1].x - data[i].x) > maxGapMs)
            out.push({ x: data[i + 1].x, y: null });
    }
    return out;
}

// ── Data fetch ─────────────────────────────────────────────────────────────
async function fetchInitialData() {
    const since = new Date(Date.now() - 24 * 3600000).toISOString();
    try {
        const rows = await sbFetchRange(since);
        state.allData = rows.map(rowToPoint);
        if (rows.length > 0) {
            state.lastFetched   = rows[rows.length - 1].timestamp;
            state.lastFetchedMs = new Date(state.lastFetched).getTime();
        }
    } catch (err) {
        console.error('Initial fetch failed:', err);
    }
    updateChart({ scaleY: true });
}

async function fetchNewPoints() {
    if (!state.lastFetched) return;
    try {
        const rows = await sbFetchNew(state.lastFetched);
        if (rows.length > 0) {
            state.lastFetched   = rows[rows.length - 1].timestamp;
            state.lastFetchedMs = new Date(state.lastFetched).getTime();
            enqueueDrip(rows.map(rowToPoint));
        }
    } catch (err) {
        console.error('Poll failed:', err);
    }
    updateDataAge();
}

// ── Chart ──────────────────────────────────────────────────────────────────
const chartCanvas = document.getElementById('frequencyChart');
// ── Custom plugin: 50 Hz nominal line ─────────────────────────────────────
const nominalLinePlugin = {
    id: 'nominalLine',
    afterDraw(c) {
        const { ctx, scales: { x, y } } = c;
        if (!x || !y) return;
        const yPx = y.getPixelForValue(50);
        // Draw only when 50 Hz is inside the visible Y range
        if (yPx < y.top || yPx > y.bottom) return;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x.left,  yPx);
        ctx.lineTo(x.right, yPx);
        ctx.strokeStyle = 'rgba(0, 230, 80, 0.95)';
        ctx.lineWidth   = 1.2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.restore();
    }
};

const chart = new Chart(chartCanvas.getContext('2d'), {
    type: 'line',
    plugins: [nominalLinePlugin],
    data: {
        datasets: [{
            label: i18n.en.dataset,
            data: [],
            borderColor: '#00f7ff',
            backgroundColor: 'rgba(255, 43, 214, 0.12)',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0,
            fill: true,
            spanGaps: false,
            parsing: false,
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'nearest', intersect: false, axis: 'x' },
        layout: { padding: { left: 70, right: 10, top: 6, bottom: 40 } },
        scales: {
            x: {
                type: 'time',
                time: {
                    tooltipFormat: 'yyyy-MM-dd HH:mm:ss',
                    displayFormats: {
                        second: 'HH:mm:ss',
                        minute: 'HH:mm',
                        hour:   'HH:mm',
                        day:    'MMM d',
                    }
                },
                ticks: { color: '#9aa3c7', maxRotation: 0, autoSkipPadding: 20 },
                grid:  { color: 'rgba(0, 247, 255, 0.08)' },
            },
            y: {
                min: Y_DEFAULT.min,
                max: Y_DEFAULT.max,
                ticks: { color: '#9aa3c7', callback: v => v.toFixed(2) },
                grid:  { color: 'rgba(255, 43, 214, 0.08)' },
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(20, 8, 50, 0.95)',
                borderColor:     'rgba(0, 247, 255, 0.4)',
                borderWidth: 1,
                titleColor: '#00f7ff',
                bodyColor:  '#f5f7ff',
                callbacks: {
                    label: ctx => {
                        const v = ctx.parsed.y;
                        const d = Number.isFinite(v) ? v.toFixed(3) : '—';
                        return `${i18n[state.lang].tooltip}: ${d} ${i18n[state.lang].unit}`;
                    }
                }
            },
            zoom: {
                limits: {
                    y: { min: 45, max: 55, minRange: 0.05 },
                    x: { minRange: 15000 },
                },
                pan:  { enabled: false },
                zoom: {
                    wheel:  { enabled: true, speed: 0.1 },
                    pinch:  { enabled: true },
                    drag:   { enabled: false },
                    mode:   'x',
                    onZoomComplete: ({ chart: c }) => {
                        syncAxisState(c);
                        state.userPanned = true;
                        updateStats();
                    }
                }
            }
        }
    }
});
window.chart = chart;

// Patch chart.update to keep axis-overlay buttons aligned
const _origUpdate = chart.update.bind(chart);
chart.update = function(mode) {
    const r = _origUpdate(mode);
    positionAxisControls();
    return r;
};
window.addEventListener('resize', positionAxisControls);

// ── Pan (drag) ─────────────────────────────────────────────────────────────
let isPanning = false, panStartX = 0, panStartRange = null;

chartCanvas.addEventListener('contextmenu', e => e.preventDefault());
chartCanvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const xs = chart.scales.x;
    if (!xs || !Number.isFinite(xs.min)) return;
    isPanning     = true;
    panStartX     = e.clientX;
    panStartRange = { min: Number(xs.min), max: Number(xs.max) };
    chartCanvas.style.cursor = 'grabbing';
    e.preventDefault();
});
window.addEventListener('pointermove', e => {
    if (!isPanning || !panStartRange) return;
    const span  = panStartRange.max - panStartRange.min;
    const shift = ((e.clientX - panStartX) / Math.max(1, chartCanvas.clientWidth)) * span;
    state.xRange    = { min: panStartRange.min - shift, max: panStartRange.max - shift };
    state.userPanned = true;
    applyAxisRanges();
    chart.update('none');
});
function endPan() {
    if (!isPanning) return;
    isPanning = false;
    chartCanvas.style.cursor = 'grab';
    syncAxisState(chart);
    if (state.xRange) { state.userPanned = true; updateStats(); }
}
window.addEventListener('pointerup',     endPan);
window.addEventListener('pointercancel', endPan);
chartCanvas.addEventListener('dragstart', e => e.preventDefault());

// ── Axis helpers ───────────────────────────────────────────────────────────
function syncAxisState(c) {
    const xs = c.scales.x, ys = c.scales.y;
    if (xs && Number.isFinite(xs.min))
        state.xRange = { min: Number(xs.min), max: Number(xs.max) };
    if (ys && Number.isFinite(ys.min))
        state.yRange = { min: Number(ys.min), max: Number(ys.max) };
}

function applyAxisRanges() {
    if (state.xRange) {
        chart.options.scales.x.min = state.xRange.min;
        chart.options.scales.x.max = state.xRange.max;
    } else {
        delete chart.options.scales.x.min;
        delete chart.options.scales.x.max;
    }
    chart.options.scales.y.min = state.yRange.min;
    chart.options.scales.y.max = state.yRange.max;
}

function updateViewport() {
    if (state.userPanned) return;
    const now    = Date.now();
    state.xRange = { min: now - state.rangeMinutes * 60000, max: now };
}

function autoScaleY() {
    const r = state.xRange;
    const pts = r
        ? state.allData.filter(p => p.y !== null && p.x >= r.min && p.x <= r.max)
        : state.allData.filter(p => p.y !== null);
    if (!pts.length) { state.yRange = { ...Y_DEFAULT }; return; }
    const ys   = pts.map(p => p.y);
    // Always include 50 Hz so the nominal line stays visible
    const lo   = Math.min(...ys, 50);
    const hi   = Math.max(...ys, 50);
    const span = Math.max(hi - lo, 0.05);
    state.yRange = { min: lo - span * 0.2, max: hi + span * 0.2 };
}

function positionAxisControls() {
    if (!chart.scales || !chart.scales.y) return;
    const ys  = chart.scales.y, xs = chart.scales.x;
    const dpr = chart.currentDevicePixelRatio || window.devicePixelRatio || 1;
    const cr  = chartCanvas.getBoundingClientRect();
    const wr  = chartCanvas.parentElement.getBoundingClientRect();
    const cL  = cr.left - wr.left, cT = cr.top - wr.top;

    const yEl = chartCanvas.parentElement.querySelector('.chart-axis-y');
    if (yEl) {
        yEl.style.left      = Math.round(cL + (ys.left / dpr) / 2) + 'px';
        yEl.style.top       = Math.round(cT + (ys.top + ys.bottom) / (2 * dpr)) + 'px';
        yEl.style.transform = 'translate(-50%, -50%)';
    }
    const xEl = chartCanvas.parentElement.querySelector('.chart-axis-x');
    if (xEl) {
        xEl.style.left      = Math.round(cL + (xs.left + xs.right) / (2 * dpr)) + 'px';
        xEl.style.top       = Math.round(cT + xs.top + 35) + 'px';
        xEl.style.transform = 'translate(-50%, -100%)';
    }
}

// ── Stats & UI update ──────────────────────────────────────────────────────
function updateStats() {
    const allValid = state.allData.filter(p => p.y !== null);
    const cur      = allValid.length ? allValid[allValid.length - 1].y : null;
    const r        = state.xRange;
    const visible  = r
        ? state.allData.filter(p => p.y !== null && p.x >= r.min && p.x <= r.max)
        : allValid;
    const ys = visible.map(p => p.y);

    document.getElementById('val-current').textContent    = cur !== null ? cur.toFixed(3) : '--';
    document.getElementById('val-min-window').textContent = ys.length ? Math.min(...ys).toFixed(3) : '--';
    document.getElementById('val-max-window').textContent = ys.length ? Math.max(...ys).toFixed(3) : '--';
    document.getElementById('val-points').textContent     = visible.length;

    // Auto-select the closest Range button to the visible span
    if (visible.length >= 2) {
        const spanMin = (Math.max(...visible.map(p => p.x)) - Math.min(...visible.map(p => p.x))) / 60000;
        const opts    = [1, 2, 10, 60, 180, 720, 1440, 2880];
        let best = null, bestDiff = Infinity;
        for (const m of opts) {
            const d = Math.abs(m - spanMin);
            if (d < bestDiff) { bestDiff = d; best = m; }
        }
        if (best !== null && bestDiff <= best * 0.3) {
            state.rangeMinutes = best;
            updateRangeButtons(best);
        }
    }
}

function updateDataAge() {
    if (!state.lastFetchedMs) {
        document.getElementById('val-data-age').textContent = '--';
        return;
    }
    const ageMins = (Date.now() - state.lastFetchedMs) / 60000;
    document.getElementById('val-data-age').textContent = ageMins.toFixed(1);
}

function updateLastUpdated() {
    const locale = state.lang === 'ua' ? 'uk-UA' : 'en-GB';
    const stamp  = new Date().toLocaleTimeString(locale, { hour12: false });
    document.getElementById('last-updated').textContent =
        `${i18n[state.lang].updated}: ${stamp}`;
}

function updateRangeButtons(minutes) {
    document.querySelectorAll('#range-buttons button[data-minutes]').forEach(btn =>
        btn.classList.toggle('active', Number(btn.dataset.minutes) === minutes));
}

function updateChart({ scaleY = false } = {}) {
    chart.data.datasets[0].data = insertGapNulls(state.allData);
    if (!state.userPanned) {
        updateViewport();
        if (scaleY && !state.userAdjustedY) autoScaleY();
    }
    applyAxisRanges();
    chart.update('none');
    updateStats();
    updateLastUpdated();
    updateDataAge();
}

// ── Zoom button logic ──────────────────────────────────────────────────────
function applyZoomButton(axis, direction) {
    const factor = direction === 'in' ? 0.6 : 1.4;
    if (axis === 'y') {
        state.userAdjustedY = true;
        const mid  = (state.yRange.min + state.yRange.max) / 2;
        const half = Math.max(0.025, ((state.yRange.max - state.yRange.min) / 2) * factor);
        state.yRange = { min: mid - half, max: mid + half };
    } else {
        const xs = chart.scales.x;
        if (!xs) return;
        const mid  = (Number(xs.min) + Number(xs.max)) / 2;
        let nMin   = mid - ((Number(xs.max) - Number(xs.min)) / 2) * factor;
        let nMax   = mid + ((Number(xs.max) - Number(xs.min)) / 2) * factor;
        if (nMax - nMin < 15000) {
            const diff = 15000 - (nMax - nMin);
            nMin -= diff / 2; nMax += diff / 2;
        }
        state.xRange     = { min: nMin, max: nMax };
        state.userPanned = true;
    }
    applyAxisRanges();
    chart.update('none');
    updateStats();
}

// ── Language ───────────────────────────────────────────────────────────────
function applyLang(lang) {
    state.lang = lang;
    const t = i18n[lang];
    [
        ['brand-text',    t.brand],
        ['page-title',    t.title],
        ['lbl-current',   t.current],
        ['lbl-min-window',t.minWindow],
        ['lbl-max-window',t.maxWindow],
        ['lbl-points',    t.points],
        ['lbl-data-age',  t.dataAge],
        ['lbl-range',     t.range],
        ['lbl-axis-time', t.axisTime],
        ['lbl-axis-freq', t.axisFreq],
        ['hint-text',     t.hint],
        ['reset-btn',     t.resetZoom],
        ['save-btn',      t.saveCsv],
    ].forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    });
    chart.data.datasets[0].label = t.dataset;
    document.querySelectorAll('.lang-toggle button').forEach(b =>
        b.classList.toggle('active', b.dataset.lang === lang));
}

// ── Event listeners ────────────────────────────────────────────────────────

// Axis ± buttons
document.querySelectorAll('.axis-zoom-btn').forEach(btn =>
    btn.addEventListener('click', () => {
        const z = btn.dataset.zoom;
        if (z === 'y-in')  applyZoomButton('y', 'in');
        if (z === 'y-out') applyZoomButton('y', 'out');
        if (z === 'x-in')  applyZoomButton('x', 'in');
        if (z === 'x-out') applyZoomButton('x', 'out');
    })
);

// Range buttons
document.querySelectorAll('#range-buttons button[data-minutes]').forEach(btn =>
    btn.addEventListener('click', () => {
        state.rangeMinutes = Number(btn.dataset.minutes);
        state.userPanned   = false;
        state.xRange       = null;
        if (!state.userAdjustedY) autoScaleY();
        updateChart();
        updateRangeButtons(state.rangeMinutes);
    })
);

// Reset zoom
document.getElementById('reset-btn').addEventListener('click', () => {
    state.userPanned    = false;
    state.userAdjustedY = false;
    state.xRange        = null;
    state.yRange        = { ...Y_DEFAULT };
    updateChart({ scaleY: true });
    updateRangeButtons(state.rangeMinutes);
});

// Save CSV
document.getElementById('save-btn').addEventListener('click', () => {
    const rows = state.allData
        .filter(p => p.y !== null)
        .map(p => `${new Date(p.x).toISOString()},${p.y}`);
    const blob = new Blob(['timestamp,frequency\n' + rows.join('\n')], { type: 'text/csv' });
    const a    = Object.assign(document.createElement('a'), {
        href:     URL.createObjectURL(blob),
        download: `frequency_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`,
    });
    a.click();
});

// Language toggle
document.querySelectorAll('.lang-toggle button').forEach(btn =>
    btn.addEventListener('click', () => applyLang(btn.dataset.lang)));

// ── Boot ───────────────────────────────────────────────────────────────────
(async function boot() {
    updateRangeButtons(state.rangeMinutes);
    await fetchInitialData();
    state.liveTimer = setInterval(fetchNewPoints, LIVE_POLL_MS);
    requestAnimationFrame(positionAxisControls);
})();
