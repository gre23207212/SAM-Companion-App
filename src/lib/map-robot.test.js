import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { prepareMapRobot, colorMapRobot } from "./map-robot.js";
describe("small Go2 map marker", () => {
    it("keeps the model 0.6 metres long and places its feet on the map", () => {
        const model = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 0.5));
        prepareMapRobot(model);
        const bounds = new THREE.Box3().setFromObject(model);
        expect(bounds.getSize(new THREE.Vector3()).x).toBeCloseTo(0.6);
        expect(bounds.min.z).toBeCloseTo(0);
        expect(bounds.getCenter(new THREE.Vector3()).x).toBeCloseTo(0);
    });
});
import { robotPart } from "./map-robot.js";
describe("robot colours", () => {
    it("paints feet, legs and body by height", () => {
        expect(robotPart(0.05)).toBe("feet");
        expect(robotPart(0.4)).toBe("legs");
        expect(robotPart(0.8)).toBe("body");
    });
    it("colours feet, legs, shell and top trim within a single mesh", () => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0.4, 0, 0, 0.8, 0, 0, 1], 3));
        const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
        const palette = { body: new THREE.Color(0.8, 0.8, 0.8), legs: new THREE.Color(0.2, 0.2, 0.2), feet: new THREE.Color(0.05, 0.05, 0.05), trim: new THREE.Color(0.1, 0.1, 0.1) };
        colorMapRobot(mesh, palette);
        const colors = mesh.geometry.getAttribute("color");
        expect(colors.getX(0)).toBeCloseTo(0.05);
        expect(colors.getX(1)).toBeCloseTo(0.2);
        expect(colors.getX(2)).toBeCloseTo(0.8);
        expect(colors.getX(3)).toBeCloseTo(0.1);
        expect(geometry.getAttribute("color")).toBeUndefined();
    });
});
