// Sensor + focal-length math for the DP-facing HUD and camera inspector.
//
// SENSOR_WIDTH_MM is the horizontal photosite width of an ARRI-style
// "Super 35, 4-perf" digital sensor (the de-facto reference for modern
// scope/flat features). Real cameras vary a little (Alexa ~24.89mm,
// Venice S35 crop ~24.0mm) but this constant is a fine stand-in for previs
// focal-length readouts — swap it if you're matching a specific camera.
export const SENSOR_WIDTH_MM = 24.89;

// Three.js PerspectiveCamera.fov is the VERTICAL field of view in degrees.
// Convert to an equivalent 35mm-style focal length using the sensor width
// and the current horizontal FOV (derived from vFOV + aspect).
export function fovToFocalLengthMM(vFovDeg, aspect) {
  const vFovRad = (vFovDeg * Math.PI) / 180;
  const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);
  return SENSOR_WIDTH_MM / 2 / Math.tan(hFovRad / 2);
}

// Inverse of the above: given a desired focal length (mm) and the current
// render aspect, return the vertical FOV (degrees) to set on the camera.
export function focalLengthMMToFov(focalMM, aspect) {
  const hFovRad = 2 * Math.atan(SENSOR_WIDTH_MM / 2 / focalMM);
  const vFovRad = 2 * Math.atan(Math.tan(hFovRad / 2) / aspect);
  return (vFovRad * 180) / Math.PI;
}

// --- Starting camera placement from framing/angle shorthand -------------
// Actor origin is (0,0,0) on the ground, facing -Z, roughly 1.85m tall.
const FRAMING_DISTANCE_M = {
  ECU: 0.45,
  CU: 0.9,
  INSERT: 0.55,
  MEDIUM: 2.6,
};

const FRAMING_TARGET_HEIGHT_M = {
  ECU: 1.55,
  CU: 1.4,
  INSERT: 1.05,
  MEDIUM: 1.0,
};

const FRAMING_FOV_DEG = {
  ECU: 28,
  CU: 32,
  INSERT: 30,
  MEDIUM: 40,
};

const EYE_HEIGHT_M = 1.6;
const LOW_HEIGHT_M = 0.55;

export function defaultCameraForShot(shot) {
  const distance = FRAMING_DISTANCE_M[shot.framing] ?? 2.0;
  const targetY = FRAMING_TARGET_HEIGHT_M[shot.framing] ?? 1.2;
  const fov = FRAMING_FOV_DEG[shot.framing] ?? 35;
  const camY = shot.angle === "LOW" ? LOW_HEIGHT_M : EYE_HEIGHT_M;

  return {
    position: { x: 0, y: camY, z: distance },
    target: { x: 0, y: targetY, z: 0 },
    fov,
  };
}
