let points = [];
let history = [];
let worker = null;
let pending = null;
let throttle = null;
let poseZ = 0.32;
const listeners = new Set();
function ensureWorker() {
    if (worker || typeof Worker === "undefined")
        return;
    try {
        worker = new Worker(new URL("../go2/workers/voxel-worker.js", import.meta.url), { type: "module" });
        worker.onmessage = (e) => {
            const d = e.data;
            if (d?.type === "__log__" || !d?.geometryData || !d.origin || !d.resolution)
                return;
            const pos = d.geometryData.positions instanceof Uint8Array ? d.geometryData.positions : new Uint8Array(d.geometryData.positions);
            const floor = poseZ - 0.32;
            const seen = new Set();
            const out = [];
            for (let i = 0; i < pos.length; i += 3) {
                const z = pos[i + 2] * d.resolution + d.origin[2];
                if (z < floor + 0.08 || z > floor + 0.75)
                    continue;
                const x = pos[i] * d.resolution + d.origin[0];
                const y = pos[i + 1] * d.resolution + d.origin[1];
                const k = `${Math.round(x * 10)},${Math.round(y * 10)}`;
                if (seen.has(k))
                    continue;
                seen.add(k);
                out.push([x, y]);
            }
            // Merge the last few frames so thin or briefly occluded obstacles don't flicker out.
            history.push(out);
            if (history.length > 4)
                history.shift();
            const merged = new Map();
            for (const frame of history)
                for (const p of frame)
                    merged.set(`${Math.round(p[0] * 10)},${Math.round(p[1] * 10)}`, p);
            points = [...merged.values()];
            listeners.forEach((l) => l());
        };
    }
    catch {
        worker = null;
    }
}
export function feedLidarFrame(data, currentZ) {
    ensureWorker();
    if (!worker)
        return;
    if (currentZ != null)
        poseZ = currentZ;
    pending = data;
    if (throttle)
        return;
    throttle = setTimeout(() => {
        throttle = null;
        if (pending && worker)
            worker.postMessage(pending);
        pending = null;
    }, 60);
}
export function clearLiveObstacles() {
    points = [];
    history = [];
    listeners.forEach((l) => l());
}
export const getLiveObstacles = () => points;
export function subscribeLiveObstacles(fn) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}
