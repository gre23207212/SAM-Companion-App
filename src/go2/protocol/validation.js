import forge from 'node-forge';
import { DATA_CHANNEL_TYPE } from './topics.js';
import { log } from '../ui/logger.js';
export function handleValidation(msg, webrtc, onValidated) {
    if (msg.type !== DATA_CHANNEL_TYPE.VALIDATION)
        return;
    const data = msg.data;
    log.webrtc.debug('[go2:val] Validation message data:', JSON.stringify(data));
    if (data === 'Validation Ok.') {
        log.webrtc.info('[go2:val] Validation OK!');
        onValidated();
        return;
    }
    // Device sent a hex key challenge — respond with MD5
    // Python ref: md5(input) → hex string → bytes.fromhex() → base64
    const md5Input = `UnitreeGo2_${data}`;
    const md5Hex = forge.md.md5.create().update(md5Input).digest().toHex();
    // Convert hex string to raw bytes, then base64 encode
    const md5Bytes = forge.util.hexToBytes(md5Hex);
    const responseB64 = forge.util.encode64(md5Bytes);
    log.webrtc.debug('[go2:val] Challenge key:', data);
    log.webrtc.debug('[go2:val] MD5 hex:', md5Hex);
    log.webrtc.debug('[go2:val] Base64 response:', responseB64);
    webrtc.send({
        type: DATA_CHANNEL_TYPE.VALIDATION,
        topic: '',
        data: responseB64,
    });
    log.webrtc.debug('[go2:val] Sent validation response');
}
