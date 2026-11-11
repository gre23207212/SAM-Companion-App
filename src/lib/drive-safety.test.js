import { describe, expect, it } from "vitest";
import { clampVelocity, MAX_LINEAR, MAX_YAW } from "./drive-limits.js";
import { guardVelocity, buildSafetyGrid } from "./drive-safety.js";
import { matchPerson } from "./person-tracking.js";
describe("speed cap", () => {
    it("caps forward, backward and strafe at 0.15 m/s", () => {
        expect(MAX_LINEAR).toBe(0.15);
        expect(clampVelocity(1, -1, 0)).toMatchObject({ vx: 0.15, vy: -0.15 });
        expect(clampVelocity(-0.5, 0, 0).vx).toBe(-0.15);
    });
    it("allows turning up to 0.8 rad/s", () => {
        expect(MAX_YAW).toBe(0.8);
        expect(clampVelocity(0, 0, 3).vyaw).toBe(0.8);
    });
});
describe("LiDAR braking", () => {
    const pose = { x: 0, y: 0, yaw: 0 };
    it("blocks driving toward a close obstacle", () => {
        expect(guardVelocity({ vx: 0.15, vy: 0, vyaw: 0 }, pose, [[0.4, 0]]).blocked).toBe(true);
    });
    it("allows driving away from it and turning in place", () => {
        expect(guardVelocity({ vx: -0.15, vy: 0, vyaw: 0 }, pose, [[0.4, 0]]).blocked).toBe(false);
        expect(guardVelocity({ vx: 0, vy: 0, vyaw: 0.5 }, pose, [[0.4, 0]]).vyaw).toBe(0.5);
    });
    it("ignores obstacles beyond stopping distance", () => {
        expect(guardVelocity({ vx: 0.15, vy: 0, vyaw: 0 }, pose, [[2, 0]]).blocked).toBe(false);
    });
});
describe("safety grid", () => {
    it("marks cells within 0.4 m as unsafe but not farther", () => {
        const g = buildSafetyGrid([[0.1, 0.1]]);
        expect(g.blocked).toEqual([[0, 0]]);
        expect(g.unsafe).toContainEqual([2, 0]);
        expect(g.unsafe).not.toContainEqual([3, 0]);
    });
});
describe("person tracking", () => {
    const a = [0.2, 0.2, 0.2, 0.8, 0.1, 0.1, 0.3, 0.3, 0.3];
    it("recognises the same person again", () => {
        expect(matchPerson(a.map((v) => v + 0.01), [a])).toBe(0);
    });
    it("treats a differently dressed person as new", () => {
        expect(matchPerson([0.9, 0.9, 0.9, 0.1, 0.1, 0.8, 0.1, 0.1, 0.1], [a])).toBe(-1);
    });
});
