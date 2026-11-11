import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VoxelMap } from '../go2/ui/scene/voxel-map.js';
import { onLidarFrame, setLidar, getActivePose, getActiveObstacles, getLinkState, subscribeLink } from '../lib/go2-link.js';
import { buildSafetyGrid, GRID_CELL } from '../lib/drive-safety.js';
import { getPersonPings, clearPersonPings } from '../lib/person-detection.js';
import { getAlerts, subscribeAlerts } from '../lib/alerts-store.js';
import { html, scope, icon } from './dom.js';
export function mappingPage() {
    const life = scope();
    let follow = true, points = 0, liveMesh = true, dense = false, voxelMap = null, clearPathAction = null;
    const node = html(`<div class="h-full min-h-0 relative bg-background overflow-hidden">
      <div data-scene class="absolute inset-0"></div>
      <div class="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-start justify-between gap-3 pointer-events-none">
        <div data-message role="status" class="pointer-events-none max-w-xs rounded-lg border border-border/60 bg-card/90 px-3 py-2 text-xs text-muted-foreground backdrop-blur-sm"></div>
        <div data-toolbar class="pointer-events-auto ml-auto max-w-full flex flex-wrap items-center justify-end gap-2 rounded-xl border border-border/70 bg-card/90 p-2 shadow-lg backdrop-blur-md"></div>
      </div>
      <div class="absolute top-24 right-4 z-10 flex flex-col gap-2">
        <button data-view="reset" title="Reset map camera" aria-label="Reset map camera" class="rounded-lg border border-border bg-card/90 p-2 text-muted-foreground hover:text-primary">${icon('maximize',17)}</button>
      </div>
      <div data-person class="absolute top-24 left-4 z-10 rounded-lg bg-card/90 border border-primary/40 px-3 py-2 text-xs max-w-xs"></div>
      <div data-model role="status" class="absolute bottom-4 left-4 text-xs font-mono text-muted-foreground bg-card/90 border border-border px-3 py-2 rounded-lg"></div>
      <div class="absolute bottom-4 right-4 w-64 max-w-[42%] rounded-xl border border-border/70 bg-card/90 shadow-lg overflow-hidden" data-camera-panel hidden>
        <div class="px-3 py-2 text-[11px] font-semibold flex items-center justify-between"><span>LIVE CAMERA</span><span class="text-primary">● LIVE</span></div>
        <video autoplay playsinline muted class="w-full aspect-video object-cover bg-background"></video>
      </div>
    </div>`);
    const modelStatus = (text) => { const el = node.querySelector('[data-model]'); el.textContent = text; el.hidden = !text; };
    modelStatus('');
    function scene() {
        const mount = node.querySelector("[data-scene]");
        if (!mount)
            return;
        const tokens = getComputedStyle(document.documentElement);
        const color = (token) => new THREE.Color(`hsl(${tokens.getPropertyValue(token).trim().replace(/ /g, ", ")})`);
        const scene = new THREE.Scene();
        scene.background = color("--background");
        scene.add(new THREE.HemisphereLight(color("--foreground"), color("--secondary"), 2));
        const light = new THREE.DirectionalLight(color("--foreground"), 3);
        light.position.set(-2, -3, 6);
        scene.add(light);
        const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / mount.clientHeight, 0.05, 500);
        camera.up.set(0, 0, 1); // robot frame is Z-up
        camera.position.set(-4, -4, 4);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        mount.appendChild(renderer.domElement);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.minDistance = 1.5;
        controls.maxDistance = 70;
        node.querySelector('[data-view="reset"]').onclick = () => { controls.target.set(0, 0, 0); camera.position.set(-4, -4, 4); controls.update(); };
        const grid = new THREE.GridHelper(24, 24, color("--border"), color("--border"));
        grid.rotation.x = Math.PI / 2;
        scene.add(grid);
        // Low-profile navigation chevron, pointing along local +X (Go2 forward).
        const marker = new THREE.Group();
        const chevronShape = new THREE.Shape();
        [[0.65, 0], [-0.28, 0.39], [-0.13, 0], [-0.28, -0.39]].forEach(([x, y], i) => {
            if (i === 0) chevronShape.moveTo(x, y);
            else chevronShape.lineTo(x, y);
        });
        chevronShape.closePath();
        const chevronGeo = new THREE.ShapeGeometry(chevronShape);
        const chevron = new THREE.Mesh(chevronGeo, new THREE.MeshBasicMaterial({
            color: 0xff8a00, side: THREE.DoubleSide, depthTest: false,
        }));
        chevron.renderOrder = 20;
        const outlinePoints = [[0.65, 0], [-0.28, 0.39], [-0.13, 0], [-0.28, -0.39], [0.65, 0]]
            .map(([x, y]) => new THREE.Vector3(x, y, 0.008));
        const outlineGeo = new THREE.BufferGeometry().setFromPoints(outlinePoints);
        const outline = new THREE.Line(outlineGeo, new THREE.LineBasicMaterial({
            color: 0xffd18b, depthTest: false,
        }));
        outline.renderOrder = 21;
        marker.add(chevron, outline);
        scene.add(marker);
        // Fixed-capacity route buffer: sample at most every 10 cm, never allocate per frame.
        const MAX_TRAIL_POINTS = 2048;
        const trailPositions = new Float32Array(MAX_TRAIL_POINTS * 3);
        const trailGeo = new THREE.BufferGeometry();
        trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3).setUsage(THREE.DynamicDrawUsage));
        trailGeo.setDrawRange(0, 0);
        const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({
            color: 0xff8a00, transparent: true, opacity: 0.9, depthTest: false,
        }));
        trail.frustumCulled = false;
        trail.renderOrder = 15;
        scene.add(trail);
        let trailCount = 0;
        let lastTrailX = NaN, lastTrailY = NaN;
        const clearPath = () => {
            trailCount = 0;
            lastTrailX = NaN;
            lastTrailY = NaN;
            trailGeo.setDrawRange(0, 0);
            trailGeo.attributes.position.needsUpdate = true;
        };
        clearPathAction = clearPath;
        const appendTrail = (pose) => {
            if (!Number.isFinite(pose.x) || !Number.isFinite(pose.y) || !Number.isFinite(pose.z)) return;
            if (Number.isFinite(lastTrailX) && Math.hypot(pose.x - lastTrailX, pose.y - lastTrailY) < 0.1) return;
            if (trailCount === MAX_TRAIL_POINTS) {
                trailPositions.copyWithin(0, 3);
                trailCount--;
            }
            const i = trailCount++ * 3;
            trailPositions[i] = pose.x;
            trailPositions[i + 1] = pose.y;
            trailPositions[i + 2] = pose.z - 0.31;
            lastTrailX = pose.x;
            lastTrailY = pose.y;
            trailGeo.setDrawRange(0, trailCount);
            trailGeo.attributes.position.needsUpdate = true;
        };
        // Path safety grid: red = blocked, amber = within 0.4 m of an obstacle.
        const MAX_CELLS = 6000;
        const cellGeo = new THREE.PlaneGeometry(GRID_CELL * 0.92, GRID_CELL * 0.92);
        const mkLayer = (token, opacity, z) => {
            const m = new THREE.InstancedMesh(cellGeo, new THREE.MeshBasicMaterial({ color: color(token), transparent: true, opacity, depthWrite: false }), MAX_CELLS);
            m.count = 0;
            m.position.z = z;
            m.frustumCulled = false;
            scene.add(m);
            return m;
        };
        const blockedLayer = mkLayer("--destructive", 0.75, 0.02);
        const unsafeLayer = mkLayer("--warning", 0.35, 0.01);
        const pingGeo = new THREE.SphereGeometry(0.15, 16, 12);
        const pingMat = new THREE.MeshBasicMaterial({ color: color("--success") });
        const pingGroup = new THREE.Group();
        scene.add(pingGroup);
        const tmp = new THREE.Object3D();
        const fill = (layer, cells, floor) => {
            const n = Math.min(cells.length, MAX_CELLS);
            for (let k = 0; k < n; k++) {
                tmp.position.set((cells[k][0] + 0.5) * GRID_CELL, (cells[k][1] + 0.5) * GRID_CELL, floor);
                tmp.updateMatrix();
                layer.setMatrixAt(k, tmp.matrix);
            }
            layer.count = n;
            layer.instanceMatrix.needsUpdate = true;
        };
        const refreshOverlays = () => {
            const pose = getActivePose();
            const floor = pose ? pose.z - 0.32 : 0;
            const grid = buildSafetyGrid(getActiveObstacles());
            fill(blockedLayer, grid.blocked, floor);
            fill(unsafeLayer, grid.unsafe, floor);
            const pings = getPersonPings();
            while (pingGroup.children.length < pings.length) {
                const p = pings[pingGroup.children.length];
                const m = new THREE.Mesh(pingGeo, pingMat);
                m.position.set(p.x, p.y, floor + 0.15);
                pingGroup.add(m);
            }
            while (pingGroup.children.length > pings.length)
                pingGroup.remove(pingGroup.children[pingGroup.children.length - 1]);
        };
        refreshOverlays();
        const overlayTimer = setInterval(refreshOverlays, 400);
        const voxel = new VoxelMap(scene);
        voxelMap = voxel;
        const statTimer = setInterval(() => points = voxel.pointCount, 500);
        const offFrame = onLidarFrame((d) => voxel.processCompressed(d));
        let raf = 0;
        const tick = () => {
            const pose = getActivePose();
            if (pose) {
                marker.position.set(pose.x, pose.y, pose.z - 0.3);
                if (Number.isFinite(pose.yaw)) {
                    const deltaYaw = Math.atan2(Math.sin(pose.yaw - marker.rotation.z), Math.cos(pose.yaw - marker.rotation.z));
                    marker.rotation.z += deltaYaw * 0.22;
                }
                appendTrail(pose);
                if (follow) {
                    const delta = new THREE.Vector3(pose.x, pose.y, pose.z).sub(controls.target);
                    controls.target.add(delta);
                    camera.position.add(delta);
                }
            }
            controls.update();
            renderer.render(scene, camera);
            raf = requestAnimationFrame(tick);
        };
        tick();
        const ro = new ResizeObserver(() => {
            camera.aspect = mount.clientWidth / mount.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(mount.clientWidth, mount.clientHeight);
        });
        ro.observe(mount);
        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            offFrame();
            clearInterval(overlayTimer);
            clearInterval(statTimer);
            [blockedLayer, unsafeLayer].forEach((l) => { scene.remove(l); l.material.dispose(); l.dispose(); });
            cellGeo.dispose();
            pingGeo.dispose();
            pingMat.dispose();
            voxel.destroy();
            clearPathAction = null;
            scene.remove(trail);
            trailGeo.dispose();
            trail.material.dispose();
            marker.traverse((node) => {
                if (!(node instanceof THREE.Mesh || node instanceof THREE.Line))
                    return;
                node.geometry.dispose();
                const materials = Array.isArray(node.material) ? node.material : [node.material];
                materials.forEach((material) => material.dispose());
            });
            grid.geometry.dispose();
            const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
            gridMaterials.forEach((material) => material.dispose());
            controls.dispose();
            renderer.dispose();
            mount.removeChild(renderer.domElement);
        };
    }
    let started = false;
    const start = () => { if (started)
        return; started = true; try {
        const cleanup = scene();
        if (cleanup)
            life.add(cleanup);
    }
    catch (error) {
        modelStatus('3D RENDERER ERROR: ' + error.message);
    } };
    const frame = requestAnimationFrame(start);
    life.add(() => cancelAnimationFrame(frame));
    const refresh = () => {
        const link = getLinkState(), online = link.status === 'online', busy = ['connecting', 'validating'].includes(link.status), toolbar = node.querySelector('[data-toolbar]');
        toolbar.hidden = false;
        toolbar.innerHTML = '<div class="flex flex-wrap items-center gap-2">' + [['lidar', icon('radar', 14) + (link.lidarOn ? 'LiDAR on' : 'Start LiDAR')], ['blocks', 'Live blocks'], ['dense', dense ? 'Detail: Max' : 'Detail: Clean'], ['follow', icon('crosshair', 14) + 'Follow'], ['clearPath', icon('route', 14) + 'Clear Path'], ['clear', icon('trash-2', 14) + 'Clear']].map(([id, label]) => '<button data-action="' + id + '" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ' + ((id === 'blocks' && liveMesh) || (id === 'dense' && dense) || (id === 'follow' && follow) ? 'border-primary/40 text-primary bg-primary/10' : 'border-border text-muted-foreground') + '">' + label + '</button>').join('') + '</div>';
        toolbar.querySelectorAll('button').forEach(b => { if (b.dataset.action === 'lidar' && !online) { b.disabled = true; b.title = 'Connect the Go2 to start LiDAR'; b.classList.add('opacity-50', 'cursor-not-allowed'); } b.onclick = () => { switch (b.dataset.action) {
            case 'lidar':
                setLidar(!link.lidarOn);
                break;
            case 'blocks':
                liveMesh = !liveMesh;
                voxelMap?.setLiveMeshVisible(liveMesh);
                break;
            case 'dense':
                dense = !dense;
                if (voxelMap)
                    voxelMap.minHits = dense ? 1 : 2;
                break;
            case 'follow':
                follow = !follow;
                break;
            case 'clearPath':
                clearPathAction?.();
                break;
            case 'clear':
                voxelMap?.clear();
                clearPersonPings();
                break;
        } refresh(); }; });
        const msg = node.querySelector('[data-message]');
        msg.hidden = online && !link.error;
        msg.textContent = link.status === 'error'
            ? (link.error || 'Connection error')
            : busy ? 'Connecting to Go2…'
            : 'Robot not linked · Connect your Go2 to receive LiDAR mapping.';
        const person = getAlerts().find(a => a.personId), el = node.querySelector('[data-person]');
        el.hidden = !person;
        if (person)
            el.textContent = 'Latest detection: ' + person.message + ' · ' + (person.survivorStatus ?? '').replace('_', ' ');
        const video = node.querySelector('video');
        node.querySelector('[data-camera-panel]').hidden = !link.stream;
        if (video.srcObject !== link.stream) {
            video.srcObject = link.stream;
            if (link.stream)
                video.play().catch(() => { });
        }
    };
    life.add(subscribeLink(refresh));
    life.add(subscribeAlerts(refresh));
    life.interval(refresh, 500);
    refresh();
    life.add(() => { node.querySelector('video').srcObject = null; });
    return { node, destroy: () => life.destroy() };
}
