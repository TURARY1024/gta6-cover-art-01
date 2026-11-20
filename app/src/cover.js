// Leonida Cover Lab — the cover engine.
// Pure canvas, no DOM: given a state and loaded images, draws a GTA VI-style
// multi-panel cover (poster grid, bold caption lettering, sunset/neon grade)
// onto any canvas at any export size.
const LeonidaCover = (() => {
  "use strict";

  // Common post sizes, in pixels.
  const SIZES = {
    square: { w: 1080, h: 1080, label: "Square 1080 × 1080" },
    portrait: { w: 1080, h: 1350, label: "Portrait 1080 × 1350" },
    wide: { w: 1920, h: 1080, label: "Wide 1920 × 1080" },
  };

  // A panel is a photo slot: x/y/w/h in fractions of the cover, rot in degrees.
  // A layout also names its title band, where the caption sits.
  function gridPanels(cols, rows, top, height, gap) {
    const panels = [];
    const cw = (1 - gap * (cols + 1)) / cols;
    const ch = (height - gap * (rows + 1)) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        panels.push({
          x: gap + c * (cw + gap),
          y: top + gap + r * (ch + gap),
          w: cw,
          h: ch,
          rot: 0,
        });
      }
    }
    return panels;
  }

  const LAYOUTS = {
    nine: {
      name: "Nine-Panel Grid",
      blurb: "The classic poster grid",
      panels: gridPanels(3, 3, 0, 0.84, 0.008),
      title: { x: 0, y: 0.84, w: 1, h: 0.16, align: "left" },
    },
    hero: {
      name: "Hero + Three",
      blurb: "One big moment, three beats",
      panels: [
        { x: 0.008, y: 0.008, w: 0.984, h: 0.56, rot: 0 },
        ...gridPanels(3, 1, 0.576, 0.264, 0.008),
      ],
      title: { x: 0, y: 0.84, w: 1, h: 0.16, align: "left" },
    },
    four: {
      name: "Four-Panel",
      blurb: "Two by two, even and bold",
      panels: gridPanels(2, 2, 0, 0.84, 0.01),
      title: { x: 0, y: 0.84, w: 1, h: 0.16, align: "left" },
    },
    tilted: {
      name: "Tilted Snapshots",
      blurb: "Polaroids tossed on the table",
      background: true,
      panels: [
        { x: 0.06, y: 0.3, w: 0.4, h: 0.34, rot: -6 },
        { x: 0.34, y: 0.42, w: 0.36, h: 0.32, rot: 4 },
        { x: 0.6, y: 0.26, w: 0.36, h: 0.36, rot: -3 },
      ],
      title: { x: 0, y: 0.02, w: 1, h: 0.16, align: "center" },
    },
    split: {
      name: "Split Screen",
      blurb: "Lead photo, supporting column",
      panels: [
        { x: 0.008, y: 0.008, w: 0.54, h: 0.824, rot: 0 },
        { x: 0.556, y: 0.008, w: 0.436, h: 0.408, rot: 0 },
        { x: 0.556, y: 0.424, w: 0.436, h: 0.408, rot: 0 },
      ],
      title: { x: 0, y: 0.84, w: 1, h: 0.16, align: "left" },
    },
    strip: {
      name: "Full-Bleed",
      blurb: "One photo, loading-screen style",
      panels: [{ x: 0, y: 0, w: 1, h: 0.84, rot: 0 }],
      title: { x: 0, y: 0.84, w: 1, h: 0.16, align: "left" },
    },
  };

  // A grade is a canvas filter plus tint overlays drawn over each panel.
  const GRADES = {
    sunset: {
      name: "Sunset",
      filter: "saturate(1.28) contrast(1.08) brightness(1.02)",
      tints: [
        { op: "overlay", from: "rgba(255,122,61,0.30)", to: "rgba(122,40,130,0.30)" },
        { op: "multiply", from: "rgba(255,150,80,0.10)", to: "rgba(255,150,80,0.10)" },
      ],
    },
    neon: {
      name: "Neon Nights",
      filter: "saturate(1.55) contrast(1.12) brightness(1.02)",
      tints: [
        { op: "soft-light", from: "rgba(255,45,149,0.42)", to: "rgba(0,229,255,0.42)" },
        { op: "screen", from: "rgba(120,60,255,0.08)", to: "rgba(0,180,255,0.10)" },
      ],
    },
    heat: {
      name: "Heat",
      filter: "saturate(1.35) contrast(1.16) brightness(1.0)",
      tints: [
        { op: "overlay", from: "rgba(255,60,30,0.34)", to: "rgba(160,20,60,0.30)" },
        { op: "multiply", from: "rgba(255,90,40,0.12)", to: "rgba(255,90,40,0.12)" },
      ],
    },
    vice: {
      name: "Vice",
      filter: "saturate(1.12) contrast(1.06) brightness(1.03)",
      tints: [
        { op: "multiply", from: "rgba(20,180,190,0.10)", to: "rgba(20,180,190,0.20)" },
        { op: "screen", from: "rgba(255,120,200,0.14)", to: "rgba(255,120,200,0.05)" },
      ],
    },
    gold: {
      name: "Golden Hour",
      filter: "saturate(0.92) contrast(1.05) brightness(1.06) sepia(0.22)",
      tints: [
        { op: "overlay", from: "rgba(255,200,110,0.22)", to: "rgba(190,120,40,0.22)" },
      ],
    },
  };

  const TITLE_STYLES = {
    sunset: { name: "Sunset gradient", fill: "gradient" },
    white: { name: "White", fill: "#ffffff" },
    neon: { name: "Neon pink", fill: "#ff5da2" },
  };

  function fitRect(img, pw, ph, zoom, ox, oy) {
    // Cover-fit an image into a panel, with zoom and pan offsets
    // (ox/oy in fractions of the panel size, -1..1).
    const scale = Math.max(pw / img.width, ph / img.height) * zoom;
    const dw = img.width * scale;
    const dh = img.height * scale;
    return {
      dx: (pw - dw) / 2 + ox * pw * 0.5,
      dy: (ph - dh) / 2 + oy * ph * 0.5,
      dw,
      dh,
    };
  }

  function drawGradedPhoto(target, img, panel, grade, zoom, ox, oy) {
    // Draw one photo into a panel rect, graded. Returns nothing.
    const pw = Math.max(2, Math.round(panel.w));
    const ph = Math.max(2, Math.round(panel.h));
    const off = drawGradedPhoto._off || (drawGradedPhoto._off = document.createElement("canvas"));
    off.width = pw;
    off.height = ph;
    const c = off.getContext("2d");
    c.clearRect(0, 0, pw, ph);
    c.filter = grade.filter;
    const r = fitRect(img, pw, ph, zoom, ox, oy);
    c.drawImage(img, r.dx, r.dy, r.dw, r.dh);
    c.filter = "none";
    for (const tint of grade.tints) {
      const g = c.createLinearGradient(0, 0, 0, ph);
      g.addColorStop(0, tint.from);
      g.addColorStop(1, tint.to);
      c.globalCompositeOperation = tint.op;
      c.fillStyle = g;
      c.fillRect(0, 0, pw, ph);
    }
    c.globalCompositeOperation = "source-over";
    target.save();
    if (panel.rot) {
      target.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
      target.rotate((panel.rot * Math.PI) / 180);
      target.drawImage(off, -pw / 2, -ph / 2);
    } else {
      target.drawImage(off, panel.x, panel.y);
    }
    target.restore();
  }

  function fitFont(ctx, text, maxWidth, startPx, family, weight) {
    let px = startPx;
    while (px > 12) {
      ctx.font = `${weight} ${px}px ${family}`;
      if (ctx.measureText(text).width <= maxWidth) return px;
      px -= 2;
    }
    return px;
  }

  function drawTitle(ctx, state, W, H) {
    const layout = LAYOUTS[state.layout];
    const band = layout.title;
    const bx = band.x * W;
    const by = band.y * H;
    const bw = band.w * W;
    const bh = band.h * H;
    const cx = band.align === "center" ? bx + bw / 2 : bx + bw * 0.045;

    // Title band: ink slab for grid layouts, scrim for full-bleed ones.
    if (state.layout === "strip" || state.layout === "tilted") {
      const g = ctx.createLinearGradient(0, by, 0, by + bh);
      if (state.layout === "strip") {
        g.addColorStop(0, "rgba(16,6,28,0)");
        g.addColorStop(0.45, "rgba(16,6,28,0.82)");
        g.addColorStop(1, "rgba(16,6,28,0.96)");
      } else {
        g.addColorStop(0, "rgba(16,6,28,0.94)");
        g.addColorStop(1, "rgba(16,6,28,0.55)");
      }
      ctx.fillStyle = g;
      ctx.fillRect(bx, by, bw, bh);
    } else {
      ctx.fillStyle = "#150819";
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = "rgba(255,93,162,0.9)";
      ctx.fillRect(bx, by, bw, Math.max(2, H * 0.004));
    }

    // Halftone dots behind the caption.
    if (state.halftone) {
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      const step = Math.max(9, W * 0.011);
      for (let y = by + step * 0.6; y < by + bh - step * 0.3; y += step) {
        for (let x = bx + step * 0.6; x < bx + bw - step * 0.3; x += step) {
          const r = Math.max(1, step * 0.11 * (1 + 0.6 * Math.sin(x * 0.05)));
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    const title = (state.title || "LEONIDA").toUpperCase();
    const sub = state.subtitle || "";
    const pad = bw * 0.045;
    const textW = bw - pad * (band.align === "center" ? 2 : 1.6);

    // Title: Anton, sunset gradient or flat, heavy dark outline.
    const titlePx = fitFont(ctx, title, textW, Math.round(bh * 0.52), "Anton, 'Arial Narrow', sans-serif", "400");
    ctx.save();
    ctx.translate(cx, by + bh * 0.56);
    ctx.rotate(-0.015);
    ctx.textAlign = band.align === "center" ? "center" : "left";
    ctx.textBaseline = "middle";
    ctx.font = `${titlePx}px Anton, 'Arial Narrow', sans-serif`;
    let fill;
    const style = TITLE_STYLES[state.titleStyle] || TITLE_STYLES.sunset;
    if (style.fill === "gradient") {
      const g = ctx.createLinearGradient(0, -titlePx * 0.55, 0, titlePx * 0.55);
      g.addColorStop(0, "#ffe27a");
      g.addColorStop(0.45, "#ff8a3d");
      g.addColorStop(1, "#ff2d95");
      fill = g;
    } else {
      fill = style.fill;
    }
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(18,6,28,0.92)";
    ctx.lineWidth = Math.max(2, titlePx / 14);
    ctx.strokeText(title, 0, 0);
    ctx.fillStyle = fill;
    ctx.fillText(title, 0, 0);
    ctx.restore();

    // Subtitle: Pacifico script, neon glow.
    if (sub) {
      const subPx = fitFont(ctx, sub, textW * 0.8, Math.round(bh * 0.26), "Pacifico, cursive", "400");
      ctx.save();
      ctx.textAlign = band.align === "center" ? "center" : "left";
      ctx.textBaseline = "middle";
      ctx.font = `${subPx}px Pacifico, cursive`;
      ctx.shadowColor = "rgba(255,45,149,0.9)";
      ctx.shadowBlur = Math.max(4, subPx * 0.35);
      ctx.fillStyle = "#7df3ff";
      const sy = by + bh * 0.86;
      ctx.fillText(sub, band.align === "center" ? bx + bw / 2 : bx + pad, sy);
      ctx.restore();
    }
  }

  let _noise = null;
  function grainCanvas() {
    if (_noise) return _noise;
    const n = document.createElement("canvas");
    n.width = 160;
    n.height = 160;
    const c = n.getContext("2d");
    const data = c.createImageData(160, 160);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = 110 + Math.floor(Math.random() * 90);
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    c.putImageData(data, 0, 0);
    _noise = n;
    return n;
  }

  function render(state, images, canvas) {
    // state: {layout, grade, size, title, subtitle, titleStyle,
    //         grain, vignette, halftone, panels:[{src,zoom,ox,oy}]}
    // images: {key: HTMLImageElement} keyed by panel src.
    const size = SIZES[state.size] || SIZES.portrait;
    const W = size.w;
    const H = size.h;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    const layout = LAYOUTS[state.layout] || LAYOUTS.nine;
    const grade = GRADES[state.grade] || GRADES.sunset;

    // Backdrop: deep ink, so gutters read as poster borders.
    ctx.fillStyle = "#150819";
    ctx.fillRect(0, 0, W, H);

    const px = (f) => f * W;
    const py = (f) => f * H;

    // Full-bleed background for the tilted layout.
    if (layout.background) {
      const bg = state.panels[0];
      const img = bg && images[bg.src];
      if (img) {
        ctx.save();
        ctx.filter = grade.filter;
        const r = fitRect(img, W, H, bg.zoom || 1, bg.ox || 0, bg.oy || 0);
        ctx.drawImage(img, r.dx, r.dy, r.dw, r.dh);
        ctx.restore();
        ctx.fillStyle = "rgba(20,8,32,0.28)";
        ctx.fillRect(0, 0, W, H);
      }
    }

    // Panels, in order; panel i uses state.panels[i].
    layout.panels.forEach((p, i) => {
      const slot = state.panels[i] || state.panels[0];
      const img = slot && images[slot.src];
      const rect = {
        x: px(p.x),
        y: py(p.y),
        w: px(p.w),
        h: py(p.h),
        rot: p.rot || 0,
      };
      if (!img) {
        ctx.fillStyle = i % 2 ? "#241031" : "#1d0c28";
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      } else {
        drawGradedPhoto(ctx, img, rect, grade, slot.zoom || 1, slot.ox || 0, slot.oy || 0);
      }
      // Panel frame: white inner keyline + dark outer edge (poster print look).
      ctx.save();
      if (rect.rot) {
        ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
        ctx.rotate((rect.rot * Math.PI) / 180);
        ctx.translate(-rect.w / 2, -rect.h / 2);
      } else {
        ctx.translate(rect.x, rect.y);
      }
      ctx.lineWidth = Math.max(2, W * 0.004);
      ctx.strokeStyle = "rgba(255,255,255,0.92)";
      ctx.strokeRect(0, 0, rect.w, rect.h);
      ctx.lineWidth = Math.max(3, W * 0.006);
      ctx.strokeStyle = "rgba(12,5,20,0.9)";
      ctx.strokeRect(-ctx.lineWidth / 2, -ctx.lineWidth / 2, rect.w + ctx.lineWidth, rect.h + ctx.lineWidth);
      ctx.restore();
    });

    drawTitle(ctx, state, W, H);

    // Grain + vignette finish.
    if (state.grain) {
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = ctx.createPattern(grainCanvas(), "repeat");
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    if (state.vignette) {
      const g = ctx.createRadialGradient(
        W / 2, H / 2, Math.min(W, H) * 0.42,
        W / 2, H / 2, Math.max(W, H) * 0.75,
      );
      g.addColorStop(0, "rgba(8,3,16,0)");
      g.addColorStop(1, "rgba(8,3,16,0.42)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    // Outer poster frame.
    ctx.lineWidth = Math.max(3, W * 0.006);
    ctx.strokeStyle = "#0d0514";
    ctx.strokeRect(0, 0, W, H);
    return canvas;
  }

  // Hit-test: which panel (index) sits under a point in cover fractions?
  function panelAt(state, fx, fy) {
    const layout = LAYOUTS[state.layout] || LAYOUTS.nine;
    for (let i = layout.panels.length - 1; i >= 0; i--) {
      const p = layout.panels[i];
      if (fx >= p.x && fx <= p.x + p.w && fy >= p.y && fy <= p.y + p.h) return i;
    }
    return -1;
  }

  return {
    SIZES,
    LAYOUTS,
    GRADES,
    TITLE_STYLES,
    render,
    panelAt,
  };
})();
