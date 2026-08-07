import * as THREE from "three";
import { JOINT_NAMES, resolvePose } from "./poses.js";

// ---------------------------------------------------------------------
// Body dimensions (meters). Sums to ~1.85m standing, matching a typical
// adult male actor. Tune here if you need a different actor height —
// everything downstream (camera defaults, pose reach) is proportional.
// ---------------------------------------------------------------------
const HEAD_R = 0.11;
const NECK_LEN = 0.06;
const CHEST_LEN = 0.28;
const SPINE_LEN = 0.18;
const PELVIS_LEN = 0.18;
const THIGH_LEN = 0.42;
const SHIN_LEN = 0.4;
const FOOT_HEIGHT = 0.08;
const UPPER_ARM_LEN = 0.28;
const FOREARM_LEN = 0.26;
const HAND_LEN = 0.1;

const SHOULDER_W = 0.42; // shoulder joint separation
const HIP_W = 0.26; // hip joint separation

export const BASE_HIP_HEIGHT = THIGH_LEN + SHIN_LEN + FOOT_HEIGHT; // pelvis height above ground, standing
export const ACTOR_HEIGHT = BASE_HIP_HEIGHT + PELVIS_LEN + SPINE_LEN + CHEST_LEN + NECK_LEN + HEAD_R * 2;

// Joints whose segment hangs DOWNWARD from the pivot (limbs). Everything
// else (pelvis/spine/chest/neck/head) extends UPWARD, forming the spine.
// This matters for applyPose()'s sign correction — see the big comment
// there for why "forward" flips sign between the two.
const DOWN_JOINTS = new Set([
  "shoulder_L", "elbow_L", "wrist_L",
  "shoulder_R", "elbow_R", "wrist_R",
  "hip_L", "knee_L", "ankle_L",
  "hip_R", "knee_R", "ankle_R",
]);

const materials = {
  skin: new THREE.MeshStandardMaterial({ color: 0xc49a6c, roughness: 0.85 }),
  pants: new THREE.MeshStandardMaterial({ color: 0x3b3f2f, roughness: 0.9 }),
  boot: new THREE.MeshStandardMaterial({ color: 0x161613, roughness: 0.7 }),
  gear: new THREE.MeshStandardMaterial({ color: 0x24261f, roughness: 0.8 }),
  webbing: new THREE.MeshStandardMaterial({ color: 0x4a4630, roughness: 0.85 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x8a8d92, roughness: 0.35, metalness: 0.7 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x5c3d21, roughness: 0.7 }),
};

function box(w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// Builds a joint pivot + its segment mesh. `dir` is +1 for segments that
// extend upward from the pivot (torso chain) or -1 for segments that hang
// downward (limbs). Returns { pivot, mesh, end } where `end` is the
// anchor Group at the far end of the segment, ready to parent the next
// joint (or a prop) to.
function createSegment(name, length, geometry, material, dir) {
  const pivot = new THREE.Group();
  pivot.name = name;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = (dir * length) / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  pivot.add(mesh);
  const end = new THREE.Group();
  end.name = `${name}_end`;
  end.position.y = dir * length;
  pivot.add(end);
  return { name, pivot, mesh, end };
}

function buildGearProps(chestEnd, hipR, wristL, wristR) {
  const group = new THREE.Group();
  group.name = "gear";

  // Chest rig: flat box on the sternum.
  const rig = box(0.26, 0.22, 0.05, materials.gear);
  rig.position.set(0, -CHEST_LEN * 0.55, 0.11);
  chestEnd.parent.add(rig); // parent = chest pivot (so it rides the chest rotation)

  // Bandolier: diagonal strap approximated as a thin rotated box across the chest.
  const bandolier = box(0.08, CHEST_LEN * 0.95, 0.03, materials.webbing);
  bandolier.position.set(0.1, -CHEST_LEN * 0.5, 0.1);
  bandolier.rotation.z = THREE.MathUtils.degToRad(18);
  chestEnd.parent.add(bandolier);

  // Holster: small box on the right hip.
  const holster = box(0.09, 0.16, 0.06, materials.gear);
  holster.position.set(0, -0.1, 0.08);
  hipR.pivot.add(holster);

  // Rifle (AK-pattern silhouette): parented to the RIGHT hand so it
  // follows wrist_R rotation in every pose.
  const rifle = new THREE.Group();
  rifle.name = "rifle";
  const rifleBody = box(0.045, 0.06, 0.62, materials.wood);
  rifleBody.position.set(0, 0, 0.05);
  const rifleReceiver = box(0.05, 0.08, 0.22, materials.metal);
  rifleReceiver.position.set(0, 0.01, -0.18);
  const rifleMag = box(0.035, 0.18, 0.06, materials.metal);
  rifleMag.position.set(0, -0.1, -0.12);
  rifleMag.rotation.x = THREE.MathUtils.degToRad(-20);
  rifle.add(rifleBody, rifleReceiver, rifleMag);
  rifle.position.set(0, -0.03, 0.02);
  rifle.rotation.x = THREE.MathUtils.degToRad(90);
  wristR.end.add(rifle);

  // Pistol: parented to the LEFT hand (matches the forearm-present /
  // press-check poses where the support hand is presented on the left).
  const pistol = new THREE.Group();
  pistol.name = "pistol";
  const pistolSlide = box(0.032, 0.045, 0.16, materials.metal);
  const pistolGrip = box(0.03, 0.09, 0.045, materials.gear);
  pistolGrip.position.set(0, -0.06, 0.05);
  pistolGrip.rotation.x = THREE.MathUtils.degToRad(15);
  pistol.add(pistolSlide, pistolGrip);
  pistol.position.set(0, -0.02, 0.03);
  wristL.end.add(pistol);

  // Knife + sheath on the pack/hip (right side), for the draw_knife shot.
  const sheath = box(0.03, 0.16, 0.02, materials.boot);
  sheath.position.set(0.08, -0.06, 0.06);
  sheath.rotation.z = THREE.MathUtils.degToRad(-10);
  hipR.pivot.add(sheath);

  group.userData = { rifle, pistol, holster, rig, bandolier, sheath };
  return group;
}

/**
 * Builds the posable mannequin: a hierarchy of jointed primitives.
 *   pelvis -> spine -> chest -> neck -> head
 *   chest  -> shoulder_[L|R] -> elbow_[L|R] -> wrist_[L|R]
 *   pelvis -> hip_[L|R]      -> knee_[L|R]  -> ankle_[L|R]
 * Returns { root, joints, applyPose(pose), setRootHeight(m), dispose() }.
 *
 * --- Swapping in a rigged GLTF later -----------------------------------
 * See loadActorModel() below. To replace this procedural rig with a
 * skinned character, export your rig with bone names matching
 * JOINT_NAMES (poses.js) exactly — "pelvis", "spine", "chest", "neck",
 * "head", "shoulder_L/elbow_L/wrist_L", "shoulder_R/elbow_R/wrist_R",
 * "hip_L/knee_L/ankle_L", "hip_R/knee_R/ankle_R" — and every pose preset,
 * the pose editor, and the prop-parenting logic keeps working unmodified,
 * because they all key off these joint names rather than this file's
 * mesh hierarchy.
 */
export function createMannequin() {
  const root = new THREE.Group();
  root.name = "root";
  root.position.y = BASE_HIP_HEIGHT;

  const joints = {};

  const pelvis = createSegment("pelvis", PELVIS_LEN, new THREE.BoxGeometry(0.3, PELVIS_LEN, 0.18), materials.pants, +1);
  root.add(pelvis.pivot);
  joints.pelvis = pelvis;

  const spine = createSegment("spine", SPINE_LEN, new THREE.CylinderGeometry(0.11, 0.13, SPINE_LEN, 8), materials.skin, +1);
  pelvis.end.add(spine.pivot);
  joints.spine = spine;

  const chest = createSegment("chest", CHEST_LEN, new THREE.BoxGeometry(0.36, CHEST_LEN, 0.2), materials.skin, +1);
  spine.end.add(chest.pivot);
  joints.chest = chest;

  const neck = createSegment("neck", NECK_LEN, new THREE.CylinderGeometry(0.05, 0.06, NECK_LEN, 8), materials.skin, +1);
  chest.end.add(neck.pivot);
  joints.neck = neck;

  const head = createSegment("head", HEAD_R * 2, new THREE.SphereGeometry(HEAD_R, 12, 10), materials.skin, +1);
  neck.end.add(head.pivot);
  joints.head = head;

  for (const side of ["L", "R"]) {
    const sign = side === "L" ? 1 : -1; // +X = character's left (character faces +Z)
    const shoulder = createSegment(
      `shoulder_${side}`,
      UPPER_ARM_LEN,
      new THREE.CylinderGeometry(0.05, 0.045, UPPER_ARM_LEN, 8),
      materials.skin,
      -1
    );
    shoulder.pivot.position.set(sign * (SHOULDER_W / 2), -0.02, 0);
    chest.end.add(shoulder.pivot);
    joints[`shoulder_${side}`] = shoulder;

    const elbow = createSegment(`elbow_${side}`, FOREARM_LEN, new THREE.CylinderGeometry(0.045, 0.04, FOREARM_LEN, 8), materials.skin, -1);
    shoulder.end.add(elbow.pivot);
    joints[`elbow_${side}`] = elbow;

    const wrist = createSegment(`wrist_${side}`, HAND_LEN, new THREE.BoxGeometry(0.055, HAND_LEN, 0.03), materials.skin, -1);
    elbow.end.add(wrist.pivot);
    joints[`wrist_${side}`] = wrist;

    const hip = createSegment(`hip_${side}`, THIGH_LEN, new THREE.CylinderGeometry(0.075, 0.065, THIGH_LEN, 8), materials.pants, -1);
    hip.pivot.position.set(sign * (HIP_W / 2), -PELVIS_LEN / 2, 0);
    pelvis.pivot.add(hip.pivot);
    joints[`hip_${side}`] = hip;

    const knee = createSegment(`knee_${side}`, SHIN_LEN, new THREE.CylinderGeometry(0.06, 0.05, SHIN_LEN, 8), materials.pants, -1);
    hip.end.add(knee.pivot);
    joints[`knee_${side}`] = knee;

    const ankle = createSegment(`ankle_${side}`, FOOT_HEIGHT, new THREE.BoxGeometry(0.09, FOOT_HEIGHT, 0.24), materials.boot, -1);
    ankle.mesh.position.z = 0.05;
    knee.end.add(ankle.pivot);
    joints[`ankle_${side}`] = ankle;
  }

  const gear = buildGearProps(joints.chest.end, joints.hip_R, joints.wrist_L, joints.wrist_R);
  root.add(gear);
  // Held weapons default to hidden; applyPose() shows only what a given
  // pose's `props` field asks for (see poses.js) so a bare-handed pose
  // (grabbing a duffel, painting a stripe) doesn't visibly clutch a gun.
  gear.userData.rifle.visible = false;
  gear.userData.pistol.visible = false;

  // Accepts either a preset name (string, see poses.js POSES) or an
  // already-resolved { rootHeight, joints, props } pose object (as
  // produced by resolvePose(), e.g. one round-tripped through the pose
  // editor or loaded from localStorage/import JSON).
  function applyPose(presetNameOrResolvedPose) {
    const resolved =
      typeof presetNameOrResolvedPose === "string"
        ? resolvePose(presetNameOrResolvedPose)
        : presetNameOrResolvedPose;
    setRootHeight(resolved.rootHeight);
    for (const name of JOINT_NAMES) {
      setJointRotation(name, resolved.joints[name]);
    }
    const props = resolved.props || {};
    gear.userData.rifle.visible = !!props.rifle;
    gear.userData.pistol.visible = !!props.pistol;
    return resolved;
  }

  // Central sign-correction: pose data (poses.js) is authored with a
  // simple, symmetric convention (x=forward, z=away from centerline,
  // same meaning for L and R). Geometrically:
  //  - Torso joints extend UPWARD from their pivot, where +x rotation
  //    already swings the child forward (toward +Z, the way the actor
  //    faces) - applied as-is.
  //  - Limb joints hang DOWNWARD, where +x rotation swings the child
  //    backward (-Z) - so we negate x to match the authored meaning.
  //  - Right-side limb joints are the mirror of the left, so z (and y,
  //    for symmetric twist) are negated on "_R" joints only.
  function setJointRotation(name, rot) {
    const j = joints[name];
    if (!j || !rot) return;
    if (DOWN_JOINTS.has(name)) {
      const mirror = name.endsWith("_R") ? -1 : 1;
      j.pivot.rotation.set(-rot.x, mirror * rot.y, mirror * rot.z, "XYZ");
    } else {
      j.pivot.rotation.set(rot.x, rot.y, rot.z, "XYZ");
    }
  }

  function setRootHeight(offsetM) {
    root.position.y = BASE_HIP_HEIGHT + (offsetM || 0);
  }

  function dispose() {
    root.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      }
      // materials are shared module-level singletons; not disposed here.
    });
  }

  return { root, joints, gear: gear.userData, applyPose, setRootHeight, dispose };
}

/**
 * Stub for swapping the procedural mannequin for a rigged GLTF character.
 * Not called by default — createMannequin() above is the active actor.
 *
 * Usage once you have a rig:
 *   const gltf = await new GLTFLoader().loadAsync('/models/actor.glb');
 *   const skeleton = gltf.scene.getObjectByProperty('type', 'SkinnedMesh').skeleton;
 *   const joints = {};
 *   for (const name of JOINT_NAMES) {
 *     joints[name] = { pivot: skeleton.getBoneByName(name) };
 *   }
 *   // applyPose(joints, pose) can reuse the same setJointRotation logic
 *   // above once bone names line up with JOINT_NAMES — no rotation.set()
 *   // sign flips should be needed if your rig's rest pose also has arms
 *   // hanging down and legs hanging down (a standard T/A-pose export).
 */
export async function loadActorModel(_url) {
  throw new Error("loadActorModel() is a stub — see the comment above it for wiring instructions.");
}
