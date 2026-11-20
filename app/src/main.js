// Wires the editor: photos, layouts, grades, words, per-panel crop,
// export sizes, undo/redo and the live preview. A `?shot=` query instead
// sets up a fixed scene for a screenshot (./shots.js).
import { SAMPLE_PHOTOS, SIZES, LAYOUTS, GRADES, defaultState, cloneState } from './state.js';
import { drawCover, loadImage, panelAtPoint } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('preview');
const status = document.getElementById('status');
const panelLabel = document.getElementById('panelLabel');

const state = defaultState();
const images = new Map();
const photos = [...SAMPLE_PHOTOS];
let history = [];
let historyIndex = -1;
let selectedPhotoForTray = null;

function previewSize() {
  const size = SIZES[state.size];
  const scale = 880 / Math.max(size.width, size.height);
  return { width: Math.round(size.width * scale), height: Math.round(size.height * scale) };
}

function redraw() {
  const { width, height } = previewSize();
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  drawCover(canvas, state, images);
  syncControls();
}

function setStatus(text) {
  status.textContent = text;
}

/** Pushes the current state onto the undo stack after a committed change. */
function commit(message) {
  history = history.slice(0, historyIndex + 1);
  history.push(JSON.stringify(state));
  if (history.length > 60) history.shift();
  historyIndex = history.length - 1;
  document.getElementById('undoBtn').disabled = historyIndex <= 0;
  document.getElementById('redoBtn').disabled = true;
  if (message) setStatus(message);
}

function restoreFromHistory() {
  const saved = JSON.parse(history[historyIndex]);
  Object.assign(state, saved);
  state.panels = saved.panels;
  state.effects = saved.effects;
  document.getElementById('undoBtn').disabled = historyIndex <= 0;
  document.getElementById('redoBtn').disabled = historyIndex >= history.length - 1;
  redraw();
}

function undo() {
  if (historyIndex <= 0) return;
  historyIndex -= 1;
  restoreFromHistory();
  setStatus('Undid the last change.');
}

function redo() {
  if (historyIndex >= history.length - 1) return;
  historyIndex += 1;
  restoreFromHistory();
  setStatus('Redid the change.');
}

/** Refreshes every control to match the state (called after each redraw). */
function syncControls() {
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('[name="size"]').forEach((r) => { r.checked = r.value === state.size; });
  const titleInput = document.getElementById('titleInput');
  if (document.activeElement !== titleInput) titleInput.value = state.title;
  const subtitleInput = document.getElementById('subtitleInput');
  if (document.activeElement !== subtitleInput) subtitleInput.value = state.subtitle;
  const badgeInput = document.getElementById('badgeInput');
  if (document.activeElement !== badgeInput) badgeInput.value = state.badge;
  const kickerInput = document.getElementById('kickerInput');
  if (document.activeElement !== kickerInput) kickerInput.value = state.kicker;
  document.getElementById('grainCheck').checked = state.effects.grain;
  document.getElementById('vignetteCheck').checked = state.effects.vignette;
  document.getElementById('halftoneCheck').checked = state.effects.halftone;
  document.getElementById('starsRange').value = String(state.stars);
  document.getElementById('starsOut').textContent = `${state.stars} / 5`;
  const slot = state.panels[state.selectedPanel];
  const layout = LAYOUTS[state.layout];
  const panelCount = layout.panels.length;
  panelLabel.textContent = state.selectedPanel < panelCount
    ? `Panel ${state.selectedPanel + 1} of ${panelCount}${layout.panels[state.selectedPanel].hero ? ' — hero' : ''}`
    : `Panel ${state.selectedPanel + 1} (not used by this layout)`;
  document.getElementById('zoomRange').value = String(slot.zoom);
  document.getElementById('panXRange').value = String(slot.ox);
  document.getElementById('panYRange').value = String(slot.oy);
  document.getElementById('zoomOut').textContent = `${Math.round(slot.zoom * 100)}%`;
  const select = document.getElementById('panelPhotoSelect');
  select.innerHTML = '';
  for (const p of photos) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.label;
    if (p.id === slot.photo) opt.selected = true;
    select.appendChild(opt);
  }
  document.querySelectorAll('#photoTray .thumb').forEach((t) => {
    t.classList.toggle('selected', t.dataset.photo === slot.photo);
  });
}

/** Rebuilds the photo tray thumbnails from the loaded photos. */
function renderTray() {
  const tray = document.getElementById('photoTray');
  tray.innerHTML = '';
  for (const p of photos) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb';
    button.dataset.photo = p.id;
    button.title = `Use ${p.label} in the selected panel`;
    const img = document.createElement('img');
    img.src = p.src;
    img.alt = p.label;
    const span = document.createElement('span');
    span.textContent = p.label;
    button.append(img, span);
    button.addEventListener('click', () => {
      state.panels[state.selectedPanel].photo = p.id;
      selectedPhotoForTray = p.id;
      commit();
      redraw();
      setStatus(`${p.label} is now in panel ${state.selectedPanel + 1}.`);
    });
    tray.appendChild(button);
  }
}

/** Loads every sample photo, then draws the first preview. */
async function loadSamples() {
  for (const p of SAMPLE_PHOTOS) {
    try {
      images.set(p.id, await loadImage(p.src));
    } catch {
      setStatus(`Could not load sample ${p.label}.`);
    }
  }
}

document.getElementById('photoInput').addEventListener('change', async (event) => {
  const files = [...event.target.files];
  if (!files.length) return;
  for (const file of files) {
    const url = URL.createObjectURL(file);
    const img = await loadImage(url);
    const id = `user-${Date.now()}-${photos.length}`;
    photos.push({ id, src: url, label: file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Your photo' });
    images.set(id, img);
    state.panels[state.selectedPanel].photo = id;
  }
  renderTray();
  commit(`${files.length} photo${files.length > 1 ? 's' : ''} added — click a thumbnail to place it.`);
  redraw();
});

document.getElementById('fillAllBtn').addEventListener('click', () => {
  const slot = state.panels[state.selectedPanel];
  for (const p of state.panels) p.photo = slot.photo;
  commit('Every panel now shows the same photo.');
  redraw();
});

document.getElementById('spreadBtn').addEventListener('click', () => {
  state.panels.forEach((p, i) => { p.photo = photos[i % photos.length].id; });
  commit('Photos spread across the panels.');
  redraw();
});

document.querySelectorAll('[data-layout]').forEach((button) => {
  button.addEventListener('click', () => {
    state.layout = button.dataset.layout;
    const count = LAYOUTS[state.layout].panels.length;
    if (state.selectedPanel >= count) state.selectedPanel = 0;
    commit(`Layout: ${LAYOUTS[state.layout].label}.`);
    redraw();
  });
});

document.querySelectorAll('[data-grade]').forEach((button) => {
  button.addEventListener('click', () => {
    state.grade = button.dataset.grade;
    commit(`Grade: ${GRADES[state.grade].label}.`);
    redraw();
  });
});

function bindText(id, key) {
  const input = document.getElementById(id);
  input.addEventListener('input', () => {
    state[key] = input.value;
    redraw();
  });
  input.addEventListener('change', () => commit());
}
bindText('titleInput', 'title');
bindText('subtitleInput', 'subtitle');
bindText('badgeInput', 'badge');
bindText('kickerInput', 'kicker');

document.getElementById('panelPhotoSelect').addEventListener('change', (event) => {
  state.panels[state.selectedPanel].photo = event.target.value;
  commit();
  redraw();
});

function bindSlider(id, apply) {
  const input = document.getElementById(id);
  input.addEventListener('input', () => {
    apply(Number(input.value));
    redraw();
  });
  input.addEventListener('change', () => commit());
}
bindSlider('zoomRange', (v) => { state.panels[state.selectedPanel].zoom = v; });
bindSlider('panXRange', (v) => { state.panels[state.selectedPanel].ox = v; });
bindSlider('panYRange', (v) => { state.panels[state.selectedPanel].oy = v; });

document.getElementById('starsRange').addEventListener('input', (event) => {
  state.stars = Number(event.target.value);
  redraw();
});
document.getElementById('starsRange').addEventListener('change', () => commit());

for (const [id, key] of [['grainCheck', 'grain'], ['vignetteCheck', 'vignette'], ['halftoneCheck', 'halftone']]) {
  document.getElementById(id).addEventListener('change', (event) => {
    state.effects[key] = event.target.checked;
    commit();
    redraw();
  });
}

document.querySelectorAll('[name="size"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    state.size = radio.value;
    commit(`Preview size: ${SIZES[state.size].label}.`);
    redraw();
  });
});

document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (event.shiftKey) redo();
    else undo();
  }
});

document.getElementById('shuffleBtn').addEventListener('click', () => {
  const layouts = Object.keys(LAYOUTS);
  const grades = Object.keys(GRADES);
  state.layout = layouts[Math.floor(Math.random() * layouts.length)];
  state.grade = grades[Math.floor(Math.random() * grades.length)];
  state.panels.forEach((p, i) => { p.photo = photos[(i + Math.floor(Math.random() * photos.length)) % photos.length].id; });
  commit('Shuffled the look — layout, grade and photos.');
  redraw();
});

canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  const hit = panelAtPoint(x, y);
  if (hit >= 0) {
    state.selectedPanel = hit;
    redraw();
    setStatus(`Panel ${hit + 1} selected — crop it below or pick a photo for it.`);
  }
});

/** Renders the cover at full export size and downloads it as a PNG. */
function exportSize(sizeKey) {
  const size = SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = size.width;
  off.height = size.height;
  const savedSize = state.size;
  state.size = sizeKey;
  drawCover(off, state, images);
  state.size = savedSize;
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `leonida-cover-${size.width}x${size.height}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve();
    }, 'image/png');
  });
}

document.getElementById('exportBtn').addEventListener('click', async () => {
  const size = SIZES[state.size];
  await exportSize(state.size);
  setStatus(`Saved leonida-cover-${size.width}x${size.height}.png`);
});

document.getElementById('exportAllBtn').addEventListener('click', async () => {
  for (const key of Object.keys(SIZES)) {
    // eslint-disable-next-line no-await-in-loop
    await exportSize(key);
  }
  setStatus('Saved all three sizes: 1080x1080, 1080x1350 and 1920x1080.');
});

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  await loadSamples();
  runShot(shot, params, state, images, photos, redraw);
  commit();
} else {
  renderTray();
  await loadSamples();
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('100px "Bebas Neue"'),
      document.fonts.load('60px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch {
    // The cover still draws with fallback lettering.
  }
  redraw();
  commit();
  setStatus('Pick a photo, choose a layout and grade, then export your cover.');
}

// Exposed for the screenshot scenes and for debugging in the console.
window.__leonida = { state, images, photos, redraw, exportSize };
