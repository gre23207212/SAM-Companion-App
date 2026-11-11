import { afterEach, expect, it, vi } from "vitest";
afterEach(() => { vi.useRealTimers(); vi.resetModules(); });
it("keeps elapsed time when the dashboard is reopened", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-17T15:00:00Z"));
    vi.resetModules();
    const firstVisit = await import("./app-uptime");
    vi.advanceTimersByTime(12000);
    expect(firstVisit.formatAppUptime()).toBe("00:00:12");
    vi.advanceTimersByTime(8000);
    const returnVisit = await import("./app-uptime");
    expect(returnVisit.formatAppUptime()).toBe("00:00:20");
});
