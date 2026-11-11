export const FACE_LABELS_PS = ["✕", "○", "□", "△"];
export const FACE_LABELS_XBOX = ["A", "B", "X", "Y"];
export const FACE_BUTTON_INDEX = {
    cross: 0,
    circle: 1,
    square: 2,
    triangle: 3,
};
export function isPlayStationController(name) {
    return /dualsense|wireless controller|playstation/i.test(name);
}
export function getFaceLabels(name) {
    return isPlayStationController(name) ? FACE_LABELS_PS : FACE_LABELS_XBOX;
}
