const KEY = (sn) => `sam-aes-key-${sn}`;
export function getCachedAesKey(sn) { return localStorage.getItem(KEY(sn)); }
export function setCachedAesKey(sn, key) { localStorage.setItem(KEY(sn), key); }
export function clearCachedAesKey(sn) { localStorage.removeItem(KEY(sn)); }
