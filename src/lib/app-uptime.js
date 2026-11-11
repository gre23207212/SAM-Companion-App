// App lifetime, independent of dashboard mounting and page navigation.
const startedAt = Date.now();
export function formatAppUptime(now = Date.now()) {
    const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
    return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
        .map((value) => String(value).padStart(2, "0")).join(":");
}
