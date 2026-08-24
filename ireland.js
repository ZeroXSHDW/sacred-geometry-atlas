(() => {
  "use strict";

  const root = document.documentElement;
  const themeStorageKey = "sacred-geometry-atlas-theme";
  const mapLayerLabels = {
    outline: "outline",
    provinces: "province fields",
    places: "places",
    grid: "grid",
    symbols: "symbols"
  };
  const defaultMapLayers = ["outline", "places", "grid"];
  const state = {
    mapLayers: new Set(defaultMapLayers),
    garment: "tee",
    mapDetail: "outline",
    palette: "forest",
    symbol: "shamrock",
    caption: "EIRE / 53°N"
  };

  const palettes = {
    forest: {
      label: "Forest / sea / saffron",
      garment: "#253a32",
      ink: "#eef2e9",
      fill: "rgba(136, 198, 186, 0.16)",
      teal: "#88c6ba",
      amber: "#e9b36c",
      coral: "#e77f62"
    },
    ink: {
      label: "Ink / stone / coral",
      garment: "#2e3030",
      ink: "#f3e9d4",
      fill: "rgba(244, 226, 183, 0.12)",
      teal: "#d6c49f",
      amber: "#f1d39b",
      coral: "#ef866a"
    },
    flag: {
      label: "Green / white / orange",
      garment: "#244d3d",
      ink: "#f8f8f2",
      fill: "rgba(248, 248, 242, 0.14)",
      teal: "#f8f8f2",
      amber: "#f4a261",
      coral: "#f4a261"
    },
    night: {
      label: "Night / teal / gold",
      garment: "#1a2637",
      ink: "#dceae4",
      fill: "rgba(78, 154, 155, 0.2)",
      teal: "#71c6c1",
      amber: "#f1bf6c",
      coral: "#e7866e"
    }
  };

  const garmentLabels = { tee: "T-shirt", hoodie: "Hoodie", tote: "Tote bag" };
  const symbolLabels = {
    shamrock: "shamrock-inspired mark",
    harp: "harp rhythm",
    knot: "knot circle",
    ogham: "Ogham-inspired bars"
  };

  const mapPath = "M233 72C196 82 169 116 155 151C143 183 118 206 111 240C102 275 120 301 111 333C101 366 72 395 88 429C103 459 133 476 139 512C145 548 137 574 160 602C182 628 203 632 218 660C238 697 271 714 312 700C350 686 376 657 406 637C435 617 471 613 493 586C519 553 515 520 542 489C567 459 578 418 566 382C555 347 533 321 537 286C541 248 529 220 508 195C482 164 473 129 440 107C409 86 383 90 354 76C325 63 289 57 258 64C250 66 242 68 233 72Z";
  const designTransform = "translate(-15 0) scale(.78)";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  function escapeXml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&apos;",
      '"': "&quot;"
    }[character]));
  }

  function applyTheme(mode) {
    const next = mode === "light" ? "light" : "dark";
    root.dataset.theme = next;
    root.style.colorScheme = next;
    const button = $("#themeToggle");
    if (button) {
      button.setAttribute("aria-label", `Colour theme: ${next}. Switch to ${next === "dark" ? "light" : "dark"} theme`);
      button.title = `Colour theme: ${next} · switch to ${next === "dark" ? "light" : "dark"}`;
      button.innerHTML = `${next === "dark" ? "◐" : "☼"} <span>Theme</span>`;
    }
  }

  function setupTheme() {
    let stored = "";
    try { stored = window.localStorage.getItem(themeStorageKey) || ""; } catch (error) { /* optional preference */ }
    const systemLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    applyTheme(stored === "light" || stored === "dark" ? stored : systemLight ? "light" : "dark");
    const button = $("#themeToggle");
    if (!button) return;
    button.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      try { window.localStorage.setItem(themeStorageKey, next); } catch (error) { /* optional preference */ }
      applyTheme(next);
    });
  }

  function activeLayerLabel() {
    const labels = [...state.mapLayers].map((layer) => mapLayerLabels[layer]);
    return labels.length ? labels.join(" + ") : "no layers";
  }

  function renderMapState() {
    $$('[data-map-layer]').forEach((button) => {
      const active = state.mapLayers.has(button.dataset.mapLayer);
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    $$('[data-map-layer-target]').forEach((layer) => {
      const active = state.mapLayers.has(layer.dataset.mapLayerTarget);
      layer.style.display = active ? "" : "none";
      layer.setAttribute("aria-hidden", String(!active));
    });
    const status = $("#mapStatus");
    const legend = $("#mapLegend");
    if (status) status.textContent = `${state.mapLayers.size} layer${state.mapLayers.size === 1 ? "" : "s"} active · ${activeLayerLabel()}`;
    if (legend) legend.textContent = activeLayerLabel();
    const caption = $("#mapCaptionText");
    if (caption) {
      caption.textContent = state.mapLayers.size
        ? "Turn a visual observation into a named layer, then carry only the layers that improve the garment composition."
        : "No layers are active. Add the outline or a design field to begin composing.";
    }
  }

  function setupMapControls() {
    $$('[data-map-layer]').forEach((button) => {
      button.addEventListener("click", () => {
        const layer = button.dataset.mapLayer;
        if (state.mapLayers.has(layer)) state.mapLayers.delete(layer);
        else state.mapLayers.add(layer);
        renderMapState();
      });
    });
    $$('[data-map-preset="all"]').forEach((button) => {
      button.addEventListener("click", () => {
        state.mapLayers = new Set(Object.keys(mapLayerLabels));
        renderMapState();
      });
    });
    $$(".place-node").forEach((node) => {
      const selectPlace = () => {
        const name = node.dataset.place || "place";
        const caption = $("#mapCaptionText");
        const status = $("#mapStatus");
        if (caption) caption.textContent = `${name} anchor selected. Coordinates are rounded design references; verify any production map data against the linked sources.`;
        if (status) status.textContent = `${state.mapLayers.size} layer${state.mapLayers.size === 1 ? "" : "s"} active · selected place: ${name}`;
      };
      node.addEventListener("click", selectPlace);
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectPlace();
        }
      });
    });
    renderMapState();
  }

  function symbolMarkup(symbol, palette) {
    const amber = palette.amber;
    if (symbol === "harp") {
      return `<g class="design-symbol" transform="translate(240 287)"><path d="M-30-50C-4-72 31-46 26-10C22 22 5 48-25 65"/><path d="M-30-50C-16-15-6 19-25 65"/><path d="M-21-37L18 41M-27-20L14 28M-30-3L10 14"/><path d="M-2-31L21-5M-8-11L16 13M-13 9L8 31"/></g><text class="design-small-text" x="240" y="375" text-anchor="middle" fill="${amber}">HARP RHYTHM</text>`;
    }
    if (symbol === "knot") {
      return `<g class="design-symbol" transform="translate(240 286)"><circle cx="0" cy="0" r="57"/><path d="M-40 0C-40-53 40-53 40 0S-40 53-40 0ZM0-40C53-40 53 40 0 40S-53-40 0-40Z"/><circle cx="0" cy="0" r="8" class="design-symbol-fill"/></g><text class="design-small-text" x="240" y="375" text-anchor="middle">KNOT / CENTRE</text>`;
    }
    if (symbol === "ogham") {
      return `<g class="design-symbol" transform="translate(240 287)"><path d="M-68 0H68M-52-30L-38 0M-30-30L-16 0M-8-30L6 0M14-30L28 0M36-30L50 0M-52 30L-38 0M-30 30L-16 0M-8 30L6 0M14 30L28 0M36 30L50 0"/></g><text class="design-small-text" x="240" y="375" text-anchor="middle">OGHAM-INSPIRED BARS</text>`;
    }
    return `<g class="design-symbol" transform="translate(240 282)"><circle cx="0" cy="-24" r="22" class="design-symbol-fill"/><circle cx="-23" cy="12" r="22" class="design-symbol-fill"/><circle cx="23" cy="12" r="22" class="design-symbol-fill"/><path d="M0 25V69"/></g><text class="design-small-text" x="240" y="375" text-anchor="middle">SHAMROCK-INSPIRED</text>`;
  }

  function mapDetailMarkup(detail, palette) {
    const outline = `<g transform="${designTransform}"><path class="design-fill" d="${mapPath}"/><path class="design-outline" d="${mapPath}"/></g>`;
    const provinceFills = `<defs><clipPath id="designIslandClip"><path d="${mapPath}" transform="${designTransform}"/></clipPath></defs><g clip-path="url(#designIslandClip)" transform="${designTransform}"><path d="M80 55H330V405H75Z" fill="${palette.teal}" opacity=".25"/><path d="M330 55H590V405H330Z" fill="${palette.amber}" opacity=".24"/><path d="M75 405H330V730H75Z" fill="${palette.coral}" opacity=".22"/><path d="M330 405H590V730H330Z" fill="#98c980" opacity=".22"/><path d="M320 58V704M86 405H554" class="design-grid" opacity=".6"/></g>`;
    const placeMarks = `<g transform="${designTransform}" class="design-places"><circle class="design-place" cx="465" cy="390" r="9"/><circle class="design-place" cx="286" cy="615" r="9"/><circle class="design-place" cx="171" cy="388" r="9"/><text class="design-small-text" x="488" y="386">DUBLIN</text><text class="design-small-text" x="306" y="610">CORK</text><text class="design-small-text" x="104" y="383">GALWAY</text></g>`;
    const gridMarks = `<path class="design-grid" d="M42 86H438M42 166H438M42 246H438M42 326H438M42 406H438M42 486H438M42 566H438M82 46V584M162 46V584M242 46V584M322 46V584M402 46V584"/><circle cx="240" cy="307" r="134" class="design-grid" opacity=".7"/>`;
    const provinces = `${provinceFills}${outline}`;
    const places = `${placeMarks}${outline}`;
    const grid = `${gridMarks}${outline}`;
    if (detail === "provinces") return provinces;
    if (detail === "places") return places;
    if (detail === "grid") return grid;
    if (detail === "all") return `${gridMarks}${provinceFills}${placeMarks}${outline}`;
    return outline;
  }

  function renderDesign() {
    const svg = $("#designSvg");
    const palette = palettes[state.palette];
    if (!svg || !palette) return;
    svg.style.setProperty("--design-ink", palette.ink);
    svg.style.setProperty("--design-fill", palette.fill);
    svg.style.setProperty("--design-teal", palette.teal);
    svg.style.setProperty("--design-amber", palette.amber);
    svg.style.setProperty("--design-coral", palette.coral);
    svg.innerHTML = `
      <title id="design-title">${escapeXml(garmentLabels[state.garment])} design preview: ${escapeXml(state.caption)}</title>
      <desc id="design-desc">A transparent garment artwork concept using the ${escapeXml(state.mapDetail)} Ireland map layer and a ${escapeXml(symbolLabels[state.symbol])}.</desc>
      ${mapDetailMarkup(state.mapDetail, palette)}
      ${symbolMarkup(state.symbol, palette)}
      <path class="design-grid" d="M42 420H438" opacity=".55" />
      <text class="design-text" x="240" y="462" text-anchor="middle">${escapeXml(state.caption)}</text>
      <text class="design-small-text" x="240" y="489" text-anchor="middle">IRELAND MAP DESIGN LAB · 01</text>
    `;
    const preview = $("#garmentPreview");
    if (preview) {
      preview.classList.remove("garment-tee", "garment-hoodie", "garment-tote");
      preview.classList.add(`garment-${state.garment}`);
      const garmentColour = palette.garment;
      [".garment-body", ".garment-sleeve"].forEach((selector) => $$(selector, preview).forEach((part) => { part.style.background = garmentColour; }));
    }
    const designStatus = $("#designStatus");
    if (designStatus) designStatus.textContent = `${garmentLabels[state.garment]} · ${state.mapDetail} · ${palette.label}`;
    const previewGarment = $("#previewGarmentLabel");
    const previewPalette = $("#previewPaletteLabel");
    if (previewGarment) previewGarment.textContent = garmentLabels[state.garment];
    if (previewPalette) previewPalette.textContent = palette.label;
    updateDesignQuery();
  }

  function updateDesignQuery() {
    if (!window.history || !window.history.replaceState) return;
    const url = new URL(window.location.href);
    url.searchParams.set("garment", state.garment);
    url.searchParams.set("layer", state.mapDetail);
    url.searchParams.set("palette", state.palette);
    url.searchParams.set("symbol", state.symbol);
    url.searchParams.set("caption", state.caption);
    window.history.replaceState({}, "", `${url.pathname}?${url.searchParams.toString()}${url.hash}`);
  }

  function hydrateDesignQuery() {
    const params = new URLSearchParams(window.location.search);
    if (["tee", "hoodie", "tote"].includes(params.get("garment"))) state.garment = params.get("garment");
    if (["outline", "provinces", "places", "grid", "all"].includes(params.get("layer"))) state.mapDetail = params.get("layer");
    if (Object.prototype.hasOwnProperty.call(palettes, params.get("palette"))) state.palette = params.get("palette");
    if (Object.prototype.hasOwnProperty.call(symbolLabels, params.get("symbol"))) state.symbol = params.get("symbol");
    if (params.has("caption")) state.caption = params.get("caption").slice(0, 28);
    const garment = $("#garmentSelect");
    const layer = $("#designMapLayer");
    const palette = $("#paletteSelect");
    const caption = $("#captionInput");
    if (garment) garment.value = state.garment;
    if (layer) layer.value = state.mapDetail;
    if (palette) palette.value = state.palette;
    if (caption) caption.value = state.caption;
    const symbol = $(`input[name="symbol"][value="${CSS.escape(state.symbol)}"]`);
    if (symbol) symbol.checked = true;
  }

  function setupDesignControls() {
    hydrateDesignQuery();
    $("#garmentSelect")?.addEventListener("change", (event) => { state.garment = event.target.value; renderDesign(); });
    $("#designMapLayer")?.addEventListener("change", (event) => { state.mapDetail = event.target.value; renderDesign(); });
    $("#paletteSelect")?.addEventListener("change", (event) => { state.palette = event.target.value; renderDesign(); });
    $("#captionInput")?.addEventListener("input", (event) => { state.caption = event.target.value.slice(0, 28); renderDesign(); });
    $$('input[name="symbol"]').forEach((input) => input.addEventListener("change", (event) => { state.symbol = event.target.value; renderDesign(); }));
    $("#resetDesign")?.addEventListener("click", () => {
      state.garment = "tee";
      state.mapDetail = "outline";
      state.palette = "forest";
      state.symbol = "shamrock";
      state.caption = "EIRE / 53°N";
      hydrateDesignQuery();
      renderDesign();
      setExportStatus("Composer reset to the Ireland outline study.");
    });
    renderDesign();
  }

  function setExportStatus(message, isError = false) {
    const status = $("#exportStatus");
    if (!status) return;
    status.textContent = message;
    status.style.color = isError ? "var(--coral)" : "var(--teal)";
  }

  function serializedDesignSvg() {
    const svg = $("#designSvg");
    if (!svg) throw new Error("The design preview is unavailable.");
    const clone = svg.cloneNode(true);
    const palette = palettes[state.palette];
    const embeddedStyle = document.createElementNS("http://www.w3.org/2000/svg", "style");
    embeddedStyle.textContent = `
      .design-outline { fill: none; stroke: ${palette.teal}; stroke-width: 5; stroke-linejoin: round; }
      .design-fill { fill: ${palette.fill}; stroke: none; }
      .design-grid { fill: none; stroke: ${palette.amber}; stroke-width: 2; opacity: .88; }
      .design-place { fill: ${palette.coral}; stroke: ${palette.ink}; stroke-width: 3; }
      .design-symbol { fill: none; stroke: ${palette.amber}; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }
      .design-symbol-fill { fill: ${palette.amber}; stroke: none; }
      .design-text { fill: ${palette.ink}; font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace; font-size: 16px; letter-spacing: .12em; }
      .design-small-text { fill: ${palette.amber}; font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace; font-size: 9px; letter-spacing: .08em; }
    `;
    clone.insertBefore(embeddedStyle, clone.firstChild);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    clone.setAttribute("width", "2400");
    clone.setAttribute("height", "3000");
    clone.setAttribute("role", "img");
    return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadSvg() {
    try {
      const svg = serializedDesignSvg();
      downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `ireland-map-design-${state.garment}.svg`);
      setExportStatus("SVG export ready · transparent vector artwork downloaded.");
    } catch (error) {
      setExportStatus(`SVG export unavailable · ${error.message}`, true);
    }
  }

  async function downloadPng() {
    try {
      const svg = serializedDesignSvg();
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 2400;
        canvas.height = 3000;
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((png) => {
          URL.revokeObjectURL(url);
          if (!png) throw new Error("PNG encoding failed");
          downloadBlob(png, `ireland-map-design-${state.garment}-300dpi.png`);
          setExportStatus("PNG export ready · 2400 × 3000 transparent artwork downloaded.");
        }, "image/png");
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        setExportStatus("PNG export unavailable in this browser; use the SVG export instead.", true);
      };
      image.src = url;
    } catch (error) {
      setExportStatus(`PNG export unavailable · ${error.message}`, true);
    }
  }

  function printDesign() {
    document.body.classList.add("print-design");
    window.setTimeout(() => window.print(), 50);
    const clean = () => document.body.classList.remove("print-design");
    window.addEventListener("afterprint", clean, { once: true });
  }

  function setupExports() {
    $("#downloadDesign")?.addEventListener("click", downloadSvg);
    $("#downloadPng")?.addEventListener("click", downloadPng);
    $("#printDesign")?.addEventListener("click", printDesign);
  }

  function setupProviderLinks() {
    const providerTargets = {
      printful: { redirect: "/go/printful", direct: "https://www.printful.com/print-on-demand" },
      printify: { redirect: "/go/printify", direct: "https://printify.com/print-on-demand-ab/" },
      gelato: { redirect: "/go/gelato", direct: "https://www.gelato.com/the-power-of-local" }
    };
    const host = window.location.hostname.toLowerCase();
    const useCloudflareRedirects = host === "zerodevllc.eu" || host === "www.zerodevllc.eu" || host.endsWith(".pages.dev");
    $$("[data-provider]").forEach((link) => {
      const target = providerTargets[link.dataset.provider];
      if (!target) return;
      link.href = useCloudflareRedirects ? target.redirect : target.direct;
      link.addEventListener("click", () => {
        setExportStatus(`Opening ${link.dataset.provider} in a new tab · outbound fulfilment research link.`);
      });
    });
  }

  function setMapMath() {
    const ratio = $("#mapRatio");
    if (ratio) ratio.textContent = (640 / 760).toFixed(2);
  }

  function init() {
    setupTheme();
    setupMapControls();
    setupDesignControls();
    setupExports();
    setupProviderLinks();
    setMapMath();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
