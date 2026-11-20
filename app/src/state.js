// State, layouts, colour grades and export sizes for Leonida Cover Lab.
// Everything the renderer needs to draw a cover lives here as plain data,
// so the editor, the export path and the screenshot scenes share one model.

export const SAMPLE_PHOTOS = [
  { id: 'boulevard', src: 'samples/boulevard.jpg', label: 'Boulevard' },
  { id: 'neon', src: 'samples/neon.jpg', label: 'Neon street' },
  { id: 'pier', src: 'samples/pier.jpg', label: 'Pier sunset' },
];

export const SIZES = {
  square: { label: 'Square', width: 1080, height: 1080 },
  portrait: { label: 'Portrait', width: 1080, height: 1350 },
  wide: { label: 'Wide', width: 1920, height: 1080 },
};

// A panel is a rectangle in normalised cover coordinates (0..1), with an
// optional tilt in degrees and a frame style: 'ink' (poster ink border),
// 'polaroid' (white snapshot border) or 'bleed' (no border).
export const LAYOUTS = {
  nine: {
    label: 'Nine-panel grid',
    blurb: 'The classic poster: nine panels around one hero.',
    background: 'ink',
    titleStyle: 'band',
    panels: [
      { x: 0.015, y: 0.015, w: 0.32, h: 0.26, rot: 0, frame: 'ink' },
      { x: 0.34, y: 0.015, w: 0.32, h: 0.26, rot: 0, frame: 'ink' },
      { x: 0.665, y: 0.015, w: 0.32, h: 0.26, rot: 0, frame: 'ink' },
      { x: 0.015, y: 0.285, w: 0.32, h: 0.26, rot: 0, frame: 'ink' },
      { x: 0.34, y: 0.285, w: 0.32, h: 0.26, rot: 0, frame: 'ink', hero: true },
      { x: 0.665, y: 0.285, w: 0.32, h: 0.26, rot: 0, frame: 'ink' },
      { x: 0.015, y: 0.555, w: 0.32, h: 0.25, rot: 0, frame: 'ink' },
      { x: 0.34, y: 0.555, w: 0.32, h: 0.25, rot: 0, frame: 'ink' },
      { x: 0.665, y: 0.555, w: 0.32, h: 0.25, rot: 0, frame: 'ink' },
    ],
  },
  hero: {
    label: 'Hero + panels',
    blurb: 'One big hero shot with a column of moments.',
    background: 'ink',
    titleStyle: 'band',
    panels: [
      { x: 0.015, y: 0.015, w: 0.60, h: 0.79, rot: 0, frame: 'ink', hero: true },
      { x: 0.63, y: 0.015, w: 0.355, h: 0.255, rot: 0, frame: 'ink' },
      { x: 0.63, y: 0.285, w: 0.355, h: 0.255, rot: 0, frame: 'ink' },
      { x: 0.63, y: 0.555, w: 0.355, h: 0.25, rot: 0, frame: 'ink' },
    ],
  },
  fullbleed: {
    label: 'Full-bleed',
    blurb: 'One photo edge to edge, with tilted snapshots on top.',
    background: 'photo',
    titleStyle: 'overlay',
    panels: [
      { x: 0, y: 0, w: 1, h: 1, rot: 0, frame: 'bleed', hero: true },
      { x: 0.64, y: 0.045, w: 0.30, h: 0.235, rot: 4, frame: 'polaroid' },
      { x: 0.05, y: 0.06, w: 0.26, h: 0.20, rot: -5, frame: 'polaroid' },
    ],
  },
  tilted: {
    label: 'Tilted snapshots',
    blurb: 'Scattered polaroids over a Leonida sunset skyline.',
    background: 'sunset',
    titleStyle: 'diagonal',
    panels: [
      { x: 0.05, y: 0.05, w: 0.42, h: 0.34, rot: -5, frame: 'polaroid', hero: true },
      { x: 0.52, y: 0.04, w: 0.42, h: 0.30, rot: 4, frame: 'polaroid' },
      { x: 0.08, y: 0.44, w: 0.36, h: 0.30, rot: 3, frame: 'polaroid' },
      { x: 0.50, y: 0.40, w: 0.44, h: 0.32, rot: -3, frame: 'polaroid' },
      { x: 0.30, y: 0.72, w: 0.40, h: 0.24, rot: 2, frame: 'polaroid' },
    ],
  },
};

// A grade is a sunset/neon colour treatment applied over every panel:
// a gradient washed over the photo in 'overlay' mode, a soft tint, and a
// canvas filter that lifts saturation and contrast.
export const GRADES = {
  sunset: {
    label: 'Sunset',
    swatch: 'linear-gradient(135deg,#ffd319,#ff2975)',
    gradient: ['#ffb347', '#ff2975'],
    tint: 'rgba(255,110,60,0.16)',
    filter: 'saturate(1.25) contrast(1.06)',
  },
  neon: {
    label: 'Neon',
    swatch: 'linear-gradient(135deg,#00e5ff,#ff2975)',
    gradient: ['#00e5ff', '#ff2975'],
    tint: 'rgba(140,30,255,0.14)',
    filter: 'saturate(1.45) contrast(1.10)',
  },
  palm: {
    label: 'Palm',
    swatch: 'linear-gradient(135deg,#00c9a7,#ffd319)',
    gradient: ['#00c9a7', '#ffd319'],
    tint: 'rgba(0,180,140,0.12)',
    filter: 'saturate(1.2) contrast(1.05)',
  },
  heat: {
    label: 'Heat',
    swatch: 'linear-gradient(135deg,#ff3b30,#ff9500)',
    gradient: ['#ff3b30', '#ff9500'],
    tint: 'rgba(255,60,30,0.16)',
    filter: 'saturate(1.35) contrast(1.12)',
  },
};

export const MAX_PANELS = 9;

/** The default cover: nine-panel grid, sunset grade, sample photos spread. */
export function defaultState() {
  const spread = ['boulevard', 'neon', 'pier', 'neon', 'boulevard', 'pier', 'pier', 'neon', 'boulevard'];
  return {
    layout: 'nine',
    grade: 'sunset',
    size: 'wide',
    title: 'NEON SHORE',
    subtitle: 'Welcome to Leonida',
    badge: 'VICE CITY',
    kicker: 'LEONIDA',
    stars: 5,
    effects: { grain: true, vignette: true, halftone: true },
    selectedPanel: 4,
    panels: Array.from({ length: MAX_PANELS }, (_, i) => ({
      photo: spread[i % spread.length],
      zoom: 1,
      ox: 0,
      oy: 0,
    })),
  };
}

/** A deep copy of a state object, for the undo history. */
export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}
