(function () {
  "use strict";

  const studies = Array.isArray(window.CHURCH_GEOMETRY) ? window.CHURCH_GEOMETRY : [];
  const state = {
    activeId: studies[0] ? studies[0].id : null,
    surface: "exterior",
    mode: "plan",
    layer: "all",
    zoom: 1,
    query: "",
    filter: "all",
    filterPlace: "all",
    filterStatus: "all",
    sort: "index",
    page: "atlas",
    compareIds: []
  };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const MIN_ZOOM = 0.7;
  const MAX_ZOOM = 1.6;
  const zoomPercent = (zoom) => `${Math.round((zoom ?? state.zoom) * 100)}%`;
  const parseZoom = (value) => {
    if (value === undefined || value === "") return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < MIN_ZOOM || parsed > MAX_ZOOM) return null;
    return Number(parsed.toFixed(2));
  };
  const activeStudy = () => studies.find((study) => study.id === state.activeId) || studies[0];
  const studyStatus = (study) => study.status || "schematic";
  const studyDataLabel = (study) => studyStatus(study) === "measured" ? "measured" : "schematic";
  const studyStatusDescription = (study) => studyStatus(study) === "measured"
    ? "Measured data uses source-supported dimensions."
    : "Schematic data uses illustrative proportions.";
  const studySource = (study) => study.source || "Unattributed proportional model";
  const studySourceNote = (study) => study.sourceNote || "provenance not supplied";
  const studyShortName = (study) => study.shortName || study.name;
  const studySurfaceReading = (study) => state.surface === "interior"
    ? study.interiorNote || study.surfaceNote || study.exteriorNote
    : study.exteriorNote || study.surfaceNote || study.interiorNote;
  const number = (value, digits = 1) => Number(value).toFixed(digits);
  function catalogStudyAriaLabel(study, isActive) {
    const stateLabel = isActive ? "Selected study" : "Open study";
    return `${stateLabel}: ${study.name}; ${study.typology}, ${study.place}; ${number(study.length)} meters long, span ${number(study.span)} meters, height ${number(study.height)} meters; ${study.emphasis}; ${studyStatusDescription(study)}`;
  }
  const validPages = new Set(["atlas", "compare", "method"]);
  const pageAliases = new Map([["methodView", "method"]]);
  const validModes = new Set(["plan", "elevation", "section"]);
  const validSurfaces = new Set(["exterior", "interior"]);
  const validLayers = new Set(["all", "envelope", "rhythm", "axis", "measure"]);
  const layerDisplayNames = {
    envelope: "envelope",
    rhythm: "rhythm",
    axis: "axis",
    measure: "dimensions"
  };
  const validStatuses = new Set(["all", "schematic", "measured"]);
  const validSorts = new Set(["index", "length", "height", "span", "ratio", "symmetry", "name"]);
  const catalogParamKeys = ["q", "typology", "place", "status", "sort", "compare"];
  let shareResetTimer;
  let compareShareResetTimer;
  let catalogShareResetTimer;
  let citationResetTimer;
  let lastCatalogStatus = "";
  let lastCatalogResultCount = "";
  const actionFeedbackTimers = new Map();
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[character]));
  const layerDisplayName = (layer) => layerDisplayNames[layer] || layer;
  const layerFocusLabel = () => state.layer === "all" ? "all geometry" : `${layerDisplayName(state.layer)} focus`;

  function updateDocumentTitle(page = state.page) {
    if (page === "atlas" && activeStudy()) {
      const route = parseRoute();
      const hasCatalogScope = Boolean(
        state.query
        || state.filter !== "all"
        || state.filterPlace !== "all"
        || state.filterStatus !== "all"
        || state.sort !== "index"
        || state.compareIds.length > 0
      );
      if (!route.studyId && hasCatalogScope) {
        document.title = `Atlas · ${catalogScopeLabel()} · Sacred Geometry Atlas`;
        return;
      }
      const surface = state.surface === "interior" ? "Inside" : "Outside";
      const mode = state.mode[0].toUpperCase() + state.mode.slice(1);
      const catalogSuffix = hasCatalogScope ? ` · ${catalogScopeLabel()}` : "";
      document.title = studyShortName(activeStudy()) + " · " + surface + " " + mode + catalogSuffix + " · Sacred Geometry Atlas";
      return;
    }
    if (page === "compare" && state.compareIds.length >= 2) {
      const selected = comparisonStudies();
      const label = selected.slice(0, 2).map(studyShortName).join(" + ");
      const extra = selected.length > 2 ? ` +${selected.length - 2}` : "";
      document.title = `Compare ${label}${extra} · Sacred Geometry Atlas`;
      return;
    }
    document.title = page[0].toUpperCase() + page.slice(1) + " · Sacred Geometry Atlas";
  }

  function init() {
    if (!studies.length) {
      document.body.classList.remove("no-js");
      document.body.classList.add("data-error-state");
      document.title = "Atlas unavailable · Sacred Geometry Atlas";
      const dataError = $("#dataError");
      if (dataError) {
        dataError.hidden = false;
        const heading = $("#dataErrorHeading");
        if (heading && typeof heading.focus === "function") heading.focus({ preventScroll: true });
      }
      return;
    }
    renderHeroStats();
    populateFilter();
    bindEvents();
    window.addEventListener("hashchange", syncFromHash);
    window.addEventListener("popstate", syncFromHash);
    syncFromHash();
  }

  function renderHeroStats() {
    const values = {
      studyCount: studies.length,
      modeCount: validModes.size,
      profileCount: activeStudy() ? profileScores(activeStudy()).length : 0
    };
    Object.entries(values).forEach(([id, value]) => {
      const target = $(`#${id}`);
      if (target) target.textContent = String(value).padStart(2, "0");
    });
  }

  function parseRoute() {
    const segments = window.location.hash.replace(/^#/, "").replace(/^\/+/, "").split("/").map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch (error) {
        return segment;
      }
    });
    const [requestedPage = "atlas", requestedStudy, requestedMode, requestedSurface, requestedLayer, requestedZoom] = segments;
    const page = validPages.has(requestedPage) ? requestedPage : pageAliases.get(requestedPage) || "atlas";
    const studyId = page === "atlas" && studies.some((study) => study.id === requestedStudy)
      ? requestedStudy
      : null;
    const requestedCompareIds = requestedStudy ? requestedStudy.split(",") : [];
    const compareIds = page === "compare"
      ? [...new Set(requestedCompareIds.filter((id) => studies.some((study) => study.id === id)))]
      : [];
    return {
      page,
      requestedPage,
      requestedStudy,
      studyId,
      mode: validModes.has(requestedMode) ? requestedMode : null,
      surface: validSurfaces.has(requestedSurface) ? requestedSurface : null,
      layer: validLayers.has(requestedLayer) ? requestedLayer : null,
      zoom: page === "atlas" && studyId ? parseZoom(requestedZoom) : null,
      compareIds: compareIds.length >= 2 ? compareIds : []
    };
  }

  function syncCatalogControls() {
    $("#searchInput").value = state.query;
    $("#filterSelect").value = state.filter;
    $("#filterPlace").value = state.filterPlace;
    $("#filterStatus").value = state.filterStatus;
    $("#sortSelect").value = state.sort;
  }

  function syncCatalogFromUrl() {
    const params = new URL(window.location.href).searchParams;
    const typologies = new Set(studies.map((study) => study.typology));
    const places = new Set(studies.map((study) => study.place));
    const requestedQuery = params.get("q");
    const requestedTypology = params.get("typology");
    const requestedPlace = params.get("place");
    const requestedStatus = params.get("status");
    const requestedSort = params.get("sort");
    const requestedCompare = params.get("compare");
    state.query = requestedQuery ? requestedQuery.trim().toLowerCase() : "";
    state.filter = typologies.has(requestedTypology) ? requestedTypology : "all";
    state.filterPlace = places.has(requestedPlace) ? requestedPlace : "all";
    state.filterStatus = validStatuses.has(requestedStatus) ? requestedStatus : "all";
    state.sort = validSorts.has(requestedSort) ? requestedSort : "index";
    state.compareIds = requestedCompare
      ? [...new Set(requestedCompare.split(",").map((id) => id.trim()).filter((id) => studies.some((study) => study.id === id)))]
      : [];
    syncCatalogControls();
  }

  function navigationUrl(nextHash) {
    const url = new URL(window.location.href);
    url.hash = nextHash;
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function updateCatalogRoute(historyMethod = "replaceState") {
    const current = new URL(window.location.href);
    const url = new URL(current.href);
    const values = {
      q: state.query,
      typology: state.filter === "all" ? "" : state.filter,
      place: state.filterPlace === "all" ? "" : state.filterPlace,
      status: state.filterStatus === "all" ? "" : state.filterStatus,
      sort: state.sort === "index" ? "" : state.sort,
      compare: state.page === "atlas" && state.compareIds.length ? state.compareIds.join(",") : ""
    };
    catalogParamKeys.forEach((key) => {
      if (values[key]) url.searchParams.set(key, values[key]);
      else url.searchParams.delete(key);
    });
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl = `${current.pathname}${current.search}${current.hash}`;
    if (nextUrl === currentUrl) return;
    window.history[historyMethod]({
      page: state.page,
      studyId: state.page === "atlas" ? state.activeId : null,
      compareIds: state.page === "compare" ? [...state.compareIds] : []
    }, "", nextUrl);
  }

  function replaceCatalogRoute() {
    updateCatalogRoute("replaceState");
  }

  function pushCatalogRoute() {
    updateCatalogRoute("pushState");
  }

  function commitComparisonRoute() {
    if (state.page === "atlas") pushCatalogRoute();
    else replaceCatalogRoute();
  }

  function clearCatalogParams(url) {
    catalogParamKeys.forEach((key) => url.searchParams.delete(key));
    return url;
  }

  function routeHash(page, includeStudy, studyId = state.activeId) {
    if (page === "atlas" && includeStudy && studyId) {
      const zoomSegment = state.zoom === 1 ? "" : `/${Number(state.zoom.toFixed(2))}`;
      return `#atlas/${encodeURIComponent(studyId)}/${state.mode}/${state.surface}/${state.layer}${zoomSegment}`;
    }
    if (page === "compare" && state.compareIds.length >= 2) {
      return `#compare/${state.compareIds.map((id) => encodeURIComponent(id)).join(",")}`;
    }
    return `#${page}`;
  }

  function updateRoute(page, includeStudy = page === "atlas") {
    const nextHash = routeHash(page, includeStudy);
    if (window.location.hash === nextHash) return;
    window.history.pushState({ page, studyId: includeStudy ? state.activeId : null, compareIds: page === "compare" ? [...state.compareIds] : [] }, "", navigationUrl(nextHash));
  }

  function replaceRoute(page, includeStudy = page === "atlas") {
    const nextHash = routeHash(page, includeStudy);
    if (window.location.hash === nextHash) return;
    window.history.replaceState({ page, studyId: includeStudy ? state.activeId : null, compareIds: page === "compare" ? [...state.compareIds] : [] }, "", navigationUrl(nextHash));
  }

  function syncFromHash() {
    const revealPending = document.body.classList.contains("no-js");
    syncCatalogFromUrl();
    const route = parseRoute();
    const previousPage = state.page;
    let normalizedStudyRoute = false;
    let includeStudyInNormalizedRoute = true;
    let normalizedCompareRoute = false;
    let normalizedPageRoute = false;
    if (route.studyId) {
      state.activeId = route.studyId;
      state.mode = route.mode || "plan";
      state.surface = route.surface || "exterior";
      state.layer = route.layer || "all";
      state.zoom = route.zoom || 1;
    }
    if (route.page === "compare") {
      state.compareIds = route.compareIds;
      normalizedCompareRoute = window.location.hash !== routeHash("compare", false);
    }
    if (route.page === "atlas") {
      const visible = visibleStudies();
      const hasRequestedStudy = Boolean(route.requestedStudy);
      if (route.requestedPage !== route.page || (hasRequestedStudy && !route.studyId)) {
        normalizedStudyRoute = window.location.hash.length > 0;
        includeStudyInNormalizedRoute = false;
      } else if (!visible.length && route.studyId) {
        normalizedStudyRoute = true;
        includeStudyInNormalizedRoute = false;
      } else if (visible.length && !visible.some((study) => study.id === state.activeId)) {
        state.activeId = visible[0].id;
        normalizedStudyRoute = Boolean(route.studyId);
      } else if (route.studyId && window.location.hash !== routeHash("atlas", true)) {
        normalizedStudyRoute = true;
      } else if (!route.requestedStudy && window.location.hash.length > 0 && window.location.hash !== routeHash("atlas", false)) {
        normalizedStudyRoute = true;
        includeStudyInNormalizedRoute = false;
      }
    } else if (route.page !== "compare") {
      normalizedPageRoute = window.location.hash.length > 0 && window.location.hash !== routeHash(route.page, false);
    }
    showPage(route.page, { updateHash: false, scroll: window.location.hash.length > 0 });
    replaceCatalogRoute();
    renderAll();
    document.body.classList.remove("no-js");
    if (normalizedStudyRoute) {
      replaceRoute("atlas", includeStudyInNormalizedRoute);
      updateDocumentTitle("atlas");
    }
    if (normalizedCompareRoute) {
      replaceRoute("compare", false);
      updateDocumentTitle("compare");
    }
    if (normalizedPageRoute) {
      replaceRoute(route.page, false);
      updateDocumentTitle(route.page);
    }
    if (route.page === "atlas" && route.studyId && includeStudyInNormalizedRoute) {
      announceStudy(activeStudy(), visibleStudies().length);
      announceDrawingState();
      const heading = $("#activeName");
      if (heading && typeof heading.focus === "function") heading.focus({ preventScroll: false });
    } else if (window.location.hash.length > 0 && (previousPage === route.page || revealPending)) {
      focusPageHeading(route.page);
    }
  }

  function populateFilter() {
    const select = $("#filterSelect");
    [...new Set(studies.map((study) => study.typology))].forEach((typology) => {
      const option = document.createElement("option");
      option.value = typology;
      option.textContent = typology;
      select.appendChild(option);
    });
    const placeSelect = $("#filterPlace");
    [...new Set(studies.map((study) => study.place))].forEach((place) => {
      const option = document.createElement("option");
      option.value = place;
      option.textContent = place;
      placeSelect.appendChild(option);
    });
  }

  function bindEvents() {
    $(".brand").addEventListener("click", (event) => {
      event.preventDefault();
      showPage("atlas", { routeStudy: false });
      renderAll();
    });
    $("#searchInput").addEventListener("input", (event) => {
      state.query = event.target.value.trim().toLowerCase();
      refreshCatalog();
      replaceCatalogRoute();
    });
    $("#searchInput").addEventListener("keydown", handleSearchKeydown);
    $("#clearSearchInput").addEventListener("click", () => clearFilter("query", { focus: true }));
    $("#filterSelect").addEventListener("change", (event) => {
      state.filter = event.target.value;
      pushCatalogRoute();
      refreshCatalog();
    });
    $("#filterPlace").addEventListener("change", (event) => {
      state.filterPlace = event.target.value;
      pushCatalogRoute();
      refreshCatalog();
    });
    $("#filterStatus").addEventListener("change", (event) => {
      state.filterStatus = event.target.value;
      pushCatalogRoute();
      refreshCatalog();
    });
    $("#sortSelect").addEventListener("change", (event) => {
      state.sort = event.target.value;
      pushCatalogRoute();
      refreshCatalog();
    });
    $("#clearSearch").addEventListener("click", () => clearCatalogFilters({ resetSort: true, focus: true }));
    $("#clearVisualFilters").addEventListener("click", () => clearCatalogFilters({ resetSort: true, focus: true }));
    $("#churchList").addEventListener("click", (event) => {
      const compareToggle = event.target.closest("[data-compare-id]");
      if (compareToggle) {
        toggleCompare(compareToggle.dataset.compareId, { focus: true });
        return;
      }
      const card = event.target.closest("[data-study-id]");
      if (!card) return;
      if (card.tagName.toLowerCase() === "a") {
        if ((event.button !== undefined && event.button !== 0) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
      }
      selectStudy(card.dataset.studyId, { focus: event.detail === 0, restoreCardFocus: true });
    });
    $$("[data-surface]").forEach((button) => button.addEventListener("click", () => {
      state.surface = button.dataset.surface;
      renderControls();
      renderDrawing();
      announceDrawingState();
      if (state.page === "atlas") replaceRoute("atlas");
    }));
    $$("[data-mode]").forEach((button) => button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      renderControls();
      renderDrawing();
      announceDrawingState();
      if (state.page === "atlas") replaceRoute("atlas");
    }));
    $$("[data-layer]").forEach((button) => button.addEventListener("click", () => {
      state.layer = button.dataset.layer;
      renderControls();
      renderDrawing();
      announceDrawingState();
      if (state.page === "atlas") replaceRoute("atlas");
    }));
    $("#zoomOut").addEventListener("click", () => changeZoom(-0.15));
    $("#zoomIn").addEventListener("click", () => changeZoom(0.15));
    $("#zoomReset").addEventListener("click", () => {
      state.zoom = 1;
      renderControls();
      renderDrawing();
      announceKeyboard("Drawing zoom reset to 100%.");
      if (state.page === "atlas") replaceRoute("atlas");
    });
    $("#resetDrawing").addEventListener("click", resetDrawingView);
    $$("[data-view]").forEach((button) => button.addEventListener("click", () => {
      showPage(button.dataset.view, { routeStudy: false });
    }));
    $("#clearCompare").addEventListener("click", () => clearComparisonSelection({ focus: true }));
    $("#selectVisibleCompare").addEventListener("click", () => addVisibleToComparison({ focus: true }));
    $("#openCompare").addEventListener("click", () => showPage("compare"));
    $("#editCompare").addEventListener("click", () => showPage("atlas"));
    $("#clearCompareView").addEventListener("click", () => clearComparisonSelection({ focus: true }));
    $("#compareSelection").addEventListener("click", (event) => {
      const remove = event.target.closest("[data-remove-compare-id]");
      if (remove) removeComparisonStudy(remove.dataset.removeCompareId);
    });
    $("#geometryCompare").addEventListener("click", (event) => {
      const studyCard = event.target.closest("[data-compare-study]");
      if (!studyCard) return;
      selectStudy(studyCard.dataset.compareStudy, { focus: event.detail === 0, restoreCardFocus: true });
    });
    $("#downloadData").addEventListener("click", downloadData);
    $("#downloadStudy").addEventListener("click", downloadStudy);
    $("#downloadCatalogView").addEventListener("click", downloadCatalogView);
    $("#downloadComparison").addEventListener("click", downloadComparisonCsv);
    $("#downloadDrawing").addEventListener("click", downloadDrawing);
    $("#shareStudy").addEventListener("click", shareStudy);
    $("#shareCatalog").addEventListener("click", shareCatalog);
    $("#shareCompare").addEventListener("click", shareComparison);
    $("#copyCitation").addEventListener("click", copyCitation);
    $("#printStudy").addEventListener("click", printStudy);
    $("#prevStudy").addEventListener("click", () => cycleStudy(-1));
    $("#nextStudy").addEventListener("click", () => cycleStudy(1));
    $("#activeFilters").addEventListener("click", (event) => {
      if (event.target.closest("[data-clear-filters]")) {
        clearCatalogFilters({ resetSort: true, focus: true });
        return;
      }
      const chip = event.target.closest("[data-clear-filter]");
      if (chip) clearFilter(chip.dataset.clearFilter, { focus: true });
    });
    const comparisonTable = $(".comparison-table-wrap");
    if (comparisonTable) comparisonTable.addEventListener("keydown", handleComparisonTableKey);
    window.addEventListener("keydown", handleKeyboard);
  }

  function clearCatalogFilters({ resetSort = false, focus = false } = {}) {
    state.query = "";
    state.filter = "all";
    state.filterPlace = "all";
    state.filterStatus = "all";
    $("#searchInput").value = "";
    $("#filterSelect").value = "all";
    $("#filterPlace").value = "all";
    $("#filterStatus").value = "all";
    if (resetSort) {
      $("#sortSelect").value = "index";
      state.sort = "index";
    }
    pushCatalogRoute();
    refreshCatalog();
    if (focus) focusCatalogControl("query");
  }

  function selectStudy(id, options = {}) {
    const { scroll = true, focus = false, restoreCardFocus = false } = options;
    if (!studies.some((study) => study.id === id)) return;
    state.activeId = id;
    showPage("atlas", { scroll });
    renderAll();
    announceStudy(activeStudy(), visibleStudies().length);
    if (focus) {
      const heading = $("#activeName");
      if (heading && typeof heading.focus === "function") heading.focus({ preventScroll: !scroll });
    } else if (restoreCardFocus) {
      focusStudyCard(id);
    }
  }

  function resultCountText(count) {
    const visibleCount = String(count).padStart(2, "0");
    const totalCount = String(studies.length).padStart(2, "0");
    return `${visibleCount} of ${totalCount} studies`;
  }

  function renderCatalogResultCount(count) {
    const resultCount = $("#catalogResultCount");
    if (!resultCount) return;
    const text = resultCountText(count);
    const scopeLabel = `${text}; ${catalogScopeLabel()}.`;
    resultCount.textContent = text;
    resultCount.setAttribute("aria-label", scopeLabel);
    const liveStatus = $("#catalogLiveStatus");
    if (liveStatus) {
      if (lastCatalogStatus && lastCatalogStatus !== scopeLabel && lastCatalogResultCount === text) {
        liveStatus.textContent = `Catalog updated: ${scopeLabel}`;
      } else if (lastCatalogResultCount !== text) {
        liveStatus.textContent = "";
      }
    }
    lastCatalogResultCount = text;
    lastCatalogStatus = scopeLabel;
  }

  function renderActiveFilters() {
    const target = $("#activeFilters");
    if (!target) return;
    const filters = [];
    if (state.query) filters.push({ key: "query", label: `Search: “${state.query}”` });
    if (state.filter !== "all") filters.push({ key: "filter", label: $("#filterSelect").selectedOptions[0].textContent });
    if (state.filterPlace !== "all") filters.push({ key: "place", label: $("#filterPlace").selectedOptions[0].textContent });
    if (state.filterStatus !== "all") filters.push({ key: "status", label: $("#filterStatus").selectedOptions[0].textContent });
    if (state.sort !== "index") filters.push({ key: "sort", label: `Sort: ${$("#sortSelect").selectedOptions[0].textContent}` });
    target.hidden = filters.length === 0;
    target.innerHTML = filters.length
      ? `${filters.map(({ key, label }) => `
          <button class="filter-chip" type="button" data-clear-filter="${key}" aria-label="Clear ${escapeHtml(label)}">
            <span>${escapeHtml(label)}</span><span aria-hidden="true">×</span>
          </button>
        `).join("")}
        <button class="filter-clear-all" type="button" data-clear-filters aria-label="Clear all active filters">Clear all</button>`
      : "";
  }

  function focusCatalogControl(key, options = {}) {
    const { preventScroll = true } = options;
    const selectors = {
      query: "#searchInput",
      filter: "#filterSelect",
      place: "#filterPlace",
      status: "#filterStatus",
      sort: "#sortSelect"
    };
    const control = $(selectors[key] || selectors.query);
    if (control && typeof control.focus === "function") control.focus({ preventScroll });
  }

  function focusCompareToggle(id) {
    const toggle = $$("[data-compare-id]").find((button) => button.dataset.compareId === id);
    if (toggle && typeof toggle.focus === "function") toggle.focus({ preventScroll: true });
  }

  function focusStudyCard(id) {
    const card = $$(`[data-study-id]`).find((button) => button.dataset.studyId === id);
    if (card && typeof card.focus === "function") card.focus({ preventScroll: true });
  }

  function clearFilter(key, options = {}) {
    const { focus = false } = options;
    if (key === "query") {
      state.query = "";
      $("#searchInput").value = "";
    }
    if (key === "filter") {
      state.filter = "all";
      $("#filterSelect").value = "all";
    }
    if (key === "place") {
      state.filterPlace = "all";
      $("#filterPlace").value = "all";
    }
    if (key === "status") {
      state.filterStatus = "all";
      $("#filterStatus").value = "all";
    }
    if (key === "sort") {
      state.sort = "index";
      $("#sortSelect").value = "index";
    }
    pushCatalogRoute();
    refreshCatalog();
    if (focus) focusCatalogControl(key);
  }

  function announceKeyboard(message) {
    const status = $("#keyboardStatus");
    if (status) status.textContent = message;
  }

  function announceStudy(study, visibleCount) {
    const status = $("#studyLiveStatus");
    if (status && study) status.textContent = `Study ${study.index}, ${study.name} selected. ${visibleCount} ${visibleCount === 1 ? "study" : "studies"} visible.`;
  }

  function announceDrawingState() {
    announceKeyboard(`${state.surface} ${state.mode} view selected, ${layerFocusLabel()}, ${zoomPercent()} zoom.`);
  }

  function updateSearchClear() {
    const clearButton = $("#clearSearchInput");
    if (clearButton) clearButton.hidden = !state.query;
  }

  function setButtonFeedback(button, visibleLabel, accessibleLabel) {
    if (!button) return;
    const label = button.querySelector("span:last-child");
    if (label) label.textContent = visibleLabel;
    button.setAttribute("aria-label", accessibleLabel);
  }

  function temporaryButtonFeedback(button, visibleLabel, accessibleLabel, resetVisibleLabel, resetAccessibleLabel, key) {
    if (!button) return;
    button.classList.add("is-complete");
    setButtonFeedback(button, visibleLabel, accessibleLabel);
    window.clearTimeout(actionFeedbackTimers.get(key));
    actionFeedbackTimers.set(key, window.setTimeout(() => {
      button.classList.remove("is-complete");
      setButtonFeedback(button, resetVisibleLabel, resetAccessibleLabel);
      actionFeedbackTimers.delete(key);
    }, 2200));
  }

  function beginAsyncAction(button) {
    if (!button || button.disabled) return false;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    return true;
  }

  function endAsyncAction(button) {
    if (!button) return;
    button.disabled = false;
    button.setAttribute("aria-busy", "false");
  }

  function renderStudyNav() {
    const navigation = $("#studyNav");
    const position = $("#studyNavPosition");
    const previous = $("#prevStudy");
    const next = $("#nextStudy");
    if (!previous || !next) return;
    const visible = visibleStudies();
    const currentIndex = visible.findIndex((study) => study.id === state.activeId);
    const canNavigate = visible.length > 1 && currentIndex >= 0;
    const previousStudy = canNavigate ? visible[(currentIndex - 1 + visible.length) % visible.length] : null;
    const nextStudy = canNavigate ? visible[(currentIndex + 1) % visible.length] : null;
    const positionLabel = visible.length && currentIndex >= 0
      ? `${String(currentIndex + 1).padStart(2, "0")} / ${String(visible.length).padStart(2, "0")} visible`
      : "No studies visible";
    if (position) position.textContent = positionLabel;
    if (navigation) navigation.setAttribute("aria-label", visible.length && currentIndex >= 0
      ? `Move between studies; showing study ${currentIndex + 1} of ${visible.length} visible studies`
      : "Move between studies; no studies visible");
    previous.disabled = !canNavigate;
    next.disabled = !canNavigate;
    previous.setAttribute("aria-label", previousStudy ? `Previous study: ${previousStudy.name}` : "Previous study");
    next.setAttribute("aria-label", nextStudy ? `Next study: ${nextStudy.name}` : "Next study");
    previous.title = previousStudy ? `Previous: ${previousStudy.name}` : "Previous study";
    next.title = nextStudy ? `Next: ${nextStudy.name}` : "Next study";
  }

  function cycleStudy(direction, options = {}) {
    const { scroll = true, focus = false } = options;
    const visible = visibleStudies();
    if (!visible.length) return;
    const currentIndex = visible.findIndex((study) => study.id === state.activeId);
    const baseIndex = currentIndex >= 0 ? currentIndex : direction > 0 ? -1 : 0;
    const nextIndex = (baseIndex + direction + visible.length) % visible.length;
    const nextStudy = visible[nextIndex];
    selectStudy(nextStudy.id, { scroll, focus });
  }

  function handleKeyboard(event) {
    const tagName = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : "";
    if (["input", "select", "textarea", "button", "summary", "a"].includes(tagName) || event.target.isContentEditable) return;
    if (event.metaKey || event.ctrlKey || event.altKey || state.page !== "atlas") return;
    const key = event.key.toLowerCase();
    if (key === "/") {
      event.preventDefault();
      focusCatalogControl("query", { preventScroll: false });
      return;
    }
    if (key === "c") {
      event.preventDefault();
      if (state.compareIds.length >= 2) showPage("compare");
      else announceKeyboard("Select at least two studies to open comparison.");
      return;
    }
    if (key === "j" || key === "k") {
      event.preventDefault();
      cycleStudy(key === "j" ? 1 : -1, { scroll: false, focus: true });
      return;
    }
    if (["1", "2", "3"].includes(key)) {
      const modes = { "1": "plan", "2": "elevation", "3": "section" };
      state.mode = modes[key];
      renderControls();
      renderDrawing();
      announceDrawingState();
      if (state.page === "atlas") replaceRoute("atlas");
      return;
    }
    if (key === "i" || key === "o") {
      state.surface = key === "i" ? "interior" : "exterior";
      renderControls();
      renderDrawing();
      announceDrawingState();
      if (state.page === "atlas") replaceRoute("atlas");
      return;
    }
    if (key === "r") {
      state.zoom = 1;
      renderControls();
      renderDrawing();
      announceKeyboard("Drawing zoom reset to 100%.");
      if (state.page === "atlas") replaceRoute("atlas");
    }
  }

  function handleSearchKeydown(event) {
    if (event.key !== "Escape" || !state.query) return;
    event.preventDefault();
    const clearButton = $("#clearSearchInput");
    if (clearButton && typeof clearButton.click === "function") clearButton.click();
  }

  function handleComparisonTableKey(event) {
    const target = event.currentTarget;
    if (!target || event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key;
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;
    const behavior = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    const maxScroll = Math.max(0, (target.scrollWidth || 0) - (target.clientWidth || 0));
    if (key === "Home" || key === "End") {
      const left = key === "End" ? maxScroll : 0;
      if (typeof target.scrollTo === "function") target.scrollTo({ left, behavior });
      else target.scrollLeft = left;
    } else {
      const amount = Math.max(120, Math.round((target.clientWidth || 0) * 0.8));
      const delta = key === "ArrowRight" ? amount : -amount;
      if (typeof target.scrollBy === "function") target.scrollBy({ left: delta, behavior });
      else target.scrollLeft = Math.max(0, Math.min(maxScroll, (target.scrollLeft || 0) + delta));
    }
    event.preventDefault();
  }

  function studySearchText(study) {
    const details = Array.isArray(study.details) ? study.details.flat() : [];
    const dimensions = [
      `length ${study.length} m`,
      `length ${number(study.length)} m`,
      `span ${study.span} m`,
      `span ${number(study.span)} m`,
      `height ${study.height} m`,
      `height ${number(study.height)} m`,
      `${study.bayCount} bays`,
      `module ${study.module} m`,
      `module ${number(study.module)} m`,
      `radius ${study.radius} m`,
      `radius ${number(study.radius)} m`,
      `symmetry ${number(study.symmetry, 2)}`,
      Number.isFinite(study.floorAreaEstimate) ? `floor area ${study.floorAreaEstimate} m²` : "",
      Number.isFinite(study.floorAreaEstimate) ? `floor area ${number(study.floorAreaEstimate, 0)} m²` : "",
      Number.isFinite(study.volumeEstimate) ? `volume ${study.volumeEstimate} m³` : "",
      Number.isFinite(study.volumeEstimate) ? `volume ${Number(study.volumeEstimate).toLocaleString()} m³` : ""
    ];
    return [
      study.name, study.shortName, study.churchName, study.typology, study.place, study.era,
      study.emphasis, study.axis, study.envelope, studySource(study), studySourceNote(study),
      study.surfaceNote, study.exteriorNote, study.interiorNote, study.volumeBasis, studyStatus(study),
      ...dimensions,
      ...details
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function visibleStudies() {
    const result = studies.filter((study) => {
      const haystack = studySearchText(study);
      const matchesQuery = !state.query || haystack.includes(state.query);
      const matchesFilter = state.filter === "all" || study.typology === state.filter;
      const matchesPlace = state.filterPlace === "all" || study.place === state.filterPlace;
      const matchesStatus = state.filterStatus === "all" || studyStatus(study) === state.filterStatus;
      return matchesQuery && matchesFilter && matchesPlace && matchesStatus;
    });
    return result.sort((a, b) => {
      if (state.sort === "length") return b.length - a.length;
      if (state.sort === "height") return b.height - a.height;
      if (state.sort === "span") return b.span - a.span;
      if (state.sort === "ratio") return (b.length / b.span) - (a.length / a.span);
      if (state.sort === "symmetry") return b.symmetry - a.symmetry;
      if (state.sort === "name") return a.name.localeCompare(b.name);
      return a.index.localeCompare(b.index);
    });
  }

  function refreshCatalog() {
    const visible = visibleStudies();
    const previousId = state.activeId;
    if (visible.length && !visible.some((study) => study.id === state.activeId)) state.activeId = visible[0].id;
    renderList();
    if (state.page === "atlas" && !visible.length) replaceRoute("atlas", false);
    if (previousId !== state.activeId) {
      renderStudy();
      renderDrawing();
      if (state.page === "atlas") replaceRoute("atlas");
      announceStudy(activeStudy(), visible.length);
    }
    updateDocumentTitle("atlas");
    updateCompareTray();
  }

  function renderAll() {
    renderList();
    renderStudy();
    renderControls();
    renderDrawing();
    renderCompare();
    updateCompareTray();
  }

  function renderList() {
    const list = $("#churchList");
    const empty = $("#emptyState");
    const emptyMessage = $("#emptyStateMessage");
    const visible = visibleStudies();
    const catalogExport = $("#downloadCatalogView");
    renderCatalogResultCount(visible.length);
    if (catalogExport) catalogExport.disabled = visible.length === 0;
    if (emptyMessage) emptyMessage.textContent = emptyCatalogMessage();
    renderVisualState(visible);
    renderActiveFilters();
    renderVisibleComparisonAction(visible);
    updateSearchClear();
    renderStudyNav();
    list.innerHTML = visible.map((study) => {
      const isActive = study.id === state.activeId;
      const isCompared = state.compareIds.includes(study.id);
      const currentAttribute = isActive ? ' aria-current="true"' : "";
      return `
        <li class="catalog-entry">
          <a class="catalog-card ${isActive ? "is-active" : ""}" data-study-id="${escapeHtml(study.id)}" href="${escapeHtml(navigationUrl(routeHash("atlas", true, study.id)))}"${currentAttribute} aria-label="${escapeHtml(catalogStudyAriaLabel(study, isActive))}">
            <span class="catalog-number" aria-hidden="true">${escapeHtml(study.index)}</span>
            <span class="catalog-card-copy">
              <span class="catalog-card-title">${escapeHtml(study.name)}</span>
              <span class="catalog-card-meta">${escapeHtml(study.typology)} · ${escapeHtml(study.emphasis)} · ${escapeHtml(studyStatus(study))}</span>
            </span>
            ${catalogGlyph(study)}
          </a>
          <button class="compare-toggle ${isCompared ? "is-selected" : ""}" data-compare-id="${escapeHtml(study.id)}" type="button" aria-pressed="${isCompared}" aria-label="${isCompared ? "Remove" : "Add"} ${escapeHtml(study.name)} ${isCompared ? "from" : "to"} comparison">${isCompared ? "✓" : "+"}</button>
        </li>
      `;
    }).join("");
    empty.hidden = visible.length !== 0;
  }

  function renderVisibleComparisonAction(visible = visibleStudies()) {
    const button = $("#selectVisibleCompare");
    if (!button) return;
    const additions = visible.filter((study) => !state.compareIds.includes(study.id));
    const visibleCount = visible.length;
    const additionCount = additions.length;
    const isComplete = visibleCount > 0 && additionCount === 0;
    const label = visibleCount === 0
      ? "No visible studies to add to comparison"
      : isComplete
        ? `All ${visibleCount} visible ${visibleCount === 1 ? "study is" : "studies are"} already in comparison`
        : `Add ${additionCount} visible ${additionCount === 1 ? "study" : "studies"} to comparison`;
    button.disabled = visibleCount === 0 || isComplete;
    button.setAttribute("aria-label", label);
    button.title = label;
    const text = button.querySelector("span:last-child");
    if (text) text.textContent = visibleCount === 0 ? "No visible studies" : isComplete ? "Visible selected" : "Add visible to compare";
  }

  function emptyCatalogMessage() {
    const hasSecondaryFilters = state.filter !== "all" || state.filterPlace !== "all";
    const hasCatalogFilters = hasSecondaryFilters || state.filterStatus !== "all";
    if (state.query && hasCatalogFilters) return `No studies match “${state.query}” within the selected catalog filters.`;
    if (state.query) return `No studies match “${state.query}”.`;
    if (state.filterStatus === "measured" && !hasSecondaryFilters) return "No measured studies are in the atlas yet.";
    if (hasCatalogFilters) return "No studies match the selected catalog filters.";
    return "No studies are available in the current catalog view.";
  }

  function renderVisualState(visible) {
    const visualColumn = $(".visual-column");
    const emptyState = $("#visualEmptyState");
    if (!visualColumn || !emptyState) return;
    const isEmpty = visible.length === 0;
    visualColumn.classList.toggle("is-empty", isEmpty);
    emptyState.hidden = !isEmpty;
    const message = $("#visualEmptyMessage");
    if (message && isEmpty) message.textContent = `${emptyCatalogMessage()} Clear filters to restore a study drawing.`;
  }

  function renderStudy() {
    const study = activeStudy();
    if (!study) return;
    const ratio = study.length / study.span;
    $("#activeKicker").textContent = `Study ${study.index} / ${study.typology}`;
    $("#activeName").textContent = study.name;
    $("#activeMeta").textContent = `${study.place} · ${study.era} · ${study.emphasis.toLowerCase()}`;
    const activeStatus = $("#activeStatus");
    if (activeStatus) {
      activeStatus.textContent = studyStatus(study);
      activeStatus.title = studyStatusDescription(study);
    }
    const activeStatusHelp = $("#activeStatusHelp");
    if (activeStatusHelp) activeStatusHelp.textContent = studyStatusDescription(study);
    $("#activeReference").textContent = `Reference · ${study.churchName || study.name}`;
    $("#activeSource").textContent = `Source · ${studySource(study)} · ${studySourceNote(study).toLowerCase()}`;
    $("#activeIndex").textContent = study.index;
    $("#activeDescription").textContent = studySurfaceReading(study) || "No interpretive reading supplied.";
    $("#analysisReading").textContent = studySurfaceReading(study) || "No interpretive note supplied.";
    $("#metricLength").textContent = `${number(study.length)} m`;
    $("#metricSpan").textContent = `${number(study.span)} m`;
    $("#metricHeight").textContent = `${number(study.height)} m`;
    $("#metricRatio").textContent = `${number(ratio, 2)} : 1`;
    $("#metricSymmetry").textContent = number(study.symmetry, 2);
    $("#detailGrid").innerHTML = study.details.map(([label, value]) => `
      <div class="detail-item"><span class="detail-item-label">${escapeHtml(label)}</span><span class="detail-item-value">${escapeHtml(value)}</span></div>
    `).join("");
    const area = study.floorAreaEstimate || study.length * study.span;
    const sectionRatio = study.height / study.span;
    const moduleRatio = study.module / study.span;
    const volume = volumeReading(study);
    $("#analysisArea").textContent = `${number(area, 0)} m²`;
    $("#analysisSection").textContent = number(sectionRatio, 2);
    $("#analysisModule").textContent = number(moduleRatio, 2);
    $("#analysisRadius").textContent = `${number(study.radius)} m`;
    $("#analysisVolume").textContent = volume.value;
    $("#analysisVolumeBasis").textContent = volume.basis;
    $("#activeEquation").textContent = `R = L ÷ span = ${number(ratio, 2)}`;
    $("#profileRow").innerHTML = profileScores(study).map(([label, score]) => `
      <div class="profile-item" role="listitem"><div class="profile-label"><span>${escapeHtml(label)}</span><b>${score}</b></div><div class="profile-track" role="meter" aria-label="${escapeHtml(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${score}" aria-valuetext="${score} out of 100"><i class="profile-fill" style="--profile:${score}%"></i></div></div>
    `).join("");
  }

  function volumeReading(study) {
    const hasEstimate = Number.isFinite(study.volumeEstimate) && study.volumeEstimate > 0;
    return {
      value: hasEstimate ? `${Number(study.volumeEstimate).toLocaleString()} m³` : "Not supplied",
      basis: hasEstimate
        ? study.volumeBasis || (studyStatus(study) === "measured" ? "source-supported estimate" : "schematic estimate")
        : "No estimate supplied"
    };
  }

  function profileScores(study) {
    const ratio = study.length / study.span;
    const radiality = { central: 100, baroque: 84, basilica: 48, gothic: 42, stave: 36, modern: 28 }[study.type] || 40;
    return [
      ["linearity", Math.round(Math.min(100, Math.max(0, ((ratio - 1) / 3.5) * 100)))],
      ["verticality", Math.round(Math.min(100, Math.max(0, (study.height / study.span / 1.2) * 100)))],
      ["radiality", radiality],
      ["repetition", Math.round(Math.min(100, (study.bayCount / 8) * 100))]
    ];
  }

  function renderControls() {
    $$('[data-surface]').forEach((button) => {
      const selected = button.dataset.surface === state.surface;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    $$('[data-mode]').forEach((button) => {
      const selected = button.dataset.mode === state.mode;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    $$('[data-layer]').forEach((button) => {
      const selected = button.dataset.layer === state.layer;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    $("#zoomReadout").textContent = `${Math.round(state.zoom * 100)}%`;
    $("#zoomReset").textContent = `${Math.round(state.zoom * 100)}%`;
    const zoomOut = $("#zoomOut");
    const zoomIn = $("#zoomIn");
    if (zoomOut) {
      zoomOut.disabled = state.zoom <= MIN_ZOOM;
      zoomOut.setAttribute("aria-label", zoomOut.disabled ? "Zoom out (minimum 70%)" : "Zoom out");
    }
    if (zoomIn) {
      zoomIn.disabled = state.zoom >= MAX_ZOOM;
      zoomIn.setAttribute("aria-label", zoomIn.disabled ? "Zoom in (maximum 160%)" : "Zoom in");
    }
  }

  function showPage(page, options = {}) {
    const { updateHash: shouldUpdateHash = true, routeStudy = page === "atlas", scroll = true } = options;
    const previousPage = state.page;
    if (!validPages.has(page)) page = "atlas";
    const pageChanged = previousPage !== page;
    state.page = page;
    const atlas = $("#atlas");
    const compare = $("#compareView");
    const method = $("#methodView");
    atlas.hidden = page !== "atlas";
    compare.hidden = page !== "compare";
    method.hidden = page !== "method";
    $$("[data-view]").forEach((button) => {
      const selected = button.dataset.view === page;
      button.classList.toggle("is-active", selected);
      if (selected) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    if (page === "compare") renderCompare();
    if (shouldUpdateHash) updateRoute(page, routeStudy);
    if (shouldUpdateHash) replaceCatalogRoute();
    if (scroll) {
      const behavior = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      const pageTarget = page === "atlas" ? atlas : page === "compare" ? compare : method;
      if (pageTarget && typeof pageTarget.scrollIntoView === "function") {
        pageTarget.scrollIntoView({ behavior, block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior });
      }
    }
    if (pageChanged && !document.body.classList.contains("no-js")) {
      focusPageHeading(page);
    }
    updateDocumentTitle(page);
  }

  function focusPageHeading(page, preventScroll = true) {
    const heading = $(page === "atlas" ? "#atlas-heading" : page === "compare" ? "#compare-heading" : "#method-heading");
    if (heading && typeof heading.focus === "function") heading.focus({ preventScroll });
  }

  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch (error) {
        // Continue with the textarea fallback if the permissioned API rejects.
      }
    }
    try {
      const previousFocus = document.activeElement;
      const copyField = document.createElement("textarea");
      copyField.value = value;
      copyField.setAttribute("readonly", "");
      copyField.style.position = "fixed";
      copyField.style.opacity = "0";
      document.body.appendChild(copyField);
      try {
        copyField.select();
        return document.execCommand("copy");
      } finally {
        copyField.remove();
        if (previousFocus && previousFocus !== document.body && typeof previousFocus.focus === "function") {
          try {
            previousFocus.focus({ preventScroll: true });
          } catch (error) {
            // Focus restoration is best-effort; preserve the copy result.
          }
        }
      }
    } catch (error) {
      return false;
    }
  }

  async function attemptNativeShare(payload) {
    if (typeof navigator.share !== "function") return "unavailable";
    try {
      await navigator.share(payload);
      return "shared";
    } catch (error) {
      return error.name === "AbortError" ? "cancelled" : "unavailable";
    }
  }

  async function shareStudy() {
    const study = activeStudy();
    const button = $("#shareStudy");
    const status = $("#shareStatus");
    if (!study || !button || !status || !beginAsyncAction(button)) return;
    try {
      const shareUrl = clearCatalogParams(new URL(window.location.href));
      shareUrl.hash = routeHash("atlas", true);
      const sharePayload = {
        title: `${studyShortName(study)} · Sacred Geometry Atlas`,
        text: `Explore ${study.name} in the Sacred Geometry Atlas — ${state.surface} ${state.mode} view, ${layerFocusLabel()}, ${zoomPercent()} zoom.`,
        url: shareUrl.href
      };

      const nativeShareResult = await attemptNativeShare(sharePayload);
      if (nativeShareResult === "shared") {
        temporaryButtonFeedback(button, "Shared", "Study shared", "Share study", "Share current study", "share-study");
        status.textContent = `${study.name} shared.`;
        return;
      }
      if (nativeShareResult === "cancelled") return;

      const copied = await copyText(shareUrl.href);

      if (copied) {
        button.classList.add("is-copied");
        setButtonFeedback(button, "Link copied", "Share link copied");
        status.textContent = `A shareable link for ${study.name} was copied.`;
        window.clearTimeout(shareResetTimer);
        shareResetTimer = window.setTimeout(() => {
          button.classList.remove("is-copied");
          setButtonFeedback(button, "Share study", "Share current study");
        }, 2200);
      } else {
        status.textContent = "Copying was unavailable. You can copy the page URL from the address bar.";
      }
    } finally {
      endAsyncAction(button);
    }
  }

  function catalogScopeLabel() {
    const parts = [];
    if (state.query) parts.push(`results matching “${state.query}”`);
    if (state.filter !== "all") parts.push(state.filter);
    if (state.filterPlace !== "all") parts.push(state.filterPlace);
    if (state.filterStatus !== "all") parts.push(`${state.filterStatus} records`);
    if (state.compareIds.length) parts.push(`${state.compareIds.length} selected for comparison`);
    if (state.sort !== "index") {
      const sortLabels = {
        length: "length (longest first)",
        height: "height (tallest first)",
        span: "span (widest first)",
        ratio: "length-to-span ratio (highest first)",
        symmetry: "symmetry (highest first)",
        name: "name (A–Z)"
      };
      parts.push(`sorted by ${sortLabels[state.sort] || state.sort}`);
    }
    return parts.length ? parts.join(", ") : "the full collection";
  }

  async function shareCatalog() {
    const button = $("#shareCatalog");
    const status = $("#catalogShareStatus");
    if (!button || !status || !beginAsyncAction(button)) return;
    try {
      const shareUrl = new URL(window.location.href);
      shareUrl.hash = routeHash("atlas", false);
      const sharePayload = {
        title: "Sacred Geometry Atlas · catalog view",
        text: `Explore ${catalogScopeLabel()} in the Sacred Geometry Atlas.`,
        url: shareUrl.href
      };

      const nativeShareResult = await attemptNativeShare(sharePayload);
      if (nativeShareResult === "shared") {
        temporaryButtonFeedback(button, "Shared", "Catalog view shared", "Share view", "Share current catalog view", "share-catalog");
        status.textContent = "Catalog view shared.";
        return;
      }
      if (nativeShareResult === "cancelled") return;

      const copied = await copyText(shareUrl.href);
      if (copied) {
        button.classList.add("is-copied");
        setButtonFeedback(button, "Link copied", "Catalog view link copied");
        status.textContent = "A shareable catalog view link was copied.";
        window.clearTimeout(catalogShareResetTimer);
        catalogShareResetTimer = window.setTimeout(() => {
          button.classList.remove("is-copied");
          setButtonFeedback(button, "Share view", "Share current catalog view");
        }, 2200);
      } else {
        status.textContent = "Copying was unavailable. You can copy the catalog URL from the address bar.";
      }
    } finally {
      endAsyncAction(button);
    }
  }

  async function shareComparison() {
    const button = $("#shareCompare");
    const status = $("#compareShareStatus");
    if (!button || !status || !beginAsyncAction(button)) return;
    try {
      const shareUrl = clearCatalogParams(new URL(window.location.href));
      shareUrl.hash = routeHash("compare", false);
      const selected = state.compareIds.length >= 2 ? comparisonStudies() : [];
      const selectionLabel = selected.length
        ? selected.map((study) => studyShortName(study)).join(", ")
        : "the full collection";
      const sharePayload = {
        title: "Sacred Geometry Atlas comparison",
        text: `Compare ${selectionLabel} in the Sacred Geometry Atlas.`,
        url: shareUrl.href
      };

      const nativeShareResult = await attemptNativeShare(sharePayload);
      if (nativeShareResult === "shared") {
        temporaryButtonFeedback(button, "Shared", "Comparison shared", "Share comparison", "Share this comparison", "share-comparison");
        status.textContent = "Comparison shared.";
        return;
      }
      if (nativeShareResult === "cancelled") return;

      const copied = await copyText(shareUrl.href);
      if (copied) {
        button.classList.add("is-copied");
        setButtonFeedback(button, "Link copied", "Comparison link copied");
        status.textContent = "A shareable comparison link was copied.";
        window.clearTimeout(compareShareResetTimer);
        compareShareResetTimer = window.setTimeout(() => {
          button.classList.remove("is-copied");
          setButtonFeedback(button, "Share comparison", "Share this comparison");
        }, 2200);
      } else {
        status.textContent = "Copying was unavailable. You can copy the comparison URL from the address bar.";
      }
    } finally {
      endAsyncAction(button);
    }
  }

  function citationText(study) {
    const citationUrl = clearCatalogParams(new URL(window.location.href));
    citationUrl.hash = routeHash("atlas", true);
    const surface = state.surface === "interior" ? "inside" : "outside";
    const focus = layerFocusLabel();
    return `${study.name} (${study.churchName || study.name}). ${study.typology} study, ${study.place}, ${study.era}. ${studySource(study)}; ${studySourceNote(study)}. ${studyStatus(study)}. ${surface} ${state.mode} view, ${focus}, ${zoomPercent()} zoom. Sacred Geometry Atlas. ${citationUrl.href}`;
  }

  async function copyCitation() {
    const study = activeStudy();
    const button = $("#copyCitation");
    const status = $("#citationStatus");
    if (!study || !button || !status || !beginAsyncAction(button)) return;
    try {
      const copied = await copyText(citationText(study));
      if (copied) {
        button.classList.add("is-copied");
        setButtonFeedback(button, "Citation copied", "Citation copied");
        status.textContent = `Citation for ${study.name} copied.`;
        window.clearTimeout(citationResetTimer);
        citationResetTimer = window.setTimeout(() => {
          button.classList.remove("is-copied");
          setButtonFeedback(button, "Copy citation", "Copy a citation for the active study");
        }, 2200);
      } else {
        status.textContent = "Copying was unavailable. You can copy the citation from the study details.";
      }
    } finally {
      endAsyncAction(button);
    }
  }

  function printStudy() {
    const study = activeStudy();
    if (!study) return;
    if (typeof window.print !== "function") {
      announceKeyboard("Printing is unavailable in this browser.");
      return;
    }
    announceKeyboard(`Printing ${study.name} study sheet.`);
    window.print();
  }

  function downloadDrawing() {
    const study = activeStudy();
    const svgElement = $("#geometryCanvas svg");
    const status = $("#drawingDownloadStatus");
    const button = $("#downloadDrawing");
    if (!study || !svgElement) return;
    const exportStyles = `
      .geometry-svg { background: #0c1110; color: #eef2e9; }
      .geometry-svg text { font-family: 'DM Mono', 'SFMono-Regular', Consolas, monospace; font-size: 10px; letter-spacing: .06em; text-transform: uppercase; }
      .geometry-svg .grid-line { stroke: rgba(213, 229, 214, .08); stroke-width: 1; }
      .geometry-svg .axis-line { stroke: #88c6ba; stroke-dasharray: 5 6; stroke-width: 1; opacity: .75; }
      .geometry-svg .primary-line { stroke: #e9b36c; stroke-width: 2; }
      .geometry-svg .primary-fill { fill: rgba(233, 179, 108, .1); stroke: #e9b36c; stroke-width: 2; }
      .geometry-svg .interior-fill { fill: rgba(136, 198, 186, .11); stroke: #88c6ba; stroke-width: 2; }
      .geometry-svg .secondary-line { stroke: #88c6ba; stroke-width: 1.2; }
      .geometry-svg .tertiary-line { stroke: #e77f62; stroke-width: 1; }
      .geometry-svg .faint-line { stroke: rgba(213, 229, 214, .27); stroke-width: 1; fill: none; }
      .geometry-svg .dim-text { fill: #e77f62; font-size: 9px; }
      .geometry-svg .label-text { fill: #aebbb1; font-size: 9px; }
      .geometry-svg .small-label { fill: #84948a; font-size: 8px; }
      .geometry-svg .watermark { fill: rgba(233, 179, 108, .12); font-family: 'Playfair Display', Georgia, serif; font-size: 42px; letter-spacing: -.04em; }
      .geometry-svg .stone-dot { fill: #e9b36c; }
      .geometry-svg .column { fill: #0c1110; stroke: #e9b36c; stroke-width: 1.5; }
      .geometry-svg .crosshair { stroke: #e77f62; stroke-width: 1; }
      .geometry-svg .dimension-bracket { stroke: #e77f62; stroke-width: 1; }
      .geometry-svg.focus-envelope .axis-line, .geometry-svg.focus-envelope .secondary-line, .geometry-svg.focus-envelope .column, .geometry-svg.focus-envelope .stone-dot { opacity: .13; }
      .geometry-svg.focus-envelope .tertiary-line { opacity: .75; }
      .geometry-svg.focus-rhythm .primary-line, .geometry-svg.focus-rhythm .primary-fill, .geometry-svg.focus-rhythm .interior-fill, .geometry-svg.focus-rhythm .dimension-bracket { opacity: .15; }
      .geometry-svg.focus-axis .primary-line, .geometry-svg.focus-axis .primary-fill, .geometry-svg.focus-axis .interior-fill, .geometry-svg.focus-axis .secondary-line, .geometry-svg.focus-axis .column { opacity: .12; }
      .geometry-svg.focus-axis .axis-line, .geometry-svg.focus-axis .stone-dot, .geometry-svg.focus-axis .tertiary-line { opacity: 1; }
      .geometry-svg.focus-measure .primary-line, .geometry-svg.focus-measure .primary-fill, .geometry-svg.focus-measure .interior-fill, .geometry-svg.focus-measure .axis-line, .geometry-svg.focus-measure .secondary-line, .geometry-svg.focus-measure .column, .geometry-svg.focus-measure .stone-dot { opacity: .1; }
      .geometry-svg.focus-measure .dimension-bracket, .geometry-svg.focus-measure .dim-text, .geometry-svg.focus-measure .tertiary-line, .geometry-svg.focus-measure .faint-line { opacity: 1; }
    `;
    const rawSource = typeof XMLSerializer === "function"
      ? new XMLSerializer().serializeToString(svgElement)
      : svgElement.outerHTML;
    const source = rawSource.replace(/<svg([^>]*)>/, (opening, attributes) => {
      const namespace = attributes.includes("xmlns=") ? "" : ' xmlns="http://www.w3.org/2000/svg"';
      return `<svg${attributes}${namespace}><style>${exportStyles}</style>`;
    });
    const filename = `${study.id}-${state.surface}-${state.mode}-${state.layer}.svg`;
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${source}`], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    if (status) status.textContent = `Current drawing exported as ${filename}.`;
    temporaryButtonFeedback(button, "Exported", "Drawing exported", "SVG", "Export the current drawing as SVG", "drawing-export");
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function downloadStudy() {
    const study = activeStudy();
    const status = $("#studyDownloadStatus");
    const button = $("#downloadStudy");
    if (!study) return;
    const shareUrl = clearCatalogParams(new URL(window.location.href));
    shareUrl.hash = routeHash("atlas", true);
    const filename = `${study.id}-sacred-geometry-study.json`;
    const payload = JSON.stringify({
      title: `Sacred Geometry Atlas · ${studyShortName(study)}`,
      schema: window.CHURCH_GEOMETRY_SCHEMA || { version: "1.1", units: "meters" },
      view: {
        studyId: study.id,
        surface: state.surface,
        mode: state.mode,
        layer: state.layer,
        zoom: state.zoom,
        route: shareUrl.href
      },
      study
    }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    if (status) status.textContent = `Active study exported as ${filename}.`;
    temporaryButtonFeedback(button, "Downloaded", "Study JSON downloaded", "Study JSON", "Download active study as JSON", "study-download");
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function downloadData() {
    const button = $("#downloadData");
    const payload = JSON.stringify({ title: "Sacred Geometry Atlas", schema: window.CHURCH_GEOMETRY_SCHEMA || { version: "1.1", units: "meters" }, studies }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "sacred-geometry-atlas.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    $("#downloadStatus").textContent = "Atlas data downloaded as sacred-geometry-atlas.json.";
    temporaryButtonFeedback(button, "Downloaded", "Atlas data downloaded", "Download data", "Download full atlas data as JSON", "atlas-download");
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function downloadCatalogView() {
    const visible = visibleStudies();
    const status = $("#catalogDownloadStatus");
    const button = $("#downloadCatalogView");
    if (!visible.length) {
      if (status) status.textContent = "There are no studies in the current catalog view to export.";
      return;
    }
    const filename = "sacred-geometry-atlas-view.json";
    const shareUrl = new URL(window.location.href);
    shareUrl.hash = routeHash("atlas", false);
    const payload = JSON.stringify({
      title: "Sacred Geometry Atlas · catalog view",
      schema: window.CHURCH_GEOMETRY_SCHEMA || { version: "1.1", units: "meters" },
      view: {
        scope: catalogScopeLabel(),
        route: shareUrl.href,
        query: state.query || null,
        typology: state.filter,
        place: state.filterPlace,
        status: state.filterStatus,
        sort: state.sort,
        compareIds: [...state.compareIds]
      },
      studies: visible
    }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    if (status) status.textContent = `${visible.length} ${visible.length === 1 ? "study" : "studies"} exported as ${filename}.`;
    temporaryButtonFeedback(button, "Exported", "Catalog view exported", "Export view", "Export current catalog view as JSON", "catalog-download");
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function csvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function comparisonCsvPayload(comparison) {
    const headers = [
      "ID", "Study", "Typology", "Place", "Era", "Status", "Reference", "Source", "Source note",
      "Length (m)", "Span (m)", "Length / span", "Height (m)", "Height / span",
      "Bay count", "Module (m)", "Radius (m)", "Symmetry index"
    ];
    const rows = comparison.map((study) => [
      study.id,
      studyShortName(study),
      study.typology,
      study.place,
      study.era,
      studyStatus(study),
      study.churchName || study.name,
      studySource(study),
      studySourceNote(study),
      number(study.length),
      number(study.span),
      number(study.length / study.span, 2),
      number(study.height),
      number(study.height / study.span, 2),
      study.bayCount,
      number(study.module),
      number(study.radius),
      number(study.symmetry, 2)
    ]);
    return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  }

  function downloadComparisonCsv() {
    const comparison = comparisonStudies();
    const status = $("#comparisonDownloadStatus");
    const button = $("#downloadComparison");
    if (!comparison.length) {
      if (status) status.textContent = "There are no comparison records to export.";
      return;
    }
    const filename = "sacred-geometry-comparison.csv";
    const blob = new Blob([`\uFEFF${comparisonCsvPayload(comparison)}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    if (status) status.textContent = `${comparison.length} ${comparison.length === 1 ? "study" : "studies"} exported as ${filename}.`;
    temporaryButtonFeedback(button, "Downloaded", "Comparison CSV downloaded", "CSV", "Download comparison data as CSV", "comparison-download");
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function changeZoom(delta) {
    state.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((state.zoom + delta).toFixed(2))));
    renderControls();
    renderDrawing();
    announceKeyboard(`Drawing zoom ${zoomPercent()}.`);
    if (state.page === "atlas") replaceRoute("atlas");
  }

  function resetDrawingView() {
    state.surface = "exterior";
    state.mode = "plan";
    state.layer = "all";
    state.zoom = 1;
    renderControls();
    renderDrawing();
    announceKeyboard("Drawing view reset to outside plan, all geometry, 100% zoom.");
    if (state.page === "atlas") replaceRoute("atlas");
  }

  function clearComparisonSelection({ focus = false } = {}) {
    const hadSelection = state.compareIds.length > 0;
    state.compareIds = [];
    renderList();
    updateCompareTray();
    renderCompare();
    if (state.page === "compare") replaceRoute("compare", false);
    commitComparisonRoute();
    updateDocumentTitle(state.page);
    if (hadSelection) announceKeyboard("Comparison selection cleared.");
    if (focus) {
      const control = state.page === "compare" ? $("#editCompare") : $("#searchInput");
      if (control && typeof control.focus === "function") control.focus({ preventScroll: true });
    }
  }

  function addVisibleToComparison({ focus = false } = {}) {
    const visible = visibleStudies();
    const additions = visible.filter((study) => !state.compareIds.includes(study.id));
    if (!additions.length) {
      announceKeyboard(visible.length ? "All visible studies are already in comparison." : "There are no visible studies to add to comparison.");
      if (focus) {
        const button = $("#selectVisibleCompare");
        if (button && typeof button.focus === "function") button.focus({ preventScroll: true });
      }
      return;
    }
    state.compareIds = [...state.compareIds, ...additions.map((study) => study.id)];
    renderList();
    updateCompareTray();
    renderCompare();
    if (state.page === "compare") replaceRoute("compare", false);
    commitComparisonRoute();
    updateDocumentTitle(state.page);
    const additionLabel = `${additions.length} ${additions.length === 1 ? "study" : "studies"}`;
    announceKeyboard(`${additionLabel} added to comparison. ${state.compareIds.length} selected.`);
    if (focus) {
      const button = $("#selectVisibleCompare");
      if (button && typeof button.focus === "function") button.focus({ preventScroll: true });
    }
  }

  function removeComparisonStudy(id) {
    const index = state.compareIds.indexOf(id);
    if (index < 0) return;
    const study = studies.find((candidate) => candidate.id === id);
    state.compareIds = state.compareIds.filter((compareId) => compareId !== id);
    renderList();
    updateCompareTray();
    renderCompare();
    if (state.page === "compare") replaceRoute("compare", false);
    commitComparisonRoute();
    updateDocumentTitle(state.page);
    if (study) announceKeyboard(`${study.name} removed from comparison. ${state.compareIds.length} selected.`);
    const remaining = $$('[data-remove-compare-id]');
    const next = remaining.length ? remaining[Math.min(index, remaining.length - 1)] : $("#editCompare");
    if (next && typeof next.focus === "function") next.focus({ preventScroll: true });
  }

  function toggleCompare(id, options = {}) {
    const { focus = false } = options;
    const study = studies.find((candidate) => candidate.id === id);
    const wasSelected = state.compareIds.includes(id);
    if (state.compareIds.includes(id)) {
      state.compareIds = state.compareIds.filter((compareId) => compareId !== id);
    } else {
      state.compareIds = [...state.compareIds, id];
    }
    renderList();
    updateCompareTray();
    renderCompare();
    if (state.page === "compare") replaceRoute("compare", false);
    commitComparisonRoute();
    updateDocumentTitle(state.page);
    if (study) announceKeyboard(`${study.name} ${wasSelected ? "removed from" : "added to"} comparison. ${state.compareIds.length} selected.`);
    if (focus) focusCompareToggle(id);
  }

  function updateCompareTray() {
    updateCompareNavigation();
    const tray = $("#compareTray");
    const count = $("#compareCount");
    const summary = $("#compareSummary");
    const open = $("#openCompare");
    const clear = $("#clearCompare");
    if (!tray || !count || !open) return;
    const selectedCount = state.compareIds.length;
    const selectedLabel = `${selectedCount} selected ${selectedCount === 1 ? "study" : "studies"}`;
    const selectedStudies = state.compareIds
      .map((id) => studies.find((study) => study.id === id))
      .filter(Boolean);
    const selectedNames = selectedStudies.map(studyShortName);
    const preview = selectedNames.slice(0, 2).join(" · ");
    const extra = selectedNames.length > 2 ? ` · +${selectedNames.length - 2} more` : "";
    const compareLabel = selectedCount >= 2
      ? `Compare ${selectedLabel}`
      : selectedCount === 1
        ? "Select one more study to compare"
        : "Compare selected studies (select at least two)";
    tray.hidden = selectedCount === 0;
    count.textContent = `${selectedCount} selected`;
    count.setAttribute("aria-label", selectedNames.length ? `${selectedLabel}: ${selectedNames.join(", ")}` : selectedLabel);
    if (summary) {
      summary.textContent = preview + extra;
      summary.title = selectedNames.join(" · ");
      summary.hidden = !preview;
    }
    open.disabled = selectedCount < 2;
    const openText = open.querySelector(".compare-action-label");
    if (openText) openText.textContent = selectedCount === 1 ? "Select one more" : "Compare selected";
    open.setAttribute("aria-label", compareLabel);
    open.title = compareLabel;
    if (clear) {
      const clearLabel = selectedCount ? `Clear ${selectedLabel}` : "Clear comparison selection";
      clear.setAttribute("aria-label", clearLabel);
      clear.title = clearLabel;
    }
  }

  function updateCompareNavigation() {
    const button = $('[data-view="compare"]');
    const count = $("#compareNavCount");
    if (!button) return;
    const selectedCount = state.compareIds.length;
    const label = selectedCount ? `Compare (${selectedCount} selected)` : "Compare";
    button.setAttribute("aria-label", label);
    button.title = label;
    if (count) {
      count.textContent = selectedCount ? String(selectedCount) : "";
      count.hidden = selectedCount === 0;
    }
  }

  function comparisonStudies() {
    if (state.compareIds.length >= 2) return studies.filter((study) => state.compareIds.includes(study.id));
    return studies;
  }

  function renderCompare() {
    renderCharts();
    renderGeometryCompare();
    renderComparisonTable();
    renderCompareSelection();
    renderCompareContext();
    const selected = state.compareIds.length;
    const edit = $("#editCompare");
    if (edit) {
      const editLabel = selected >= 2 ? "Edit comparison selection in Atlas" : "Browse studies in Atlas";
      edit.setAttribute("aria-label", editLabel);
      edit.title = editLabel;
      const editText = edit.querySelector("span:last-child");
      if (editText) editText.textContent = selected >= 2 ? "Edit selection" : "Browse Atlas";
    }
    if (state.page === "compare") updateDocumentTitle("compare");
  }

  function renderCompareContext() {
    const selected = state.compareIds.length;
    const focused = selected >= 2;
    const compareScopeLabel = focused ? "selected collection" : "full collection";
    const sectionNote = $("#compareSectionNote");
    const geometryKicker = $("#geometryCompareKicker");
    const scope = $("#compareScope");
    const helper = $("#compareHelper");
    if (sectionNote) sectionNote.textContent = `Relative readings · ${compareScopeLabel}`;
    if (geometryKicker) geometryKicker.textContent = focused ? "00 / selected geometry" : "00 / collection geometry";
    if (scope) scope.textContent = focused ? `${selected} selected` : "Full collection";
    if (helper) helper.textContent = focused
      ? "Focused comparison is using the studies you selected in the Atlas. Click a geometry card to return to that study."
      : "Select two or more studies with the + controls in the Atlas to create a focused comparison. Without a selection, the full collection is shown.";
  }

  function renderCompareSelection() {
    const selection = $("#compareSelection");
    const list = $("#compareSelectionList");
    const clear = $("#clearCompareView");
    if (!selection || !list) return;
    const focused = state.compareIds.length >= 2;
    const comparison = focused ? comparisonStudies() : [];
    selection.hidden = !focused;
    list.innerHTML = focused ? comparison.map((study) => {
      const label = `Remove ${study.name} from comparison`;
      return `<button class="compare-selection-chip" data-remove-compare-id="${escapeHtml(study.id)}" type="button" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><span>${escapeHtml(studyShortName(study))}</span><span aria-hidden="true">×</span></button>`;
    }).join("") : "";
    if (clear && focused) {
      const clearLabel = `Clear ${comparison.length} selected ${comparison.length === 1 ? "study" : "studies"}`;
      clear.setAttribute("aria-label", clearLabel);
      clear.title = clearLabel;
    }
  }

  function renderComparisonTable() {
    const body = $("#comparisonTableBody");
    const caption = $("#comparisonTableCaption");
    const summary = $("#comparisonTableSummary");
    if (!body) return;
    const comparison = comparisonStudies();
    const isFocused = state.compareIds.length >= 2;
    if (summary) summary.textContent = isFocused
      ? `Read the ${comparison.length} selected study records as a table`
      : `Read the ${comparison.length} study records as a table`;
    if (caption) caption.textContent = isFocused
      ? `Recorded study values for ${comparison.length} selected studies; each row includes its data status.`
      : "Recorded study values for the full collection; each row includes its data status.";
    body.innerHTML = comparison.map((study) => {
      const ratio = study.length / study.span;
      const section = study.height / study.span;
      return `
        <tr>
          <th scope="row">${escapeHtml(studyShortName(study))}</th>
          <td class="comparison-status">${escapeHtml(studyStatus(study))}</td>
          <td>${number(study.length)} m</td>
          <td>${number(study.span)} m</td>
          <td>${number(ratio, 2)}</td>
          <td>${number(study.height)} m</td>
          <td>${number(section, 2)}</td>
          <td>${study.bayCount}</td>
          <td>${number(study.module)} m</td>
          <td>${number(study.symmetry, 2)}</td>
        </tr>
      `;
    }).join("");
  }

  function renderGeometryCompare() {
    const target = $("#geometryCompare");
    if (!target) return;
    target.setAttribute("aria-label", "Study envelopes; each card identifies whether its data is schematic or measured.");
    target.innerHTML = comparisonStudies().map((study) => {
      const ratio = number(study.length / study.span, 2);
      const section = number(study.height / study.span, 2);
      const label = comparisonStudyAriaLabel(study, ratio, section);
      return `
      <button class="compare-study-card" data-compare-study="${escapeHtml(study.id)}" type="button" aria-controls="atlas" aria-label="${label}">
        <span class="compare-study-number">${escapeHtml(study.index)} / ${escapeHtml(studyStatus(study))}</span>
        ${miniPlan(study)}
        <span class="compare-study-title">${escapeHtml(study.name)}</span>
        <span class="compare-study-meta">${ratio} ratio · ${section} section</span>
      </button>
    `;
    }).join("");
  }

  function comparisonStudyAriaLabel(study, ratio, section) {
    return `Open ${escapeHtml(study.name)} in the Atlas. ${escapeHtml(study.typology)} study at ${escapeHtml(study.place)}; ${studyStatusDescription(study)} Dimensions: ${number(study.length)} meters long, with a span of ${number(study.span)} meters, and a height of ${number(study.height)} meters. Length to span ratio ${ratio}; height to span ratio ${section}.`;
  }

  function miniPlan(study) {
    const shapes = {
      basilica: '<path class="mini-primary" d="M30 30H190V88A28 28 0 0 1 110 112A28 28 0 0 1 30 88Z"/><path class="mini-secondary" d="M70 30V88M150 30V88M110 20V118"/>',
      gothic: '<path class="mini-primary" d="M72 18H148V58H190V82H148V112L110 128L72 112V82H30V58H72Z"/><path class="mini-secondary" d="M88 20V102M132 20V102M110 18V128"/>',
      central: '<rect class="mini-primary" x="60" y="20" width="100" height="100"/><circle class="mini-primary" cx="110" cy="70" r="39"/><path class="mini-secondary" d="M110 12V128M52 70H168"/>',
      baroque: '<rect class="mini-primary" x="32" y="38" width="156" height="64" rx="26"/><ellipse class="mini-primary" cx="110" cy="70" rx="55" ry="39"/><path class="mini-secondary" d="M110 18V122M26 70H194"/>',
      stave: '<rect class="mini-primary" x="54" y="32" width="112" height="76"/><rect class="mini-primary" x="76" y="18" width="68" height="104"/><path class="mini-secondary" d="M76 18V122M110 18V122M144 18V122"/>',
      modern: '<polygon class="mini-primary" points="28,98 48,28 132,18 190,48 170,108"/><path class="mini-secondary" d="M55 30L72 105M108 22L120 106M155 34L150 106"/>'
    };
    return `<svg class="compare-mini" viewBox="0 0 220 140" aria-hidden="true" focusable="false"><path class="mini-detail" d="M18 124H202M110 10V130"/>${shapes[study.type] || shapes.basilica}</svg>`;
  }

  function renderCharts() {
    if (!$("#ratioChart")) return;
    const comparison = comparisonStudies();
    const maxRatio = Math.max(...comparison.map((study) => study.length / study.span));
    const maxHeightRatio = Math.max(...comparison.map((study) => study.height / study.span));
    $("#ratioChart").innerHTML = comparison.map((study) => {
      const ratio = study.length / study.span;
      return `<div class="bar-row" role="listitem" aria-label="${escapeHtml(studyShortName(study))}: length to span ratio ${number(ratio, 2)}; ${studyDataLabel(study)} record"><span class="bar-label">${escapeHtml(studyShortName(study))}</span><span class="bar-track"><i class="bar-fill" style="width:${(ratio / maxRatio) * 100}%"></i></span><span class="bar-value">${number(ratio, 2)}</span></div>`;
    }).join("");
    $("#heightChart").innerHTML = comparison.map((study) => {
      const ratio = study.height / study.span;
      return `<div class="bar-row" role="listitem" aria-label="${escapeHtml(studyShortName(study))}: height to span ratio ${number(ratio, 2)}; ${studyDataLabel(study)} record"><span class="bar-label">${escapeHtml(studyShortName(study))}</span><span class="bar-track"><i class="bar-fill teal" style="width:${(ratio / maxHeightRatio) * 100}%"></i></span><span class="bar-value">${number(ratio, 2)}</span></div>`;
    }).join("");
    $("#moduleChart").innerHTML = comparison.map((study) => `
      <div class="module-row" role="listitem" aria-label="${escapeHtml(studyShortName(study))}: ${study.bayCount} bays, module ${number(study.module)} meters; ${studyDataLabel(study)} record">
        <span class="module-name">${escapeHtml(studyShortName(study))}</span>
        <span class="module-bars">${Array.from({ length: study.bayCount }, (_, index) => `<i class="module-bar" style="height:${10 + ((index + study.module) % 5) * 3}px"></i>`).join("")}</span>
        <span class="module-value">${number(study.module)} m</span>
      </div>
    `).join("");
  }

  function catalogGlyph(study) {
    const glyphs = {
      basilica: '<svg class="catalog-glyph" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><rect x="5" y="10" width="30" height="20"/><path d="M8 10V6h24v4M12 15h16M12 20h16M12 25h16"/><line class="soft" x1="20" y1="5" x2="20" y2="35"/></svg>',
      gothic: '<svg class="catalog-glyph" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="M7 30V15l5-5 5 5v15M23 30V15l5-5 5 5v15M5 30h30M12 10V5M28 10V5"/><path class="soft" d="M20 30V7M16 12h8"/></svg>',
      central: '<svg class="catalog-glyph" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle cx="20" cy="20" r="12"/><path d="M20 4v32M4 20h32M12 12l16 16M28 12L12 28"/><circle class="soft" cx="20" cy="20" r="5"/></svg>',
      baroque: '<svg class="catalog-glyph" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><ellipse cx="20" cy="20" rx="14" ry="10"/><rect x="8" y="14" width="24" height="12" rx="6"/><path class="soft" d="M20 6v28M6 20h28"/></svg>',
      stave: '<svg class="catalog-glyph" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="M7 31V13l6-6 7 6 7-6 6 6v18M5 31h30M10 13v18M20 13v18M30 13v18"/><path class="soft" d="M8 22h24"/></svg>',
      modern: '<svg class="catalog-glyph" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="M6 29L11 9l15 3 8 17H6Z"/><path class="soft" d="M11 9v20M18 11l4 18M26 12v17M6 25h28"/></svg>'
    };
    return glyphs[study.type] || glyphs.basilica;
  }

  function svgBase(study, title) {
    const surface = state.surface === "interior" ? "Interior" : "Exterior";
    const layer = state.layer === "all" ? "complete geometry study" : `${layerDisplayName(state.layer)} layer focus`;
    const reading = studySurfaceReading(study);
    const description = `${surface} ${state.mode} ${studyDataLabel(study)} drawing showing the ${layer} for ${study.name} at ${zoomPercent()} zoom. Overall dimensions are length ${study.length} meters, span ${study.span} meters, and height ${study.height} meters. Envelope: ${study.envelope}. Axis: ${study.axis}. Rhythm: ${study.bayCount} bays at a ${number(study.module)} meter module. Primary radius: ${number(study.radius)} meters. Symmetry index: ${number(study.symmetry, 2)}. Reading: ${reading || "No interpretive reading supplied."} Status: ${studyStatusDescription(study)} Reference: ${study.churchName || study.name}.`;
    return `<svg class="geometry-svg focus-${escapeHtml(state.layer)}" viewBox="0 0 820 510" role="img" aria-labelledby="drawing-title" aria-describedby="drawing-description" focusable="false"><title id="drawing-title">${escapeHtml(title)}</title><desc id="drawing-description">${escapeHtml(description)}</desc><defs>
      <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" class="grid-line" fill="none" /></pattern>
      <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M6 0L0 3L6 6" fill="none" stroke="#e77f62" stroke-width="1" /></marker>
    </defs><rect width="820" height="510" fill="url(#grid)" /><g class="drawing-zoom" transform="translate(410 255) scale(${state.zoom}) translate(-410 -255)"><text class="watermark" x="46" y="466">${escapeHtml(study.index)}</text><text class="small-label" x="48" y="42">${escapeHtml(title)}</text>`;
  }

  function renderDrawing() {
    const study = activeStudy();
    if (!study) return;
    let svg = svgBase(study, `${state.surface} ${state.mode} of ${study.name}`);
    if (state.mode === "plan") svg += drawPlan(study);
    if (state.mode === "elevation") svg += drawElevation(study);
    if (state.mode === "section") svg += drawSection(study);
    svg += `</g><text class="label-text" x="710" y="449" text-anchor="end">${state.surface === "interior" ? "INNER GEOMETRY" : "OUTER ENVELOPE"}</text></svg>`;
    $("#geometryCanvas").innerHTML = svg;
    $("#drawingScale").textContent = `Scale 1 : ${state.mode === "section" ? "120" : "200"}`;
    renderStudy();
    if (state.page === "atlas") updateDocumentTitle("atlas");
  }

  function drawingFrame(label, subtitle) {
    return `<text class="label-text" x="690" y="66" text-anchor="end">${escapeHtml(label)}</text><text class="small-label" x="690" y="82" text-anchor="end">${escapeHtml(subtitle)}</text>`;
  }

  function dimensionLine(x1, y1, x2, y2, label, tx, ty) {
    return `<line class="dimension-bracket" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" /><text class="dim-text" x="${tx}" y="${ty}" text-anchor="middle">${escapeHtml(label)}</text>`;
  }

  function axisCross(cx, cy, radius) {
    return `<line class="axis-line" x1="${cx - radius}" y1="${cy}" x2="${cx + radius}" y2="${cy}" /><line class="axis-line" x1="${cx}" y1="${cy - radius}" x2="${cx}" y2="${cy + radius}" /><circle cx="${cx}" cy="${cy}" r="3" class="stone-dot" />`;
  }

  function drawPlan(study) {
    const scale = Math.min(430 / study.length, 260 / study.span);
    const width = study.length * scale;
    const height = study.span * scale;
    const x = 330 - width / 2;
    const y = 265 - height / 2;
    const inner = state.surface === "interior";
    const mainClass = inner ? "interior-fill" : "primary-fill";
    let content = drawingFrame(`${study.typology} / PLAN`, inner ? "spatial field · inner face" : "building shell · outer face");
    content += axisCross(330, 265, Math.max(width, height) / 2 + 38);
    if (study.type === "basilica") {
      const aisle = Math.max(10, height * 0.17);
      const naveX = x + aisle;
      const naveW = width - aisle * 2;
      content += `<path class="${mainClass}" d="M${x} ${y}H${x + width}V${y + height * 0.72}A${height * 0.28} ${height * 0.28} 0 0 1 ${x + width / 2} ${y + height}A${height * 0.28} ${height * 0.28} 0 0 1 ${x} ${y + height * 0.72}Z" />`;
      if (inner) {
        content += `<rect class="faint-line" x="${naveX}" y="${y + 9}" width="${naveW}" height="${height * 0.66}" />`;
        for (let i = 1; i < study.bayCount; i += 1) {
          const px = naveX + (naveW / study.bayCount) * i;
          content += `<line class="secondary-line" x1="${px}" y1="${y + 18}" x2="${px}" y2="${y + height * 0.67}" />`;
        }
        for (let i = 0; i < study.bayCount; i += 1) {
          const px = naveX + (naveW / study.bayCount) * (i + 0.5);
          content += `<circle class="column" cx="${px}" cy="${y + 7}" r="4" /><circle class="column" cx="${px}" cy="${y + height * 0.7}" r="4" />`;
        }
      } else {
        content += `<line class="secondary-line" x1="${naveX}" y1="${y}" x2="${naveX}" y2="${y + height * 0.7}" /><line class="secondary-line" x1="${naveX + naveW}" y1="${y}" x2="${naveX + naveW}" y2="${y + height * 0.7}" />`;
        for (let i = 1; i < study.bayCount; i += 1) {
          const px = naveX + (naveW / study.bayCount) * i;
          content += `<line class="secondary-line" x1="${px}" y1="${y + height * 0.1}" x2="${px}" y2="${y + height * 0.62}" />`;
        }
      }
      content += dimensionLine(x, y - 25, x + width, y - 25, `${study.length} m`, x + width / 2, y - 33);
      content += dimensionLine(x - 25, y, x - 25, y + height * 0.72, `${study.span} m`, x - 34, y + height * 0.36);
      content += `<text class="small-label" x="${x + width / 2}" y="${y + height + 33}" text-anchor="middle">module ${number(study.module)} m · ${study.bayCount} bays · radius ${number(study.radius)} m</text>`;
    } else if (study.type === "gothic") {
      const transeptY = y + height * 0.42;
      const apseR = height * 0.22;
      const path = `M${x + width * 0.24} ${y}H${x + width * 0.76}V${transeptY}H${x + width}V${transeptY + height * 0.17}H${x + width * 0.76}V${y + height * 0.74}L${x + width * 0.68} ${y + height * 0.9}L${x + width * 0.5} ${y + height}L${x + width * 0.32} ${y + height * 0.9}L${x + width * 0.24} ${y + height * 0.74}V${transeptY + height * 0.17}H${x}V${transeptY}H${x + width * 0.24}Z`;
      content += `<path class="${mainClass}" d="${path}" />`;
      content += `<line class="secondary-line" x1="${x + width * 0.34}" y1="${y}" x2="${x + width * 0.34}" y2="${y + height * 0.78}" /><line class="secondary-line" x1="${x + width * 0.66}" y1="${y}" x2="${x + width * 0.66}" y2="${y + height * 0.78}" />`;
      for (let i = 1; i < study.bayCount; i += 1) {
        const px = x + width * 0.24 + (width * 0.52 / study.bayCount) * i;
        content += `<line class="secondary-line" x1="${px}" y1="${y + 6}" x2="${px}" y2="${transeptY - 5}" />`;
        content += `<circle class="column" cx="${px}" cy="${y + 7}" r="4" /><circle class="column" cx="${px}" cy="${transeptY - 5}" r="4" />`;
      }
      content += `<circle class="faint-line" cx="${x + width / 2}" cy="${y + height * 0.86}" r="${apseR}" />`;
      content += dimensionLine(x, y - 25, x + width, y - 25, `${study.length} m`, x + width / 2, y - 33);
      content += dimensionLine(x - 25, y + height * 0.42, x - 25, y + height * 0.59, `${study.span} m`, x - 34, y + height * 0.51);
      content += `<text class="small-label" x="${x + width / 2}" y="${y + height + 33}" text-anchor="middle">pointed bay · ${study.bayCount} ribs · radius ${number(study.radius)} m</text>`;
    } else if (study.type === "central") {
      const r = Math.min(width, height) * 0.34;
      content += `<rect class="${mainClass}" x="${330 - r * 1.18}" y="${265 - r * 1.18}" width="${r * 2.36}" height="${r * 2.36}" />`;
      content += `<circle class="${inner ? "interior-fill" : "primary-fill"}" cx="330" cy="265" r="${r}" />`;
      content += `<path class="${inner ? "secondary-line" : "faint-line"}" d="M330 ${265 - r * 1.6}V${265 + r * 1.6}M${330 - r * 1.6} 265H${330 + r * 1.6}" />`;
      [0, 90, 180, 270].forEach((angle) => {
        const rad = angle * Math.PI / 180;
        const cx = 330 + Math.cos(rad) * r * 1.22;
        const cy = 265 + Math.sin(rad) * r * 1.22;
        content += `<circle class="${mainClass}" cx="${cx}" cy="${cy}" r="${r * 0.32}" />`;
      });
      content += `<circle class="secondary-line" cx="330" cy="265" r="${r * 0.2}" fill="none" />`;
      content += dimensionLine(330 - r * 1.18, 265 + r * 1.55, 330 + r * 1.18, 265 + r * 1.55, `${study.span} m`, 330, 265 + r * 1.7);
      content += `<text class="small-label" x="330" y="${265 + r * 1.95}" text-anchor="middle">central radius ${number(study.radius)} m · 4 arms · dome field</text>`;
    } else if (study.type === "baroque") {
      const rx = width * 0.37;
      const ry = height * 0.44;
      content += `<rect class="${mainClass}" x="${x}" y="${y + height * 0.2}" width="${width}" height="${height * 0.6}" rx="${height * 0.12}" />`;
      content += `<ellipse class="${inner ? "interior-fill" : "primary-line"}" cx="330" cy="265" rx="${rx}" ry="${ry}" fill="${inner ? "rgba(136,198,186,.08)" : "none"}" />`;
      content += `<line class="secondary-line" x1="330" y1="${y}" x2="330" y2="${y + height}" /><line class="secondary-line" x1="${x}" y1="265" x2="${x + width}" y2="265" />`;
      content += `<circle class="column" cx="${330 - rx}" cy="265" r="4" /><circle class="column" cx="${330 + rx}" cy="265" r="4" />`;
      content += dimensionLine(x, y - 25, x + width, y - 25, `${study.length} m`, 330, y - 33);
      content += `<text class="small-label" x="330" y="${y + height + 33}" text-anchor="middle">ellipse ${number(rx / scale)} × ${number(ry / scale)} m · 2 focal points</text>`;
    } else if (study.type === "stave") {
      content += `<rect class="${mainClass}" x="${x + width * 0.15}" y="${y + height * 0.16}" width="${width * 0.7}" height="${height * 0.68}" />`;
      content += `<rect class="${mainClass}" x="${x + width * 0.28}" y="${y + height * 0.04}" width="${width * 0.44}" height="${height * 0.92}" />`;
      for (let i = 0; i < study.bayCount; i += 1) {
        const px = x + width * 0.29 + (width * 0.42 / Math.max(1, study.bayCount - 1)) * i;
        content += `<line class="secondary-line" x1="${px}" y1="${y + height * 0.06}" x2="${px}" y2="${y + height * 0.94}" />`;
      }
      content += `<path class="${inner ? "secondary-line" : "primary-line"}" d="M${x + width * 0.13} ${y + height * 0.16}L${x + width * 0.27} ${y}L${x + width * 0.5} ${y + height * 0.13}L${x + width * 0.73} ${y}L${x + width * 0.87} ${y + height * 0.16}" fill="none" />`;
      content += dimensionLine(x + width * 0.15, y + height + 25, x + width * 0.85, y + height + 25, `${study.span} m`, 330, y + height + 33);
      content += `<text class="small-label" x="330" y="${y + height + 58}" text-anchor="middle">${study.bayCount} post frames · module ${number(study.module)} m</text>`;
    } else {
      const poly = `${x + width * 0.08},${y + height * 0.75} ${x + width * 0.17},${y + height * 0.15} ${x + width * 0.6},${y + height * 0.05} ${x + width * 0.92},${y + height * 0.3} ${x + width * 0.78},${y + height * 0.86} ${x + width * 0.08},${y + height * 0.75}`;
      content += `<polygon class="${mainClass}" points="${poly}" />`;
      for (let i = 1; i < study.bayCount; i += 1) {
        const px = x + width * (0.18 + i * 0.18);
        content += `<line class="secondary-line" x1="${px}" y1="${y + height * 0.14}" x2="${px - 10}" y2="${y + height * 0.78}" />`;
      }
      content += `<line class="axis-line" x1="${x}" y1="${y + height * 0.5}" x2="${x + width}" y2="${y + height * 0.5}" />`;
      content += dimensionLine(x + width * 0.08, y + height + 25, x + width * 0.78, y + height + 25, `${study.length} m`, x + width * 0.43, y + height + 33);
      content += `<text class="small-label" x="330" y="${y + height + 58}" text-anchor="middle">offset axis · ${study.bayCount} portal frames · shell thickness study</text>`;
    }
    return content;
  }

  function drawElevation(study) {
    const scale = Math.min(500 / study.length, 260 / study.height);
    const width = study.length * scale;
    const height = study.height * scale;
    const x = 330 - width / 2;
    const ground = 390;
    const top = ground - height;
    const inner = state.surface === "interior";
    let content = drawingFrame(`${study.typology} / ELEVATION`, inner ? "room profile · inner face" : "silhouette · outer face");
    content += `<line class="faint-line" x1="90" y1="${ground}" x2="690" y2="${ground}" />`;
      if (study.type === "basilica") {
        const naveTop = top + height * 0.18;
        content += `<path class="${inner ? "interior-fill" : "primary-fill"}" d="M${x} ${ground}V${top + height * 0.33}H${x + width * 0.18}V${naveTop}H${x + width * 0.82}V${top + height * 0.33}H${x + width}V${ground}Z" />`;
        content += `<path class="${inner ? "secondary-line" : "primary-line"}" d="M${x + width * 0.18} ${naveTop}L${x + width * 0.5} ${top}L${x + width * 0.82} ${naveTop}" fill="none" />`;
        for (let i = 1; i < study.bayCount; i += 1) {
          const px = x + width * 0.18 + (width * 0.64 / study.bayCount) * i;
          content += `<line class="secondary-line" x1="${px}" y1="${naveTop}" x2="${px}" y2="${ground}" />`;
        }
      } else if (study.type === "gothic") {
        const bayW = width * 0.64 / study.bayCount;
        content += `<path class="${inner ? "interior-fill" : "primary-fill"}" d="M${x} ${ground}V${top + height * 0.35}H${x + width * 0.16}L${x + width * 0.24} ${top + height * 0.16}L${x + width * 0.32} ${top + height * 0.35}H${x + width * 0.42}L${x + width * 0.5} ${top}L${x + width * 0.58} ${top + height * 0.35}H${x + width * 0.68}L${x + width * 0.76} ${top + height * 0.16}L${x + width * 0.84} ${top + height * 0.35}H${x + width}V${ground}Z" />`;
        for (let i = 1; i < study.bayCount; i += 1) {
          const px = x + width * 0.18 + bayW * i;
          content += `<path class="secondary-line" d="M${px} ${ground}V${top + height * 0.35}Q${px + bayW / 2} ${top + height * 0.03} ${px + bayW} ${top + height * 0.35}" fill="none" />`;
        }
        content += `<line class="secondary-line" x1="${x + width * 0.12}" y1="${top + height * 0.26}" x2="${x + width * 0.12}" y2="${ground}" /><line class="secondary-line" x1="${x + width * 0.88}" y1="${top + height * 0.26}" x2="${x + width * 0.88}" y2="${ground}" />`;
      } else if (study.type === "central") {
        const drum = height * 0.28;
        content += `<path class="${inner ? "interior-fill" : "primary-fill"}" d="M${x + width * 0.12} ${ground}V${top + height * 0.43}H${x + width * 0.32}V${top + height * 0.3}H${x + width * 0.68}V${top + height * 0.43}H${x + width * 0.88}V${ground}Z" />`;
        content += `<path class="${inner ? "secondary-line" : "primary-line"}" d="M${x + width * 0.32} ${top + height * 0.3}Q330 ${top - drum} ${x + width * 0.68} ${top + height * 0.3}" fill="none" />`;
        content += `<line class="axis-line" x1="330" y1="${top - drum * 0.9}" x2="330" y2="${ground}" />`;
      } else if (study.type === "baroque") {
        content += `<path class="${inner ? "interior-fill" : "primary-fill"}" d="M${x} ${ground}V${top + height * 0.5}Q${x + width * 0.15} ${top + height * 0.1} ${x + width * 0.3} ${top + height * 0.5}Q330 ${top - height * 0.2} ${x + width * 0.7} ${top + height * 0.5}Q${x + width * 0.85} ${top + height * 0.1} ${x + width} ${top + height * 0.5}V${ground}Z" />`;
        content += `<line class="secondary-line" x1="330" y1="${top - height * 0.2}" x2="330" y2="${ground}" />`;
      } else if (study.type === "stave") {
        content += `<path class="${inner ? "interior-fill" : "primary-fill"}" d="M${x} ${ground}V${top + height * 0.4}L${x + width * 0.18} ${top + height * 0.24}L${x + width * 0.33} ${top + height * 0.36}L${x + width * 0.5} ${top}L${x + width * 0.67} ${top + height * 0.36}L${x + width * 0.82} ${top + height * 0.24}L${x + width} ${top + height * 0.4}V${ground}Z" />`;
        for (let i = 0; i < study.bayCount + 1; i += 1) {
          const px = x + (width / study.bayCount) * i;
          content += `<line class="secondary-line" x1="${px}" y1="${top + height * (i % 2 ? 0.35 : 0.22)}" x2="${px}" y2="${ground}" />`;
        }
      } else {
        content += `<path class="${inner ? "interior-fill" : "primary-fill"}" d="M${x} ${ground}V${top + height * 0.4}L${x + width * 0.18} ${top + height * 0.12}L${x + width * 0.72} ${top}L${x + width} ${top + height * 0.3}V${ground}Z" />`;
        for (let i = 1; i < study.bayCount; i += 1) {
          const px = x + width * (0.15 + i * 0.17);
          content += `<line class="secondary-line" x1="${px}" y1="${top + height * 0.16}" x2="${px - 7}" y2="${ground}" />`;
        }
        content += `<line class="axis-line" x1="${x + width * 0.12}" y1="${ground - height * 0.08}" x2="${x + width * 0.88}" y2="${ground - height * 0.08}" />`;
      }
    content += dimensionLine(x, ground + 30, x + width, ground + 30, `${study.length} m`, x + width / 2, ground + 47);
    content += dimensionLine(x + width + 28, ground, x + width + 28, top, `${study.height} m`, x + width + 42, (ground + top) / 2);
    content += `<text class="small-label" x="330" y="${ground + 78}" text-anchor="middle">${study.emphasis.toLowerCase()} · height / span ${number(study.height / study.span, 2)}</text>`;
    return content;
  }

  function drawSection(study) {
    const scale = Math.min(300 / study.span, 250 / study.height);
    const width = study.span * scale;
    const height = study.height * scale;
    const x = 330 - width / 2;
    const ground = 390;
    const top = ground - height;
    const inner = state.surface === "interior";
    let content = drawingFrame(`${study.typology} / SECTION`, inner ? "section through room" : "section through envelope");
    content += `<line class="faint-line" x1="90" y1="${ground}" x2="690" y2="${ground}" />`;
    if (study.type === "central") {
      content += `<rect class="${inner ? "interior-fill" : "primary-fill"}" x="${x}" y="${top + height * 0.4}" width="${width}" height="${height * 0.6}" />`;
      content += `<path class="${inner ? "interior-fill" : "primary-fill"}" d="M${x} ${top + height * 0.4}Q330 ${top - height * 0.38} ${x + width} ${top + height * 0.4}" />`;
      content += `<circle class="secondary-line" cx="330" cy="${top + height * 0.28}" r="${Math.max(8, width * 0.1)}" fill="none" />`;
      content += axisCross(330, top + height * 0.56, Math.max(width, height) * 0.47);
    } else if (study.type === "gothic") {
      content += `<path class="${inner ? "interior-fill" : "primary-fill"}" d="M${x} ${ground}V${top + height * 0.42}Q${x + width * 0.2} ${top - height * 0.1} 330 ${top}Q${x + width * 0.8} ${top - height * 0.1} ${x + width} ${top + height * 0.42}V${ground}Z" />`;
      content += `<path class="secondary-line" d="M${x + width * 0.14} ${ground}V${top + height * 0.44}Q${x + width * 0.3} ${top + height * 0.08} 330 ${top + height * 0.18}Q${x + width * 0.7} ${top + height * 0.08} ${x + width * 0.86} ${top + height * 0.44}V${ground}" fill="none" />`;
      content += axisCross(330, ground - height * 0.32, width * 0.45);
    } else if (study.type === "baroque") {
      content += `<path class="${inner ? "interior-fill" : "primary-fill"}" d="M${x} ${ground}V${top + height * 0.5}Q${x + width * 0.1} ${top + height * 0.18} 330 ${top}Q${x + width * 0.9} ${top + height * 0.18} ${x + width} ${top + height * 0.5}V${ground}Z" />`;
      content += `<path class="secondary-line" d="M${x + width * 0.18} ${ground}V${top + height * 0.52}Q330 ${top + height * 0.15} ${x + width * 0.82} ${top + height * 0.52}V${ground}" fill="none" />`;
      content += axisCross(330, ground - height * 0.35, width * 0.47);
    } else if (study.type === "stave") {
      content += `<path class="${inner ? "interior-fill" : "primary-fill"}" d="M${x} ${ground}V${top + height * 0.44}L${x + width * 0.22} ${top + height * 0.22}L330 ${top}L${x + width * 0.78} ${top + height * 0.22}L${x + width} ${top + height * 0.44}V${ground}Z" />`;
      content += `<path class="secondary-line" d="M${x + width * 0.16} ${ground}V${top + height * 0.47}L330 ${top + height * 0.16}L${x + width * 0.84} ${top + height * 0.47}V${ground}" fill="none" />`;
      [0.25, 0.5, 0.75].forEach((fraction) => { content += `<line class="secondary-line" x1="${x + width * fraction}" y1="${top + height * 0.2}" x2="${x + width * fraction}" y2="${ground}" />`; });
    } else if (study.type === "modern") {
      content += `<path class="${inner ? "interior-fill" : "primary-fill"}" d="M${x} ${ground}V${top + height * 0.36}L${x + width * 0.28} ${top + height * 0.15}L${x + width * 0.82} ${top}L${x + width} ${top + height * 0.28}V${ground}Z" />`;
      content += `<path class="secondary-line" d="M${x + width * 0.12} ${ground}V${top + height * 0.42}L${x + width * 0.5} ${top + height * 0.2}L${x + width * 0.88} ${top + height * 0.32}V${ground}" fill="none" />`;
      content += `<line class="axis-line" x1="${x + width * 0.16}" y1="${top + height * 0.62}" x2="${x + width * 0.86}" y2="${top + height * 0.62}" />`;
    } else {
      content += `<path class="${inner ? "interior-fill" : "primary-fill"}" d="M${x} ${ground}V${top + height * 0.34}H${x + width * 0.16}V${top + height * 0.2}H${x + width * 0.84}V${top + height * 0.34}H${x + width}V${ground}Z" />`;
      content += `<path class="secondary-line" d="M${x + width * 0.18} ${ground}V${top + height * 0.36}H${x + width * 0.82}V${ground}" fill="none" />`;
      for (let i = 1; i < study.bayCount; i += 1) { const px = x + width * 0.18 + (width * 0.64 / study.bayCount) * i; content += `<line class="secondary-line" x1="${px}" y1="${top + height * 0.25}" x2="${px}" y2="${ground}" />`; }
    }
    content += dimensionLine(x, ground + 30, x + width, ground + 30, `${study.span} m`, 330, ground + 47);
    content += dimensionLine(x + width + 28, ground, x + width + 28, top, `${study.height} m`, x + width + 42, (ground + top) / 2);
    content += `<text class="small-label" x="330" y="${ground + 78}" text-anchor="middle">vault / roof profile · ${study.type === "central" ? "central radius" : `module ${number(study.module)} m`}</text>`;
    return content;
  }

  init();
})();
