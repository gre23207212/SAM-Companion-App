/**
 * Direct WebRTC link to the Go2 (same handshake the Unitree app uses).
 * One shared connection feeds the camera, the LiDAR map and telemetry.
 */
import { connectLocal } from "@/go2/connection/local-connector.js";
import { DataChannelHandler } from "@/go2/protocol/data-channel.js";
import { DATA_CHANNEL_TYPE, RTC_TOPIC, SPORT_CMD } from "@/go2/protocol/topics.js";
import { clampVelocity } from "@/lib/drive-limits.js";
import { guardVelocity } from "@/lib/drive-safety.js";
import { feedLidarFrame, clearLiveObstacles, getLiveObstacles } from "@/lib/lidar-obstacles.js";
import { addAlert } from "@/lib/alerts-store.js";
import { setConnectionStatus, setRobotIp, getRobotState } from "@/lib/robot-store.js";
let state = {
    status: "offline",
    step: "",
    error: null,
    stream: null,
    lidarOn: false,
    pose: null,
    lidarState: null,
    packets: 0,
    lastLidarFrameAt: null,
};
let webrtc = null;
let handler = null;
const listeners = new Set();
const lidarListeners = new Set();
const ROBOT_STATUS = { offline: "disconnected", connecting: "connecting", validating: "connecting", online: "connected", error: "error" };
function set(patch) {
    state = { ...state, ...patch };
    setConnectionStatus(ROBOT_STATUS[state.status], state.error);
    listeners.forEach((l) => l());
}
export const getLinkState = () => state;
export function subscribeLink(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}
export function onLidarFrame(fn) {
    lidarListeners.add(fn);
    return () => lidarListeners.delete(fn);
}
function yawFromQuat(q) {
    return Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z));
}
function onTopic(msg) {
    switch (msg.topic) {
        case RTC_TOPIC.LIDAR_ARRAY:
            set({ packets: state.packets + 1, lastLidarFrameAt: Date.now() });
            feedLidarFrame(msg.data, state.pose?.z);
            lidarListeners.forEach((l) => l(msg.data));
            break;
        case RTC_TOPIC.ROBOT_ODOM: {
            const p = msg.data?.pose?.pose;
            if (p?.position && p.orientation) {
                set({ pose: { x: p.position.x, y: p.position.y, z: p.position.z, yaw: yawFromQuat(p.orientation) } });
            }
            break;
        }
        case RTC_TOPIC.LIDAR_STATE:
            set({ lidarState: typeof msg.data === "string" ? msg.data : JSON.stringify(msg.data) });
            break;
    }
}
export async function connectLink(ip, mode = ip.startsWith("192.168.12.") ? "AP" : "STA-L") {
    if (state.status === "connecting" || state.status === "validating" || state.status === "online")
        return;
    if (getRobotState().robotIp !== ip)
        setRobotIp(ip);
    set({ status: "connecting", error: null, step: "Contacting robot" });
    const callbacks = {
        onStateChange: (s) => {
            if (s === "connected")
                set({ status: "validating", step: "Checking credentials" });
            if ((s === "failed" || s === "disconnected") && state.status !== "offline") {
                set({ status: "error", error: "Connection to the robot dropped", stream: null, lidarOn: false });
                clearLiveObstacles();
                addAlert({ type: "danger", message: "Robot connection dropped. Movement stopped.", severity: "high" });
            }
        },
        onValidated: () => {
            if (!handler)
                return;
            handler.onTopicData = onTopic;
            handler.publishTyped("", { req_type: "disable_traffic_saving", instruction: "on" }, DATA_CHANNEL_TYPE.RTC_INNER_REQ);
            handler.publishTyped("", "on", DATA_CHANNEL_TYPE.VID);
            handler.subscribe(RTC_TOPIC.ROBOT_ODOM);
            handler.subscribe(RTC_TOPIC.LIDAR_STATE);
            set({ status: "online", step: "Connected" });
            setLidar(true);
        },
        onMessage: (msg) => handler?.handleMessage(msg),
        onVideoTrack: (stream) => set({ stream }),
        onAudioTrack: () => { },
    };
    try {
        webrtc = await connectLocal(ip, mode, callbacks, (step) => set({ step }));
        handler = new DataChannelHandler(webrtc, callbacks);
    }
    catch (err) {
        webrtc?.close();
        webrtc = null;
        handler = null;
        set({ status: "error", error: err instanceof Error ? err.message : "Could not connect" });
    }
}
export function disconnectLink() {
    setLidar(false);
    webrtc?.close();
    webrtc = null;
    handler = null;
    set({ status: "offline", stream: null, lidarOn: false, pose: null, step: "", packets: 0, lastLidarFrameAt: null });
    clearLiveObstacles();
}
export const isLive = () => state.status === "online";
/** Pose of the linked robot, or null when not linked. */
export function getActivePose() {
    return isLive() ? state.pose : null;
}
/** LiDAR obstacles of the linked robot. */
export function getActiveObstacles() {
    return isLive() ? getLiveObstacles() : [];
}
let lastBlocked = 0;
/** True for a moment after the LiDAR guard blocked a command. */
export const recentlyBlocked = () => Date.now() - lastBlocked < 400;
/**
 * Send a velocity command (m/s, m/s, rad/s). Always clamped to the permanent
 * limits and checked against LiDAR obstacles. Goes to the robot only when
 * linked; otherwise it is dropped.
 */
export function sendMove(vx, vy, vyaw) {
    const limited = clampVelocity(vx, vy, vyaw);
    const safe = guardVelocity(limited, getActivePose(), getActiveObstacles());
    if (safe.blocked) {
        if (!recentlyBlocked())
            addAlert({ type: "warning", message: "Safety stop: obstacle ahead", severity: "medium" });
        lastBlocked = Date.now();
    }
    if (!isLive() || !handler) {
        return;
    }
    if (safe.vx === 0 && safe.vy === 0 && safe.vyaw === 0) {
        handler.publishRequest(RTC_TOPIC.SPORT_MOD, SPORT_CMD.StopMove);
    }
    else {
        handler.publishRequest(RTC_TOPIC.SPORT_MOD, SPORT_CMD.Move, JSON.stringify({ x: safe.vx, y: safe.vy, z: safe.vyaw }));
    }
}
/** Fire a Unitree Sport API command (posture, gait). Ignored while not linked. */
export function sendSport(apiId, parameter) {
    if (!handler || !isLive())
        return false;
    handler.publishRequest(RTC_TOPIC.SPORT_MOD, apiId, parameter ? JSON.stringify(parameter) : undefined);
    return true;
}
export function setLidar(on) {
    if (!handler)
        return;
    if (on) {
        handler.subscribe(RTC_TOPIC.LIDAR_ARRAY);
        // Firmware sometimes drops the first switch packet, so send it a few times.
        for (let i = 0; i < 5; i++)
            setTimeout(() => handler?.publish(RTC_TOPIC.LIDAR_SWITCH, "ON"), i * 100);
    }
    else {
        handler.publish(RTC_TOPIC.LIDAR_SWITCH, "OFF");
        handler.unsubscribe(RTC_TOPIC.LIDAR_ARRAY);
    }
    set({ lidarOn: on });
}
/** Connect directly to the robot at `ip` and resolve once it is online (true) or failed (false). */
export async function connectRobot(ip) {
    await connectLink(ip);
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
        if (state.status === "online")
            return true;
        if (state.status === "error" || state.status === "offline")
            return false;
        await new Promise((r) => setTimeout(r, 200));
    }
    return state.status === "online";
}
