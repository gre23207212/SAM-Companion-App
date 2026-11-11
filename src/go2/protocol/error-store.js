/**
 * Active-error store — single source of truth for the current robot fault set.
 *
 * Receives three wire-message kinds via `applyWireMessage`:
 *   - "errors"    : full snapshot — REPLACES the active set
 *   - "add_error" : delta — inserts one entry (no-op if already present)
 *   - "rm_error"  : delta — removes one entry (no-op if absent)
 *
 * Subscribers see two event kinds:
 *   - "change"  : the visible list changed (any of the above) — re-render
 *   - "added"   : a single new error appeared via add_error — used to toast.
 *                 NOT fired for entries that arrive via the "errors" snapshot,
 *                 so reconnect/resync doesn't spam toasts.
 */
import { decodeError, errorKey } from './errors-catalog.js';
function isTriple(v) {
    return Array.isArray(v)
        && v.length === 3
        && typeof v[0] === 'number'
        && typeof v[1] === 'number'
        && typeof v[2] === 'number';
}
/** Normalise the `data` field of an errors/add_error/rm_error message into
 *  an array of triples. Single-triple deltas arrive un-wrapped on the wire. */
function normaliseData(data) {
    if (!Array.isArray(data) || data.length === 0)
        return [];
    // Snapshot: [[ts,src,code], …]. Delta: [ts,src,code].
    if (isTriple(data))
        return [data];
    return data.filter(isTriple);
}
export class ErrorStore {
    byKey = new Map();
    listeners = new Set();
    /** All currently active errors, sorted newest-first by timestamp. */
    list() {
        return Array.from(this.byKey.values()).sort((a, b) => b.timestamp - a.timestamp);
    }
    count() {
        return this.byKey.size;
    }
    subscribe(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }
    /** Drop every active error and notify subscribers. Called on disconnect. */
    clear() {
        if (this.byKey.size === 0)
            return;
        this.byKey.clear();
        this.emitChange();
    }
    /** Dispatch one of the three wire message kinds into the store. */
    applyWireMessage(type, data) {
        const triples = normaliseData(data);
        if (type === 'errors') {
            this.replaceAll(triples);
            return;
        }
        if (type === 'add_error') {
            for (const t of triples)
                this.add(t, /* fromSnapshot */ false);
            return;
        }
        if (type === 'rm_error') {
            for (const t of triples)
                this.remove(t);
            return;
        }
    }
    replaceAll(triples) {
        const next = new Map();
        for (const [ts, source, code] of triples) {
            const key = errorKey(source, code);
            // Preserve the original timestamp when an entry persists across snapshots
            // so the "appeared at" label doesn't jitter as the robot refreshes it.
            const existing = this.byKey.get(key);
            const timestamp = existing?.timestamp ?? ts;
            next.set(key, decodeError({ timestamp, source, code }));
        }
        // Detect a real change before emitting (snapshot-on-snapshot is common).
        if (mapsEqual(this.byKey, next))
            return;
        this.byKey = next;
        this.emitChange();
    }
    add(triple, fromSnapshot) {
        const [ts, source, code] = triple;
        const key = errorKey(source, code);
        if (this.byKey.has(key))
            return; // idempotent — guards against snapshot/add race
        const decoded = decodeError({ timestamp: ts, source, code });
        this.byKey.set(key, decoded);
        if (!fromSnapshot) {
            for (const fn of this.listeners)
                fn({ kind: 'added', error: decoded });
        }
        this.emitChange();
    }
    remove(triple) {
        const [, source, code] = triple;
        const key = errorKey(source, code);
        if (!this.byKey.delete(key))
            return;
        this.emitChange();
    }
    emitChange() {
        const snapshot = this.list();
        for (const fn of this.listeners)
            fn({ kind: 'change', errors: snapshot });
    }
}
function mapsEqual(a, b) {
    if (a.size !== b.size)
        return false;
    for (const k of a.keys())
        if (!b.has(k))
            return false;
    return true;
}
