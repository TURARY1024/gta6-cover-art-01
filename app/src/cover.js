// Draws the cover onto a canvas: multi-panel poster, colour grade, title
// block with display lettering and neon script, grain / vignette / halftone.
// One function, drawCover, renders at any size, so the live preview and the
// exported PNGs are the same drawing.
import { LAYOUTS, GRADES } from './state.js';

let lastPanels = [];
let noisePattern = null;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** The panels drawn by the last drawCover call, in canvas pixels, for clicks. */
export function drawnPanels() {
  return lastPanels;
}

function makeNoisePattern(ctx) {
  if (noisePattern) return noisePattern;
  const tile = document.createElement('canvas');
  tile.width = 140;
  tile.height = 140;
  const tctx = tile.getContext('2d');
  const data = tctx.createImageData(140, 140);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  tctx.putImageData(data, 0, 0);
  noisePattern = ctx.createPattern(tile, 'repeat');
  return noisePattern;
}

/** Shrinks a font until `text` fits `maxWidth`; returns the fitted size. */
export function fitFontSize(ctx, text, family, startSize, maxWidth, weight = 400) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function letterSpacedText(ctx, text, x, y, spacing) {
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  return cx - x;
}

/** Draws one photo cover-filling a rectangle, with zoom and pan offsets. */
function drawPhotoCoverFit(ctx, img, x, y, w, h, zoom, ox, oy, grade) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const dx = x + (w - pw) / 2 + ox * w * 0.25;
  const dy = y + (h - ph) / 2 + oy * h * 0.25;
  ctx.save();
  ctx.filter = grade.filter;
  ctx.drawImage(img, dx, dy, pw, ph);
  ctx.restore();
}

/** Washes a grade's sunset/neon gradient over a panel rectangle. */
function applyGrade(ctx, x, y, w, h, grade) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, grade.gradient[0]);
  g.addColorStop(1, grade.gradient[1]);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function drawInkFrame(ctx, x, y, w, h) {
  ctx.save();
  ctx.lineWidth = Math.max(2, w * 0.012);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(x, y, w, h);
  ctx.lineWidth = Math.max(3, w * 0.02);
  ctx.strokeStyle = '#14081f';
  ctx.strokeRect(x - ctx.lineWidth / 2, y - ctx.lineWidth / 2, w + ctx.lineWidth, h + ctx.lineWidth);
  ctx.restore();
}

function drawPolaroidFrame(ctx, x, y, w, h) {
  const pad = Math.max(6, w * 0.03);
  const bottom = Math.max(14, h * 0.14);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = w * 0.06;
  ctx.shadowOffsetY = w * 0.02;
  ctx.fillStyle = '#fdfbf6';
  ctx.fillRect(x - pad, y - pad, w + pad * 2, h + pad + bottom);
  ctx.restore();
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.strokeRect(x - pad, y - pad, w + pad * 2, h + pad + bottom);
  ctx.restore();
}

/** Draws one panel: photo, grade, frame. Returns its canvas rectangle. */
function drawPanel(ctx, panel, slot, img, grade, W, H) {
  const x = panel.x * W;
  const y = panel.y * H;
  const w = panel.w * W;
  const h = panel.h * H;
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.save();
  if (panel.frame === 'polaroid') drawPolaroidFrame(ctx, x, y, w, h);
  ctx.translate(cx, cy);
  ctx.rotate((panel.rot * Math.PI) / 180);
  ctx.translate(-cx, -cy);
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (img) {
    drawPhotoCoverFit(ctx, img, x, y, w, h, slot.zoom, slot.ox, slot.oy, grade);
    applyGrade(ctx, x, y, w, h, grade);
  } else {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#3a1c5e');
    g.addColorStop(1, '#12081f');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
  if (panel.frame === 'ink') drawInkFrame(ctx, x, y, w, h);
  return { x, y, w, h, rot: panel.rot, cx, cy };
}

/** A Leonida sunset skyline for the tilted-snapshots background. */
function drawSunsetBackground(ctx, W, H) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#2b1055');
  sky.addColorStop(0.45, '#ff2975');
  sky.addColorStop(0.75, '#ff7a3c');
  sky.addColorStop(1, '#ffd319');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.fillStyle = '#ffdf6b';
  ctx.beginPath();
  ctx.arc(W * 0.72, H * 0.34, H * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#1c0b33';
  const base = H * 0.82;
  const widths = [0.09, 0.06, 0.12, 0.07, 0.10, 0.08, 0.11, 0.06, 0.09];
  let bx = 0;
  for (let i = 0; i < widths.length; i += 1) {
    const bw = widths[i] * W;
    const bh = H * (0.10 + ((i * 37) % 13) / 100);
    ctx.fillRect(bx, base - bh, bw, bh + H * 0.2);
    ctx.fillStyle = 'rgba(255,211,25,0.85)';
    for (let wy = 0; wy < 3; wy += 1) {
      for (let wx = 0; wx < 2; wx += 1) {
        if ((i + wy + wx) % 2 === 0) ctx.fillRect(bx + bw * (0.2 + wx * 0.45), base - bh + H * (0.02 + wy * 0.035), bw * 0.14, H * 0.012);
      }
    }
    ctx.fillStyle = '#1c0b33';
    bx += bw + W * 0.012;
  }
  ctx.fillStyle = '#12081f';
  ctx.fillRect(0, base + H * 0.06, W, H);
}

function drawStars(ctx, count, x, y, size) {
  ctx.save();
  ctx.fillStyle = '#ffd319';
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = Math.max(1, size * 0.08);
  for (let i = 0; i < 5; i += 1) {
    const sx = x + i * size * 1.35;
    ctx.beginPath();
    for (let p = 0; p < 10; p += 1) {
      const r = p % 2 === 0 ? size : size * 0.45;
      const a = -Math.PI / 2 + (p * Math.PI) / 5;
      const px = sx + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (p === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (i < count) ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawTitleText(ctx, state, x, y, maxWidth, align, titleSize) {
  const title = state.title.trim().toUpperCase() || 'LEONIDA';
  const size = fitFontSize(ctx, title, 'Anton, sans-serif', titleSize, maxWidth);
  const grad = ctx.createLinearGradient(0, y - size, 0, y + size * 0.2);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.55, '#ffd319');
  grad.addColorStop(1, '#ff2975');
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#14081f';
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.strokeText(title, x, y);
  ctx.fillStyle = grad;
  ctx.fillText(title, x, y);
  ctx.restore();
  return size;
}

function drawSubtitle(ctx, state, x, y, align, size) {
  const sub = state.subtitle.trim();
  if (!sub) return 0;
  ctx.save();
  ctx.textAlign = align;
  ctx.font = `400 ${size}px Pacifico, cursive`;
  const width = ctx.measureText(sub).width;
  ctx.shadowColor = '#ff2975';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#ff7ad9';
  ctx.fillText(sub, x, y);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(sub, x, y);
  ctx.restore();
  return width;
}

function drawBadge(ctx, state, W, H) {
  const text = state.badge.trim().toUpperCase();
  if (!text) return;
  ctx.save();
  ctx.translate(W * 0.87, H * 0.05);
  ctx.rotate(-0.12);
  const size = fitFontSize(ctx, text, 'Bebas Neue, sans-serif', H * 0.038, W * 0.26);
  const tw = ctx.measureText(text).width;
  const pad = size * 0.5;
  ctx.fillStyle = '#ff2975';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, size * 0.08);
  const bw = tw + pad * 2;
  const bh = size * 1.5;
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${size}px "Bebas Neue", sans-serif`;
  ctx.fillText(text, 0, size * 0.06);
  ctx.restore();
}

/** The black title band used by the grid and hero layouts. */
function drawTitleBand(ctx, state, W, H) {
  const bandY = H * 0.82;
  const bandH = H * 0.18;
  ctx.save();
  ctx.fillStyle = '#0d0518';
  ctx.fillRect(0, bandY, W, bandH);
  const stripe = ctx.createLinearGradient(0, 0, W, 0);
  stripe.addColorStop(0, '#ff2975');
  stripe.addColorStop(0.5, '#ffd319');
  stripe.addColorStop(1, '#00e5ff');
  ctx.fillStyle = stripe;
  ctx.fillRect(0, bandY, W, Math.max(3, H * 0.008));
  if (state.effects.halftone) {
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    const step = Math.max(10, W * 0.012);
    for (let yy = bandY + step; yy < bandY + bandH; yy += step) {
      for (let xx = step / 2; xx < W; xx += step) {
        ctx.beginPath();
        ctx.arc(xx + (Math.round(yy / step) % 2 ? step / 2 : 0), yy, Math.max(1.5, step * 0.16), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const kicker = state.kicker.trim().toUpperCase();
  if (kicker) {
    ctx.fillStyle = '#ffd319';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const ks = fitFontSize(ctx, kicker, 'Bebas Neue, sans-serif', H * 0.032, W * 0.5);
    ctx.font = `${ks}px "Bebas Neue", sans-serif`;
    letterSpacedText(ctx, kicker, W * 0.03, bandY + bandH * 0.20, ks * 0.22);
  }
  // The subtitle's width caps the title, so the two never collide.
  const subtitleSize = Math.max(14, H * 0.046);
  ctx.font = `400 ${subtitleSize}px Pacifico, cursive`;
  const subWidth = state.subtitle.trim() ? ctx.measureText(state.subtitle.trim()).width : 0;
  const titleMax = Math.min(W * 0.66, W * 0.97 - subWidth - W * 0.05);
  const titleSize = drawTitleText(ctx, state, W * 0.03, bandY + bandH * 0.82, titleMax, 'left', H * 0.105);
  void titleSize;
  drawSubtitle(ctx, state, W * 0.97, bandY + bandH * 0.52, 'right', subtitleSize);
  drawStars(ctx, state.stars, W * 0.70, bandY + bandH * 0.86, H * 0.017);
  ctx.restore();
}

/** Title over a dark gradient at the foot of a full-bleed photo. */
function drawTitleOverlay(ctx, state, W, H) {
  const g = ctx.createLinearGradient(0, H * 0.55, 0, H);
  g.addColorStop(0, 'rgba(13,5,24,0)');
  g.addColorStop(1, 'rgba(13,5,24,0.92)');
  ctx.fillStyle = g;
  ctx.fillRect(0, H * 0.55, W, H * 0.45);
  const kicker = state.kicker.trim().toUpperCase();
  if (kicker) {
    ctx.save();
    ctx.fillStyle = '#ffd319';
    ctx.textAlign = 'left';
    const ks = fitFontSize(ctx, kicker, 'Bebas Neue, sans-serif', H * 0.035, W * 0.5);
    ctx.font = `${ks}px "Bebas Neue", sans-serif`;
    letterSpacedText(ctx, kicker, W * 0.04, H * 0.80, ks * 0.22);
    ctx.restore();
  }
  drawTitleText(ctx, state, W * 0.04, H * 0.925, W * 0.92, 'left', H * 0.11);
  drawSubtitle(ctx, state, W * 0.96, H * 0.80, 'right', Math.max(14, H * 0.046));
  drawStars(ctx, state.stars, W * 0.04, H * 0.965, H * 0.016);
}

/** A tilted title ribbon across the middle of the snapshot layout. */
function drawTitleDiagonal(ctx, state, W, H) {
  ctx.save();
  ctx.translate(W / 2, H * 0.52);
  ctx.rotate(-0.045);
  ctx.fillStyle = 'rgba(13,5,24,0.88)';
  ctx.fillRect(-W * 0.52, -H * 0.085, W * 1.04, H * 0.17);
  const stripe = ctx.createLinearGradient(-W * 0.52, 0, W * 0.52, 0);
  stripe.addColorStop(0, '#ff2975');
  stripe.addColorStop(0.5, '#ffd319');
  stripe.addColorStop(1, '#00e5ff');
  ctx.fillStyle = stripe;
  ctx.fillRect(-W * 0.52, -H * 0.085, W * 1.04, Math.max(3, H * 0.008));
  ctx.fillRect(-W * 0.52, H * 0.085 - Math.max(3, H * 0.008), W * 1.04, Math.max(3, H * 0.008));
  ctx.textAlign = 'center';
  const title = state.title.trim().toUpperCase() || 'LEONIDA';
  const size = fitFontSize(ctx, title, 'Anton, sans-serif', H * 0.085, W * 0.9);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#14081f';
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.strokeText(title, 0, size * 0.18);
  const grad = ctx.createLinearGradient(0, -size, 0, size * 0.3);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.55, '#ffd319');
  grad.addColorStop(1, '#ff2975');
  ctx.fillStyle = grad;
  ctx.fillText(title, 0, size * 0.18);
  ctx.restore();
  drawSubtitle(ctx, state, W * 0.5, H * 0.66, 'center', Math.max(14, H * 0.046));
  drawStars(ctx, state.stars, W * 0.44, H * 0.70, H * 0.016);
}

function drawGrain(ctx, W, H) {
  const pattern = makeNoisePattern(ctx);
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(10,4,20,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Draws the whole cover onto `canvas` at its own pixel size.
 * `images` maps photo ids to loaded HTMLImageElements.
 */
export function drawCover(canvas, state, images) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const layout = LAYOUTS[state.layout];
  const grade = GRADES[state.grade];
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#12081f';
  ctx.fillRect(0, 0, W, H);
  if (layout.background === 'sunset') drawSunsetBackground(ctx, W, H);
  lastPanels = [];
  layout.panels.forEach((panel, i) => {
    const slot = state.panels[i] ?? { photo: null, zoom: 1, ox: 0, oy: 0 };
    const img = slot.photo ? images.get(slot.photo) ?? null : null;
    const rect = drawPanel(ctx, panel, slot, img, grade, W, H);
    lastPanels.push({ index: i, ...rect });
  });
  if (layout.titleStyle === 'band') drawTitleBand(ctx, state, W, H);
  if (layout.titleStyle === 'overlay') drawTitleOverlay(ctx, state, W, H);
  if (layout.titleStyle === 'diagonal') drawTitleDiagonal(ctx, state, W, H);
  drawBadge(ctx, state, W, H);
  if (state.effects.grain) drawGrain(ctx, W, H);
  if (state.effects.vignette) drawVignette(ctx, W, H);
  ctx.restore();
}

/**
 * Finds the panel index under a point in canvas pixels, honouring tilt.
 * Returns -1 when the point lands on no panel.
 */
export function panelAtPoint(x, y) {
  for (let i = lastPanels.length - 1; i >= 0; i -= 1) {
    const p = lastPanels[i];
    const dx = x - p.cx;
    const dy = y - p.cy;
    const a = (-p.rot * Math.PI) / 180;
    const lx = dx * Math.cos(a) - dy * Math.sin(a);
    const ly = dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(lx) <= p.w / 2 && Math.abs(ly) <= p.h / 2) return p.index;
  }
  return -1;
}
