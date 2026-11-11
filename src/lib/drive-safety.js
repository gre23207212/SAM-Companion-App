/**
 * LiDAR collision braking. Blocks commanded linear motion toward obstacles
 * that are closer than STOP_DISTANCE. Rotation in place is always allowed.
 */
export const STOP_DISTANCE = 0.6; // metres from robot centre
const CONE_COS = Math.cos((50 * Math.PI) / 180);
export function guardVelocity(cmd, pose, obstacles) {
    const speed = Math.hypot(cmd.vx, cmd.vy);
    if (speed === 0 || !pose || obstacles.length === 0)
        return { ...cmd, blocked: false };
    // Motion direction in world frame.
    const c = Math.cos(pose.yaw), s = Math.sin(pose.yaw);
    const dx = (cmd.vx * c - cmd.vy * s) / speed;
    const dy = (cmd.vx * s + cmd.vy * c) / speed;
    for (const [ox, oy] of obstacles) {
        const rx = ox - pose.x, ry = oy - pose.y;
        const d = Math.hypot(rx, ry);
        if (d === 0 || d > STOP_DISTANCE)
            continue;
        if ((rx * dx + ry * dy) / d > CONE_COS)
            return { vx: 0, vy: 0, vyaw: cmd.vyaw, blocked: true };
    }
    return { ...cmd, blocked: false };
}
/** Path safety grid: blocked cells hold obstacles, unsafe cells lie within 0.4 m of one. */
export const GRID_CELL = 0.2;
export const UNSAFE_MARGIN = 0.4;
export function buildSafetyGrid(obstacles) {
    const key = (i, j) => `${i},${j}`;
    const blocked = new Map();
    for (const [x, y] of obstacles) {
        const i = Math.floor(x / GRID_CELL), j = Math.floor(y / GRID_CELL);
        blocked.set(key(i, j), [i, j]);
    }
    const r = Math.ceil(UNSAFE_MARGIN / GRID_CELL);
    const unsafe = new Map();
    for (const [i, j] of blocked.values()) {
        for (let a = -r; a <= r; a++)
            for (let b = -r; b <= r; b++) {
                if (Math.hypot(a, b) * GRID_CELL > UNSAFE_MARGIN)
                    continue;
                const k = key(i + a, j + b);
                if (!blocked.has(k))
                    unsafe.set(k, [i + a, j + b]);
            }
    }
    return { blocked: [...blocked.values()], unsafe: [...unsafe.values()] };
}
