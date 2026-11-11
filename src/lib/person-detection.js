/**
 * Local in-browser person detection (TensorFlow.js + COCO-SSD) using weights
 * packaged in public/detection. Purely an observer: it never commands motion.
 * Drops one map ping where each new person is first spotted.
 */
import { getLinkState, subscribeLink, getActivePose } from "@/lib/go2-link.js";
import { addAlert } from "@/lib/alerts-store.js";
import { matchPerson } from "@/lib/person-tracking.js";
let pings = [];
const known = [];
const listeners = new Set();
const notify = () => listeners.forEach((l) => l());
export const getPersonPings = () => pings;
export function subscribePings(fn) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}
export function clearPersonPings() {
    pings = [];
    known.length = 0;
    notify();
}
const HFOV = (100 * Math.PI) / 180; // Go2 front camera, approx.
const PERSON_HEIGHT = 1.7;
let detectorPromise = null;
function loadDetector() {
    detectorPromise ??= (async () => {
        try {
            const tf = await import("@tensorflow/tfjs");
            await tf.ready();
            const cocoSsd = await import("@tensorflow-models/coco-ssd");
            const modelUrl = new URL("detection/model.json", document.baseURI).href;
            return (await cocoSsd.load({ base: "lite_mobilenet_v2", modelUrl }));
        }
        catch (e) {
            console.warn("[SAM] person detection unavailable:", e);
            return null;
        }
    })();
    return detectorPromise;
}
function signatureOf(ctx, video, [x, y, w, h]) {
    ctx.canvas.width = 3;
    ctx.canvas.height = 3;
    ctx.drawImage(video, x, y, w, h, 0, 0, 3, 3);
    const d = ctx.getImageData(0, 0, 3, 3).data;
    const sig = [];
    for (let row = 0; row < 3; row++) {
        let r = 0, g = 0, b = 0;
        for (let col = 0; col < 3; col++) {
            const i = (row * 3 + col) * 4;
            r += d[i];
            g += d[i + 1];
            b += d[i + 2];
        }
        sig.push(r / 765, g / 765, b / 765);
    }
    return sig;
}
/** Start watching the shared camera stream. Returns a stop function. */
export function startPersonDetection() {
    if (typeof document === "undefined")
        return () => { };
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    let stopped = false;
    let busy = false;
    const bind = () => {
        const s = getLinkState().stream;
        if (video.srcObject !== s) {
            video.srcObject = s;
            if (s)
                video.play().catch(() => { });
        }
    };
    const off = subscribeLink(bind);
    bind();
    const timer = setInterval(async () => {
        if (stopped || busy || !ctx || !video.srcObject || video.readyState < 2 || !video.videoWidth)
            return;
        busy = true;
        try {
            const detector = await loadDetector();
            if (!detector)
                return;
            const found = (await detector.detect(video)).filter((p) => p.class === "person" && p.score > 0.6);
            const pose = getActivePose();
            const claimed = new Set();
            for (const p of found) {
                const sig = signatureOf(ctx, video, p.bbox);
                // Someone else in the same frame can't be the same person, so skip already-claimed matches.
                const idx = matchPerson(sig, known.map((k, i) => (claimed.has(i) ? [] : k)));
                if (idx >= 0) {
                    claimed.add(idx);
                    continue;
                }
                claimed.add(known.length);
                known.push(sig);
                const [bx, , bw, bh] = p.bbox;
                const W = video.videoWidth;
                const focal = W / 2 / Math.tan(HFOV / 2);
                const dist = Math.min(8, Math.max(0.5, (PERSON_HEIGHT * focal) / Math.max(bh, 1)));
                const bearing = -((bx + bw / 2) / W - 0.5) * HFOV;
                if (!pose) {
                    addAlert({ type: "warning", message: "Person detected; map location unavailable (no robot pose)", severity: "high", confidence: p.score });
                    continue;
                }
                const yaw = pose.yaw + bearing;
                const ping = {
                    id: crypto.randomUUID(),
                    x: (pose?.x ?? 0) + Math.cos(yaw) * dist,
                    y: (pose?.y ?? 0) + Math.sin(yaw) * dist,
                    at: new Date(),
                };
                const alert = addAlert({ type: "info", message: `Person detected — estimated location (${(p.score * 100).toFixed(0)}% confidence)`, severity: "high", personId: ping.id, confidence: p.score, location: { x: ping.x, y: ping.y }, survivorStatus: "located" });
                ping.alertId = alert.id;
                pings = [...pings, ping];
                notify();
            }
        }
        catch (e) {
            console.warn("[SAM] detection frame failed:", e);
        }
        finally {
            busy = false;
        }
    }, 700);
    return () => { stopped = true; clearInterval(timer); off(); video.srcObject = null; };
}
