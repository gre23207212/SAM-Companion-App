import * as THREE from "three";
export const MAP_ROBOT_LENGTH = 0.6;
/** The uploaded Go2 is Y-up; the live odometry map is Z-up, X-forward. */
export function prepareMapRobot(model) {
    model.rotation.x = Math.PI / 2;
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    if (size.x <= 0)
        return model;
    model.scale.setScalar(MAP_ROBOT_LENGTH / size.x);
    model.updateMatrixWorld(true);
    const scaled = new THREE.Box3().setFromObject(model);
    const center = scaled.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -center.y, -scaled.min.z);
    return model;
}
/** Which band a part sits in, by the height of its centre (0 = floor, 1 = top). */
export function robotPart(heightRatio) {
    if (heightRatio < 0.15)
        return "feet";
    if (heightRatio < 0.6)
        return "legs";
    return "body";
}
/** Colour vertices individually so a single mesh can contain shell, legs and rubber feet. */
export function colorMapRobot(model, palette) {
    model.updateMatrixWorld(true);
    const all = new THREE.Box3().setFromObject(model);
    const height = all.max.z - all.min.z || 1;
    const point = new THREE.Vector3();
    model.traverse((node) => {
        if (!(node instanceof THREE.Mesh))
            return;
        // Clone geometry: meshes in the uploaded model may share it.
        node.geometry = node.geometry.clone();
        const positions = node.geometry.getAttribute("position");
        const colors = new Float32Array(positions.count * 3);
        for (let i = 0; i < positions.count; i++) {
            point.fromBufferAttribute(positions, i).applyMatrix4(node.matrixWorld);
            const ratio = (point.z - all.min.z) / height;
            const color = ratio > 0.92 && palette.trim ? palette.trim : palette[robotPart(ratio)];
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        node.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        node.material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            metalness: 0.45,
            roughness: 0.38,
        });
    });
    return model;
}
