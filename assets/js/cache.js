// ── IndexedDB local cache ──────────────────────────────────────────────────
// Stores {x, y} points keyed by x (epoch ms). Falls back silently on error.

const CACHE_DB    = 'webHz-cache';
const CACHE_STORE = 'points';

let _cacheDb = null;

function cacheOpen() {
    if (_cacheDb) return Promise.resolve(_cacheDb);
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(CACHE_DB, 1);
        req.onupgradeneeded = e =>
            e.target.result.createObjectStore(CACHE_STORE, { keyPath: 'x' });
        req.onsuccess = e => { _cacheDb = e.target.result; resolve(_cacheDb); };
        req.onerror   = ()  => reject(req.error);
    });
}

// Read all cached points with x >= sinceMs
async function cacheRead(sinceMs) {
    const db    = await cacheOpen();
    const range = sinceMs != null ? IDBKeyRange.lowerBound(sinceMs) : undefined;
    return new Promise((resolve, reject) => {
        const req = db.transaction(CACHE_STORE, 'readonly')
                      .objectStore(CACHE_STORE).getAll(range);
        req.onsuccess = () => resolve(req.result);
        req.onerror   = () => reject(req.error);
    });
}

// Read cached points in range [fromMs, untilMs)
async function cacheReadRange(fromMs, untilMs) {
    const db    = await cacheOpen();
    const range = IDBKeyRange.bound(fromMs, untilMs, false, true);
    return new Promise((resolve, reject) => {
        const req = db.transaction(CACHE_STORE, 'readonly')
                      .objectStore(CACHE_STORE).getAll(range);
        req.onsuccess = () => resolve(req.result);
        req.onerror   = () => reject(req.error);
    });
}

// Write points to cache (upsert by x)
async function cacheWrite(points) {
    if (!points.length) return;
    const db = await cacheOpen();
    const tx  = db.transaction(CACHE_STORE, 'readwrite');
    const st  = tx.objectStore(CACHE_STORE);
    for (const p of points) st.put(p);
    return new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror    = () => reject(tx.error);
    });
}

// Delete every cached point (full wipe)
async function cacheClear() {
    const db = await cacheOpen();
    const tx = db.transaction(CACHE_STORE, 'readwrite');
    tx.objectStore(CACHE_STORE).clear();
    return new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror    = () => reject(tx.error);
    });
}

// Delete all cached points with x < olderThanMs
async function cachePrune(olderThanMs) {
    try {
        const db    = await cacheOpen();
        const tx    = db.transaction(CACHE_STORE, 'readwrite');
        const range = IDBKeyRange.upperBound(olderThanMs, true);
        tx.objectStore(CACHE_STORE).delete(range);
    } catch (e) {
        console.warn('Cache prune failed:', e);
    }
}
