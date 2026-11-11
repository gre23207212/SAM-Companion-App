import { describe, it, expect, beforeEach } from "vitest";
import { getBindings, setKeyBinding, setPadBinding, resetBindings, keyboardAxes, createControlProfile, getControlProfiles, selectControlProfile, deleteControlProfile, renameControlProfile } from "./bindings.js";
describe("bindings", () => {
    beforeEach(() => {
        while (getControlProfiles().profiles.length > 1)
            deleteControlProfile();
        resetBindings();
        renameControlProfile("Default");
    });
    it("rebinding a key to one already in use swaps them", () => {
        setKeyBinding("forward", "s");
        expect(getBindings().keys.forward).toBe("s");
        expect(getBindings().keys.back).toBe("w");
    });
    it("rebinding a controller button swaps clashes", () => {
        setPadBinding("stop", 3);
        expect(getBindings().pad.stop).toBe(3);
        expect(getBindings().pad.standUp).toBe(1);
    });
    it("keyboard axes follow the custom bindings", () => {
        setKeyBinding("forward", "arrowup");
        expect(keyboardAxes(new Set(["arrowup"])).forward).toBe(1);
        expect(keyboardAxes(new Set(["w"])).forward).toBe(0);
    });
    it("saves independent keyboard and controller profiles and switches both", () => {
        const first = getControlProfiles().activeId;
        createControlProfile("Rescue");
        const rescue = getControlProfiles().activeId;
        setKeyBinding("forward", "arrowup");
        setPadBinding("stop", 5);
        selectControlProfile(first);
        expect(getBindings().keys.forward).toBe("w");
        expect(getBindings().pad.stop).toBe(1);
        selectControlProfile(rescue);
        expect(getBindings().keys.forward).toBe("arrowup");
        expect(getBindings().pad.stop).toBe(5);
        const saved = JSON.parse(localStorage.getItem("sam-control-profiles-v1") ?? "{}");
        expect(saved.activeId).toBe(rescue);
        expect(saved.profiles[1].bindings.keys.forward).toBe("arrowup");
    });
    it("reset affects only the selected profile", () => {
        setKeyBinding("forward", "arrowup");
        const first = getControlProfiles().activeId;
        createControlProfile("Second");
        resetBindings();
        selectControlProfile(first);
        expect(getBindings().keys.forward).toBe("arrowup");
    });
    it("keeps at least one profile and rejects duplicate names", () => {
        expect(createControlProfile("default")).toBe(false);
        deleteControlProfile();
        expect(getControlProfiles().profiles.length).toBe(1);
    });
});
