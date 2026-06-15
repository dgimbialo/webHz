// ── App — state, chart, drip queue, event handlers, boot ─────────────────

// ── Constants ──────────────────────────────────────────────────────────────
const LIVE_POLL_MS          = 2000;          // poll Supabase every 2 s
const DRIP_MS               = 1000;          // release 1 queued point per second
const DATA_WINDOW_MS        = 49 * 3600000;  // 49 h in-memory buffer (covers 48 h display)
const INITIAL_RANGE_MINUTES = 2;             // show last 2 min on startup
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
    backfilling:    false,    // true = on-demand fetch in progress
    liveTimer:      null,
};

// ── Drip Queue ─────────────────────────────────────────────────────────────
// Live mode: release one valid point per second for smooth animation.
// Stale fallback: if the oldest queued point is > DRIP_STALE_MS old,
// flush the entire queue instantly so the chart catches up.
const DRIP_STALE_MS = 15000; // ms; points older than this are batch-flushed

let dripQueue = [];
let dripTimer = null;

function flushToAllData(pts) {
    const now = Date.now();
    for (const pt of pts) {
        if (pt.x > 0 && pt.x <= now + 60000) state.allData.push(pt);
    }
    // Trim buffer to DATA_WINDOW_MS
    const cutoff = now - DATA_WINDOW_MS;
    if (state.allData.length > 3000 && state.allData[0].x < cutoff)
        state.allData = state.allData.filter(p => p.x >= cutoff);
}

function dripNextPoint() {
    dripTimer = null;
    if (!dripQueue.length) return;

    // If the oldest queued point has gone stale, flush all at once to catch up
    if (Date.now() - dripQueue[0].x > DRIP_STALE_MS) {
        flushToAllData(dripQueue.splice(0));
    } else {
        flushToAllData([dripQueue.shift()]);
    }

    updateChart({ scaleY: !state.userPanned });

    if (dripQueue.length > 0)
        dripTimer = setTimeout(dripNextPoint, DRIP_MS);
}

function enqueueDrip(points) {
    const now = Date.now();
    for (const p of points) {
        // Only enqueue valid timestamps — skip corrupted future rows
        if (p.x > 0 && p.x <= now + 60000 && !dripQueue.some(q => q.x === p.x))
            dripQueue.push(p);
    }
    if (dripTimer === null && dripQueue.length > 0)
        dripTimer = setTimeout(dripNextPoint, DRIP_MS);
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
function insertGapNulls(data, maxGapMs = 5000) {
    if (data.length < 2) return data;
    const out = [];
    for (let i = 0; i < data.length; i++) {
        out.push(data[i]);
        if (i < data.length - 1 && (data[i + 1].x - data[i].x) > maxGapMs)
            out.push({ x: data[i + 1].x, y: null });
    }
    return out;
}

// ── Backfill overlay ────────────────────────────────────────────────────────
const SPINNER_C = 138.23;   // 2π × r=22

function showBackfillOverlay() {
    const el = document.getElementById('backfill-overlay');
    if (!el) return;
    el.classList.remove('is-indeterminate');
    el.hidden = false;
}

function updateBackfillProgress(pct) {
    const arc   = document.getElementById('backfill-arc');
    const label = document.getElementById('backfill-label');
    if (arc)   arc.style.strokeDashoffset = (SPINNER_C * (1 - pct / 100)).toFixed(2);
    if (label) label.textContent = i18n[state.lang].loading + '… ' + Math.round(pct) + '%';
}

function hideBackfillOverlay() {
    const el = document.getElementById('backfill-overlay');
    if (el) el.hidden = true;
}

// ── Data fetch ─────────────────────────────────────────────────────────────

async function fetchInitialData() {
    const overlay = document.getElementById('backfill-overlay');
    const label   = document.getElementById('backfill-label');
    if (overlay) { overlay.classList.add('is-indeterminate'); overlay.hidden = false; }
    if (label)   label.textContent = i18n[state.lang].loading + '…';

    // ── Phase 1: load IndexedDB cache (instant, no network) ──────────────────
    try {
        const cached = await cacheRead(Date.now() - DATA_WINDOW_MS);
        const now = Date.now();
        const validCached = cached.filter(p => p.x > 0 && p.x <= now + 60000);
        if (validCached.length > 0) {
            // IndexedDB returns in key (x) order — already sorted ASC
            state.allData       = validCached;
            state.lastFetched   = new Date(validCached[validCached.length - 1].x).toISOString();
            state.lastFetchedMs = validCached[validCached.length - 1].x;
            updateChart({ scaleY: true });   // render cached data immediately
        }
    } catch (e) { console.warn('Cache read failed:', e); }

    // ── Phase 2: fetch only the delta from Supabase ───────────────────────────
    try {
        if (state.lastFetched) {
            // Cache exists — paginated catch-up for all new rows since last cached point
            const PAGE = 1000;
            let allNew = [];
            for (let offset = 0; ; offset += PAGE) {
                const rows = await sbFetchNew(state.lastFetched, PAGE, offset);
                if (!rows.length) break;
                allNew = allNew.concat(rows);
                if (rows.length < PAGE) break;
            }
            if (allNew.length > 0) {
                const pts = allNew.map(rowToPoint);
                flushToAllData(pts);
                const nowCatchup = Date.now();
                let lastValidCatchup = null;
                for (const p of pts) { if (p.x > 0 && p.x <= nowCatchup + 60000) lastValidCatchup = p; }
                if (lastValidCatchup) {
                    state.lastFetched   = new Date(lastValidCatchup.x).toISOString();
                    state.lastFetchedMs = lastValidCatchup.x;
                }
                cacheWrite(pts.filter(p => p.x > 0 && p.x <= nowCatchup + 60000)).catch(console.warn);
            }
        } else {
            // No cache — first visit: fetch the most recent 1 000 rows
            const recent = await sbFetchRecent(1000);
            recent.reverse();
            const pts = recent.map(rowToPoint);
            state.allData = pts;
            if (pts.length > 0) {
                const nowRecent = Date.now();
                let lastValidRecent = null;
                for (const p of pts) { if (p.x > 0 && p.x <= nowRecent + 60000) lastValidRecent = p; }
                if (lastValidRecent) {
                    state.lastFetched   = new Date(lastValidRecent.x).toISOString();
                    state.lastFetchedMs = lastValidRecent.x;
                }
                cacheWrite(pts.filter(p => p.x > 0 && p.x <= nowRecent + 60000)).catch(console.warn);
            }
        }
    } catch (err) { console.error('Initial fetch failed:', err); }

    updateChart({ scaleY: true });
    cachePrune(Date.now() - DATA_WINDOW_MS);
    // Overlay stays — hides on first fetchNewPoints tick (auto-scroll confirmed active).
}

// Fetch historical data on demand when the viewport left edge moves past
// what is already loaded. Adds a lookahead buffer so small scrolls don't
// immediately trigger another request.
async function ensureDataCoverage(viewportMinMs) {
    if (state.backfilling) return;

    let oldestLoaded = state.allData.length > 0 ? state.allData[0].x : Date.now();
    const HARD_LIMIT = Date.now() - DATA_WINDOW_MS;

    if (viewportMinMs >= oldestLoaded || oldestLoaded <= HARD_LIMIT + 60000) return;

    const visibleSpan = state.xRange
        ? (state.xRange.max - state.xRange.min)
        : state.rangeMinutes * 60000;
    const buffer    = Math.min(visibleSpan * 0.5, 30 * 60000);
    const fetchFrom = Math.max(HARD_LIMIT, viewportMinMs - buffer);

    // ── Step 1: serve from IndexedDB cache ───────────────────────────────────
    try {
        const cached = await cacheReadRange(fetchFrom, oldestLoaded);
        if (cached.length > 0) {
            state.allData = cached.concat(state.allData);
            oldestLoaded  = state.allData[0].x;
            updateChart();
            if (oldestLoaded <= viewportMinMs) return;  // cache fully covered
        }
    } catch (e) { console.warn('Cache range read failed:', e); }

    // ── Step 2: fetch uncovered range from Supabase ──────────────────────────
    if (oldestLoaded <= viewportMinMs) return;

    const since      = new Date(fetchFrom).toISOString();
    const until      = new Date(oldestLoaded).toISOString();
    const totalRange = oldestLoaded - fetchFrom;
    const PAGE       = 1000;
    let   prepend    = [];

    state.backfilling = true;
    showBackfillOverlay();
    updateBackfillProgress(0);

    // Cursor-based pagination — O(1) per page (index seek to last timestamp).
    // Offset-based is O(N) per page and becomes very slow for 12h/24h/48h ranges.
    let cursorTs = since;
    try {
        for (;;) {
            const rows = await sbFetchRange(cursorTs, PAGE, 0, until);
            if (!rows.length) break;
            prepend = prepend.concat(rows);
            cursorTs = rows[rows.length - 1].timestamp;

            const lastTs = new Date(cursorTs).getTime();
            updateBackfillProgress(Math.min(99, ((lastTs - fetchFrom) / totalRange) * 100));

            if (rows.length < PAGE) break;
        }
    } catch (err) {
        console.error('On-demand fetch failed:', err);
        hideBackfillOverlay();
        state.backfilling = false;
        return;
    }

    hideBackfillOverlay();
    state.backfilling = false;

    if (prepend.length) {
        const newPts = prepend.map(rowToPoint);
        state.allData = newPts.concat(state.allData);
        cacheWrite(newPts).catch(console.warn);
        updateChart();
    }

    // If the user changed the range while this backfill was running (e.g. 24h→48h),
    // the 48h request was skipped (backfilling=true guard). Re-check now,
    // but only if the viewport actually needs older data than what's loaded.
    const reCheckMin = state.xRange
        ? state.xRange.min
        : Date.now() - state.rangeMinutes * 60000;
    const oldestNow = state.allData.length > 0 ? state.allData[0].x : Date.now();
    if (reCheckMin < oldestNow) {
        ensureDataCoverage(reCheckMin);
    }
}

async function fetchNewPoints() {
    if (!state.lastFetched) return;
    try {
        const rows = await sbFetchNew(state.lastFetched);
        if (rows.length > 0) {
            const pts = rows.map(rowToPoint);
            const nowPoll = Date.now();
            let lastValidPoll = null;
            for (const p of pts) { if (p.x > 0 && p.x <= nowPoll + 60000) lastValidPoll = p; }
            if (lastValidPoll) {
                state.lastFetched   = new Date(lastValidPoll.x).toISOString();
                state.lastFetchedMs = lastValidPoll.x;
            }

            // Only process valid timestamps; corrupted future rows are skipped here
            // (enqueueDrip also guards, but batched oldPts go via flushToAllData directly).
            const RECENT_MS  = 10000;
            const validPts   = pts.filter(p => p.x > 0 && p.x <= nowPoll + 60000);
            const oldPts     = validPts.filter(p => nowPoll - p.x > RECENT_MS);
            const recentPts  = validPts.filter(p => nowPoll - p.x <= RECENT_MS);
            if (oldPts.length > 0) {
                flushToAllData(oldPts);
                updateChart({ scaleY: !state.userPanned });
            }
            if (recentPts.length > 0) {
                enqueueDrip(recentPts);
            }
            cacheWrite(pts).catch(console.warn);
        }
    } catch (err) {
        console.error('Poll failed:', err);
    }
    updateDataAge();

    // Hide the initial-load overlay on the first live poll — auto-scroll is now active.
    const initOverlay = document.getElementById('backfill-overlay');
    if (initOverlay && !initOverlay.hidden && initOverlay.classList.contains('is-indeterminate')) {
        initOverlay.classList.remove('is-indeterminate');
        initOverlay.hidden = true;
    }
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
        layout: { padding: { left: 38, right: 10, top: 6, bottom: 52 } },
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
            decimation: {
                enabled:   true,
                algorithm: 'lttb',   // preserves peaks & valleys best
                samples:   1500,     // target points per render (≈ 1 pt/px at 1500 px wide)
                threshold: 500,      // only decimates datasets larger than this
            },
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
                        if (state.xRange) ensureDataCoverage(state.xRange.min);
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

// ── Wheel: mark as panned immediately so a concurrent live-poll updateChart()
//    cannot reset the viewport before onZoomComplete fires.
chartCanvas.addEventListener('wheel', () => {
    state.userPanned = true;
}, { passive: true, capture: true });

// ── Pan (drag) ─────────────────────────────────────────────────────────────
let isPanning = false, panStartX = 0, panStartY = 0, panStartRange = null, panStartYRange = null;

chartCanvas.addEventListener('contextmenu', e => e.preventDefault());
chartCanvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const xs = chart.scales.x;
    if (!xs || !Number.isFinite(xs.min)) return;
    isPanning      = true;
    panStartX      = e.clientX;
    panStartY      = e.clientY;
    panStartRange  = { min: Number(xs.min), max: Number(xs.max) };
    panStartYRange = { min: state.yRange.min, max: state.yRange.max };
    chartCanvas.style.cursor = 'grabbing';
    e.preventDefault();
});
window.addEventListener('pointermove', e => {
    if (!isPanning || !panStartRange) return;
    const xSpan  = panStartRange.max - panStartRange.min;
    const xShift = ((e.clientX - panStartX) / Math.max(1, chartCanvas.clientWidth)) * xSpan;
    state.xRange = { min: panStartRange.min - xShift, max: panStartRange.max - xShift };

    const ySpan  = panStartYRange.max - panStartYRange.min;
    const yShift = ((e.clientY - panStartY) / Math.max(1, chartCanvas.clientHeight)) * ySpan;
    state.yRange = { min: panStartYRange.min + yShift, max: panStartYRange.max + yShift };
    state.userAdjustedY = true;

    state.userPanned = true;
    applyAxisRanges();
    chart.update('none');
});
function endPan() {
    if (!isPanning) return;
    isPanning = false;
    chartCanvas.style.cursor = 'grab';
    syncAxisState(chart);
    if (state.xRange) {
        state.userPanned = true;
        updateStats();
        ensureDataCoverage(state.xRange.min);
    }
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

    // Anchor to last data point when data is old (> 30 s behind current time).
    // Anchor to current time when data is live so the chart scrolls forward.
    const LIVE_THRESHOLD_MS = 30000;
    const isLive = state.lastFetchedMs &&
                   (Date.now() - state.lastFetchedMs) < LIVE_THRESHOLD_MS;
    const anchor = isLive
        ? Date.now()
        : (state.lastFetchedMs ? state.lastFetchedMs + 15000 : Date.now());

    state.xRange = {
        min: anchor - state.rangeMinutes * 60000,
        max: anchor,
    };
}

function getVisibleRange() {
    if (state.xRange) return state.xRange;

    const LIVE_THRESHOLD_MS = 30000;
    const isLive = state.lastFetchedMs &&
                   (Date.now() - state.lastFetchedMs) < LIVE_THRESHOLD_MS;
    const anchor = isLive
        ? Date.now()
        : (state.lastFetchedMs ? state.lastFetchedMs + 15000 : Date.now());

    return {
        min: anchor - state.rangeMinutes * 60000,
        max: anchor,
    };
}

function getVisiblePoints() {
    const r = getVisibleRange();
    return state.allData.filter(p => p.y !== null && p.x >= r.min && p.x <= r.max);
}

function formatLocalCsvTimestamp(ms) {
    return new Date(ms).toLocaleString('sv-SE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    })
        .replace(' ', 'T')
        .replace(/,/g, '');
}

function autoScaleY() {
    const r = state.xRange;
    const pts = r
        ? state.allData.filter(p => p.y !== null && p.x >= r.min && p.x <= r.max)
        : state.allData.filter(p => p.y !== null);
    if (!pts.length) { state.yRange = { ...Y_DEFAULT }; return; }
    // Use a loop instead of spread to avoid call-stack overflow on large datasets
    let lo = 50, hi = 50;
    for (const p of pts) { if (p.y < lo) lo = p.y; if (p.y > hi) hi = p.y; }
    const span = Math.max(hi - lo, 0.05);
    state.yRange = { min: lo - span * 0.2, max: hi + span * 0.2 };
}

function positionAxisControls() {
    // chart.chartArea and scale .left/.right/.top/.bottom are all in CSS pixels —
    // NO devicePixelRatio division is needed here.
    if (!chart.chartArea || !chart.scales.y || !chart.scales.x) return;

    const ca = chart.chartArea;          // CSS px: {left, top, right, bottom} of plot area
    const xs = chart.scales.x;          // CSS px axis bounds
    const cr = chartCanvas.getBoundingClientRect();
    const wr = chartCanvas.parentElement.getBoundingClientRect();
    const cL = cr.left - wr.left;       // canvas left offset inside wrapper (CSS px)
    const cT = cr.top  - wr.top;        // canvas top  offset inside wrapper (CSS px)

    // ── Y buttons: centred in layout.padding.left strip, mid-height of plot ──
    const padL = (chart.options.layout.padding || {}).left || 0;
    const yEl  = chartCanvas.parentElement.querySelector('.chart-axis-y');
    if (yEl) {
        yEl.style.left      = Math.round(cL + padL / 2 - 5) + 'px';
        yEl.style.top       = Math.round(cT + (ca.top + ca.bottom) / 2) + 'px';
        yEl.style.transform = 'translate(-50%, -50%)';
    }

    // ── X buttons: centred horizontally in plot, mid of bottom padding strip ─
    // xs.bottom = CSS px bottom of X-axis tick labels; cr.height = CSS canvas height.
    const xEl = chartCanvas.parentElement.querySelector('.chart-axis-x');
    if (xEl) {
        xEl.style.left      = Math.round(cL + (ca.left + ca.right) / 2) + 'px';
        xEl.style.top       = Math.round(cT + (xs.bottom + cr.height) / 2 + 5) + 'px';
        xEl.style.transform = 'translate(-50%, -50%)';
    }
}

// ── Stats & UI update ──────────────────────────────────────────────────────
function updateStats() {
    const allValid = state.allData.filter(p => p.y !== null);
    const cur      = allValid.length ? allValid[allValid.length - 1].y : null;
    const visible  = getVisiblePoints();
    let minY = Infinity, maxY = -Infinity;
    for (const p of visible) { if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; }

    document.getElementById('val-current').textContent    = cur !== null ? cur.toFixed(3) : '--';
    document.getElementById('val-min-window').textContent = isFinite(minY) ? minY.toFixed(3) : '--';
    document.getElementById('val-max-window').textContent = isFinite(maxY) ? maxY.toFixed(3) : '--';
    document.getElementById('val-points').textContent     = visible.length;

    // Keep range button highlight in sync with user's choice — never auto-change it
    updateRangeButtons(state.rangeMinutes);
}

function updateDataAge() {
    const card    = document.getElementById('card-data-age');
    const numEl   = document.getElementById('val-data-age');
    const unitEl  = document.getElementById('val-data-age-min');
    const t       = i18n[state.lang];

    if (!state.lastFetchedMs) {
        numEl.textContent  = '--';
        unitEl.textContent = '';
        card.classList.remove('old');
        return;
    }

    const totalSecs = Math.max(0, Math.floor((Date.now() - state.lastFetchedMs) / 1000));
    const hrs  = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (totalSecs < 60) {
        // 0–59 s → "42 s"
        numEl.textContent  = totalSecs;
        unitEl.textContent = ' ' + t.dataAgeSec;
    } else if (totalSecs < 3600) {
        // 1 min – 59:59 → "9:24 min"
        numEl.textContent  = mins + ':' + String(secs).padStart(2, '0');
        unitEl.textContent = ' ' + t.dataAgeUnit;
    } else {
        // 1 h+ → "2h 9:24"
        numEl.textContent  = hrs + t.dataAgeHour + ' ' + mins + ':' + String(secs).padStart(2, '0');
        unitEl.textContent = ' ' + t.dataAgeUnit;
    }

    card.classList.toggle('old', totalSecs > 120); // > 2 minutes
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
    // Keep zoom-plugin x bounds in sync with actual data extent
    const zoomLimitsX = chart.options.plugins.zoom.limits.x;
    zoomLimitsX.min = state.allData.length > 0 ? state.allData[0].x : Date.now() - DATA_WINDOW_MS;
    zoomLimitsX.max = Date.now() + 120000;   // allow up to 2 min ahead for live tail
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
        ensureDataCoverage(nMin);
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
        ['lbl-axis-freq',    t.axisFreq],
        ['clear-cache-btn',    t.clearCache],
        ['reset-btn',          t.resetZoom],
        ['save-btn',           t.saveCsv],
        ['val-data-age-old',   t.oldData],
        ['footer-disclaimer',    t.disclaimer],
        ['device-log-btn',       t.deviceLogBtn],
        ['about-btn',            t.aboutBtn],
        ['about-disclaimer-text',t.disclaimer],
    ].forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    });
    // Range buttons
    document.querySelectorAll('#range-buttons button[data-minutes]').forEach(btn => {
        const label = t.rangeLabels[Number(btn.dataset.minutes)];
        if (label) btn.textContent = label;
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
    btn.addEventListener('click', async () => {
        state.rangeMinutes = Number(btn.dataset.minutes);
        state.userPanned   = false;
        state.xRange       = null;
        if (!state.userAdjustedY) autoScaleY();
        updateChart();
        updateRangeButtons(state.rangeMinutes);
        // Fetch historical data if the new range extends beyond what is loaded,
        // then always do a final updateChart() so the range is applied whether
        // ensureDataCoverage fetched data or returned early (data already loaded).
        const neededMin = Date.now() - state.rangeMinutes * 60000;
        await ensureDataCoverage(neededMin);
        updateChart();
    })
);

// Reset zoom
// Clear cache
document.getElementById('clear-cache-btn').addEventListener('click', async () => {
    const btn = document.getElementById('clear-cache-btn');
    btn.disabled    = true;
    btn.textContent = '…';
    try {
        await cacheClear();
        location.reload();          // reload with empty cache → fresh Supabase fetch
    } catch (e) {
        console.warn('Cache clear failed:', e);
        btn.disabled    = false;
        btn.textContent = i18n[state.lang].clearCache;
    }
});

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
    const rows = getVisiblePoints()
        .map(p => `${formatLocalCsvTimestamp(p.x)},${p.y}`);
    const blob = new Blob(['timestamp,frequency\n' + rows.join('\n')], { type: 'text/csv' });
    const fileStamp = formatLocalCsvTimestamp(Date.now()).replace(/[:T]/g, '-');
    const a    = Object.assign(document.createElement('a'), {
        href:     URL.createObjectURL(blob),
        download: `frequency_${fileStamp}.csv`,
    });
    a.click();
});

// Side nav drawer
const menuBtn    = document.getElementById('nav-hamburger');
const navDrawer  = document.getElementById('nav-mobile-menu');
const navOverlay = document.getElementById('nav-overlay');

function closeMenu() {
    navDrawer.classList.remove('open');
    navOverlay.classList.remove('open');
    menuBtn.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
    navDrawer.setAttribute('aria-hidden', 'true');
}

function openMenu() {
    navDrawer.classList.add('open');
    navOverlay.classList.add('open');
    menuBtn.classList.add('open');
    menuBtn.setAttribute('aria-expanded', 'true');
    navDrawer.setAttribute('aria-hidden', 'false');
}

menuBtn.addEventListener('click', e => {
    e.stopPropagation();
    navDrawer.classList.contains('open') ? closeMenu() : openMenu();
});

navOverlay.addEventListener('click', closeMenu);
document.getElementById('nav-drawer-close').addEventListener('click', closeMenu);

// About dialog
const aboutDialog = document.getElementById('about-dialog');
document.getElementById('about-btn').addEventListener('click', () => {
    closeMenu();
    aboutDialog.showModal();
});
document.getElementById('about-close-btn').addEventListener('click', () => aboutDialog.close());
aboutDialog.addEventListener('click', e => { if (e.target === aboutDialog) aboutDialog.close(); });

// Language toggle
document.querySelectorAll('.lang-toggle button').forEach(btn =>
    btn.addEventListener('click', () => applyLang(btn.dataset.lang)));

// ── Boot ───────────────────────────────────────────────────────────────────
(async function boot() {
    applyLang(state.lang);
    updateRangeButtons(state.rangeMinutes);
    await fetchInitialData();
    state.liveTimer = setInterval(fetchNewPoints, LIVE_POLL_MS);
    requestAnimationFrame(positionAxisControls);
})();
