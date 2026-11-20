// Leonida Cover Lab — editor wiring: state, photos, controls, export.
// The cover itself is drawn by LeonidaCover.render (src/cover.js).
(() => {
  "use strict";

  const SAMPLES = {
    boulevard: { src: "samples/boulevard.jpg", name: "Boulevard Sunset" },
    neon: { src: "samples/neon.jpg", name: "Neon Street" },
    pier: { src: "samples/pier.jpg", name: "Golden Pier" },
  };
  const SAMPLE_KEYS = Object.keys(SAMPLES);

  const PRESETS = {
    sleeve: {
      label: "Sunset Sleeve",
      layout: "nine", grade: "sunset", size: "portrait",
      title: "NEON SHORE", subtitle: "Welcome to Leonida", titleStyle: "sunset",
      panels: ["boulevard", "neon", "pier", "neon", "boulevard", "pier", "pier", "neon", "boulevard"],
    },
    nights: {
      label: "Neon Nights",
      layout: "hero", grade: "neon", size: "wide",
      title: "NIGHT SHIFT", subtitle: "Welcome to Leonida", titleStyle: "neon",
      panels: ["neon", "boulevard", "pier", "neon"],
    },
    pier: {
      label: "Pier Pressure",
      layout: "tilted", grade: "gold", size: "square",
      title: "PIER PRESSURE", subtitle: "Keys to the city", titleStyle: "white",
      panels: ["pier", "boulevard", "neon", "pier"],
    },
  };

  const DEFAULT_STATE = {
    layout: "nine",
    grade: "sunset",
    size: "portrait",
    title: "NEON SHORE",
    subtitle: "Welcome to Leonida",
    titleStyle: "sunset",
    grain: true,
    vignette: true,
    halftone: true,
    selected: 0,
    panels: PRESETS.sleeve.panels.map((key) => ({
      src: SAMPLES[key].src,
      key,
      zoom: 1,
      ox: 0,
      oy: 0,
    })),
  };

  const STORE_KEY = "leonida-cover-lab-v1";
  const canvas = document.getElementById("cover");
  const images = new Map(); // src -> HTMLImageElement
  let state = loadState();
  let renderQueued = false;
  let shot = null;

  function loadState() {
    const base = JSON.parse(JSON.stringify(DEFAULT_STATE));
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        for (const k of ["layout", "grade", "size", "title", "subtitle", "titleStyle", "grain", "vignette", "halftone"]) {
          if (saved[k] !== undefined) base[k] = saved[k];
        }
        if (Array.isArray(saved.panels)) {
          base.panels = saved.panels
            .filter((p) => p && SAMPLES[p.key])
            .map((p) => ({ src: SAMPLES[p.key].src, key: p.key, zoom: p.zoom || 1, ox: p.ox || 0, oy: p.oy || 0 }));
          while (base.panels.length < 9) {
            const k = SAMPLE_KEYS[base.panels.length % 3];
            base.panels.push({ src: SAMPLES[k].src, key: k, zoom: 1, ox: 0, oy: 0 });
          }
        }
      }
    } catch (e) { /* fresh start on any bad save */ }
    return base;
  }

  function saveState() {
    try {
      const slim = { ...state };
      delete slim.selected;
      slim.panels = state.panels.map((p) => ({ key: p.key || "", zoom: p.zoom, ox: p.ox, oy: p.oy }));
      localStorage.setItem(STORE_KEY, JSON.stringify(slim));
    } catch (e) { /* storage may be unavailable */ }
  }

  function loadImage(src) {
    if (images.has(src)) return Promise.resolve(images.get(src));
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { images.set(src, img); resolve(img); };
      img.onerror = reject;
      img.src = src;
    });
  }

  function neededSrcs() {
    const layout = LeonidaCover.LAYOUTS[state.layout];
    const n = layout.panels.length;
    const srcs = new Set();
    for (let i = 0; i < n; i++) srcs.add(state.panels[i].src);
    return [...srcs];
  }

  function imageMap() {
    const map = {};
    for (const [src, img] of images) map[src] = img;
    return map;
  }

  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      doRender();
    });
  }

  function doRender() {
    try {
      LeonidaCover.render(state, imageMap(), canvas);
      document.documentElement.dataset.ready = "1";
    } catch (e) {
      console.error("render failed", e);
    }
  }

  async function ensureImages() {
    await Promise.all(neededSrcs().map((s) => loadImage(s).catch(() => null)));
  }

  // ---- controls -----------------------------------------------------------

  function markActive(group, value) {
    document.querySelectorAll(`[data-group="${group}"]`).forEach((b) => {
      b.classList.toggle("active", b.dataset.value === value);
    });
  }

  function syncControls() {
    markActive("layout", state.layout);
    markActive("grade", state.grade);
    markActive("size", state.size);
    markActive("titleStyle", state.titleStyle);
    const t = document.getElementById("titleInput");
    if (t && t.value !== state.title) t.value = state.title;
    const s = document.getElementById("subtitleInput");
    if (s && s.value !== state.subtitle) s.value = state.subtitle;
    document.getElementById("grainToggle").checked = !!state.grain;
    document.getElementById("vignetteToggle").checked = !!state.vignette;
    document.getElementById("halftoneToggle").checked = !!state.halftone;
    syncPanelControls();
  }

  function syncPanelControls() {
    const layout = LeonidaCover.LAYOUTS[state.layout];
    const slot = state.panels[state.selected] || state.panels[0];
    const label = document.getElementById("panelLabel");
    if (label) {
      label.textContent = state.selected >= layout.panels.length
        ? "Panel (not used by this layout)"
        : `Panel ${state.selected + 1} of ${layout.panels.length} — ${slot.key ? SAMPLES[slot.key].name : "Your photo"}`;
    }
    document.querySelectorAll("#photoRow [data-photo]").forEach((b) => {
      b.classList.toggle("active", slot.key === b.dataset.photo);
    });
    const z = document.getElementById("zoomRange");
    if (z) z.value = slot.zoom;
    const px = document.getElementById("panXRange");
    if (px) px.value = slot.ox;
    const py = document.getElementById("panYRange");
    if (py) py.value = slot.oy;
    document.getElementById("zoomVal").textContent = `${Math.round(slot.zoom * 100)}%`;
  }

  function applyPreset(name) {
    const p = PRESETS[name];
    if (!p) return;
    state.layout = p.layout;
    state.grade = p.grade;
    state.size = p.size;
    state.title = p.title;
    state.subtitle = p.subtitle;
    state.titleStyle = p.titleStyle;
    state.panels = p.panels.map((key) => ({ src: SAMPLES[key].src, key, zoom: 1, ox: 0, oy: 0 }));
    state.selected = 0;
    saveState();
    syncControls();
    ensureImages().then(queueRender);
  }

  function setPanelPhoto(key) {
    const slot = state.panels[state.selected];
    slot.src = SAMPLES[key].src;
    slot.key = key;
    slot.zoom = 1;
    slot.ox = 0;
    slot.oy = 0;
    saveState();
    syncPanelControls();
    ensureImages().then(queueRender);
  }

  function handleUpload(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      const key = `upload:${file.name}:${Date.now()}`;
      const img = new Image();
      img.onload = () => {
        images.set(src, img);
        const slot = state.panels[state.selected];
        slot.src = src;
        slot.key = "";
        slot.zoom = 1;
        slot.ox = 0;
        slot.oy = 0;
        saveState();
        syncPanelControls();
        queueRender();
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  // ---- export -------------------------------------------------------------

  function downloadBlob(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }

  function exportSize(sizeKey) {
    return new Promise((resolve) => {
      const off = document.createElement("canvas");
      const snap = { ...state, size: sizeKey };
      LeonidaCover.render(snap, imageMap(), off);
      off.toBlob((blob) => {
        if (blob) downloadBlob(blob, `leonida-cover-${sizeKey}.png`);
        resolve(!!blob);
      }, "image/png");
    });
  }

  async function exportAll() {
    const btn = document.getElementById("exportAllBtn");
    if (btn) { btn.disabled = true; btn.textContent = "Exporting…"; }
    for (const key of ["square", "portrait", "wide"]) {
      await exportSize(key);
      await new Promise((r) => setTimeout(r, 150));
    }
    if (btn) { btn.disabled = false; btn.textContent = "Export all 3 sizes"; }
  }

  // ---- canvas pointer: pick a panel, drag to pan, wheel to zoom -----------

  function canvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      fx: (e.clientX - rect.left) / rect.width,
      fy: (e.clientY - rect.top) / rect.height,
      rect,
    };
  }

  let drag = null;
  canvas.addEventListener("pointerdown", (e) => {
    const { fx, fy } = canvasPoint(e);
    const idx = LeonidaCover.panelAt(state, fx, fy);
    if (idx < 0) return;
    state.selected = idx;
    syncPanelControls();
    canvas.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, idx };
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const slot = state.panels[drag.idx];
    const rect = canvas.getBoundingClientRect();
    const layout = LeonidaCover.LAYOUTS[state.layout];
    const p = layout.panels[drag.idx];
    const pw = p.w * rect.width;
    const ph = p.h * rect.height;
    slot.ox += ((e.clientX - drag.x) / pw) * 2;
    slot.oy += ((e.clientY - drag.y) / ph) * 2;
    slot.ox = Math.max(-1.5, Math.min(1.5, slot.ox));
    slot.oy = Math.max(-1.5, Math.min(1.5, slot.oy));
    drag.x = e.clientX;
    drag.y = e.clientY;
    syncPanelControls();
    queueRender();
  });
  canvas.addEventListener("pointerup", () => { drag = null; saveState(); });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const { fx, fy } = canvasPoint(e);
    const idx = LeonidaCover.panelAt(state, fx, fy);
    if (idx < 0) return;
    const slot = state.panels[idx];
    slot.zoom = Math.max(1, Math.min(4, slot.zoom * Math.exp(-e.deltaY * 0.0012)));
    state.selected = idx;
    syncPanelControls();
    saveState();
    queueRender();
  }, { passive: false });

  // ---- wire the controls ---------------------------------------------------

  document.querySelectorAll("[data-preset]").forEach((b) => {
    b.addEventListener("click", () => applyPreset(b.dataset.preset));
  });
  document.querySelectorAll("[data-group]").forEach((b) => {
    b.addEventListener("click", () => {
      const group = b.dataset.group;
      const value = b.dataset.value;
      if (group === "layout" || group === "grade" || group === "size" || group === "titleStyle") {
        state[group] = value;
        if (group === "layout") state.selected = 0;
        saveState();
        syncControls();
        ensureImages().then(queueRender);
      }
    });
  });
  document.getElementById("titleInput").addEventListener("input", (e) => {
    state.title = e.target.value;
    saveState();
    queueRender();
  });
  document.getElementById("subtitleInput").addEventListener("input", (e) => {
    state.subtitle = e.target.value;
    saveState();
    queueRender();
  });
  for (const [id, key] of [["grainToggle", "grain"], ["vignetteToggle", "vignette"], ["halftoneToggle", "halftone"]]) {
    document.getElementById(id).addEventListener("change", (e) => {
      state[key] = e.target.checked;
      saveState();
      queueRender();
    });
  }
  document.querySelectorAll("#photoRow [data-photo]").forEach((b) => {
    b.addEventListener("click", () => setPanelPhoto(b.dataset.photo));
  });
  document.getElementById("uploadInput").addEventListener("change", (e) => {
    handleUpload(e.target.files[0]);
    e.target.value = "";
  });
  document.getElementById("fillAllBtn").addEventListener("click", () => {
    const slot = state.panels[state.selected];
    state.panels = state.panels.map((p) => ({ ...p, src: slot.src, key: slot.key }));
    saveState();
    ensureImages().then(queueRender);
  });
  document.getElementById("shuffleBtn").addEventListener("click", () => {
    const keys = [...SAMPLE_KEYS];
    state.panels = state.panels.map(() => {
      const key = keys[Math.floor(Math.random() * keys.length)];
      return { src: SAMPLES[key].src, key, zoom: 1, ox: 0, oy: 0 };
    });
    saveState();
    syncPanelControls();
    ensureImages().then(queueRender);
  });
  document.getElementById("zoomRange").addEventListener("input", (e) => {
    const slot = state.panels[state.selected];
    slot.zoom = parseFloat(e.target.value);
    document.getElementById("zoomVal").textContent = `${Math.round(slot.zoom * 100)}%`;
    queueRender();
  });
  document.getElementById("zoomRange").addEventListener("change", saveState);
  document.getElementById("panXRange").addEventListener("input", (e) => {
    state.panels[state.selected].ox = parseFloat(e.target.value);
    queueRender();
  });
  document.getElementById("panXRange").addEventListener("change", saveState);
  document.getElementById("panYRange").addEventListener("input", (e) => {
    state.panels[state.selected].oy = parseFloat(e.target.value);
    queueRender();
  });
  document.getElementById("panYRange").addEventListener("change", saveState);
  document.getElementById("exportBtn").addEventListener("click", () => exportSize(state.size));
  document.getElementById("exportAllBtn").addEventListener("click", exportAll);
  document.getElementById("resetBtn").addEventListener("click", () => {
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    saveState();
    syncControls();
    ensureImages().then(queueRender);
  });

  // ---- boot ----------------------------------------------------------------

  async function boot() {
    shot = LeonidaShots.shotConfig();
    if (shot) {
      document.body.classList.add(shot.shot === "cover" ? "shot-cover" : "shot-editor");
      if (shot.layout && LeonidaCover.LAYOUTS[shot.layout]) state.layout = shot.layout;
      if (shot.grade && LeonidaCover.GRADES[shot.grade]) state.grade = shot.grade;
      if (shot.size && LeonidaCover.SIZES[shot.size]) state.size = shot.size;
      if (shot.title !== undefined) state.title = shot.title;
      if (shot.subtitle !== undefined) state.subtitle = shot.subtitle;
      if (shot.titleStyle && LeonidaCover.TITLE_STYLES[shot.titleStyle]) state.titleStyle = shot.titleStyle;
      for (const k of ["grain", "vignette", "halftone"]) if (shot[k] !== undefined) state[k] = shot[k];
      const keys = shot.panels || (shot.sample ? [shot.sample] : null);
      if (keys) {
        state.panels = state.panels.map((p, i) => {
          const key = keys[Math.min(i, keys.length - 1)];
          return SAMPLES[key] ? { src: SAMPLES[key].src, key, zoom: 1, ox: 0, oy: 0 } : p;
        });
      }
      state.selected = 0;
    }
    try {
      await Promise.race([
        Promise.all([
          document.fonts.load('40px Anton'),
          document.fonts.load('40px Pacifico'),
          document.fonts.load('40px "Bebas Neue"'),
        ]),
        new Promise((r) => setTimeout(r, 4000)),
      ]);
    } catch (e) { /* fall back to system fonts */ }
    await ensureImages();
    syncControls();
    doRender();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
