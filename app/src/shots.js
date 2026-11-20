// Fixed scenes for screenshots: ?shot=cover draws one exported cover full
// frame; ?shot=editor shows the editor with a sample photo loaded.
// Query knobs: layout, grade, size, title, subtitle, badge, kicker.
// window.__shotReady is set once the fonts are in and the scene is painted.
import { LAYOUTS, GRADES, SIZES } from './state.js';
import { drawCover } from './cover.js';

async function waitForFonts() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('100px "Bebas Neue"'),
      document.fonts.load('60px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch {
    // Fallback fonts still draw; the scene is usable either way.
  }
}

function applyQuery(state, query) {
  const layout = query.get('layout');
  if (layout && LAYOUTS[layout]) state.layout = layout;
  const grade = query.get('grade');
  if (grade && GRADES[grade]) state.grade = grade;
  const size = query.get('size');
  if (size && SIZES[size]) state.size = size;
  for (const key of ['title', 'subtitle', 'badge', 'kicker']) {
    const value = query.get(key);
    if (value) state[key] = value;
  }
  const stars = Number(query.get('stars'));
  if (stars >= 1 && stars <= 5) state.stars = stars;
}

function markReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

export async function runShot(shot, query, state, images, photos, redraw) {
  applyQuery(state, query);
  await waitForFonts();
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const canvas = document.getElementById('preview');
    const size = SIZES[state.size];
    canvas.width = size.width;
    canvas.height = size.height;
    drawCover(canvas, state, images);
    markReady();
    return;
  }
  // Editor scene: the normal editor, with the tray built and a photo in.
  const tray = document.getElementById('photoTray');
  if (tray && !tray.children.length) {
    for (const p of photos) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'thumb';
      button.dataset.photo = p.id;
      const img = document.createElement('img');
      img.src = p.src;
      img.alt = p.label;
      const span = document.createElement('span');
      span.textContent = p.label;
      button.append(img, span);
      tray.appendChild(button);
    }
  }
  redraw();
  markReady();
}
