// Robot connection — connects directly to Go2 HTTP Sport API (port 8081)
// State is kept locally in memory.
let state = {
    status: "disconnected",
    robotIp: (typeof localStorage !== "undefined" && localStorage.getItem("sam.robotIp")) || "192.168.123.161",
    port: "8081",
    error: null,
    scanResults: [],
    batteryPercent: null,
    temperature: null,
    externalClientConnected: false,
    externalClientInfo: null,
    position: null,
    velocity: null,
    mode: null,
    cameraUrl: null,
};
let telemetryInterval = null;
const listeners = new Set();
function notify() {
    listeners.forEach((fn) => fn());
}
export function getRobotState() {
    return state;
}
export function subscribe(fn) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}
/** Mirror of the shared WebRTC link status, so every page shows the same connection state. */
export function setConnectionStatus(status, error) {
    if (state.status === status && state.error === error)
        return;
    state = { ...state, status, error };
    notify();
}
export function setRobotIp(ip) {
    state = { ...state, robotIp: ip };
    try {
        localStorage.setItem("sam.robotIp", ip);
    }
    catch { /* storage unavailable */ }
    notify();
}
export function setRobotPort(port) {
    state = { ...state, port };
    notify();
}
function apiUrl(path) {
    return `http://${state.robotIp}:${state.port}${path}`;
}
// ── Network Scan ──────────────────────────────────────────────
const GO2_KNOWN_HOSTS = [
    { ip: "192.168.123.1", label: "Network Gateway", type: "gateway" },
    { ip: "192.168.123.18", label: "Go2 Companion Computer", type: "companion" },
    { ip: "192.168.123.20", label: "Go2 LiDAR Module", type: "lidar" },
    { ip: "192.168.123.161", label: "Go2 Motion Controller", type: "robot" },
];
// Probe a host on the Go2 Sport API port. We only trust a host as
// "reachable" when we get a real HTTP response back — opaque/CORS
// successes from random network gear are treated as unreachable so the
// scan does not produce false positives when the robot is powered off.
async function checkHost(ip, type) {
    const port = type === "robot" ? 8081 : 8081;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);
        const resp = await fetch(`http://${ip}:${port}/api/sport/state`, {
            signal: controller.signal,
            cache: "no-store",
        });
        clearTimeout(timeout);
        // Only count as reachable when the device actually answered HTTP.
        return resp.ok || resp.status > 0;
    }
    catch {
        return false;
    }
}
export async function scanNetwork() {
    state = { ...state, status: "scanning", scanResults: [], error: null };
    notify();
    const results = [];
    for (const host of GO2_KNOWN_HOSTS) {
        const reachable = await checkHost(host.ip, host.type);
        results.push({ ...host, reachable });
        state = { ...state, scanResults: [...results] };
        notify();
    }
    const robotFound = results.some((r) => r.type === "robot" && r.reachable);
    state = {
        ...state,
        status: "disconnected",
        scanResults: results,
        error: robotFound ? null : "No Go2 robot detected on network",
    };
    notify();
    return results;
}
// ── Auto Discover ─────────────────────────────────────────────
// Quietly scans the default Go2 subnet and connects automatically
// when a robot answers on port 8081. Returns true when connected.
export async function autoDiscoverRobot() {
    if (state.status === "connected" || state.status === "connecting")
        return false;
    // Probe known Go2 motion controller addresses.
    const candidates = [
        "192.168.123.161", // Default motion controller
        "192.168.123.99", // Alternate seen on some units
        state.robotIp, // User-set IP (may already be one of the above)
    ];
    const tried = new Set();
    for (const ip of candidates) {
        if (tried.has(ip))
            continue;
        tried.add(ip);
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 1500);
            const resp = await fetch(`http://${ip}:${state.port}/api/sport/state`, {
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (resp.ok) {
                state = { ...state, robotIp: ip };
                notify();
                return await connectToRobot();
            }
        }
        catch {
            // try next candidate
        }
    }
    return false;
}
// ── External Client Check ─────────────────────────────────────
// The Go2 app binds via the sport API. If we can read state and detect
// an active binding, we warn the user.
async function checkExternalClient() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const resp = await fetch(apiUrl("/api/sport/state"), { signal: controller.signal });
        clearTimeout(timeout);
        if (resp.ok) {
            const data = await resp.json();
            // The Go2 may report conn_state or binding info
            const connState = data?.data?.conn_state;
            if (connState && connState > 1) {
                return { connected: true, info: "Unitree Go App is bound to this robot" };
            }
        }
        return { connected: false, info: null };
    }
    catch {
        return { connected: false, info: null };
    }
}
// ── Connect ───────────────────────────────────────────────────
export async function connectToRobot() {
    state = { ...state, status: "connecting", error: null };
    notify();
    try {
        // 1) Check if robot is reachable
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const resp = await fetch(apiUrl("/api/sport/state"), { signal: controller.signal });
        clearTimeout(timeout);
        if (!resp.ok) {
            state = { ...state, status: "error", error: `Robot responded with status ${resp.status}` };
            notify();
            return false;
        }
        // 2) Check for external client (Unitree Go app)
        const ext = await checkExternalClient();
        if (ext.connected) {
            state = {
                ...state,
                status: "error",
                externalClientConnected: true,
                externalClientInfo: ext.info,
                error: `${ext.info || "Another client is already connected"}. Disconnect the Unitree Go app first.`,
            };
            notify();
            return false;
        }
        // 3) Parse initial telemetry
        const data = await resp.json();
        const telemetry = parseTelemetry(data);
        state = {
            ...state,
            status: "connected",
            error: null,
            externalClientConnected: false,
            externalClientInfo: null,
            cameraUrl: `http://${state.robotIp}:8081/api/webrtc/offer`,
            ...telemetry,
        };
        notify();
        // 4) Start polling telemetry
        startTelemetry();
        return true;
    }
    catch (e) {
        const msg = e instanceof Error && e.name === "AbortError"
            ? `Connection timed out. Is the Go2 powered on at ${state.robotIp}?`
            : `Cannot reach robot at ${state.robotIp}:${state.port}. Check network connection.`;
        state = { ...state, status: "error", error: msg };
        notify();
        return false;
    }
}
// ── Telemetry Polling ─────────────────────────────────────────
function parseTelemetry(data) {
    try {
        const d = (data?.data ?? data);
        const bms = d?.bms;
        const imu = d?.imu;
        const pos = d?.position;
        const vel = d?.velocity;
        return {
            batteryPercent: bms?.soc ?? null,
            temperature: imu?.temperature ?? null,
            position: pos ? { x: pos[0], y: pos[1], z: pos[2] } : null,
            velocity: vel ? { vx: vel[0], vy: vel[1] } : null,
            mode: d?.mode ?? null,
        };
    }
    catch {
        return {};
    }
}
function startTelemetry() {
    stopTelemetry();
    telemetryInterval = setInterval(async () => {
        if (state.status !== "connected") {
            stopTelemetry();
            return;
        }
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            const resp = await fetch(apiUrl("/api/sport/state"), { signal: controller.signal });
            clearTimeout(timeout);
            if (resp.ok) {
                const data = await resp.json();
                const telemetry = parseTelemetry(data);
                state = { ...state, ...telemetry };
                notify();
            }
        }
        catch {
            // Connection lost
            state = { ...state, status: "disconnected", error: "Connection lost to robot" };
            notify();
            stopTelemetry();
        }
    }, 1000);
}
function stopTelemetry() {
    if (telemetryInterval) {
        clearInterval(telemetryInterval);
        telemetryInterval = null;
    }
}
// ── Disconnect ────────────────────────────────────────────────
export function disconnect() {
    stopTelemetry();
    state = {
        ...state,
        status: "disconnected",
        error: null,
        batteryPercent: null,
        temperature: null,
        externalClientConnected: false,
        externalClientInfo: null,
        position: null,
        velocity: null,
        mode: null,
        cameraUrl: null,
    };
    notify();
}
// ── Commands ──────────────────────────────────────────────────
// Go2 Sport API command IDs
const SPORT_COMMANDS = {
    stand_up: { api_id: 1001 },
    crouch_down: { api_id: 1002 },
    damping: { api_id: 1003 },
    stop: { api_id: 1004 },
    move_forward: { api_id: 1008, args: { vx: 0.5, vy: 0, vyaw: 0 } },
    move_backward: { api_id: 1008, args: { vx: -0.5, vy: 0, vyaw: 0 } },
    move_left: { api_id: 1008, args: { vx: 0, vy: 0.3, vyaw: 0 } },
    move_right: { api_id: 1008, args: { vx: 0, vy: -0.3, vyaw: 0 } },
    turn_left: { api_id: 1008, args: { vx: 0, vy: 0, vyaw: 0.5 } },
    turn_right: { api_id: 1008, args: { vx: 0, vy: 0, vyaw: -0.5 } },
    look_up: { api_id: 1013, args: { pitch: 0.4, yaw: 0 } },
    look_down: { api_id: 1013, args: { pitch: -0.4, yaw: 0 } },
    jump: { api_id: 1020 },
    roll_over: { api_id: 1015 },
    lock: { api_id: 1004 },
    pose: { api_id: 1014 },
    keep_walking: { api_id: 1008, args: { vx: 0.3, vy: 0, vyaw: 0 } },
};
export async function sendCommand(command) {
    // Always dispatch a UI event so simulation pages (mapping, etc.) can react,
    // even when no real robot is connected.
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sam:robot-command", { detail: { command } }));
    }
    if (state.status !== "connected") {
        console.log(`[SAM] ${command} — not connected (sim only)`);
        return;
    }
    const cmd = SPORT_COMMANDS[command];
    if (!cmd)
        return;
    try {
        await fetch(apiUrl("/api/sport/request"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                header: { identity: { api_id: cmd.api_id } },
                parameter: cmd.args ?? {},
            }),
        });
    }
    catch (e) {
        console.error(`[SAM] Command ${command} failed:`, e);
    }
}
export async function sendMovement(vx, vy, vyaw) {
    if (state.status !== "connected")
        return;
    try {
        await fetch(apiUrl("/api/sport/request"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                header: { identity: { api_id: 1008 } },
                parameter: { vx, vy, vyaw },
            }),
        });
    }
    catch {
        // Silent fail for continuous movement
    }
}
