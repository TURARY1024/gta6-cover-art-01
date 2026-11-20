// LeonidaShots: drive the app from URL params, for screenshots.
// ?shot=cover&layout=nine&grade=sunset&size=portrait&title=NEON%20SHORE
//   renders just the cover, full-viewport, for the app's own export shot.
// ?shot=editor&layout=hero&grade=neon
//   opens the editor with that state, a photo already loaded.
const LeonidaShots = (() => {
  "use strict";

  function shotConfig() {
    const q = new URLSearchParams(location.search);
    const shot = q.get("shot");
    if (!shot) return null;
    const cfg = { shot };
    for (const key of ["layout", "grade", "size", "title", "subtitle", "titleStyle", "sample"]) {
      const v = q.get(key);
      if (v !== null && v !== "") cfg[key] = v;
    }
    const panels = q.get("panels");
    if (panels) cfg.panels = panels.split(",");
    for (const key of ["grain", "vignette", "halftone"]) {
      const v = q.get(key);
      if (v === "0" || v === "1") cfg[key] = v === "1";
    }
    return cfg;
  }

  return { shotConfig };
})();
