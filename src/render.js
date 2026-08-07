import * as THREE from "three";

// Two independent WebGLRenderer instances — one per <canvas> — rendering
// the SAME THREE.Scene from two different cameras every frame: the free
// "director" camera in the main viewport, and the locked-aspect "shot"
// camera in the preview panel. Two renderers (rather than one renderer
// with scissor/viewport regions) because the two canvases live in
// unrelated parts of the page layout, not adjoining regions of one
// element — this keeps resize/layout trivial while still hitting 60fps
// for a scene this simple.
export function createDualRenderer(canvasMain, canvasPreview) {
  const rendererMain = new THREE.WebGLRenderer({ canvas: canvasMain, antialias: true });
  rendererMain.shadowMap.enabled = true;
  rendererMain.shadowMap.type = THREE.PCFSoftShadowMap;
  rendererMain.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const rendererPreview = new THREE.WebGLRenderer({ canvas: canvasPreview, antialias: true });
  rendererPreview.shadowMap.enabled = true;
  rendererPreview.shadowMap.type = THREE.PCFSoftShadowMap;
  rendererPreview.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Tracks last-applied CSS size per canvas (NOT canvas.width/height, which
  // are the drawing-buffer pixel dimensions scaled by devicePixelRatio and
  // so never equal the container's CSS pixel size — comparing against
  // those directly would force a resize on every single frame).
  const lastSize = new WeakMap();

  function resizeToContainer(renderer, canvas, camera) {
    const parent = canvas.parentElement;
    const w = Math.max(1, Math.floor(parent.clientWidth));
    const h = Math.max(1, Math.floor(parent.clientHeight));
    const prev = lastSize.get(canvas);
    const needsResize = !prev || prev.w !== w || prev.h !== h;
    if (needsResize) {
      renderer.setSize(w, h, false);
      if (camera.isPerspectiveCamera) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      lastSize.set(canvas, { w, h });
    }
    return needsResize;
  }

  return { rendererMain, rendererPreview, resizeToContainer };
}
