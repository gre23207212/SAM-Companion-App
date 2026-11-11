import { DATA_CHANNEL_TYPE } from './topics.js';
let heartbeatTimer = null;
function formatTime(date) {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
export function startHeartbeat(webrtc) {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
        const now = new Date();
        webrtc.send({
            type: DATA_CHANNEL_TYPE.HEARTBEAT,
            topic: '',
            data: {
                timeInStr: formatTime(now),
                timeInNum: Math.floor(now.getTime() / 1000),
            },
        });
    }, 2000);
}
export function stopHeartbeat() {
    if (heartbeatTimer !== null) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
}
