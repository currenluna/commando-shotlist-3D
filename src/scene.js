import * as THREE from "three";
import { createMannequin, ACTOR_HEIGHT } from "./mannequin.js";

export const DEFAULT_SUN = { azimuth: 45, elevation: 35 };

/**
 * Builds the shared scene: ground plane, a blocky cliff/rock wall, the
 * posable mannequin, and a rotatable directional "sun" light. Both the
 * director camera and the shot camera render this exact same scene
 * (see render.js), so anything added here shows up identically in both
 * views.
 */
export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1b1d22);
  scene.fog = new THREE.Fog(0x1b1d22, 12, 40);

  const hemi = new THREE.HemisphereLight(0x9aa6c2, 0x2b2418, 0.55);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2d9, 2.2);
  sun.castShadow = true;
  // Kept modest since the scene renders twice per frame (director + shot
  // camera, see render.js) — 1024 is plenty for a blocky previs mannequin
  // and meaningfully cheaper than 2048 on machines without a real GPU.
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -6;
  sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6;
  sun.shadow.camera.bottom = -6;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 20;
  sun.shadow.bias = -0.0015;
  scene.add(sun);
  scene.add(sun.target);

  function setSun(azimuthDeg, elevationDeg) {
    const az = THREE.MathUtils.degToRad(azimuthDeg);
    const el = THREE.MathUtils.degToRad(elevationDeg);
    const radius = 10;
    sun.position.set(
      radius * Math.cos(el) * Math.sin(az),
      radius * Math.sin(el),
      radius * Math.cos(el) * Math.cos(az)
    );
    sun.target.position.set(0, 1, 0);
    sun.target.updateMatrixWorld();
  }
  setSun(DEFAULT_SUN.azimuth, DEFAULT_SUN.elevation);

  // Ground plane
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x6b5a3f, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Cliff / rock wall block on one side, roughly matching the sandstone
  // cliff face behind the actor in the reference frames.
  const cliff = new THREE.Group();
  cliff.name = "cliff";
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a6b4a, roughness: 1 });
  const slabGeo = [
    [4.5, 5, 2, -3.2, 2.5, -2.2, -0.05],
    [3, 3.5, 1.8, -1.6, 1.75, -1.3, 0.08],
    [2.5, 6, 1.6, -4.6, 3, -2.0, -0.1],
  ];
  for (const [w, h, d, x, y, z, rotY] of slabGeo) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), rockMat);
    slab.position.set(x, y, z);
    slab.rotation.y = rotY;
    slab.castShadow = true;
    slab.receiveShadow = true;
    cliff.add(slab);
  }
  scene.add(cliff);

  // Actor
  const mannequin = createMannequin();
  scene.add(mannequin.root);

  return { scene, sun, setSun, ground, cliff, mannequin, actorHeight: ACTOR_HEIGHT };
}
