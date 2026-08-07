import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { SHOTS, frameForShot } from "./shots.js";
import { defaultCameraForShot, fovToFocalLengthMM, focalLengthMMToFov } from "./cameraMath.js";
import { JOINT_NAMES, POSES, POSE_LABELS, resolvePose } from "./poses.js";
import { createScene, DEFAULT_SUN } from "./scene.js";
import { createDualRenderer } from "./render.js";
import { createCameraRig, createDraggableRig } from "./cameraRig.js";
import * as store from "./store.js";

// ---------------------------------------------------------------------
// Scene / renderer / camera setup
// ---------------------------------------------------------------------
const sceneBundle = createScene();
const { scene, mannequin } = sceneBundle;

const rig = createCameraRig();
scene.add(rig.camera);
scene.add(rig.helper);
scene.add(rig.targetGizmo);

const canvasMain = document.getElementById("viewport-canvas");
const canvasPreview = document.getElementById("preview-canvas");

const directorCamera = new THREE.PerspectiveCamera(50, 1, 0.05, 200);
directorCamera.position.set(2.6, 2.1, 4.2);

const { rendererMain, rendererPreview, resizeToContainer } = createDualRenderer(canvasMain, canvasPreview);

const orbitControls = new OrbitControls(directorCamera, canvasMain);
orbitControls.target.set(0, 1.1, 0);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.08;
orbitControls.update();

const draggable = createDraggableRig(rig, canvasMain, directorCamera, () => {
  syncCameraFieldsFromRig();
  autosaveCurrentShot();
});
scene.add(draggable.helper);
// TransformControls captures the pointer while dragging; suspend orbit so
// the two don't fight over the same drag gesture.
draggable.controls.addEventListener("dragging-changed", (e) => {
  orbitControls.enabled = !e.value;
});

const dragCameraBtn = document.getElementById("drag-camera-btn");
const dragTargetBtn = document.getElementById("drag-target-btn");
dragCameraBtn.addEventListener("click", () => {
  draggable.attachCamera();
  dragCameraBtn.dataset.active = "true";
  dragTargetBtn.dataset.active = "false";
});
dragTargetBtn.addEventListener("click", () => {
  draggable.attachTarget();
  dragCameraBtn.dataset.active = "false";
  dragTargetBtn.dataset.active = "true";
});

const directorOnlyObjects = [rig.gizmo, rig.helper, rig.targetGizmo, draggable.helper];

function setDirectorOnlyVisible(visible) {
  for (const obj of directorOnlyObjects) obj.visible = visible;
}

// ---------------------------------------------------------------------
// App state
// ---------------------------------------------------------------------
let shotIndex = 0;
let cameraState = null; // { position:{x,y,z}, target:{x,y,z}, roll, fov }
let poseState = null; // { rootHeight, joints:{...} }
let selectedJoint = JOINT_NAMES[0];
let aspectRatio = 2.39;
const globalState = store.loadGlobalState();
if (globalState.aspect) aspectRatio = globalState.aspect;
const sunState = globalState.sun || { ...DEFAULT_SUN };
sceneBundle.setSun(sunState.azimuth, sunState.elevation);

// ---------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------
const referenceImg = document.getElementById("reference-img");
const onionImg = document.getElementById("onion-img");
const onionToggle = document.getElementById("onion-toggle");
const onionOpacity = document.getElementById("onion-opacity");
const onionOpacityVal = document.getElementById("onion-opacity-val");
const referenceBox = document.getElementById("reference-box");
const previewBox = document.getElementById("preview-box");
const shotIndicator = document.getElementById("shot-indicator");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const cameraFields = document.getElementById("camera-fields");
const cameraResetBtn = document.getElementById("camera-reset-btn");
const jointSelect = document.getElementById("joint-select");
const jointSliders = document.getElementById("joint-sliders");
const posePresetSelect = document.getElementById("pose-preset-select");
const poseCopySelect = document.getElementById("pose-copy-select");
const poseCopyBtn = document.getElementById("pose-copy-btn");
const poseResetBtn = document.getElementById("pose-reset-btn");
const rootHeightSlider = document.getElementById("root-height");
const rootHeightVal = document.getElementById("root-height-val");
const aspectSelect = document.getElementById("aspect-select");
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importFile = document.getElementById("import-file");
const hudFocal = document.getElementById("hud-focal");
const hudHeight = document.getElementById("hud-height");

// ---------------------------------------------------------------------
// Reusable slider+number field row
// ---------------------------------------------------------------------
function createFieldRow(container, { label, min, max, step, value, onInput, unit = "" }) {
  const row = document.createElement("div");
  row.className = "field-row";
  const lbl = document.createElement("label");
  lbl.textContent = label;
  const range = document.createElement("input");
  range.type = "range";
  range.min = min;
  range.max = max;
  range.step = step;
  range.value = value;
  const num = document.createElement("input");
  num.type = "number";
  num.min = min;
  num.max = max;
  num.step = step;
  num.value = Math.round(value * 1000) / 1000;
  row.append(lbl, range, num);
  container.appendChild(row);

  function fire(v) {
    range.value = v;
    num.value = Math.round(v * 1000) / 1000;
    onInput(v);
  }
  range.addEventListener("input", () => fire(parseFloat(range.value)));
  num.addEventListener("input", () => {
    const v = parseFloat(num.value);
    if (!Number.isNaN(v)) fire(v);
  });
  return { row, range, num, set: (v) => { range.value = v; num.value = Math.round(v * 1000) / 1000; }, unit };
}

// ---------------------------------------------------------------------
// Camera inspector panel
// ---------------------------------------------------------------------
let camFieldRefs = {};

function buildCameraPanel() {
  cameraFields.innerHTML = "";
  camFieldRefs = {};

  const posTitle = document.createElement("div");
  posTitle.className = "field-group-title";
  posTitle.textContent = "Position (m)";
  cameraFields.appendChild(posTitle);
  camFieldRefs.posX = createFieldRow(cameraFields, { label: "X", min: -6, max: 6, step: 0.01, value: 0, onInput: (v) => { cameraState.position.x = v; applyCameraState(); autosaveCurrentShot(); } });
  camFieldRefs.posY = createFieldRow(cameraFields, { label: "Y", min: 0.05, max: 4, step: 0.01, value: 1.6, onInput: (v) => { cameraState.position.y = v; applyCameraState(); autosaveCurrentShot(); } });
  camFieldRefs.posZ = createFieldRow(cameraFields, { label: "Z", min: -6, max: 6, step: 0.01, value: 2, onInput: (v) => { cameraState.position.z = v; applyCameraState(); autosaveCurrentShot(); } });

  const targetTitle = document.createElement("div");
  targetTitle.className = "field-group-title";
  targetTitle.textContent = "Look-at target (m)";
  cameraFields.appendChild(targetTitle);
  camFieldRefs.tgtX = createFieldRow(cameraFields, { label: "X", min: -2.5, max: 2.5, step: 0.01, value: 0, onInput: (v) => { cameraState.target.x = v; applyCameraState(); autosaveCurrentShot(); } });
  camFieldRefs.tgtY = createFieldRow(cameraFields, { label: "Y", min: 0, max: 2.2, step: 0.01, value: 1.2, onInput: (v) => { cameraState.target.y = v; applyCameraState(); autosaveCurrentShot(); } });
  camFieldRefs.tgtZ = createFieldRow(cameraFields, { label: "Z", min: -2.5, max: 2.5, step: 0.01, value: 0, onInput: (v) => { cameraState.target.z = v; applyCameraState(); autosaveCurrentShot(); } });

  const lensTitle = document.createElement("div");
  lensTitle.className = "field-group-title";
  lensTitle.textContent = "Lens";
  cameraFields.appendChild(lensTitle);
  camFieldRefs.roll = createFieldRow(cameraFields, { label: "Roll", min: -45, max: 45, step: 0.5, value: 0, onInput: (v) => { cameraState.roll = v; applyCameraState(); autosaveCurrentShot(); } });
  camFieldRefs.fov = createFieldRow(cameraFields, { label: "FOV", min: 8, max: 90, step: 0.5, value: 35, onInput: (v) => { cameraState.fov = v; applyCameraState(); autosaveCurrentShot(); } });
  camFieldRefs.focal = createFieldRow(cameraFields, {
    label: "Focal", min: 8, max: 400, step: 1, value: 35,
    onInput: (v) => {
      const aspect = rig.camera.aspect || aspectRatio;
      cameraState.fov = focalLengthMMToFov(v, aspect);
      applyCameraState();
      autosaveCurrentShot();
    },
  });
}

function syncCameraFieldsFromRig() {
  cameraState.position.x = rig.camera.position.x;
  cameraState.position.y = rig.camera.position.y;
  cameraState.position.z = rig.camera.position.z;
  cameraState.target.x = rig.target.x;
  cameraState.target.y = rig.target.y;
  cameraState.target.z = rig.target.z;
  refreshCameraPanelDisplay();
}

function refreshCameraPanelDisplay() {
  camFieldRefs.posX.set(cameraState.position.x);
  camFieldRefs.posY.set(cameraState.position.y);
  camFieldRefs.posZ.set(cameraState.position.z);
  camFieldRefs.tgtX.set(cameraState.target.x);
  camFieldRefs.tgtY.set(cameraState.target.y);
  camFieldRefs.tgtZ.set(cameraState.target.z);
  camFieldRefs.roll.set(cameraState.roll);
  camFieldRefs.fov.set(cameraState.fov);
  const aspect = rig.camera.aspect || aspectRatio;
  camFieldRefs.focal.set(Math.round(fovToFocalLengthMM(cameraState.fov, aspect) * 10) / 10);
}

function applyCameraState() {
  rig.setPosition(cameraState.position.x, cameraState.position.y, cameraState.position.z);
  rig.setTarget(cameraState.target.x, cameraState.target.y, cameraState.target.z);
  rig.setRoll(cameraState.roll);
  rig.camera.fov = cameraState.fov;
  rig.camera.updateProjectionMatrix();
  refreshCameraPanelDisplay();
}

cameraResetBtn.addEventListener("click", () => {
  const shot = SHOTS[shotIndex];
  cameraState = { ...defaultCameraForShot(shot), roll: 0 };
  cameraState.position = { ...cameraState.position };
  cameraState.target = { ...cameraState.target };
  applyCameraState();
  autosaveCurrentShot();
});

// ---------------------------------------------------------------------
// Pose editor panel
// ---------------------------------------------------------------------
for (const name of JOINT_NAMES) {
  const opt = document.createElement("option");
  opt.value = name;
  opt.textContent = name;
  jointSelect.appendChild(opt);
}
jointSelect.value = selectedJoint;
jointSelect.addEventListener("change", () => {
  selectedJoint = jointSelect.value;
  buildJointSliders();
});

for (const key of Object.keys(POSES)) {
  const opt = document.createElement("option");
  opt.value = key;
  opt.textContent = POSE_LABELS[key] || key;
  posePresetSelect.appendChild(opt);
}
posePresetSelect.addEventListener("change", () => {
  poseState = resolvePose(posePresetSelect.value);
  applyPoseState();
  autosaveCurrentShot();
});

for (const shot of SHOTS) {
  const opt = document.createElement("option");
  opt.value = shot.id;
  opt.textContent = `${String(shot.id).padStart(2, "0")} — ${shot.label}`;
  poseCopySelect.appendChild(opt);
}
poseCopyBtn.addEventListener("click", () => {
  const srcId = parseInt(poseCopySelect.value, 10);
  const saved = store.loadShotState(srcId);
  const srcShot = SHOTS.find((s) => s.id === srcId);
  poseState = saved ? clonePose(saved.pose) : resolvePose(srcShot.pose);
  applyPoseState();
  autosaveCurrentShot();
});

let jointFieldRefs = null;
function buildJointSliders() {
  jointSliders.innerHTML = "";
  const rot = poseState.joints[selectedJoint];
  const toDeg = (r) => (r * 180) / Math.PI;
  const fromDeg = (d) => (d * Math.PI) / 180;
  jointFieldRefs = {
    x: createFieldRow(jointSliders, { label: "X", min: -180, max: 180, step: 1, value: toDeg(rot.x), onInput: (v) => { poseState.joints[selectedJoint].x = fromDeg(v); applyPoseState(); autosaveCurrentShot(); } }),
    y: createFieldRow(jointSliders, { label: "Y", min: -180, max: 180, step: 1, value: toDeg(rot.y), onInput: (v) => { poseState.joints[selectedJoint].y = fromDeg(v); applyPoseState(); autosaveCurrentShot(); } }),
    z: createFieldRow(jointSliders, { label: "Z", min: -180, max: 180, step: 1, value: toDeg(rot.z), onInput: (v) => { poseState.joints[selectedJoint].z = fromDeg(v); applyPoseState(); autosaveCurrentShot(); } }),
  };
}

function refreshJointSliderDisplay() {
  if (!jointFieldRefs) return;
  const rot = poseState.joints[selectedJoint];
  const toDeg = (r) => (r * 180) / Math.PI;
  jointFieldRefs.x.set(toDeg(rot.x));
  jointFieldRefs.y.set(toDeg(rot.y));
  jointFieldRefs.z.set(toDeg(rot.z));
}

rootHeightSlider.addEventListener("input", () => {
  const v = parseFloat(rootHeightSlider.value);
  poseState.rootHeight = v;
  rootHeightVal.textContent = v.toFixed(2);
  mannequin.setRootHeight(v);
  autosaveCurrentShot();
});

function applyPoseState() {
  mannequin.applyPose(poseState);
  rootHeightSlider.value = poseState.rootHeight;
  rootHeightVal.textContent = poseState.rootHeight.toFixed(2);
  refreshJointSliderDisplay();
}

poseResetBtn.addEventListener("click", () => {
  const shot = SHOTS[shotIndex];
  poseState = resolvePose(shot.pose);
  applyPoseState();
  autosaveCurrentShot();
});

function clonePose(p) {
  const joints = {};
  for (const k in p.joints) joints[k] = { ...p.joints[k] };
  return { rootHeight: p.rootHeight, joints, props: { ...(p.props || {}) } };
}

// ---------------------------------------------------------------------
// Shot loading / navigation
// ---------------------------------------------------------------------
function autosaveCurrentShot() {
  const shot = SHOTS[shotIndex];
  store.saveShotState(shot.id, { camera: cloneCamera(cameraState), pose: clonePose(poseState) });
}

function cloneCamera(c) {
  return { position: { ...c.position }, target: { ...c.target }, roll: c.roll, fov: c.fov };
}

function loadShot(index) {
  shotIndex = ((index % SHOTS.length) + SHOTS.length) % SHOTS.length;
  const shot = SHOTS[shotIndex];

  referenceImg.src = frameForShot(shot.id);
  referenceImg.alt = `Shot ${shot.id}: ${shot.label}`;
  onionImg.src = frameForShot(shot.id);

  const saved = store.loadShotState(shot.id);
  cameraState = saved ? cloneCamera(saved.camera) : { ...defaultCameraForShot(shot), roll: 0 };
  poseState = saved ? clonePose(saved.pose) : resolvePose(shot.pose);

  applyCameraState();
  applyPoseState();

  shotIndicator.textContent = `Shot ${String(shot.id).padStart(2, "0")} / ${SHOTS.length} — ${shot.timecode} — ${shot.label}`;
  posePresetSelect.value = shot.pose;
  poseCopySelect.value = shot.id;
}

prevBtn.addEventListener("click", () => loadShot(shotIndex - 1));
nextBtn.addEventListener("click", () => loadShot(shotIndex + 1));
window.addEventListener("keydown", (e) => {
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
  if (e.key === "ArrowLeft") loadShot(shotIndex - 1);
  if (e.key === "ArrowRight") loadShot(shotIndex + 1);
});

// ---------------------------------------------------------------------
// Onion-skin overlay
// ---------------------------------------------------------------------
function updateOnionVisibility() {
  onionImg.style.display = onionToggle.checked ? "block" : "none";
}
onionToggle.addEventListener("change", updateOnionVisibility);
onionOpacity.addEventListener("input", () => {
  const v = parseInt(onionOpacity.value, 10);
  onionImg.style.opacity = v / 100;
  onionOpacityVal.textContent = `${v}%`;
});
onionImg.style.opacity = onionOpacity.value / 100;
updateOnionVisibility();

// ---------------------------------------------------------------------
// Aspect ratio
// ---------------------------------------------------------------------
function applyAspectRatio() {
  referenceBox.style.aspectRatio = String(aspectRatio);
  previewBox.style.aspectRatio = String(aspectRatio);
}
aspectSelect.value = String(aspectRatio);
applyAspectRatio();
aspectSelect.addEventListener("change", () => {
  aspectRatio = parseFloat(aspectSelect.value);
  applyAspectRatio();
  store.saveGlobalState({ aspect: aspectRatio });
});

// ---------------------------------------------------------------------
// Export / Import
// ---------------------------------------------------------------------
exportBtn.addEventListener("click", () => store.downloadExport());
importBtn.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", async () => {
  const file = importFile.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    store.importFromJSON(text);
    const g = store.loadGlobalState();
    if (g.aspect) {
      aspectRatio = g.aspect;
      aspectSelect.value = String(aspectRatio);
      applyAspectRatio();
    }
    if (g.sun) sceneBundle.setSun(g.sun.azimuth, g.sun.elevation);
    loadShot(shotIndex);
    alert("Import successful.");
  } catch (err) {
    alert(`Import failed: ${err.message}`);
  } finally {
    importFile.value = "";
  }
});

// ---------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------
function tick() {
  requestAnimationFrame(tick);

  orbitControls.update();
  resizeToContainer(rendererMain, canvasMain, directorCamera);
  resizeToContainer(rendererPreview, canvasPreview, rig.camera);

  setDirectorOnlyVisible(false);
  rendererPreview.render(scene, rig.camera);

  setDirectorOnlyVisible(true);
  rendererMain.render(scene, directorCamera);

  const aspect = rig.camera.aspect || aspectRatio;
  const focal = fovToFocalLengthMM(rig.camera.fov, aspect);
  hudFocal.textContent = `${focal.toFixed(1)} mm`;
  hudHeight.textContent = `${rig.camera.position.y.toFixed(2)} m height`;
}

buildCameraPanel();
loadShot(0);
buildJointSliders();
tick();
