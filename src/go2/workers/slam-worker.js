/**
 * Web Worker for SLAM point cloud processing using libvoxel-slam.wasm.
 * Mirrors the APK's three.worker-4tXjtm4c.js logic exactly.
 *
 * APK's WASM (libvoxel-amusQfn9.wasm) export layout:
 *   b = memory
 *   c = __wasm_call_ctors
 *   d = _reset
 *   e = _generate(xmin,xmax,ymin,ymax,zmin,zmax,numPts,input,maxPts,dict,indices,directOut,output,addedCount,outputCount)
 *   f = _malloc
 *   g = _free
 *   Import: a.a = emscripten_resize_heap (1 import only)
 */
import { workerLog } from './worker-logger.js';
const MAX_POINTS = 1_000_000;
class SlamProcessor {
    exports;
    heap;
    _input;
    _directOutput;
    _outputCount;
    _addedCount;
    _outputDict;
    _outputIndices;
    _output;
    constructor(exports) {
        this.exports = exports;
        this.heap = new Uint8Array(exports.b.buffer);
        this._input = exports.f(200_000);
        this._directOutput = exports.f(300_000);
        this._outputCount = exports.f(4);
        this._addedCount = exports.f(4);
        this._outputDict = exports.f(67_108_864);
        this._outputIndices = exports.f(MAX_POINTS * 4);
        this._output = exports.f(MAX_POINTS * 12);
    }
    clear() {
        // Refresh heap view in case memory grew
        this.heap = new Uint8Array(this.exports.b.buffer);
        this.heap.fill(0, this._outputDict, this._outputDict + 67_108_864);
        this.heap.fill(0, this._outputIndices, this._outputIndices + MAX_POINTS * 4);
        this.exports.d(); // _reset
    }
    generate(xmin, xmax, ymin, ymax, zmin, zmax, inputData) {
        // Refresh heap view
        this.heap = new Uint8Array(this.exports.b.buffer);
        this.heap.set(inputData, this._input);
        const numPoints = Math.floor(inputData.length / 6);
        this.exports.e(xmin, xmax, ymin, ymax, zmin, zmax, numPoints, this._input, MAX_POINTS, this._outputDict, this._outputIndices, this._directOutput, this._output, this._addedCount, this._outputCount);
        // Read results from heap
        const buf = this.exports.b.buffer;
        const outputCount = new Int32Array(buf, this._outputCount, 1)[0];
        const output = new Float32Array(buf.slice(this._output, this._output + outputCount * 12));
        const directOutput = new Float32Array(buf.slice(this._directOutput, this._directOutput + numPoints * 12));
        return { output, directOutput, outputCount, directCount: numPoints };
    }
}
// ── WASM Loading ──
async function loadWasm() {
    const wasmUrl = new URL('../../../public/libslam.wasm', import.meta.url).href;
    const wasmBytes = await fetch(wasmUrl).then((r) => r.arrayBuffer());
    const imports = {
        a: {
            a: () => 0, // emscripten_resize_heap — only 1 import needed
        },
    };
    const result = await WebAssembly.instantiate(wasmBytes, imports);
    const exports = result.instance.exports;
    // Run __wasm_call_ctors
    exports.c();
    return new SlamProcessor(exports);
}
// ── Worker Message Handler ──
let processor = null;
loadWasm().then((p) => {
    processor = p;
    workerLog.info('[slam-worker] WASM loaded, processor ready');
    self.postMessage({ type: 'ready' });
}).catch((err) => {
    workerLog.error('[slam-worker] WASM load failed:', err);
});
self.addEventListener('message', (e) => {
    if (!processor)
        return;
    if (e.data === 'clear') {
        processor.clear();
        return;
    }
    const msg = e.data;
    if (msg.type === 'newMap') {
        const d = msg.data;
        const result = processor.generate(d.xmin, d.xmax, d.ymin, d.ymax, d.zmin, d.zmax, new Uint8Array(d.data));
        self.postMessage({ type: 'newMap', data: result });
    }
    else if (msg.type === 'preview' || msg.type === 'navigation-path') {
        // PointCloud2 format (ROS2): {width, height, fields, point_step, data: ArrayBuffer}
        const d = msg.data;
        const width = d.width || 0;
        const height = d.height || 1;
        const numPoints = width * height;
        const fields = d.fields;
        const pointStep = d.point_step;
        const buf = d.data;
        if (!buf || !fields || fields.length < 3 || numPoints === 0)
            return;
        const view = new DataView(buf);
        const positions = new Float32Array(numPoints * 3);
        for (let i = 0; i < numPoints; i++) {
            positions[i * 3] = view.getFloat32(i * pointStep + fields[0].offset, true);
            positions[i * 3 + 1] = view.getFloat32(i * pointStep + fields[1].offset, true);
            positions[i * 3 + 2] = view.getFloat32(i * pointStep + fields[2].offset, true);
        }
        self.postMessage({ type: msg.type, data: { points: positions } });
    }
});
