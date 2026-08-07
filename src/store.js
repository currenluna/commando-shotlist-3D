// localStorage persistence + JSON export/import.
//
// Every shot's camera + pose is auto-saved immediately on change, keyed
// by shot id, under one root object so export/import round-trips the
// entire session (all 20 shots, sun, aspect ratio) as a single JSON file.
const STORAGE_KEY = "commando-previs:v1";

function readRoot() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { shots: {}, sun: null, aspect: null };
    const parsed = JSON.parse(raw);
    return { shots: parsed.shots || {}, sun: parsed.sun || null, aspect: parsed.aspect || null };
  } catch (err) {
    console.warn("commando-previs: failed to read localStorage, starting fresh.", err);
    return { shots: {}, sun: null, aspect: null };
  }
}

function writeRoot(root) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
  } catch (err) {
    console.warn("commando-previs: failed to write localStorage.", err);
  }
}

export function loadShotState(shotId) {
  const root = readRoot();
  return root.shots[shotId] || null;
}

export function saveShotState(shotId, state) {
  const root = readRoot();
  root.shots[shotId] = state;
  writeRoot(root);
}

export function loadGlobalState() {
  const root = readRoot();
  return { sun: root.sun, aspect: root.aspect };
}

export function saveGlobalState({ sun, aspect }) {
  const root = readRoot();
  if (sun) root.sun = sun;
  if (aspect) root.aspect = aspect;
  writeRoot(root);
}

export function exportAllToJSON() {
  const root = readRoot();
  return JSON.stringify(root, null, 2);
}

export function downloadExport(filename = "commando-previs-shots.json") {
  const json = exportAllToJSON();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Validates and replaces the whole store from an imported JSON string.
// Returns the parsed root on success, throws on malformed input.
export function importFromJSON(jsonString) {
  const parsed = JSON.parse(jsonString);
  if (typeof parsed !== "object" || parsed === null || typeof parsed.shots !== "object") {
    throw new Error("Invalid file: expected an object with a \"shots\" field.");
  }
  writeRoot({ shots: parsed.shots || {}, sun: parsed.sun || null, aspect: parsed.aspect || null });
  return parsed;
}
