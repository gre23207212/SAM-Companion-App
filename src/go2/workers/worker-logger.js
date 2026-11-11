/**
 * Worker-side logger shim. Web Workers run in isolated contexts with no
 * shared localStorage or appSettings singleton, so they can't gate their
 * own console output by the in-app Settings chips. Instead they
 * postMessage a small `__log__` frame to the main thread, which routes
 * it through the regular `log.<category>.*` API.
 *
 * Usage (inside a worker):
 *   import { workerLog } from './worker-logger.js';
 *   workerLog.info('WASM loaded');
 *   workerLog.error('decode failed:', err);
 *
 * The receiving side wires `pipeWorkerLogs(worker, 'scene')` (see
 * src/ui/logger.ts) so each worker's logs land in a chosen category.
 */
const ctx = self;
/** Discriminator on the postMessage envelope — the main-thread
 *  handlers check for this constant and short-circuit before any
 *  domain-specific parsing. Exported so the receiving side can match
 *  it without re-typing the string. */
export const WORKER_LOG_TYPE = '__log__';
function post(level, args) {
    try {
        ctx.postMessage({ type: WORKER_LOG_TYPE, level, args });
    }
    catch {
        // Worker hasn't been attached yet, or the main thread is gone.
        // Either way: there's no one to receive these logs — silently drop.
    }
}
export const workerLog = {
    info: (...args) => post('info', args),
    debug: (...args) => post('debug', args),
    warn: (...args) => post('warn', args),
    error: (...args) => post('error', args),
};
