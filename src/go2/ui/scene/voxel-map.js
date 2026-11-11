import * as THREE from 'three';
import { log, pipeWorkerLogs } from '../logger.js';
export class VoxelMap {
    scene;
    mesh = null;
    material;
    worker = null;
    throttleTimer = null;
    pendingData = null;
    // Persistent world map: every voxel ever seen, kept after it leaves the
    // robot's live LiDAR window, coloured by height.
    static MAX_POINTS = 600_000;
    cloudPos = new Float32Array(VoxelMap.MAX_POINTS * 3);
    cloudCol = new Float32Array(VoxelMap.MAX_POINTS * 3);
    pending = new Map();
    cloudCount = 0;
    cloudGeo = new THREE.BufferGeometry();
    cloud;
    cloudMat;
    tmpColor = new THREE.Color();
    /** Hide noise: a voxel must be seen this many frames before it shows. */
    minHits = 2;
    get pointCount() { return this.cloudCount; }
    constructor(scene) {
        this.scene = scene;
        // APK: MeshBasicMaterial with axisColor4.png texture, NearestFilter, DoubleSide
        const texture = new THREE.TextureLoader().load('./models/axisColor4.png');
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        this.material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: false,
        });
        this.cloudGeo.setAttribute('position', new THREE.BufferAttribute(this.cloudPos, 3).setUsage(THREE.DynamicDrawUsage));
        this.cloudGeo.setAttribute('color', new THREE.BufferAttribute(this.cloudCol, 3).setUsage(THREE.DynamicDrawUsage));
        this.cloudGeo.setDrawRange(0, 0);
        this.cloudMat = new THREE.PointsMaterial({ size: 0.06, vertexColors: true, sizeAttenuation: true });
        this.cloud = new THREE.Points(this.cloudGeo, this.cloudMat);
        this.cloud.frustumCulled = false;
        scene.add(this.cloud);
        this.initWorker();
    }
    setPointSize(size) { this.cloudMat.size = size; }
    setLiveMeshVisible(v) { this.showLive = v; if (this.mesh)
        this.mesh.visible = v; }
    showLive = true;
    heightColor(z) {
        // floor (blue) -> knee (green) -> head height (red)
        const t = Math.max(0, Math.min(1, (z + 0.1) / 1.6));
        return this.tmpColor.setHSL(0.66 - t * 0.66, 0.9, 0.55);
    }
    accumulate(positions, faceCount, res, origin) {
        const before = this.cloudCount;
        for (let f = 0; f < faceCount; f++) {
            const b = f * 12;
            // voxel = min corner of the face's 4 vertices
            let x = 255, y = 255, z = 255;
            for (let v = 0; v < 12; v += 3) {
                x = Math.min(x, positions[b + v]);
                y = Math.min(y, positions[b + v + 1]);
                z = Math.min(z, positions[b + v + 2]);
            }
            const wx = Math.round(x + origin[0] / res);
            const wy = Math.round(y + origin[1] / res);
            const wz = Math.round(z + origin[2] / res);
            const key = `${wx},${wy},${wz}`;
            const hits = (this.pending.get(key) ?? 0) + 1;
            if (hits === -1)
                continue; // already placed
            if (hits < this.minHits) {
                this.pending.set(key, hits);
                continue;
            }
            if (this.cloudCount >= VoxelMap.MAX_POINTS)
                continue;
            this.pending.set(key, -2); // marks placed (+1 => -1)
            const i = this.cloudCount++;
            const pz = (wz + 0.5) * res;
            this.cloudPos.set([(wx + 0.5) * res, (wy + 0.5) * res, pz], i * 3);
            const c = this.heightColor(pz);
            this.cloudCol.set([c.r, c.g, c.b], i * 3);
        }
        this.cloudSize(res);
        if (this.cloudCount !== before) {
            this.cloudGeo.setDrawRange(0, this.cloudCount);
            this.cloudGeo.attributes.position.needsUpdate = true;
            this.cloudGeo.attributes.color.needsUpdate = true;
        }
    }
    cloudSize(res) {
        if (this.cloudMat.userData.res !== res) {
            this.cloudMat.userData.res = res;
            this.cloudMat.size = res * 1.15;
        }
    }
    initWorker() {
        try {
            this.worker = new Worker(new URL('../../workers/voxel-worker.js', import.meta.url), { type: 'module' });
            pipeWorkerLogs(this.worker, 'scene');
            this.worker.onmessage = (e) => {
                // pipeWorkerLogs uses addEventListener, but .onmessage still
                // fires for every message — skip log frames so applyGeometry
                // doesn't try to interpret them as a geometry payload.
                if (e.data?.type === '__log__')
                    return;
                this.applyGeometry(e.data);
            };
            this.worker.onerror = (err) => {
                log.scene.error('[go2:voxel] Worker error:', err);
            };
            log.scene.info('[go2:voxel] Worker initialized');
        }
        catch (err) {
            log.scene.error('[go2:voxel] Failed to create worker:', err);
        }
    }
    /** Send raw voxel_map_compressed data to the worker for decompression. */
    processCompressed(data) {
        if (!this.worker)
            return;
        // Throttle to 150ms (matching APK)
        this.pendingData = data;
        if (this.throttleTimer)
            return;
        this.throttleTimer = setTimeout(() => {
            this.throttleTimer = null;
            if (this.pendingData && this.worker) {
                this.worker.postMessage(this.pendingData);
                this.pendingData = null;
            }
        }, 60);
    }
    applyGeometry(result) {
        const { geometryData, resolution, origin } = result;
        if (geometryData.face_count === 0)
            return;
        // Ensure typed arrays after worker postMessage
        const positions = geometryData.positions instanceof Uint8Array
            ? geometryData.positions
            : new Uint8Array(geometryData.positions);
        const uvs = geometryData.uvs instanceof Uint8Array
            ? geometryData.uvs
            : new Uint8Array(geometryData.uvs);
        const indices = geometryData.indices instanceof Uint32Array
            ? geometryData.indices
            : new Uint32Array(geometryData.indices.buffer);
        this.accumulate(positions, geometryData.face_count, resolution, origin);
        // Remove old mesh
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
        }
        const geometry = new THREE.BufferGeometry();
        // Positions: Uint8 voxel grid coordinates, 3 components
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        // UVs: Uint8, 2 components, normalized to [0,1] — maps into axisColor4.png texture
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2, true));
        // Indices
        if (indices.length > 0) {
            geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        }
        this.mesh = new THREE.Mesh(geometry, this.material);
        // APK: mesh.scale.set(resolution), mesh.position.set(origin)
        this.mesh.scale.set(resolution, resolution, resolution);
        this.mesh.position.set(origin[0], origin[1], origin[2]);
        this.mesh.frustumCulled = false;
        this.mesh.visible = this.showLive;
        this.scene.add(this.mesh);
    }
    clear() {
        this.pending.clear();
        this.cloudCount = 0;
        this.cloudGeo.setDrawRange(0, 0);
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh = null;
        }
    }
    destroy() {
        this.clear();
        this.material.dispose();
        this.scene.remove(this.cloud);
        this.cloudGeo.dispose();
        this.cloudMat.dispose();
        this.worker?.terminate();
        if (this.throttleTimer)
            clearTimeout(this.throttleTimer);
    }
}
