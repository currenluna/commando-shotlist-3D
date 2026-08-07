// Pose system for the jointed-primitive mannequin (see mannequin.js).
//
// Authoring convention (radians, Euler 'XYZ', relative to each joint's own
// rest orientation). This is a SYMMETRIC convention — the same sign means
// the same thing on the left and right side of the body. mannequin.js's
// applyPose() is responsible for mirroring the right-side joints and for
// correcting for the fact that limbs hang "down" while the spine chain
// extends "up" (see the comment there) — authors of pose data never need
// to think about that, only about the character's own body:
//   x = swing FORWARD (+) / BACKWARD (-), e.g. leaning the torso forward,
//       kicking a leg forward. On a limb this sweeps a full arc as it
//       grows: ~90 is horizontal-forward, ~180 is straight UP (arrived at
//       via the forward arc), and negative values sweep the same arc
//       backward (-90 horizontal-behind, -180 straight up via the back
//       arc). Any "raise the arm up" pose needs a LARGE x, not z — z
//       alone only swings a limb out sideways at shoulder height.
//   z = swing AWAY FROM the body's centerline (+) / ACROSS the body,
//       toward the centerline or past it (-), e.g. an arm raised out to
//       the side (T-pose-like) is a large +z, an arm reaching across the
//       chest to the opposite shoulder is -z. Use it for side clearance
//       and crossing, in small-to-moderate amounts — let x do the work
//       of actually lifting a limb.
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

// Which held props (parented to wrist_L / wrist_R in mannequin.js) should
// be visible for a preset. Omitted = both hidden. Keeping irrelevant
// weapons out of frame makes poses read far more clearly (a bare-handed
// "grab the duffel" or "paint arm" pose shouldn't visibly clutch a rifle).
const NONE = {};
const SHOW_PISTOL = { pistol: true };
const SHOW_RIFLE = { rifle: true };

// Each preset is a PARTIAL override merged over REST_POSE (see resolvePose
// below). `rootHeight` is a meters offset applied to the mannequin root
// (negative = crouched down, positive = up on toes/raised).
export const POSES = {
  crouch_reach: {
    rootHeight: -0.35,
    props: NONE,
    joints: {
      pelvis: { x: D(10) },
      spine: { x: D(20) },
      chest: { x: D(10) },
      neck: { x: D(-15) },
      shoulder_L: { x: D(20), z: D(8) },
      elbow_L: { x: D(30) },
      shoulder_R: { x: D(70), z: D(8) },
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

  // One knee planted forward (weight-bearing), the other knee down on the
  // ground behind — a genuflect, not a double-leg squat — torso folded
  // forward over the front leg with both hands reaching down to the boot.
  kneel_boot: {
    rootHeight: -0.48,
    props: NONE,
    joints: {
      pelvis: { x: D(18) },
      spine: { x: D(45) },
      chest: { x: D(22) },
      neck: { x: D(-15) },
      shoulder_L: { x: D(95), z: D(-12) },
      elbow_L: { x: D(75) },
      wrist_L: { x: D(15) },
      shoulder_R: { x: D(95), z: D(-12) },
      elbow_R: { x: D(75) },
      wrist_R: { x: D(15) },
      // back leg: thigh stays near-vertical, knee folds sharply behind
      hip_L: { x: D(8), z: D(5) },
      knee_L: { x: D(-125) },
      ankle_L: { x: D(25) },
      // front leg: planted, weight-bearing
      hip_R: { x: D(78), z: D(8) },
      knee_R: { x: D(-95) },
      ankle_R: { x: D(18) },
    },
  },

  // Both arms raised up-and-back (large negative x, arrived at via the
  // backward arc) as if reaching behind the shoulders to shrug a vest on.
  don_vest: {
    rootHeight: 0,
    props: NONE,
    joints: {
      pelvis: { x: D(2) },
      spine: { x: D(8) },
      chest: { x: D(-8) },
      shoulder_L: { x: D(-140), z: D(35) },
      elbow_L: { x: D(100) },
      wrist_L: { x: D(-10) },
      shoulder_R: { x: D(-140), z: D(35) },
      elbow_R: { x: D(100) },
      wrist_R: { x: D(-10) },
    },
  },

  // Both hands converge at the center of the chest (zip/buckle/load) —
  // moderate forward raise, negative z pulls the hands to the midline
  // instead of leaving them splayed out near the shoulders.
  hands_at_chest: {
    rootHeight: 0,
    props: NONE,
    joints: {
      pelvis: { x: D(2) },
      spine: { x: D(8) },
      chest: { x: D(5) },
      neck: { x: D(-8) },
      shoulder_L: { x: D(75), z: D(-30) },
      elbow_L: { x: D(100) },
      wrist_L: { x: D(-10), y: D(15) },
      shoulder_R: { x: D(75), z: D(-30) },
      elbow_R: { x: D(100) },
      wrist_R: { x: D(-10), y: D(-15) },
    },
  },

  hand_to_rig: {
    rootHeight: 0,
    props: NONE,
    joints: {
      pelvis: { x: D(2) },
      spine: { x: D(5) },
      shoulder_L: { x: D(5), z: D(10) },
      elbow_L: { x: D(10) },
      shoulder_R: { x: D(80), z: D(-20) },
      elbow_R: { x: D(95) },
      wrist_R: { x: D(-15) },
    },
  },

  // Left forearm held horizontal across the front of the body (visible,
  // not hidden behind the torso), right hand reaching to meet it.
  forearm_present: {
    rootHeight: 0,
    props: SHOW_PISTOL,
    joints: {
      pelvis: { x: D(2) },
      spine: { x: D(8) },
      chest: { x: D(5) },
      shoulder_L: { x: D(75), z: D(-55), y: D(-10) },
      elbow_L: { x: D(95) },
      wrist_L: { x: 0 },
      shoulder_R: { x: D(45), z: D(-35) },
      elbow_R: { x: D(85) },
      wrist_R: { x: D(-10) },
    },
  },

  pistol_both_hands: {
    rootHeight: 0,
    props: SHOW_PISTOL,
    joints: {
      pelvis: { x: D(3) },
      spine: { x: D(10) },
      chest: { x: D(6) },
      neck: { x: D(-8) },
      shoulder_L: { x: D(70), z: D(-30) },
      elbow_L: { x: D(100) },
      wrist_L: { x: D(-5), y: D(15) },
      shoulder_R: { x: D(70), z: D(-30) },
      elbow_R: { x: D(100) },
      wrist_R: { x: D(-5), y: D(-15) },
    },
  },

  draw_knife: {
    rootHeight: 0,
    props: NONE,
    joints: {
      pelvis: { y: D(20) },
      spine: { x: D(8), y: D(10) },
      chest: { y: D(10) },
      neck: { y: D(-10) },
      shoulder_L: { x: D(10), z: D(10) },
      elbow_L: { x: D(15) },
      shoulder_R: { x: D(45), z: D(-45), y: D(15) },
      elbow_R: { x: D(85) },
      wrist_R: { x: D(-15) },
      hip_R: { z: D(10), y: D(10) },
    },
  },

  // Left arm extended out to the side (large z is correct here — it's
  // genuinely meant to read as an arm held out for painting), right hand
  // reaches across the body to touch it.
  paint_arm: {
    rootHeight: 0,
    props: NONE,
    joints: {
      pelvis: { x: D(2) },
      spine: { x: D(3) },
      shoulder_L: { x: D(15), z: D(80) },
      elbow_L: { x: D(10) },
      wrist_L: { x: D(-5) },
      shoulder_R: { x: D(45), z: D(-15), y: D(-20) },
      elbow_R: { x: D(115) },
      wrist_R: { x: D(-15) },
    },
  },

  // Upper arm raised to shoulder height, elbow folded sharply so the
  // forearm brings the hand back in to the face (not straight overhead).
  hand_to_face: {
    rootHeight: 0,
    props: NONE,
    joints: {
      pelvis: { x: D(-5) },
      spine: { x: D(-5) },
      chest: { x: D(-5) },
      neck: { x: D(-15) },
      head: { x: D(-10) },
      shoulder_L: { x: D(5), z: D(10) },
      elbow_L: { x: D(10) },
      shoulder_R: { x: D(90), z: D(15) },
      elbow_R: { x: D(130) },
      wrist_R: { x: D(-15) },
    },
  },

  rifle_load: {
    rootHeight: 0,
    props: SHOW_RIFLE,
    joints: {
      pelvis: { x: D(3) },
      spine: { x: D(12) },
      chest: { x: D(6) },
      neck: { x: D(-10) },
      shoulder_L: { x: D(65), z: D(-25) },
      elbow_L: { x: D(95) },
      wrist_L: { x: D(-5), y: D(15) },
      shoulder_R: { x: D(65), z: D(-25) },
      elbow_R: { x: D(105) },
      wrist_R: { x: D(-5), y: D(-20) },
    },
  },

  // Right arm raised nearly straight up (large x, not z) so the rifle
  // rides vertically beside the head instead of out to the side.
  rifle_vertical: {
    rootHeight: 0,
    props: SHOW_RIFLE,
    joints: {
      pelvis: { x: D(2) },
      spine: { x: D(3) },
      neck: { x: D(-5) },
      shoulder_L: { x: D(5), z: D(10) },
      elbow_L: { x: D(10) },
      shoulder_R: { x: D(155), z: D(20), y: D(10) },
      elbow_R: { x: D(15) },
      wrist_R: { x: D(-10) },
    },
  },

  // Right arm raised so the rifle rests across the shoulder, gripping
  // hand up near head height; left hand supports the barrel/foregrip.
  rifle_shoulder: {
    rootHeight: 0,
    props: SHOW_RIFLE,
    joints: {
      pelvis: { x: D(2) },
      spine: { x: D(2) },
      shoulder_L: { x: D(20), z: D(25) },
      elbow_L: { x: D(55) },
      wrist_L: { x: D(-10) },
      shoulder_R: { x: D(130), z: D(30), y: D(10) },
      elbow_R: { x: D(30) },
      wrist_R: { x: D(-15) },
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
// returning a full { rootHeight, joints: { <jointName>: {x,y,z}, ... },
// props: {rifle?, pistol?} } pose object covering every joint in
// JOINT_NAMES.
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
    props: { ...(preset && preset.props ? preset.props : {}) },
  };
}
