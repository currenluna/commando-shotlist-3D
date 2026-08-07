import * as THREE from "three";
import { TransformControls } from "three/addons/controls/TransformControls.js";

/**
 * The "film camera": a THREE.PerspectiveCamera used to render the shot
 * preview panel, plus a small camera-body gizmo mesh (visible only in the
 * main director viewport) and a CameraHelper frustum so it's easy to spot
 * in 3D. Camera orientation is driven by an explicit look-at TARGET point
 * (+ an independent roll/dutch-angle) rather than raw quaternion sliders —
 * this keeps "aim at the actor" intuitive and matches how a previs camera
 * rig is actually used, while the roll slider still allows canted angles.
 */
export function createCameraRig() {
  const camera = new THREE.PerspectiveCamera(35, 2.39, 0.05, 200);
  camera.name = "shotCamera";

  // Camera-body gizmo: a child of the camera, so it automatically follows
  // the camera's position/orientation with zero extra bookkeeping.
  const gizmo = new THREE.Group();
  gizmo.name = "cameraGizmo";
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a2c33, roughness: 0.4, metalness: 0.5 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xd98c2b, roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.2), bodyMat);
  body.position.set(0, 0, 0.11);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.09, 16), bodyMat);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0, -0.03);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.006, 8, 16), accentMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 0, -0.07);
  gizmo.add(body, lens, ring);
  gizmo.castShadow = false;
  camera.add(gizmo);

  const helper = new THREE.CameraHelper(camera);
  helper.name = "cameraHelper";

  // Look-at target, visualized with a small crosshair gizmo.
  const target = new THREE.Vector3(0, 1.2, 0);
  const targetGizmo = new THREE.Group();
  targetGizmo.name = "targetGizmo";
  const targetMat = new THREE.MeshBasicMaterial({ color: 0x4fc3f7 });
  const targetCore = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), targetMat);
  const ringXMat = new THREE.LineBasicMaterial({ color: 0x4fc3f7 });
  const crossGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.08, 0, 0), new THREE.Vector3(0.08, 0, 0),
    new THREE.Vector3(0, -0.08, 0), new THREE.Vector3(0, 0.08, 0),
    new THREE.Vector3(0, 0, -0.08), new THREE.Vector3(0, 0, 0.08),
  ]);
  const cross = new THREE.LineSegments(crossGeo, ringXMat);
  targetGizmo.add(targetCore, cross);
  targetGizmo.position.copy(target);

  let roll = 0; // degrees, applied around the camera's local view axis after look-at

  function updateCameraOrientation() {
    camera.lookAt(target);
    if (roll) camera.rotateZ(THREE.MathUtils.degToRad(roll));
    camera.updateMatrixWorld(true);
    helper.update();
  }

  function setRoll(deg) {
    roll = deg;
    updateCameraOrientation();
  }

  function setTarget(x, y, z) {
    target.set(x, y, z);
    targetGizmo.position.copy(target);
    updateCameraOrientation();
  }

  function setPosition(x, y, z) {
    camera.position.set(x, y, z);
    updateCameraOrientation();
  }

  updateCameraOrientation();

  return { camera, gizmo, helper, target, targetGizmo, getRoll: () => roll, setRoll, setTarget, setPosition, updateCameraOrientation };
}

/**
 * Wires up TransformControls (translate mode) so either the camera body
 * or the look-at target can be dragged directly in the director viewport.
 * `onChange` fires after every drag-driven transform update, so callers
 * can resync the camera inspector panel's number fields.
 */
export function createDraggableRig(rig, domElement, camera, onChange) {
  const controls = new TransformControls(camera, domElement);
  controls.setMode("translate");
  controls.setSize(0.8);

  let attachedTo = "camera"; // 'camera' | 'target'

  function attachCamera() {
    attachedTo = "camera";
    controls.attach(rig.camera);
  }
  function attachTarget() {
    attachedTo = "target";
    controls.attach(rig.targetGizmo);
  }
  attachCamera();

  controls.addEventListener("objectChange", () => {
    if (attachedTo === "camera") {
      rig.updateCameraOrientation();
    } else {
      rig.target.copy(rig.targetGizmo.position);
      rig.updateCameraOrientation();
    }
    onChange && onChange();
  });

  return { controls, helper: controls.getHelper(), attachCamera, attachTarget, get mode() { return attachedTo; } };
}
