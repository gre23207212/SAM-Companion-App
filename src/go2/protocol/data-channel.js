import { handleValidation } from './validation.js';
import { startHeartbeat, stopHeartbeat } from './heartbeat.js';
import { DATA_CHANNEL_TYPE } from './topics.js';
import { log } from '../ui/logger.js';
export class DataChannelHandler {
    webrtc;
    validated = false;
    callbacks;
    lastValidationKey = '';
    /** App-level handler for topic data messages (set by App after construction). */
    onTopicData = null;
    /** App-level handler for "errors" / "add_error" / "rm_error" wire messages. */
    onErrorMessage = null;
    constructor(webrtc, callbacks) {
        this.webrtc = webrtc;
        this.callbacks = callbacks;
    }
    handleMessage(msg) {
        if (msg.type === DATA_CHANNEL_TYPE.VALIDATION) {
            if (msg.data && msg.data !== 'Validation Ok.') {
                this.lastValidationKey = msg.data;
            }
            handleValidation(msg, this.webrtc, () => {
                this.validated = true;
                startHeartbeat(this.webrtc);
                this.callbacks.onValidated();
            });
            return;
        }
        // Robot sends "Validation Needed." as an err message if it missed our response
        if (msg.type === DATA_CHANNEL_TYPE.ERR) {
            const info = msg.info;
            if (info === 'Validation Needed.') {
                log.webrtc.info('[go2:dc] Re-sending validation (err: Validation Needed)');
                handleValidation({ type: DATA_CHANNEL_TYPE.VALIDATION, topic: '', data: this.lastValidationKey }, this.webrtc, () => {
                    this.validated = true;
                    startHeartbeat(this.webrtc);
                    this.callbacks.onValidated();
                });
                return;
            }
        }
        // Handle RTC inner requests (RTT probes, network status responses, etc.)
        if (msg.type === DATA_CHANNEL_TYPE.RTC_INNER_REQ) {
            const info = msg.info;
            if (info && info.req_type === 'rtt_probe_send_from_mechine') {
                // Echo RTT probes back to the robot (required for connection health)
                this.webrtc.send({
                    type: DATA_CHANNEL_TYPE.RTC_INNER_REQ,
                    topic: '',
                    data: info,
                });
                return;
            }
            // Forward other RTC_INNER_REQ messages (e.g. network status) to app handler
            if (this.onTopicData) {
                this.onTopicData(msg);
            }
            return;
        }
        // Silently ignore heartbeat echoes
        if (msg.type === DATA_CHANNEL_TYPE.HEARTBEAT)
            return;
        // Robot fault messages — snapshot + per-fault deltas (add_error / rm_error)
        if (msg.type === DATA_CHANNEL_TYPE.ERRORS ||
            msg.type === DATA_CHANNEL_TYPE.ADD_ERROR ||
            msg.type === DATA_CHANNEL_TYPE.RM_ERROR) {
            this.onErrorMessage?.(msg.type, msg.data);
            return;
        }
        // Forward topic data to the app-level handler (avoids recursive loop with callbacks.onMessage)
        if (this.onTopicData) {
            this.onTopicData(msg);
        }
    }
    subscribe(topic) {
        this.webrtc.send({
            type: DATA_CHANNEL_TYPE.SUBSCRIBE,
            topic,
        });
    }
    unsubscribe(topic) {
        this.webrtc.send({
            type: DATA_CHANNEL_TYPE.UNSUBSCRIBE,
            topic,
        });
    }
    publish(topic, data) {
        this.webrtc.send({
            type: DATA_CHANNEL_TYPE.MSG,
            topic,
            data,
        });
    }
    /** Send a message with a specific data channel type (e.g. VID to enable video). */
    publishTyped(topic, data, type) {
        this.webrtc.send({ type, topic, data });
    }
    /** Send a request matching the SDK format: header + parameter (JSON string) + binary.
     *  Returns the generated `id` so the caller can correlate the response
     *  (the robot echoes it back in `header.identity.id`).
     *
     *  `priority: 1` is used by emergency-stop / damping to jump the queue;
     *  the policy object is only attached when priority is requested. */
    publishRequest(topic, apiId, parameter = '{}', options = {}) {
        const id = Math.floor(Math.random() * 2147483647);
        const header = {
            identity: { id, api_id: apiId },
        };
        if (options.priority)
            header.policy = { priority: 1 };
        this.webrtc.send({
            type: DATA_CHANNEL_TYPE.REQUEST,
            topic,
            data: {
                header,
                parameter,
                binary: [],
            },
        });
        return id;
    }
    /** Request a static file from the robot. Returns base64 data via callback. */
    requestFile(filePath, onComplete) {
        const uuid = `req_${Date.now() % 2 ** 31 + Math.floor(Math.random() * 1000)}`;
        const chunks = [];
        // Set up a one-time listener for the response
        const prevHandler = this.onTopicData;
        const handler = (msg) => {
            const m = msg;
            if (m.type === DATA_CHANNEL_TYPE.RTC_INNER_REQ &&
                m.info?.req_type === 'request_static_file' &&
                m.info?.req_uuid === uuid) {
                const file = m.info.file;
                if (file?.enable_chunking) {
                    const chunk = file.data || '';
                    chunks.push(chunk);
                    // APK: chunk_index < total_chunk_num means more chunks coming
                    // Last chunk: chunk_index >= total_chunk_num
                    if (file.chunk_index !== undefined && file.total_chunk_num !== undefined &&
                        file.chunk_index >= file.total_chunk_num) {
                        this.onTopicData = prevHandler;
                        onComplete(chunks.join(''));
                    }
                }
                else if (file?.data) {
                    this.onTopicData = prevHandler;
                    onComplete(file.data);
                }
                else {
                    this.onTopicData = prevHandler;
                    onComplete(null);
                }
                return;
            }
            // Forward non-matching messages to the original handler
            if (prevHandler)
                prevHandler(msg);
        };
        this.onTopicData = handler;
        // Send the request
        this.webrtc.send({
            type: DATA_CHANNEL_TYPE.RTC_INNER_REQ,
            topic: '',
            data: {
                req_type: 'request_static_file',
                req_uuid: uuid,
                related_bussiness: 'uslam_final_pcd',
                file_md5: 'null',
                file_path: filePath,
            },
        });
        // Timeout after 30s
        setTimeout(() => {
            if (this.onTopicData === handler) {
                this.onTopicData = prevHandler;
                onComplete(null);
            }
        }, 30000);
    }
    /**
     * Push a static file to the robot in chunks (mirrors the APK's uploadFile).
     * `base64Data` is the file payload base64-encoded. `filePath` is the robot-side
     * slot name (e.g. "map.pcd"). Resolves once the robot acks every chunk; rejects
     * on chunk failure or per-chunk timeout.
     */
    async pushFile(filePath, base64Data, business = 'uslam_final_pcd', chunkSize = 30 * 1024, onProgress) {
        const chunks = [];
        for (let i = 0; i < base64Data.length; i += chunkSize) {
            chunks.push(base64Data.slice(i, i + chunkSize));
        }
        const total = chunks.length;
        if (total === 0)
            throw new Error(`pushFile: empty payload for ${filePath}`);
        const prevHandler = this.onTopicData;
        let pendingUuid = '';
        let pendingResolve = null;
        this.onTopicData = (msg) => {
            const m = msg;
            if (m.type === DATA_CHANNEL_TYPE.RTC_INNER_REQ &&
                m.info?.req_type === 'push_static_file' &&
                m.info?.req_uuid === pendingUuid &&
                pendingResolve) {
                const r = pendingResolve;
                pendingResolve = null;
                r(m.info.file_status ?? null);
                return;
            }
            if (prevHandler)
                prevHandler(msg);
        };
        try {
            for (let g = 0; g < total; g++) {
                // Throttle: 500ms breather every 5 chunks (matches APK)
                if (g > 0 && g % 5 === 0) {
                    await new Promise((r) => setTimeout(r, 500));
                }
                const uuid = `upload_req_${Date.now() % 2 ** 31 + Math.floor(Math.random() * 1000)}_${g}`;
                pendingUuid = uuid;
                const ack = new Promise((resolve) => {
                    pendingResolve = resolve;
                    setTimeout(() => {
                        if (pendingResolve === resolve) {
                            pendingResolve = null;
                            resolve(null);
                        }
                    }, 10000);
                });
                this.webrtc.send({
                    type: DATA_CHANNEL_TYPE.RTC_INNER_REQ,
                    topic: '',
                    data: {
                        req_type: 'push_static_file',
                        req_uuid: uuid,
                        related_bussiness: business,
                        file_md5: 'null',
                        file_path: filePath,
                        file_size_after_b64: base64Data.length,
                        file: {
                            chunk_index: g + 1,
                            total_chunk_num: total,
                            chunk_data: chunks[g],
                            chunk_data_size: chunks[g].length,
                        },
                    },
                });
                const status = await ack;
                if (status !== 'ok') {
                    throw new Error(`pushFile: ${filePath} chunk ${g + 1}/${total} status=${status ?? 'timeout'}`);
                }
                onProgress?.((g + 1) / total);
            }
        }
        finally {
            this.onTopicData = prevHandler;
        }
    }
    isValidated() {
        return this.validated;
    }
    destroy() {
        stopHeartbeat();
        this.validated = false;
    }
}
