// ── Supabase Data Layer ───────────────────────────────────────────────────
// Pure functions — no side-effects, no state access.
// All functions return raw row arrays: [{timestamp, frequency}, ...]

function sbHeaders() {
    return {
        'apikey':        SUPABASE_ANON,
        'Authorization': 'Bearer ' + SUPABASE_ANON,
    };
}

/**
 * Fetch rows in a time range.
 * @param {string} since  ISO-8601 timestamp (inclusive lower bound)
 * @param {number} limit  max rows (default 10 000)
 * @returns {Promise<Array>}
 */
async function sbFetchRange(since, limit = 10000) {
    const url =
        `${SUPABASE_URL}/rest/v1/frequency_log` +
        `?timestamp=gte.${encodeURIComponent(since)}` +
        `&order=timestamp.asc&limit=${limit}`;

    const resp = await fetch(url, { headers: sbHeaders() });
    if (!resp.ok) throw new Error(`Supabase ${resp.status}: ${await resp.text()}`);
    return resp.json();
}

/**
 * Fetch the most recent N rows (newest first — caller must reverse).
 * @param {number} limit  max rows (default 20 000)
 * @returns {Promise<Array>}  rows ordered newest→oldest
 */
async function sbFetchRecent(limit = 20000) {
    const url =
        `${SUPABASE_URL}/rest/v1/frequency_log` +
        `?order=timestamp.desc&limit=${limit}`;

    const resp = await fetch(url, { headers: sbHeaders() });
    if (!resp.ok) throw new Error(`Supabase ${resp.status}: ${await resp.text()}`);
    return resp.json();
}

/**
 * Fetch rows newer than a given timestamp (exclusive).
 * @param {string} after  ISO-8601 timestamp (exclusive lower bound)
 * @param {number} limit  max rows (default 500)
 * @returns {Promise<Array>}
 */
async function sbFetchNew(after, limit = 500) {
    const url =
        `${SUPABASE_URL}/rest/v1/frequency_log` +
        `?timestamp=gt.${encodeURIComponent(after)}` +
        `&order=timestamp.asc&limit=${limit}`;

    const resp = await fetch(url, { headers: sbHeaders() });
    if (!resp.ok) throw new Error(`Supabase ${resp.status}: ${await resp.text()}`);
    return resp.json();
}
