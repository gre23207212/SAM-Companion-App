let alerts = [];
let unread = 0;
const listeners = new Set();
const notify = () => listeners.forEach((l) => l());
export const getAlerts = () => [...alerts];
export const getUnreadCount = () => unread;
export function addAlert(entry) {
    const a = { ...entry, id: crypto.randomUUID(), timestamp: new Date() };
    alerts = [a, ...alerts].slice(0, 500);
    unread += 1;
    notify();
    return a;
}
export function markAlertsRead() {
    if (unread === 0)
        return;
    unread = 0;
    notify();
}
export function clearAlerts() {
    alerts = [];
    unread = 0;
    notify();
}
export function subscribeAlerts(listener) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}
export function updateSurvivorStatus(id, survivorStatus) {
    alerts = alerts.map(a => a.id === id && a.personId ? { ...a, survivorStatus } : a);
    notify();
}
