export const MATCH_THRESHOLD = 0.08;
export function signatureDistance(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++)
        s += (a[i] - b[i]) ** 2;
    return Math.sqrt(s / a.length);
}
/** Index of the known person this signature belongs to, or -1 for someone new. */
export function matchPerson(sig, known) {
    let best = -1, bestD = MATCH_THRESHOLD;
    known.forEach((k, i) => {
        if (k.length !== sig.length)
            return;
        const d = signatureDistance(sig, k);
        if (d < bestD) {
            bestD = d;
            best = i;
        }
    });
    return best;
}
