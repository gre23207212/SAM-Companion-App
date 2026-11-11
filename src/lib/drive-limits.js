/** Permanent velocity limits. Linear speed is capped at 15% (0.15 m/s). */
export const MAX_LINEAR = 0.15; // m/s, forward/backward/strafe
export const MAX_YAW = 0.8; // rad/s (~46°/s)
export function clampVelocity(vx, vy, vyaw) {
    const c = (v, m) => (Number.isFinite(v) ? Math.max(-m, Math.min(m, v)) : 0);
    return { vx: c(vx, MAX_LINEAR), vy: c(vy, MAX_LINEAR), vyaw: c(vyaw, MAX_YAW) };
}
