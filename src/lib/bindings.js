export const ACTION_LABELS = {
    forward: "Forward",
    back: "Backward",
    turnLeft: "Turn left",
    turnRight: "Turn right",
    strafeLeft: "Strafe left",
    strafeRight: "Strafe right",
    stop: "STOP",
    standUp: "Stand up",
    sit: "Sit",
};
export const KEY_ACTIONS = ["forward", "back", "turnLeft", "turnRight", "strafeLeft", "strafeRight", "stop", "standUp", "sit"];
export const PAD_ACTIONS = ["stop", "standUp", "sit"];
export const DEFAULT_BINDINGS = {
    keys: { forward: "w", back: "s", turnLeft: "arrowleft", turnRight: "arrowright", strafeLeft: "a", strafeRight: "d", stop: " ", standUp: "r", sit: "f" },
    pad: { stop: 1, standUp: 3, sit: 2 },
};
const KEY = "sam-bindings-v1";
const PROFILE_KEY = "sam-control-profiles-v1";
const copyBindings = (b) => ({ keys: { ...b.keys }, pad: { ...b.pad } });
const listeners = new Set();
function load() {
    try {
        const raw = JSON.parse(localStorage.getItem(KEY) || "null");
        if (raw)
            return { keys: { ...DEFAULT_BINDINGS.keys, ...raw.keys }, pad: { ...DEFAULT_BINDINGS.pad, ...raw.pad } };
    }
    catch { /* ignore */ }
    return DEFAULT_BINDINGS;
}
function loadProfiles() {
    try {
        const raw = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
        if (raw && Array.isArray(raw.profiles) && raw.profiles.length && raw.profiles.every((p) => typeof p.id === "string" && typeof p.name === "string" && p.name.trim() && p.bindings &&
            KEY_ACTIONS.every((a) => typeof p.bindings.keys?.[a] === "string") &&
            PAD_ACTIONS.every((a) => Number.isInteger(p.bindings.pad?.[a]) && p.bindings.pad[a] >= 0))) {
            return { activeId: raw.profiles.some((p) => p.id === raw.activeId) ? raw.activeId : raw.profiles[0].id, profiles: raw.profiles };
        }
    }
    catch { /* First launch or unavailable storage. */ }
    return { activeId: "default", profiles: [{ id: "default", name: "Default", bindings: copyBindings(typeof localStorage !== "undefined" ? load() : DEFAULT_BINDINGS) }] };
}
let profileStore = loadProfiles();
let bindings = profileStore.profiles.find((p) => p.id === profileStore.activeId)?.bindings ?? copyBindings(DEFAULT_BINDINGS);
export const getControlProfiles = () => profileStore;
function publishProfiles() {
    try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profileStore));
    }
    catch { /* Device storage unavailable. */ }
    listeners.forEach((l) => l());
}
/** New profiles copy the current controls; edits are saved to the active profile. */
export function createControlProfile(name) {
    const clean = name.trim().slice(0, 48);
    if (!clean || profileStore.profiles.some((p) => p.name.toLowerCase() === clean.toLowerCase()))
        return false;
    const profile = { id: crypto.randomUUID(), name: clean, bindings: copyBindings(bindings) };
    profileStore = { activeId: profile.id, profiles: [...profileStore.profiles, profile] };
    bindings = profile.bindings;
    publishProfiles();
    return true;
}
export function selectControlProfile(id) {
    const profile = profileStore.profiles.find((p) => p.id === id);
    if (!profile)
        return;
    profileStore = { ...profileStore, activeId: id };
    bindings = profile.bindings;
    publishProfiles();
}
export function renameControlProfile(name) {
    const clean = name.trim().slice(0, 48);
    if (!clean || profileStore.profiles.some((p) => p.id !== profileStore.activeId && p.name.toLowerCase() === clean.toLowerCase()))
        return false;
    profileStore = { ...profileStore, profiles: profileStore.profiles.map((p) => p.id === profileStore.activeId ? { ...p, name: clean } : p) };
    publishProfiles();
    return true;
}
export function deleteControlProfile() {
    if (profileStore.profiles.length <= 1)
        return;
    const profiles = profileStore.profiles.filter((p) => p.id !== profileStore.activeId);
    const first = profiles[0];
    if (!first)
        return;
    profileStore = { profiles, activeId: first.id };
    bindings = first.bindings;
    publishProfiles();
}
export const getBindings = () => bindings;
export function subscribeBindings(fn) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}
function save(next) {
    bindings = next;
    profileStore = { ...profileStore, profiles: profileStore.profiles.map((p) => p.id === profileStore.activeId ? { ...p, bindings: next } : p) };
    publishProfiles();
}
/** Assign a key; any other action using the same key is swapped onto the old key. */
export function setKeyBinding(action, key) {
    const k = key.toLowerCase();
    const keys = { ...bindings.keys };
    const clash = Object.keys(keys).find((a) => a !== action && keys[a] === k);
    if (clash)
        keys[clash] = keys[action];
    keys[action] = k;
    save({ ...bindings, keys });
}
export function setPadBinding(action, button) {
    const pad = { ...bindings.pad };
    const clash = Object.keys(pad).find((a) => a !== action && pad[a] === button);
    if (clash)
        pad[clash] = pad[action];
    pad[action] = button;
    save({ ...bindings, pad });
}
export const resetBindings = () => save(copyBindings(DEFAULT_BINDINGS));
export function keyLabel(k) {
    if (k === " ")
        return "Space";
    if (k.startsWith("arrow"))
        return k.replace("arrow", "↑↓←→".charAt(["up", "down", "left", "right"].indexOf(k.slice(5))) || "");
    return k.length === 1 ? k.toUpperCase() : k.charAt(0).toUpperCase() + k.slice(1);
}
const PAD_NAMES = ["A / ✕", "B / ○", "X / □", "Y / △", "LB / L1", "RB / R1", "LT / L2", "RT / R2", "Select", "Start", "L3", "R3", "D-pad ↑", "D-pad ↓", "D-pad ←", "D-pad →"];
export const padLabel = (i) => PAD_NAMES[i] ?? `Button ${i}`;
/** Axes from the currently held keys, using the saved bindings. */
export function keyboardAxes(held, b = bindings) {
    const h = (a) => (held.has(b.keys[a]) ? 1 : 0);
    return {
        forward: h("forward") - h("back"),
        strafe: h("strafeRight") - h("strafeLeft"),
        yaw: h("turnRight") - h("turnLeft"),
    };
}
