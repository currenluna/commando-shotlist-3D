// Seed data for the 20 "gear-up" shots. Reference frames live in /public/frames
// and MUST be named exactly as listed here (index 1-20, in shot order).
export const FRAME_FILES = [
  "Timeline_1_01_00_00_07.jpg",
  "Timeline_1_01_00_02_04.jpg",
  "Timeline_1_01_00_07_08.jpg",
  "Timeline_1_01_00_07_15.jpg",
  "Timeline_1_01_00_08_07.jpg",
  "Timeline_1_01_00_08_22.jpg",
  "Timeline_1_01_00_09_19.jpg",
  "Timeline_1_01_00_10_07.jpg",
  "Timeline_1_01_00_11_06.jpg",
  "Timeline_1_01_00_11_13.jpg",
  "Timeline_1_01_00_11_23.jpg",
  "Timeline_1_01_00_12_08.jpg",
  "Timeline_1_01_00_12_17.jpg",
  "Timeline_1_01_00_13_10.jpg",
  "Timeline_1_01_00_14_05.jpg",
  "Timeline_1_01_00_15_01.jpg",
  "Timeline_1_01_00_15_10.jpg",
  "Timeline_1_01_00_15_22.jpg",
  "Timeline_1_01_00_16_16.jpg",
  "Timeline_1_01_00_22_21.jpg",
];

// framing/angle -> starting camera. Overridable per-shot after load (see cameraDefaults.js).
export const SHOTS = [
  { id: 1, timecode: "00:07", label: "Approach at cliff", framing: "MEDIUM", angle: "LOW", pose: "crouch_reach", notes: "Crouched against sandstone cliff, bare torso, reaching for gear." },
  { id: 2, timecode: "02:04", label: "Grab the duffel", framing: "INSERT", angle: "EYE", pose: "crouch_reach", notes: "Hand grabs camo duffel off grey Zodiac." },
  { id: 3, timecode: "07:08", label: "Lace boots", framing: "ECU", angle: "LOW", pose: "kneel_boot", notes: "Both hands cinching laces of black combat boot." },
  { id: 4, timecode: "07:15", label: "Pull on vest", framing: "MEDIUM", angle: "EYE", pose: "don_vest", notes: "Front 3/4, shrugging on black tactical vest." },
  { id: 5, timecode: "08:07", label: "Zip vest", framing: "CU", angle: "EYE", pose: "hands_at_chest", notes: "Hands working vest zipper beside holster." },
  { id: 6, timecode: "08:22", label: "Buckle strap", framing: "CU", angle: "EYE", pose: "hands_at_chest", notes: "Hands snapping a buckle; dive watch on wrist." },
  { id: 7, timecode: "09:19", label: "Clip hardware", framing: "CU", angle: "EYE", pose: "hands_at_chest", notes: "Clipping gear onto olive vest." },
  { id: 8, timecode: "10:07", label: "Load shells", framing: "CU", angle: "EYE", pose: "hands_at_chest", notes: "Thumbing shells into bandolier." },
  { id: 9, timecode: "11:06", label: "Grenades on rig", framing: "CU", angle: "EYE", pose: "hands_at_chest", notes: "Twin grenades nested on chest rig." },
  { id: 10, timecode: "11:13", label: "Draw canister", framing: "CU", angle: "LOW", pose: "hand_to_rig", notes: "Hand pulls canister from rig against sky." },
  { id: 11, timecode: "11:23", label: "Pistol on forearm", framing: "CU", angle: "EYE", pose: "forearm_present", notes: "Stainless 1911 laid across forearm." },
  { id: 12, timecode: "12:08", label: "Press-check pistol", framing: "CU", angle: "EYE", pose: "pistol_both_hands", notes: "Hands gripping/press-checking pistol." },
  { id: 13, timecode: "12:17", label: "Draw knife", framing: "MEDIUM", angle: "LOW", pose: "draw_knife", notes: "Side profile, knife drawn from sheath on pack." },
  { id: 14, timecode: "13:10", label: "Paint arm", framing: "ECU", angle: "EYE", pose: "paint_arm", notes: "Black stripe applied down upper arm." },
  { id: 15, timecode: "14:05", label: "Paint face", framing: "CU", angle: "LOW", pose: "hand_to_face", notes: "War-paint stripe across face, looking up." },
  { id: 16, timecode: "15:01", label: "Paint biceps", framing: "ECU", angle: "EYE", pose: "paint_arm", notes: "Fingers dragging stripe across biceps." },
  { id: 17, timecode: "15:10", label: "Seat magazine", framing: "CU", angle: "EYE", pose: "rifle_load", notes: "Palm slaps mag into AK-pattern rifle." },
  { id: 18, timecode: "15:22", label: "Rifle detail", framing: "CU", angle: "EYE", pose: "rifle_load", notes: "Receiver + front sight, torso behind." },
  { id: 19, timecode: "16:16", label: "Full war paint", framing: "CU", angle: "EYE", pose: "rifle_vertical", notes: "Face in full paint, weapon vertical beside face." },
  { id: 20, timecode: "22:21", label: "Hero reveal", framing: "MEDIUM", angle: "LOW", pose: "rifle_shoulder", notes: "Backlit by haze, rifle over shoulder, full kit." },
];

export function frameForShot(shotId) {
  return `/frames/${FRAME_FILES[shotId - 1]}`;
}
