# Commando "Gear-Up" Shot Previsualizer

A single-page, browser-based previs tool for planning camera placement and
actor pose for the 20-shot gearing-up montage, side-by-side against the
original reference frames. Three.js + vanilla JS + Vite, no backend —
everything lives in `localStorage` on your machine.

## Quick start

```bash
npm install
npm run dev
```

Open the printed local URL. Use `‹ Prev` / `Next ›` (bottom-center) or the
Left/Right arrow keys to step through the 20 shots.

## Where to drop the reference JPGs

Place your 20 screen grabs in `public/frames/`, named **exactly** as
listed in `src/shots.js` (`FRAME_FILES`):

```
public/frames/Timeline_1_01_00_00_07.jpg
public/frames/Timeline_1_01_00_02_04.jpg
...
public/frames/Timeline_1_01_00_22_21.jpg
```

The reference viewer and onion-skin overlay both load from this array by
shot index, so the filenames must match precisely (including underscores,
not spaces).

## Layout

- **Reference** (top-left) — the current shot's JPG.
- **Shot Camera Preview** (below it, same aspect ratio) — a live Three.js
  render from the virtual film camera for this shot.
- **Main viewport** (center) — a free "director" camera (drag to orbit,
  scroll to zoom) so you can see where the shot camera and actor sit in
  3D. The camera-body gizmo, its frustum (orange `CameraHelper`), and the
  blue look-at target crosshair are only visible here — they're hidden
  when rendering the shot preview so it shows a clean shot.
- **Shot Camera** panel (right, top) — position, look-at target, roll,
  and FOV/focal-length for the film camera.
- **Pose Editor** (right, bottom) — joint-by-joint rotation sliders for
  the mannequin.
- **Shot nav** (bottom) — indicator + Prev/Next.

## Onion-skin

Check **Onion-skin** above the shot preview to overlay the reference JPG
directly on top of the live 3D render, so you can line up framing and
pose against the plate pixel-for-pixel. The **Opacity** slider blends
between the two (0% = pure 3D render, 100% = pure reference).

## Pose editor + copy-pose

Each shot ships with a starting pose preset (`crouch_reach`,
`hands_at_chest`, `rifle_shoulder`, etc. — see `src/poses.js`). To adjust
it:

1. Pick a joint from the **Joint** dropdown (e.g. `elbow_R`).
2. Drag the **X / Y / Z** sliders. X swings the limb forward/backward —
   on a limb this sweeps a full arc as it grows (~90° is horizontal, ~180°
   is straight up), so "raise the arm" poses live on X, not Z. Z swings a
   limb away from the body's centerline (a large Z genuinely means
   "held straight out to the side," as in the paint-arm pose) or across
   it toward/past the centerline for negative values; use it for side
   clearance and crossing gestures rather than lift. Y twists the segment
   around its own long axis. Torso joints (`pelvis`, `spine`, `chest`,
   `neck`, `head`) use the same convention relative to a standing rest
   pose. See the convention comment at the top of `src/poses.js` for the
   full breakdown.
3. **Crouch / root height** lowers or raises the whole mannequin (for
   kneeling/crouching shots) independently of the leg joints.
4. **Copy pose from shot** lets you pull another shot's *saved* pose
   (or its default preset, if that shot hasn't been touched yet) onto
   the current shot — handy since several shots (5–9, 17–18) share a
   similar hands-at-chest setup.
5. **Reset Pose to Default** discards your edits and reloads the shot's
   seed preset.

Any prop the mannequin is "holding" (rifle on the right hand, pistol on
the left) is parented to that hand's joint, so it follows the pose
automatically. Each preset also declares which prop, if any, should be
*visible* (see the `props` field in `src/poses.js`) — most poses show
neither, so a bare-handed gesture like grabbing the duffel or painting a
stripe doesn't visibly clutch a gun; only the pistol- and rifle-handling
poses show their weapon.

## Camera inspector

Position and look-at target are both in meters, in world space (the
actor stands at the origin, facing the default camera). **Roll** is an
independent dutch-angle twist applied after the camera aims at its
target, so re-aiming (by moving the camera or dragging the target) never
resets a canted angle. **FOV** and **Focal** are linked — editing either
one updates the other, computed from the focal length using the sensor
width constant in `src/cameraMath.js` (`SENSOR_WIDTH_MM`, a Super 35-style
reference sensor — swap it if you're matching a specific camera body).

You can also drag the camera (or, via the **Target** toggle, the blue
look-at crosshair) directly in the main viewport using the on-screen
`TransformControls` gizmo — the panel's sliders update live to match.

**Reset Camera to Default** recomputes a starting position from the
shot's `framing`/`angle` shorthand (ECU/CU/INSERT/MEDIUM ×
LOW/EYE, see `src/cameraMath.js`).

## Export / Import

- **Export JSON** downloads every shot's camera + pose, the sun
  position, and the aspect ratio as one JSON file — use it to back up a
  session or hand it to a collaborator.
- **Import JSON** replaces the current session with a previously
  exported file.

Everything also auto-saves to `localStorage` immediately on every
change, so a reload picks up exactly where you left off; shots you
haven't touched yet fall back to their seed defaults.

## Swapping in a rigged model later

The actor is currently a hierarchy of jointed primitives (see
`src/mannequin.js`) — correct scale and silhouette, not photoreal detail.
To swap in a rigged GLTF character later, see the `loadActorModel()` stub
at the bottom of `src/mannequin.js`: export your rig with bone names
matching `JOINT_NAMES` in `src/poses.js` exactly (`pelvis`, `spine`,
`chest`, `neck`, `head`, `shoulder_L/elbow_L/wrist_L`,
`shoulder_R/elbow_R/wrist_R`, `hip_L/knee_L/ankle_L`,
`hip_R/knee_R/ankle_R`), and every pose preset, the pose editor, and the
prop-parenting logic keeps working unmodified — they all key off these
joint names rather than the procedural mesh hierarchy.

## Notable constants

- `src/mannequin.js` — body segment lengths (meters), summing to a
  ~1.85m actor.
- `src/cameraMath.js` — `SENSOR_WIDTH_MM` (Super 35 reference sensor
  width used for the focal-length readout) and the starting
  distance/height/FOV per `framing`/`angle` combination.
- `src/poses.js` — the rotation-sign convention used by every pose
  preset (documented in the file header) and the 13 seed pose presets.
