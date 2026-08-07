// Pose system for the jointed-primitive mannequin (see mannequin.js).
//
// Authoring convention (radians, Euler 'XYZ', relative to each joint's own
// rest orientation). This is a SYMMETRIC convention — the same sign means
// the same thing on the left and right side of the body. mannequin.js's
// applyPose() is responsible for mirroring the right-side joints and for
// correcting for the fact that limbs hang "down" while the spine chain
// extends "up" (see the comment there) — authors of pose data never need
// to think about that, only about the character's own body:
//   x = swing FORWARD (+) / BACKWARD (-), e.g. raising an arm forward,
//       leaning the torso forward, kicking a leg forward.
//   z = swing AWAY FROM the body's centerline (+) / ACROSS the body,
//       toward the centerline or past it (-), e.g. an arm raised out to
//       the side is +z, an arm reaching across the chest is -z.
//   y = twist around the segment's own long axis.
// Each rotation is relative to its own parent's local frame (standard FK
// chain), so a bent knee is a NEGATIVE x on the knee under a POSITIVE x
// (forward-raised) thigh — that brings the shin back down under the body.
const D = (deg) => (deg * Math.PI) / 180;

export const JOINT_NAMES = [
  "pelvis", "spine", "chest", "neck", "head",
  "shoulder_L", "elbow_L", "wrist_L",
  "shoulder_R", "elbow_R", "wrist_R",
  "hip_L", "knee_L", "ankle_L",
  "hip_R", "knee_R", "ankle_R",
];

// Natural standing pose: arms hang at sides with a slight outward
// abduction so geometry doesn't intersect the torso; legs straight with a
// hair of stance width. Symmetric by construction.
export const REST_POSE = {
  pelvis: { x: 0, y: 0, z: 0 },
  spine: { x: 0, y: 0, z: 0 },
  chest: { x: 0, y: 0, z: 0 },
  neck: { x: 0, y: 0, z: 0 },
  head: { x: 0, y: 0, z: 0 },
  shoulder_L: { x: 0, y: 0, z: D(8) },
  elbow_L: { x: D(8), y: 0, z: 0 },
  wrist_L: { x: 0, y: 0, z: 0 },
  shoulder_R: { x: 0, y: 0, z: D(8) },
  elbow_R: { x: D(8), y: 0, z: 0 },
  wrist_R: { x: 0, y: 0, z: 0 },
  hip_L: { x: 0, y: 0, z: D(3) },
  knee_L: { x: 0, y: 0, z: 0 },
  ankle_L: { x: 0, y: 0, z: 0 },
  hip_R: { x: 0, y: 0, z: D(3) },
  knee_R: { x: 0, y: 0, z: 0 },
  ankle_R: { x: 0, y: 0, z: 0 },
};

export const DEFAULT_ROOT_HEIGHT = 0;

// Each preset is a PARTIAL override merged over REST_POSE (see resolvePose
// below). `rootHeight` is a meters offset applied to the mannequin root
// (negative = crouched down, positive = up on toes/raised).
export const POSES = {
  crouch_reach: {
    rootHeight: -0.35,
    joints: {
      pelvis: { x: D(10) },
      spine: { x: D(20) },
      chest: { x: D(10) },
      neck: { x: D(-15) },
      shoulder_L: { x: D(20), z: D(5) },
      elbow_L: { x: D(35) },
      shoulder_R: { x: D(70), z: D(10) },
      elbow_R: { x: D(25) },
      wrist_R: { x: D(10) },
      hip_L: { x: D(55), z: D(8) },
      knee_L: { x: D(-100) },
      ankle_L: { x: D(35) },
      hip_R: { x: D(55), z: D(8) },
      knee_R: { x: D(-100) },
      ankle_R: { x: D(35) },
    },
  },

  kneel_boot: {
    rootHeight: -0.55,
    joints: {
      pelvis: { x: D(15) },
      spine: { x: D(30) },
      chest: { x: D(15) },
      neck: { x: D(-30) },
      shoulder_L: { x: D(70), z: D(15) },
      elbow_L: { x: D(60) },
      wrist_L: { x: D(10) },
      shoulder_R: { x: D(75), z: D(-10) },
      elbow_R: { x: D(65) },
      wrist_R: { x: D(10) },
      hip_L: { x: D(95), z: D(10) },
      knee_L: { x: D(-140) },
      ankle_L: { x: D(70) },
      hip_R: { x: D(70), z: D(8) },
      knee_R: { x: D(-90) },
      ankle_R: { x: D(20) },
    },
  },

  don_vest: {
    rootHeight: 0,
    joints: {
      spine: { x: D(5) },
      chest: { x: D(-5) },
      shoulder_L: { x: D(-30), z: D(60) },
      elbow_L: { x: D(80) },
      shoulder_R: { x: D(-30), z: D(60) },
      elbow_R: { x: D(80) },
    },
  },

  hands_at_chest: {
    rootHeight: 0,
    joints: {
      pelvis: { x: D(2) },
      spine: { x: D(5) },
      chest: { x: D(3) },
      neck: { x: D(-5) },
      shoulder_L: { x: D(60), z: D(35) },
      elbow_L: { x: D(100) },
      wrist_L: { x: D(-10), y: D(20) },
      shoulder_R: { x: D(60), z: D(35) },
      elbow_R: { x: D(100) },
      wrist_R: { x: D(-10), y: D(-20) },
    },
  },

  hand_to_rig: {
    rootHeight: 0,
    joints: {
      pelvis: { x: D(2) },
      spine: { x: D(3) },
      shoulder_L: { x: D(5), z: D(10) },
      elbow_L: { x: D(10) },
      shoulder_R: { x: D(65), z: D(30) },
      elbow_R: { x: D(95) },
      wrist_R: { x: D(-15) },
    },
  },

  forearm_present: {
    rootHeight: 0,
    joints: {
      pelvis: { x: D(2) },
      spine: { x: D(5) },
      chest: { x: D(3) },
      shoulder_L: { x: D(30), z: D(-70), y: D(-15) },
      elbow_L: { x: D(90) },
      wrist_L: { x: 0 },
      shoulder_R: { x: D(35), z: D(-25) },
      elbow_R: { x: D(80) },
      wrist_R: { x: D(-10) },
    },
  },

  pistol_both_hands: {
    rootHeight: 0,
    joints: {
      pelvis: { x: D(3) },
      spine: { x: D(8) },
      chest: { x: D(5) },
      neck: { x: D(-5) },
      shoulder_L: { x: D(60), z: D(-15) },
      elbow_L: { x: D(100) },
      wrist_L: { x: D(-5), y: D(15) },
      shoulder_R: { x: D(60), z: D(-15) },
      elbow_R: { x: D(100) },
      wrist_R: { x: D(-5), y: D(-15) },
    },
  },

  draw_knife: {
    rootHeight: 0,
    joints: {
      pelvis: { y: D(20) },
      spine: { x: D(5), y: D(8) },
      chest: { y: D(8) },
      neck: { y: D(-8) },
      shoulder_L: { x: D(10), z: D(8) },
      elbow_L: { x: D(15) },
      shoulder_R: { x: D(30), z: D(-55), y: D(20) },
      elbow_R: { x: D(70) },
      wrist_R: { x: D(-15) },
      hip_R: { z: D(8), y: D(10) },
    },
  },

  paint_arm: {
    rootHeight: 0,
    joints: {
      pelvis: { x: D(2) },
      spine: { x: D(3) },
      shoulder_L: { x: D(20), z: D(75) },
      elbow_L: { x: D(15) },
      wrist_L: { x: D(-10) },
      shoulder_R: { x: D(30), z: D(-25), y: D(-15) },
      elbow_R: { x: D(105) },
      wrist_R: { x: D(-10) },
    },
  },

  hand_to_face: {
    rootHeight: 0,
    joints: {
      pelvis: { x: D(-5) },
      spine: { x: D(-8) },
      chest: { x: D(-5) },
      neck: { x: D(-20) },
      head: { x: D(-15) },
      shoulder_L: { x: D(5), z: D(8) },
      elbow_L: { x: D(10) },
      shoulder_R: { x: D(95), z: D(-10) },
      elbow_R: { x: D(120) },
      wrist_R: { x: D(-10) },
    },
  },

  rifle_load: {
    rootHeight: 0,
    joints: {
      pelvis: { x: D(3) },
      spine: { x: D(10) },
      chest: { x: D(5) },
      neck: { x: D(-10) },
      shoulder_L: { x: D(50), z: D(20) },
      elbow_L: { x: D(90) },
      wrist_L: { x: D(-5), y: D(15) },
      shoulder_R: { x: D(50), z: D(-20) },
      elbow_R: { x: D(105) },
      wrist_R: { x: D(-5), y: D(-25) },
    },
  },

  rifle_vertical: {
    rootHeight: 0,
    joints: {
      pelvis: { x: D(2) },
      spine: { x: D(3) },
      neck: { x: D(-5) },
      shoulder_L: { x: D(5), z: D(8) },
      elbow_L: { x: D(10) },
      shoulder_R: { x: D(60), z: D(85), y: D(10) },
      elbow_R: { x: D(20) },
      wrist_R: { x: D(-10) },
    },
  },

  rifle_shoulder: {
    rootHeight: 0,
    joints: {
      pelvis: { x: D(2) },
      spine: { x: D(2) },
      shoulder_L: { x: D(20), z: D(30) },
      elbow_L: { x: D(60) },
      wrist_L: { x: D(-10) },
      shoulder_R: { x: D(75), z: D(70), y: D(15) },
      elbow_R: { x: D(10) },
      wrist_R: { x: D(-10) },
    },
  },
};

export const POSE_LABELS = {
  crouch_reach: "Crouch & reach",
  kneel_boot: "Kneel — boot lace",
  don_vest: "Don vest",
  hands_at_chest: "Hands at chest",
  hand_to_rig: "Hand to rig",
  forearm_present: "Forearm present",
  pistol_both_hands: "Pistol, both hands",
  draw_knife: "Draw knife",
  paint_arm: "Paint arm",
  hand_to_face: "Hand to face",
  rifle_load: "Rifle load",
  rifle_vertical: "Rifle vertical",
  rifle_shoulder: "Rifle over shoulder",
};

function deepCloneJoints(joints) {
  const out = {};
  for (const k in joints) out[k] = { ...joints[k] };
  return out;
}

// Merge a named preset (or arbitrary partial override map) over REST_POSE,
// returning a full { rootHeight, joints: { <jointName>: {x,y,z}, ... } }
// pose object covering every joint in JOINT_NAMES.
export function resolvePose(presetNameOrOverride) {
  const preset =
    typeof presetNameOrOverride === "string"
      ? POSES[presetNameOrOverride]
      : presetNameOrOverride;
  const joints = deepCloneJoints(REST_POSE);
  if (preset && preset.joints) {
    for (const name in preset.joints) {
      joints[name] = { ...joints[name], ...preset.joints[name] };
    }
  }
  return {
    rootHeight: preset && typeof preset.rootHeight === "number" ? preset.rootHeight : DEFAULT_ROOT_HEIGHT,
    joints,
  };
}
