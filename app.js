(function () {
  "use strict";

  const rawStudies = window.CHURCH_GEOMETRY;
  const studies = Array.isArray(rawStudies) ? rawStudies : [];
  const FALLBACK_DATA_STATUS_DEFINITIONS = {
    schematic: "Illustrative proportions; not a measured survey.",
    measured: "Source-supported dimensions."
  };
  function schemaStatusValues() {
    const schemaValues = window.CHURCH_GEOMETRY_SCHEMA && window.CHURCH_GEOMETRY_SCHEMA.statusValues;
    const values = Array.isArray(schemaValues)
      ? [...new Set(schemaValues.filter((status) => typeof status === "string" && status.trim()).map((status) => status.trim()))]
      : [];
    return values.length ? values : Object.keys(FALLBACK_DATA_STATUS_DEFINITIONS);
  }
  const allowedStatusValues = new Set(schemaStatusValues());
  const requiredStudyTextFields = ["id", "index", "name", "shortName", "typology", "place", "era", "emphasis", "type", "churchName", "status", "source", "sourceNote", "envelope", "axis", "surfaceNote", "exteriorNote", "interiorNote"];
  const requiredStudyNumericFields = ["length", "span", "height", "bayCount", "module", "radius", "symmetry"];
  const nonNegativeStudyNumericFields = new Set(["symmetry"]);
  const isRenderableStudy = (study) => {
    if (!study || typeof study !== "object") return false;
    if (requiredStudyTextFields.some((field) => typeof study[field] !== "string" || !study[field].trim())) return false;
    if (!allowedStatusValues.has(study.status)) return false;
    if (requiredStudyNumericFields.some((field) => !Number.isFinite(study[field]) || (nonNegativeStudyNumericFields.has(field) ? study[field] < 0 : study[field] <= 0))) return false;
    if (!Number.isInteger(study.bayCount) || study.symmetry > 1) return false;
    if (study.floorAreaEstimate !== undefined && (!Number.isFinite(study.floorAreaEstimate) || study.floorAreaEstimate <= 0)) return false;
    if (study.volumeEstimate !== undefined && (!Number.isFinite(study.volumeEstimate) || study.volumeEstimate <= 0)) return false;
    if (study.volumeBasis !== undefined && (typeof study.volumeBasis !== "string" || !study.volumeBasis.trim())) return false;
    return Array.isArray(study.details)
      && study.details.length > 0
      && study.details.every((detail) => Array.isArray(detail) && detail.length === 2 && detail.every((value) => typeof value === "string" && value.trim()));
  };
  const hasDuplicateStudyKeys = studies.length !== new Set(studies.map((study) => study && study.id)).size
    || studies.length !== new Set(studies.map((study) => study && study.index)).size;
  const dataIssue = !Array.isArray(rawStudies)
    ? "missing"
    : studies.length === 0
      ? "empty"
      : studies.some((study) => !isRenderableStudy(study)) || hasDuplicateStudyKeys
        ? "invalid"
        : "";
  const state = {
    activeId: studies[0] ? studies[0].id : null,
    surface: "exterior",
    mode: "plan",
    layer: "all",
    zoom: 1,
    query: "",
    filter: "all",
    filterPlace: "all",
    filterEra: "all",
    filterAxis: "all",
    filterStatus: "all",
    sort: "index",
    page: "atlas",
    compareIds: []
  };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const MIN_ZOOM = 0.7;
  const MAX_ZOOM = 1.6;
  const SYNC_ACTION_COOLDOWN_MS = 400;
  const zoomPercent = (zoom) => `${Math.round((zoom ?? state.zoom) * 100)}%`;
  const zoomDeltaForKey = (key) => key === "+" ? 0.15 : key === "-" ? -0.15 : 0;
  const parseZoom = (value) => {
    if (value === undefined || value === "") return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < MIN_ZOOM || parsed > MAX_ZOOM) return null;
    return Number(parsed.toFixed(2));
  };
  const activeStudy = () => studies.find((study) => study.id === state.activeId) || studies[0];
  const studyStatus = (study) => study.status || "schematic";
  const studyDataLabel = (study) => studyStatus(study);
  const statusDisplayName = (status) => {
    const words = String(status ?? "")
      .trim()
      .split(/[\s_-]+/)
      .filter(Boolean);
    return words.length
      ? words.map((word) => word[0].toUpperCase() + word.slice(1)).join(" ")
      : "Unknown";
  };
  const studyStatusLabel = (study) => statusDisplayName(studyStatus(study));
  const studyStatusDescription = (study) => dataStatusDefinitions()[studyStatus(study)] || "Data status is not documented.";
  const studySource = (study) => study.source || "Unattributed proportional model";
  const studySourceNote = (study) => study.sourceNote || "provenance not supplied";
  const studyShortName = (study) => study.shortName || study.name;
  function axisDisplayLabel(value) {
    const axis = String(value ?? "").trim();
    return /axis$/i.test(axis) ? axis : `${axis} axis`;
  }
  const studyAxisLabel = (study) => axisDisplayLabel(study && study.axis);
  const studySurfaceReading = (study) => state.surface === "interior"
    ? study.interiorNote || study.surfaceNote || study.exteriorNote
    : study.exteriorNote || study.surfaceNote || study.interiorNote;
  const number = (value, digits = 1) => Number(value).toFixed(digits);
  const positiveEstimate = (value) => Number.isFinite(value) && value > 0 ? value : null;
  const GEOMETRY_SCHEMA_URL = "data/geometry.schema.json";
  const publishedGeometrySchemaUrl = () => {
    if (typeof document === "undefined" || typeof document.baseURI !== "string" || !document.baseURI || typeof URL !== "function") return GEOMETRY_SCHEMA_URL;
    try {
      return new URL(GEOMETRY_SCHEMA_URL, document.baseURI).href;
    } catch (error) {
      return GEOMETRY_SCHEMA_URL;
    }
  };
  const geometrySchema = () => window.CHURCH_GEOMETRY_SCHEMA || { version: "1.1", units: "meters", unitSymbol: "m" };
  const collectionProvenanceNote = () => {
    const note = geometrySchema().note;
    return typeof note === "string" && note.trim()
      ? note.trim()
      : "The current collection is a schematic proportional study, not a measured survey or a claim about every church.";
  };
  const geometryUnitName = () => geometrySchema().units || "units";
  const geometryUnitSymbol = () => geometrySchema().unitSymbol || "m";
  const linearMeasure = (value, digits = 1) => `${number(value, digits)} ${geometryUnitSymbol()}`;
  const squareMeasure = (value, digits = 0) => `${number(value, digits)} ${geometryUnitSymbol()}²`;
  const cubicMeasure = (value) => `${Number(value).toLocaleString()} ${geometryUnitSymbol()}³`;
  const rawMeasure = (value) => `${value} ${geometryUnitSymbol()}`;
  function catalogStudyAriaLabel(study, isActive) {
    const stateLabel = isActive ? "Selected study" : "Open study";
    const matchContext = searchMatchContext(study);
    const status = studyStatus(study);
    const statusLabel = statusDisplayName(status);
    return `${stateLabel}: ${study.name}; ${study.typology}, ${study.place}, ${study.era}; ${number(study.length)} ${geometryUnitName()} long, span ${number(study.span)} ${geometryUnitName()}, height ${number(study.height)} ${geometryUnitName()}; primary radius ${number(study.radius)} ${geometryUnitName()}; ${studyAxisLabel(study)}; ${study.emphasis}; Data status: ${statusLabel} (${status}); ${studyStatusDescription(study)}; Source: ${studySource(study)}; ${studySourceNote(study)}${matchContext ? `; ${matchContext}` : ""}`;
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
  const layerDescriptions = {
    all: "Complete drawing with every visible relationship.",
    envelope: "Outer walls and enclosing geometric figure.",
    rhythm: "Repeated bays, frames, and module marks.",
    axis: "Directional lines and central geometric guides.",
    measure: "Schematic measures and construction references."
  };
  const validStatuses = new Set(["all", ...schemaStatusValues()]);
  const validSorts = new Set(["index", "length", "height", "span", "ratio", "symmetry", "name"]);
  const catalogParamKeys = ["q", "typology", "place", "era", "axis", "status", "sort", "compare"];
  let shareResetTimer;
  let compareShareResetTimer;
  let catalogShareResetTimer;
  let citationResetTimer;
  let catalogCitationResetTimer;
  let comparisonCitationResetTimer;
  let downloadRecoveryFocusTarget = "";
  let lastCatalogStatus = "";
  let lastCatalogStatusFilter = null;
  let lastRouteSignature = "";
  const actionFeedbackTimers = new Map();
  const catalogFilterSpecs = [
    {
      stateKey: "filter",
      selector: "#filterSelect",
      allLabel: "All typologies",
      values: () => [...new Set(studies.map((study) => study.typology))],
      value: (study) => study.typology
    },
    {
      stateKey: "filterPlace",
      selector: "#filterPlace",
      allLabel: "All locations",
      values: () => [...new Set(studies.map((study) => study.place))],
      value: (study) => study.place
    },
    {
      stateKey: "filterEra",
      selector: "#filterEra",
      allLabel: "All eras",
      values: () => [...new Set(studies.map((study) => study.era))],
      value: (study) => study.era
    },
    {
      stateKey: "filterAxis",
      selector: "#filterAxis",
      allLabel: "All axes",
      values: () => [...new Set(studies.map((study) => study.axis))],
      value: (study) => study.axis,
      display: axisDisplayLabel
    },
    {
      stateKey: "filterStatus",
      selector: "#filterStatus",
      allLabel: "All statuses",
      values: schemaStatusValues,
      value: (study) => studyStatus(study),
      display: statusDisplayName
    }
  ];
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[character]));
  const escapedLinearMeasure = (value, digits = 1) => escapeHtml(linearMeasure(value, digits));
  const layerDisplayName = (layer) => layerDisplayNames[layer] || layer;
  const layerFocusLabel = () => state.layer === "all" ? "all geometry" : `${layerDisplayName(state.layer)} focus`;
  const drawingStateLabel = () => {
    const surface = state.surface === "interior" ? "Inside" : "Outside";
    const mode = state.mode[0].toUpperCase() + state.mode.slice(1);
    return `${surface} · ${mode} · ${layerFocusLabel()} · ${zoomPercent()} zoom`;
  };

  function updateDocumentTitle(page = state.page) {
    if (page === "atlas" && activeStudy()) {
      const route = parseRoute();
      const hasCatalogScope = Boolean(
        state.query
        || state.filter !== "all"
        || state.filterPlace !== "all"
        || state.filterEra !== "all"
        || state.filterAxis !== "all"
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
    if (page === "compare" && state.compareIds.length === 1) {
      document.title = `Compare · 1 selected · Sacred Geometry Atlas`;
      return;
    }
    if (page === "method") {
      const route = parseRoute();
      const contextStudy = route.contextStudyId ? studies.find((study) => study.id === route.contextStudyId) : null;
      document.title = contextStudy
        ? `Method · ${studyShortName(contextStudy)} · Sacred Geometry Atlas`
        : "Method · Sacred Geometry Atlas";
      return;
    }
    document.title = page[0].toUpperCase() + page.slice(1) + " · Sacred Geometry Atlas";
  }

  function init() {
    if (dataIssue) {
      document.body.classList.remove("no-js");
      document.body.classList.add("data-error-state");
      document.title = "Atlas unavailable · Sacred Geometry Atlas";
      const dataError = $("#dataError");
      if (dataError) {
        const heading = $("#dataErrorHeading");
        const description = $("#dataErrorDescription");
        const recoveryCopy = {
          missing: {
            heading: "Geometry data could not be loaded.",
            description: "The interactive collection is temporarily missing its local dataset. Reload the atlas, or open the static JSON artifact while the connection is restored."
          },
          empty: {
            heading: "The atlas collection is currently empty.",
            description: "No study records are available in the current dataset. Open the static JSON artifact or return after the collection has been populated."
          },
          invalid: {
            heading: "The atlas data is incomplete.",
            description: "The local dataset is present but one or more records cannot be rendered safely. Reload the atlas, or open the static JSON artifact while the connection is restored."
          }
        }[dataIssue];
        if (heading) heading.textContent = recoveryCopy.heading;
        if (description) description.textContent = recoveryCopy.description;
        dataError.hidden = false;
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
    renderAtlasSchemaNote();
    renderHeroProvenance();
    renderMethodProvenance();
  }

  function renderHeroProvenance() {
    const note = $("#heroDataNote");
    const summaryTarget = $("#heroDataNoteText");
    const definitionTarget = $("#heroDataNoteDefinition");
    if (!note || !summaryTarget || !definitionTarget) return;
    const definitions = dataStatusDefinitions();
    const statuses = schemaStatusValues();
    const counts = studyStatusCounts();
    const summary = statuses.map((status) => `${String(counts[status] || 0).padStart(2, "0")} ${statusDisplayName(status).toLowerCase()}`).join(" · ") || "No records";
    const activeStatuses = statuses.filter((status) => counts[status] > 0);
    const definition = activeStatuses.map((status) => `${statusDisplayName(status)} = ${definitions[status] || "Data status is not documented."}`).join(" ") || "No status definitions are available.";
    const noteStatus = activeStatuses.length === 1 ? activeStatuses[0] : activeStatuses.length > 1 ? "mixed" : "empty";
    summaryTarget.textContent = summary;
    definitionTarget.textContent = definition;
    note.setAttribute("data-status", noteStatus);
    note.setAttribute("aria-label", `Dataset status: ${summary}. ${definition}`);
  }

  function atlasSchemaNoteText(records = studies) {
    const schema = window.CHURCH_GEOMETRY_SCHEMA || { version: "1.1", units: "meters" };
    const counts = studyStatusCounts(records);
    const activeStatuses = schemaStatusValues().filter((status) => counts[status] > 0);
    const provenance = activeStatuses.length > 1
      ? activeStatuses.length === 2 && counts.schematic && counts.measured
        ? "Mixed provenance"
        : "Mixed data status"
      : activeStatuses[0] === "measured"
        ? "Source-supported dimensions"
        : activeStatuses[0] === "schematic"
          ? "Illustrative proportions"
          : activeStatuses[0]
            ? `${statusDisplayName(activeStatuses[0])} status`
            : "No status records";
    const units = schema.units === "meters" ? "metric units" : `${schema.units || "units"} units`;
    return `${provenance} · ${units} · v${schema.version || "1.1"}`;
  }

  function renderAtlasSchemaNote() {
    const target = $("#atlasSchemaNote");
    if (target) target.textContent = atlasSchemaNoteText();
  }

  function methodProvenanceText(records = studies) {
    const counts = studyStatusCounts(records);
    const activeStatuses = schemaStatusValues().filter((status) => counts[status] > 0);
    if (activeStatuses.length === 2 && counts.schematic && counts.measured) return "The collection mixes schematic proportional studies and source-supported dimensions. Use each record's status and provenance note to distinguish them.";
    if (activeStatuses.length === 1 && counts.measured) return "The current collection uses source-supported dimensions. Each record carries a status and provenance note so its evidence can be identified.";
    if (activeStatuses.length === 1 && counts.schematic) return `${collectionProvenanceNote()} Each record carries a status and provenance note.`;
    const labels = activeStatuses.map((status) => `${statusDisplayName(status).toLowerCase()} records`).join(" and ");
    return `The current collection uses ${labels || "records without a documented status"}. Each record carries a status and provenance note so its evidence can be identified.`;
  }

  function methodReadingsIntroText(records = studies) {
    const counts = studyStatusCounts(records);
    const activeStatuses = schemaStatusValues().filter((status) => counts[status] > 0);
    if (activeStatuses.length === 1 && activeStatuses[0] === "schematic") return "These readings describe the proportional model; they are analytical aids, not measured survey results.";
    if (activeStatuses.length === 1 && activeStatuses[0] === "measured") return "These readings use records labeled measured; each record's provenance note identifies its source context.";
    if (activeStatuses.length === 1) return `These readings use records labeled ${statusDisplayName(activeStatuses[0])}; use the status definition and provenance note to interpret their evidence level.`;
    if (activeStatuses.length > 1) return "These readings combine multiple data-status categories; use each record's status definition and provenance note to distinguish analytical aids from source-supported values.";
    return "These readings are analytical aids; use each record's data status and provenance note to interpret their evidence level.";
  }

  function methodStatusKeyIntroText(records = studies) {
    const statusCount = schemaStatusValues().length;
    const recordLabel = records.length === 1 ? "record" : "records";
    const statusLabel = statusCount === 1 ? "status" : "statuses";
    return `The published schema defines ${statusCount} data ${statusLabel} for ${records.length} ${recordLabel}; each record carries one label and a provenance note.`;
  }

  function renderMethodStatusKey(records = studies) {
    const intro = $("#methodStatusKeyIntro");
    const list = $("#methodStatusKeyList");
    const statuses = schemaStatusValues();
    const counts = studyStatusCounts(records);
    const definitions = dataStatusDefinitions();
    if (intro) intro.textContent = methodStatusKeyIntroText(records);
    if (!list) return;
    list.innerHTML = statuses.length
      ? statuses.map((status) => {
          const count = counts[status] || 0;
          return `<div class="method-status-key-item" role="listitem"><div class="method-status-key-meta"><span class="method-status-key-label" data-status="${escapeHtml(status)}">${escapeHtml(statusDisplayName(status))}</span><code>${escapeHtml(status)}</code><span class="method-status-key-count">${count} ${count === 1 ? "record" : "records"}</span></div><p>${escapeHtml(definitions[status] || "Data status is not documented.")}</p></div>`;
        }).join("")
      : `<p class="method-status-key-empty">No data-status definitions are published for this collection.</p>`;
  }

  function renderMethodProvenance() {
    const target = $("#methodProvenanceNote");
    if (target) target.textContent = methodProvenanceText();
    const intro = $("#methodReadingsIntro");
    if (intro) intro.textContent = methodReadingsIntroText();
    renderMethodStatusKey();
  }

  function studyStatusCounts(records = studies) {
    const counts = schemaStatusValues().reduce((statusCounts, status) => {
      statusCounts[status] = 0;
      return statusCounts;
    }, {});
    return records.reduce((statusCounts, study) => {
      const status = studyStatus(study);
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      return statusCounts;
    }, counts);
  }

  function studyStatusSummary(records = studies) {
    const counts = studyStatusCounts(records);
    return schemaStatusValues().map((status) => `${counts[status] || 0} ${statusDisplayName(status).toLowerCase()}`).join(" · ");
  }

  function exportCompletionScope(records, scope) {
    const count = records.length;
    return `Scope: ${scope}; ${count} ${count === 1 ? "study" : "studies"}`;
  }

  function readableScopeLabel(scope) {
    return scope === "full collection" ? "the full collection" : scope;
  }

  function dataStatusDefinitions() {
    const schemaDefinitions = window.CHURCH_GEOMETRY_SCHEMA && window.CHURCH_GEOMETRY_SCHEMA.statusDefinitions;
    return schemaStatusValues().reduce((definitions, status) => {
      const value = schemaDefinitions && schemaDefinitions[status];
      definitions[status] = typeof value === "string" && value.trim()
        ? value
        : FALLBACK_DATA_STATUS_DEFINITIONS[status] || "Data status is not documented.";
      return definitions;
    }, {});
  }

  function statusGuidanceText(records = studies, scope = "the full collection") {
    const definitions = dataStatusDefinitions();
    const counts = studyStatusCounts(records);
    const statuses = [...new Set([...schemaStatusValues(), ...Object.keys(counts)])];
    const definitionsText = statuses.map((status) => `${statusDisplayName(status)} = ${definitions[status] || "Data status is not documented."}`).join(" ");
    const countsText = statuses.map((status) => `${counts[status] || 0} ${statusDisplayName(status).toLowerCase()}`).join(" · ");
    return `${definitionsText} Counts for ${scope}: ${countsText}.`;
  }

  function catalogStatusGuidanceText(records = visibleStudies()) {
    return statusGuidanceText(records, catalogScopeLabel());
  }

  function catalogStatusFilterAnnouncement() {
    if (state.filterStatus === "all") return "Data status filter cleared.";
    const status = statusDisplayName(state.filterStatus);
    const definition = dataStatusDefinitions()[state.filterStatus] || "Data status is not documented.";
    return `Data status filter: ${status}. ${definition}`;
  }

  function exportProvenance(records, scope) {
    return {
      scope,
      recordCount: records.length,
      statusCounts: studyStatusCounts(records),
      statusDefinitions: dataStatusDefinitions()
    };
  }

  function catalogFilterScopeRecords(excludedKey = "") {
    const terms = queryTerms(state.query);
    return studies.filter((study) => {
      const haystack = studySearchText(study);
      if (terms.length && !terms.every((term) => haystack.includes(term))) return false;
      if (excludedKey !== "filter" && state.filter !== "all" && study.typology !== state.filter) return false;
      if (excludedKey !== "filterPlace" && state.filterPlace !== "all" && study.place !== state.filterPlace) return false;
      if (excludedKey !== "filterEra" && state.filterEra !== "all" && study.era !== state.filterEra) return false;
      if (excludedKey !== "filterAxis" && state.filterAxis !== "all" && study.axis !== state.filterAxis) return false;
      if (excludedKey !== "filterStatus" && state.filterStatus !== "all" && studyStatus(study) !== state.filterStatus) return false;
      return true;
    });
  }

  const routeSafeStudyIdPattern = /^[A-Za-z0-9._~-]+$/;
  const decodeRouteSegment = (segment) => {
    try {
      return decodeURIComponent(segment);
    } catch (error) {
      return segment;
    }
  };
  const comparisonQueryId = (id) => {
    const value = String(id ?? "");
    return routeSafeStudyIdPattern.test(value) ? value : encodeURIComponent(value);
  };

  function rawQueryParam(name) {
    const href = window.location && typeof window.location.href === "string" ? window.location.href : "";
    let search = "";
    try {
      search = new URL(href).search;
    } catch (error) {
      search = window.location && typeof window.location.search === "string" ? window.location.search : "";
    }
    const entries = search.replace(/^\?/, "").split("&");
    for (const entry of entries) {
      if (!entry) continue;
      const separator = entry.indexOf("=");
      const rawKey = separator === -1 ? entry : entry.slice(0, separator);
      if (decodeRouteSegment(rawKey.replace(/\+/g, " ")) !== name) continue;
      return separator === -1 ? "" : entry.slice(separator + 1);
    }
    return null;
  }

  function comparisonRouteId(value) {
    let candidate = String(value ?? "").trim().replace(/\+/g, " ");
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const decoded = decodeRouteSegment(candidate);
      if (studies.some((study) => study.id === decoded)) return decoded;
      if (decoded === candidate) break;
      candidate = decoded;
    }
    return candidate;
  }

  function knownComparisonIds(value) {
    const text = String(value ?? "");
    const memo = new Map();
    const match = (offset) => {
      if (offset === text.length) return [];
      if (memo.has(offset)) return memo.get(offset);
      const candidates = studies
        .filter((study) => text.startsWith(study.id, offset))
        .sort((a, b) => b.id.length - a.id.length);
      for (const study of candidates) {
        const nextOffset = offset + study.id.length;
        if (nextOffset < text.length && text[nextOffset] !== ",") continue;
        const remainder = nextOffset === text.length ? [] : match(nextOffset + 1);
        if (remainder) {
          const result = [study.id, ...remainder];
          memo.set(offset, result);
          return result;
        }
      }
      memo.set(offset, null);
      return null;
    };
    return match(0) || [];
  }

  function queryComparisonIds() {
    const rawValue = rawQueryParam("compare");
    if (!rawValue) return [];
    const directIds = rawValue.split(",").map(comparisonRouteId);
    if (directIds.length && directIds.every((id) => studies.some((study) => study.id === id))) {
      return [...new Set(directIds)];
    }
    let candidate = rawValue.replace(/\+/g, " ");
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const matchedIds = knownComparisonIds(candidate);
      if (matchedIds.length) return [...new Set(matchedIds)];
      const decoded = decodeRouteSegment(candidate);
      if (decoded === candidate) break;
      candidate = decoded;
    }
    return [];
  }

  function parseRoute() {
    const rawSegments = window.location.hash.replace(/^#/, "").replace(/^\/+/, "").split("/");
    const segments = rawSegments.map(decodeRouteSegment);
    const [requestedPage = "atlas", requestedStudy, requestedMode, requestedSurface, requestedLayer, requestedZoom] = segments;
    const rawRequestedStudy = rawSegments[1] || "";
    const page = validPages.has(requestedPage) ? requestedPage : pageAliases.get(requestedPage) || "atlas";
    const studyId = page === "atlas" && studies.some((study) => study.id === requestedStudy)
      ? requestedStudy
      : null;
    const contextStudyId = ["atlas", "method"].includes(page) && studies.some((study) => study.id === requestedStudy)
      ? requestedStudy
      : null;
    const requestedCompareIds = rawRequestedStudy ? rawRequestedStudy.split(",").map(comparisonRouteId) : [];
    const hashCompareIds = [...new Set(requestedCompareIds.filter((id) => studies.some((study) => study.id === id)))];
    const queryCompareIds = queryComparisonIds();
    const compareIds = page === "compare"
      ? (hashCompareIds.length ? hashCompareIds : queryCompareIds)
      : [];
    return {
      page,
      requestedPage,
      requestedStudy,
      studyId,
      contextStudyId,
      mode: validModes.has(requestedMode) ? requestedMode : null,
      surface: validSurfaces.has(requestedSurface) ? requestedSurface : null,
      layer: validLayers.has(requestedLayer) ? requestedLayer : null,
      zoom: page === "atlas" && studyId ? parseZoom(requestedZoom) : null,
      compareIds: compareIds.length ? compareIds : []
    };
  }

  function syncCatalogControls() {
    $("#searchInput").value = state.query;
    $("#filterSelect").value = state.filter;
    $("#filterPlace").value = state.filterPlace;
    $("#filterEra").value = state.filterEra;
    $("#filterAxis").value = state.filterAxis;
    $("#filterStatus").value = state.filterStatus;
    $("#sortSelect").value = state.sort;
  }

  function syncCatalogFromUrl() {
    const params = new URL(window.location.href).searchParams;
    const typologies = new Set(studies.map((study) => study.typology));
    const places = new Set(studies.map((study) => study.place));
    const eras = new Set(studies.map((study) => study.era));
    const axes = new Set(studies.map((study) => study.axis));
    const requestedQuery = params.get("q");
    const requestedTypology = params.get("typology");
    const requestedPlace = params.get("place");
    const requestedEra = params.get("era");
    const requestedAxis = params.get("axis");
    const requestedStatus = params.get("status");
    const requestedSort = params.get("sort");
    state.query = normalizeCatalogQuery(requestedQuery);
    state.filter = typologies.has(requestedTypology) ? requestedTypology : "all";
    state.filterPlace = places.has(requestedPlace) ? requestedPlace : "all";
    state.filterEra = eras.has(requestedEra) ? requestedEra : "all";
    state.filterAxis = axes.has(requestedAxis) ? requestedAxis : "all";
    state.filterStatus = validStatuses.has(requestedStatus) ? requestedStatus : "all";
    state.sort = validSorts.has(requestedSort) ? requestedSort : "index";
    state.compareIds = queryComparisonIds();
    syncCatalogControls();
  }

  function navigationUrl(nextHash) {
    const url = new URL(window.location.href);
    url.hash = nextHash;
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function currentRouteSignature() {
    const url = new URL(window.location.href);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function routePath(url) {
    return `${url.pathname}${url.search}${url.hash}`;
  }

  const shouldPreserveComparisonQuery = () => state.page !== "compare" || state.compareIds.length < 2;

  function catalogRouteValues(includeCompare = shouldPreserveComparisonQuery()) {
    return {
      q: state.query,
      typology: state.filter === "all" ? "" : state.filter,
      place: state.filterPlace === "all" ? "" : state.filterPlace,
      era: state.filterEra === "all" ? "" : state.filterEra,
      axis: state.filterAxis === "all" ? "" : state.filterAxis,
      status: state.filterStatus === "all" ? "" : state.filterStatus,
      sort: state.sort === "index" ? "" : state.sort,
      compare: includeCompare && state.compareIds.length ? state.compareIds.map(comparisonQueryId).join(",") : ""
    };
  }

  function applyCatalogRouteState(url, includeCompare = shouldPreserveComparisonQuery()) {
    const values = catalogRouteValues(includeCompare);
    catalogParamKeys.filter((key) => key !== "compare").forEach((key) => {
      if (values[key]) url.searchParams.set(key, values[key]);
      else url.searchParams.delete(key);
    });
    url.searchParams.delete("compare");
    if (values.compare) {
      url.search = `${url.search || "?"}${url.search ? "&" : ""}compare=${values.compare}`;
    }
    return url;
  }

  function updateCatalogRoute(historyMethod = "replaceState") {
    const current = new URL(window.location.href);
    const url = applyCatalogRouteState(new URL(current.href));
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl = `${current.pathname}${current.search}${current.hash}`;
    if (nextUrl === currentUrl) {
      lastRouteSignature = currentUrl;
      return;
    }
    window.history[historyMethod]({
      page: state.page,
      studyId: state.page === "atlas" ? state.activeId : null,
      compareIds: state.page === "compare" ? [...state.compareIds] : []
    }, "", nextUrl);
    lastRouteSignature = nextUrl;
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
    if (page === "method" && includeStudy && studyId) {
      return `#method/${encodeURIComponent(studyId)}`;
    }
    return `#${page}`;
  }

  function atlasStudyNavigationUrl(studyId) {
    const url = applyCatalogRouteState(new URL(window.location.href), true);
    url.hash = routeHash("atlas", true, studyId);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function catalogViewRouteUrl() {
    const url = applyCatalogRouteState(new URL(window.location.href), true);
    url.hash = routeHash("atlas", false);
    return url;
  }

  function studyRouteUrl(studyId = state.activeId) {
    const url = clearCatalogParams(new URL(window.location.href));
    url.hash = routeHash("atlas", true, studyId);
    return url;
  }

  function studyRoutePath(studyId = state.activeId) {
    return routePath(studyRouteUrl(studyId));
  }

  function methodNavigationUrl() {
    const url = applyCatalogRouteState(new URL(window.location.href), true);
    const study = activeStudy();
    url.hash = routeHash("method", Boolean(study), study ? study.id : null);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function comparisonNavigationUrl() {
    const url = applyCatalogRouteState(new URL(window.location.href), state.compareIds.length < 2);
    url.hash = routeHash("compare", false);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function viewNavigationUrl(page) {
    if (page === "atlas") {
      const url = catalogViewRouteUrl();
      return `${url.pathname}${url.search}${url.hash}`;
    }
    if (page === "compare") return comparisonNavigationUrl();
    return methodNavigationUrl();
  }

  function updateViewNavigationLinks() {
    $$('[data-view]').forEach((link) => {
      link.setAttribute("href", viewNavigationUrl(link.dataset.view));
    });
    const methodLink = $("[data-method-link]");
    if (methodLink) methodLink.setAttribute("href", methodNavigationUrl());
  }

  function updateRoute(page, includeStudy = page === "atlas") {
    const nextHash = routeHash(page, includeStudy);
    const nextUrl = navigationUrl(nextHash);
    if (window.location.hash === nextHash) {
      lastRouteSignature = currentRouteSignature();
      return;
    }
    window.history.pushState({ page, studyId: includeStudy ? state.activeId : null, compareIds: page === "compare" ? [...state.compareIds] : [] }, "", nextUrl);
    lastRouteSignature = nextUrl;
  }

  function replaceRoute(page, includeStudy = page === "atlas") {
    const nextHash = routeHash(page, includeStudy);
    const nextUrl = navigationUrl(nextHash);
    if (window.location.hash === nextHash) {
      lastRouteSignature = currentRouteSignature();
      return;
    }
    window.history.replaceState({ page, studyId: includeStudy ? state.activeId : null, compareIds: page === "compare" ? [...state.compareIds] : [] }, "", nextUrl);
    lastRouteSignature = nextUrl;
  }

  function syncFromHash() {
    const revealPending = document.body.classList.contains("no-js");
    if (!revealPending && currentRouteSignature() === lastRouteSignature) return;
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
    if (route.page === "method" && route.contextStudyId) state.activeId = route.contextStudyId;
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
        if (!route.studyId) state.activeId = visible[0].id;
      } else if (route.studyId && window.location.hash !== routeHash("atlas", true)) {
        normalizedStudyRoute = true;
      } else if (!route.requestedStudy && window.location.hash.length > 0 && window.location.hash !== routeHash("atlas", false)) {
        normalizedStudyRoute = true;
        includeStudyInNormalizedRoute = false;
      }
    } else if (route.page !== "compare") {
      const canonicalPageHash = route.page === "method" && route.contextStudyId
        ? routeHash("method", true, route.contextStudyId)
        : routeHash(route.page, false);
      normalizedPageRoute = window.location.hash.length > 0 && window.location.hash !== canonicalPageHash;
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
      replaceRoute(route.page, route.page === "method" && Boolean(route.contextStudyId));
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
    lastRouteSignature = currentRouteSignature();
  }

  function populateFilter() {
    renderCatalogFilterOptions();
    const statusGuidance = statusGuidanceText(studies, "the full collection");
    ["#statusHelp", "#comparisonStatusHelp"].forEach((selector) => {
      const target = $(selector);
      if (target) target.textContent = statusGuidance;
    });
  }

  function replaceSelectOptions(select, options) {
    if (!select || typeof select.appendChild !== "function") return;
    if (typeof select.replaceChildren === "function") select.replaceChildren();
    else if (Array.isArray(select.options)) select.options.length = 0;
    else if (select.options && typeof select.remove === "function") {
      while (select.options.length) select.remove(0);
    }
    options.forEach(({ value, label }) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });
  }

  function renderCatalogFilterOptions() {
    catalogFilterSpecs.forEach(({ stateKey, selector, allLabel, values, value, display }) => {
      const select = $(selector);
      if (!select) return;
      const availableValues = values();
      const currentValue = availableValues.includes(state[stateKey]) || state[stateKey] === "all"
        ? state[stateKey]
        : "all";
      state[stateKey] = currentValue;
      const scope = catalogFilterScopeRecords(stateKey);
      const options = [
        { value: "all", label: `${allLabel} · ${scope.length}` },
        ...availableValues.map((optionValue) => ({
          value: optionValue,
          label: `${display ? display(optionValue) : optionValue} · ${scope.filter((study) => value(study) === optionValue).length}`
        }))
      ];
      replaceSelectOptions(select, options);
      select.value = state[stateKey];
    });
  }

  function bindEvents() {
    $(".brand").addEventListener("click", (event) => {
      if ((event.button !== undefined && event.button !== 0) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      showPage("atlas", { routeStudy: false });
      renderAll();
    });
    $("#searchInput").addEventListener("input", (event) => {
      state.query = normalizeCatalogQuery(event.target.value);
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
    $("#filterEra").addEventListener("change", (event) => {
      state.filterEra = event.target.value;
      pushCatalogRoute();
      refreshCatalog();
    });
    $("#filterAxis").addEventListener("change", (event) => {
      state.filterAxis = event.target.value;
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
    $("#showActiveStudy").addEventListener("click", () => {
      const studyId = state.activeId;
      clearCatalogFilters({ resetSort: true });
      focusStudyCard(studyId, { preventScroll: false });
    });
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
      selectStudy(card.dataset.studyId, { focus: event.detail === 0, restoreCardFocus: true, reveal: event.detail !== 0 });
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
    $$("[data-view]").forEach((link) => link.addEventListener("click", handleViewNavigation));
    const methodLink = $("[data-method-link]");
    if (methodLink) methodLink.addEventListener("click", (event) => {
      if ((event.button !== undefined && event.button !== 0) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      showPage("method", { routeStudy: true });
    });
    $("#clearCompare").addEventListener("click", () => clearComparisonSelection({ focus: true }));
    $("#selectVisibleCompare").addEventListener("click", () => addVisibleToComparison({ focus: true }));
    $("#openCompare").addEventListener("click", () => showPage("compare"));
    const editCompare = $("#editCompare");
    if (editCompare) editCompare.addEventListener("click", (event) => {
      if ((event.button !== undefined && event.button !== 0) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      showPage("atlas");
    });
    const methodBackToStudy = $("#methodBackToStudy");
    if (methodBackToStudy) methodBackToStudy.addEventListener("click", (event) => {
      if ((event.button !== undefined && event.button !== 0) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const study = activeStudy();
      const visible = visibleStudies();
      const canOpenStudy = Boolean(study && visible.some((candidate) => candidate.id === study.id));
      showPage("atlas", { routeStudy: canOpenStudy });
      if (!canOpenStudy) refreshCatalog();
      if (canOpenStudy) {
        const heading = $("#activeName");
        if (heading && typeof heading.focus === "function") heading.focus({ preventScroll: true });
      }
    });
    $("#clearCompareView").addEventListener("click", () => clearComparisonSelection({ focus: true }));
    $("#compareSelection").addEventListener("click", (event) => {
      const remove = event.target.closest("[data-remove-compare-id]");
      if (remove) removeComparisonStudy(remove.dataset.removeCompareId);
    });
    $("#geometryCompare").addEventListener("click", (event) => {
      const studyCard = event.target.closest("[data-compare-study]");
      if (!studyCard) return;
      if (studyCard.tagName.toLowerCase() === "a") {
        if ((event.button !== undefined && event.button !== 0) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
      }
      selectStudy(studyCard.dataset.compareStudy, { focus: event.detail === 0, restoreCardFocus: true, reveal: event.detail !== 0 });
    });
    $("#downloadData").addEventListener("click", downloadData);
    $("#downloadStudy").addEventListener("click", downloadStudy);
    $("#downloadCatalogView").addEventListener("click", downloadCatalogView);
    $("#downloadCatalogCsv").addEventListener("click", downloadCatalogCsv);
    $("#downloadComparison").addEventListener("click", downloadComparisonCsv);
    $("#downloadComparisonJson").addEventListener("click", downloadComparisonJson);
    $("#downloadDrawing").addEventListener("click", downloadDrawing);
    $("#printCatalog").addEventListener("click", printCatalog);
    $("#printComparison").addEventListener("click", printComparison);
    $("#dismissDownloadRecovery").addEventListener("click", dismissDownloadRecovery);
    $("#downloadRecovery").addEventListener("keydown", handleDownloadRecoveryKeydown);
    $("#shareStudy").addEventListener("click", shareStudy);
    $("#shareCatalog").addEventListener("click", shareCatalog);
    $("#copyCatalogCitation").addEventListener("click", copyCatalogCitation);
    $("#shareCompare").addEventListener("click", shareComparison);
    $("#copyCitation").addEventListener("click", copyCitation);
    $("#copyComparisonCitation").addEventListener("click", copyComparisonCitation);
    $("#copyCatalogRoute").addEventListener("click", copyCatalogRoute);
    $("#copyStudyRoute").addEventListener("click", copyStudyRoute);
    $("#copyComparisonRoute").addEventListener("click", copyComparisonRoute);
    $$('[data-dismiss-fallback]').forEach((button) => button.addEventListener("click", () => {
      const fallbackId = button.dataset && button.dataset.dismissFallback;
      const fallbackSelector = fallbackId ? `#${fallbackId}` : "";
      if (manualCopyFallbackControls[fallbackSelector]) dismissManualCopyFallback(fallbackSelector);
    }));
    $$(".manual-copy-fallback").forEach((fallback) => fallback.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !fallback.id) return;
      event.preventDefault();
      dismissManualCopyFallback(`#${fallback.id}`);
    }));
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
    if (comparisonTable) {
      comparisonTable.addEventListener("keydown", handleComparisonTableKey);
      comparisonTable.addEventListener("scroll", () => updateComparisonTableScrollCue(comparisonTable), { passive: true });
      comparisonTable.addEventListener("click", (event) => {
        const studyLink = event.target.closest("[data-table-study]");
        if (!studyLink) return;
        if ((event.button !== undefined && event.button !== 0) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        selectStudy(studyLink.dataset.tableStudy, { focus: event.detail === 0, restoreCardFocus: true, reveal: event.detail !== 0 });
      });
    }
    const comparisonTablePanel = $(".comparison-table-panel");
    if (comparisonTablePanel) comparisonTablePanel.addEventListener("toggle", () => updateComparisonTableScrollCue());
    window.addEventListener("resize", () => updateComparisonTableScrollCue());
    window.addEventListener("keydown", handleDisclosureKeydown);
    window.addEventListener("keydown", handleKeyboard);
  }

  function clearCatalogFilters({ resetSort = false, focus = false } = {}) {
    state.query = "";
    state.filter = "all";
    state.filterPlace = "all";
    state.filterEra = "all";
    state.filterAxis = "all";
    state.filterStatus = "all";
    $("#searchInput").value = "";
    $("#filterSelect").value = "all";
    $("#filterPlace").value = "all";
    $("#filterEra").value = "all";
    $("#filterAxis").value = "all";
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
    const { scroll = true, focus = false, restoreCardFocus = false, reveal = false } = options;
    if (!studies.some((study) => study.id === id)) return;
    state.activeId = id;
    const revealCompactStudy = reveal && scroll && isCompactAtlasViewport();
    showPage("atlas", { scroll: revealCompactStudy ? false : scroll });
    renderAll();
    announceStudy(activeStudy(), visibleStudies().length);
    if (focus) {
      const heading = $("#activeName");
      if (heading && typeof heading.focus === "function") heading.focus({ preventScroll: !scroll });
    } else if (restoreCardFocus) {
      if (revealCompactStudy) scrollActiveStudyIntoView();
      focusStudyTarget(id);
    }
  }

  function isCompactAtlasViewport() {
    if (typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(max-width: 800px)").matches;
  }

  function scrollActiveStudyIntoView() {
    const heading = $("#activeName");
    if (!heading || typeof heading.scrollIntoView !== "function") return false;
    const behavior = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    heading.scrollIntoView({ behavior, block: "start" });
    return true;
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
    const scope = catalogScopeLabel();
    const scopeLabel = `${text}; ${scope}.`;
    const statusFilterChanged = lastCatalogStatusFilter !== null && lastCatalogStatusFilter !== state.filterStatus;
    resultCount.textContent = text;
    resultCount.setAttribute("aria-label", scopeLabel);
    const liveStatus = $("#catalogLiveStatus");
    if (liveStatus) {
      const announcements = [];
      if (lastCatalogStatus && lastCatalogStatus !== scope) announcements.push(`Catalog updated: ${scope}.`);
      if (statusFilterChanged) announcements.push(catalogStatusFilterAnnouncement());
      liveStatus.textContent = announcements.join(" ");
    }
    lastCatalogStatus = scope;
    lastCatalogStatusFilter = state.filterStatus;
  }

  function renderActiveFilters() {
    const target = $("#activeFilters");
    if (!target) return;
    const filters = [];
    if (state.query) filters.push({ key: "query", label: `Search: “${state.query}”` });
    if (state.filter !== "all") filters.push({ key: "filter", label: `Typology: ${$("#filterSelect").selectedOptions[0].textContent}` });
    if (state.filterPlace !== "all") filters.push({ key: "place", label: `Location: ${$("#filterPlace").selectedOptions[0].textContent}` });
    if (state.filterEra !== "all") filters.push({ key: "era", label: `Era: ${$("#filterEra").selectedOptions[0].textContent}` });
    if (state.filterAxis !== "all") filters.push({ key: "axis", label: `Axis: ${$("#filterAxis").selectedOptions[0].textContent}` });
    if (state.filterStatus !== "all") filters.push({ key: "status", label: `Data status: ${$("#filterStatus").selectedOptions[0].textContent}` });
    if (state.sort !== "index") filters.push({ key: "sort", label: `Sort: ${$("#sortSelect").selectedOptions[0].textContent}` });
    const activeSettingsLabel = filters.length
      ? `${filters.length} active catalog ${filters.length === 1 ? "setting" : "settings"}`
      : "Active catalog settings";
    target.setAttribute("aria-label", activeSettingsLabel);
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
      era: "#filterEra",
      axis: "#filterAxis",
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

  function focusStudyCard(id, options = {}) {
    const { preventScroll = true } = options;
    const card = $$(`[data-study-id]`).find((button) => button.dataset.studyId === id);
    if (!card || typeof card.focus !== "function") return false;
    card.focus({ preventScroll });
    return true;
  }

  function focusStudyTarget(id) {
    if (focusStudyCard(id)) return "card";
    const emptyState = $("#visualEmptyState");
    const emptyHeading = $("#visualEmptyHeading");
    if (emptyState && !emptyState.hidden && emptyHeading && typeof emptyHeading.focus === "function") {
      emptyHeading.focus({ preventScroll: true });
      return "empty";
    }
    const heading = $("#activeName");
    if (heading && typeof heading.focus === "function") {
      heading.focus({ preventScroll: true });
      return "heading";
    }
    return "none";
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
    if (key === "era") {
      state.filterEra = "all";
      $("#filterEra").value = "all";
    }
    if (key === "axis") {
      state.filterAxis = "all";
      $("#filterAxis").value = "all";
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
    if (status && study) status.textContent = `Study ${study.index}, ${study.name} selected. Current drawing: ${drawingStateLabel()}. ${visibleCount} ${visibleCount === 1 ? "study" : "studies"} visible.`;
  }

  function announceDrawingState() {
    announceKeyboard(`${drawingStateLabel()} selected. ${layerDescriptions[state.layer] || "Geometry layer focus."}`);
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
    button.title = accessibleLabel;
  }

  const manualCopyFallbackControls = {
    "#shareFallback": "#shareStudy",
    "#citationFallback": "#copyCitation",
    "#catalogShareFallback": "#shareCatalog",
    "#catalogCitationFallback": "#copyCatalogCitation",
    "#compareShareFallback": "#shareCompare",
    "#comparisonCitationFallback": "#copyComparisonCitation",
    "#catalogRouteFallback": "#copyCatalogRoute",
    "#studyRouteFallback": "#copyStudyRoute",
    "#comparisonRouteFallback": "#copyComparisonRoute"
  };
  const manualCopyFallbackSelectors = Object.keys(manualCopyFallbackControls);

  function hasFocusWithin(element) {
    if (!element || !document.activeElement) return false;
    if (document.activeElement === element) return true;
    return typeof element.contains === "function" && element.contains(document.activeElement);
  }

  function restoreFocus(target) {
    if (!target || typeof target.focus !== "function") return;
    try {
      target.focus({ preventScroll: true });
    } catch (error) {
      // Focus restoration is best-effort; the visible recovery action remains available.
    }
  }

  function hideManualCopyFallbacks() {
    let focusTarget = null;
    manualCopyFallbackSelectors.forEach((selector) => {
      const fallback = $(selector);
      const trigger = $(manualCopyFallbackControls[selector]);
      if (!focusTarget && hasFocusWithin(fallback)) focusTarget = trigger;
      if (fallback) fallback.hidden = true;
      if (trigger && typeof trigger.setAttribute === "function") trigger.setAttribute("aria-expanded", "false");
    });
    restoreFocus(focusTarget);
  }

  function hideDownloadRecovery() {
    const recovery = $("#downloadRecovery");
    const focusTarget = hasFocusWithin(recovery) ? $(downloadRecoveryFocusTarget) : null;
    if (recovery) recovery.hidden = true;
    downloadRecoveryFocusTarget = "";
    restoreFocus(focusTarget);
    return Boolean(focusTarget);
  }

  function showDownloadRecovery(message, focusSelector) {
    const recovery = $("#downloadRecovery");
    const heading = $("#downloadRecoveryHeading");
    if (!recovery || !heading) return;
    heading.textContent = message;
    recovery.hidden = false;
    downloadRecoveryFocusTarget = focusSelector || "";
    restoreFocus(recovery);
  }

  function dismissDownloadRecovery() {
    const focusSelector = downloadRecoveryFocusTarget;
    const focusRestored = hideDownloadRecovery();
    const trigger = focusSelector ? $(focusSelector) : null;
    if (!focusRestored) restoreFocus(trigger);
  }

  function handleDownloadRecoveryKeydown(event) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    dismissDownloadRecovery();
  }

  function dismissManualCopyFallback(fallbackSelector) {
    const fallback = $(fallbackSelector);
    if (fallback) fallback.hidden = true;
    const trigger = $(manualCopyFallbackControls[fallbackSelector]);
    if (!trigger) return;
    if (typeof trigger.setAttribute === "function") trigger.setAttribute("aria-expanded", "false");
    restoreFocus(trigger);
  }

  function revealManualCopyFallback(fallbackSelector, textSelector, value) {
    const fallback = $(fallbackSelector);
    const fallbackText = $(textSelector);
    if (!fallback || !fallbackText) return false;
    fallbackText.value = value;
    fallback.hidden = false;
    const trigger = $(manualCopyFallbackControls[fallbackSelector]);
    if (trigger && typeof trigger.setAttribute === "function") trigger.setAttribute("aria-expanded", "true");
    restoreFocus(fallbackText);
    if (typeof fallbackText.select === "function") {
      try {
        fallbackText.select();
      } catch (error) {
        // Selection is best-effort; the visible field remains available.
      }
    }
    return true;
  }

  function temporaryButtonFeedback(button, visibleLabel, accessibleLabel, resetVisibleLabel, resetAccessibleLabel, key) {
    if (!button) return;
    button.classList.add("is-complete");
    if (visibleLabel === "Unavailable") button.classList.add("is-unavailable");
    else button.classList.remove("is-unavailable");
    setButtonFeedback(button, visibleLabel, accessibleLabel);
    window.clearTimeout(actionFeedbackTimers.get(key));
    actionFeedbackTimers.set(key, window.setTimeout(() => {
      button.classList.remove("is-complete");
      button.classList.remove("is-unavailable");
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

  function endAsyncAction(button, delay = 0) {
    if (!button) return;
    const release = () => {
      button.disabled = false;
      button.setAttribute("aria-busy", "false");
    };
    if (delay > 0) window.setTimeout(release, delay);
    else release();
  }

  function renderStudyNav() {
    const navigation = $("#studyNav");
    const position = $("#studyNavPosition");
    const previous = $("#prevStudy");
    const next = $("#nextStudy");
    if (!previous || !next) return;
    const visible = visibleStudies();
    const currentIndex = visible.findIndex((study) => study.id === state.activeId);
    const activeStudyOutsideCatalog = visible.length > 0 && currentIndex < 0;
    const canNavigate = visible.length > 0 && (activeStudyOutsideCatalog || visible.length > 1);
    const previousStudy = canNavigate
      ? visible[activeStudyOutsideCatalog ? visible.length - 1 : (currentIndex - 1 + visible.length) % visible.length]
      : null;
    const nextStudy = canNavigate
      ? visible[activeStudyOutsideCatalog ? 0 : (currentIndex + 1) % visible.length]
      : null;
    const positionLabel = currentIndex >= 0
      ? `${String(currentIndex + 1).padStart(2, "0")} / ${String(visible.length).padStart(2, "0")} visible`
      : activeStudyOutsideCatalog
        ? `Outside / ${String(visible.length).padStart(2, "0")} visible`
        : "No studies visible";
    if (position) position.textContent = positionLabel;
    if (navigation) navigation.setAttribute("aria-label", currentIndex >= 0
      ? `Move between studies; showing study ${currentIndex + 1} of ${visible.length} visible studies`
      : activeStudyOutsideCatalog
        ? `Move between studies; current study is outside the ${visible.length} visible ${visible.length === 1 ? "study" : "studies"}`
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
    if (!visible.length) {
      announceKeyboard("No studies are visible. Clear the catalog filters to continue.");
      return;
    }
    const currentIndex = visible.findIndex((study) => study.id === state.activeId);
    const baseIndex = currentIndex >= 0 ? currentIndex : direction > 0 ? -1 : 0;
    const nextIndex = (baseIndex + direction + visible.length) % visible.length;
    const nextStudy = visible[nextIndex];
    selectStudy(nextStudy.id, { scroll, focus });
  }

  function handleKeyboard(event) {
    const tagName = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : "";
    if (["input", "select", "textarea", "summary", "a"].includes(tagName) || event.target.isContentEditable) return;
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
      else announceKeyboard(state.compareIds.length === 1
        ? "Select one more study to open comparison."
        : "Select at least two studies to open comparison.");
      return;
    }
    const zoomDelta = zoomDeltaForKey(key);
    if (zoomDelta) {
      event.preventDefault();
      changeZoom(zoomDelta);
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

  function handleDisclosureKeydown(event) {
    if (event.key !== "Escape") return;
    const target = event.target;
    const disclosure = target && typeof target.closest === "function" ? target.closest("details[open]") : null;
    if (!disclosure || typeof disclosure.querySelector !== "function") return;
    const summary = disclosure.querySelector("summary");
    if (!summary) return;
    event.preventDefault();
    disclosure.open = false;
    restoreFocus(summary);
    const label = typeof summary.textContent === "string" ? summary.textContent.trim() : "";
    announceKeyboard(`${label || "Disclosure"} closed.`);
  }

  function updateComparisonTableScrollCue(target = $(".comparison-table-wrap"), scrollLeftOverride = null) {
    if (!target) return;
    const scrollWidth = Number(target.scrollWidth);
    const clientWidth = Number(target.clientWidth);
    const maxScroll = Number.isFinite(scrollWidth) && Number.isFinite(clientWidth)
      ? Math.max(0, scrollWidth - clientWidth)
      : 0;
    const rawScrollLeft = scrollLeftOverride === null ? Number(target.scrollLeft) : Number(scrollLeftOverride);
    const currentLeft = Number.isFinite(rawScrollLeft) ? Math.max(0, Math.min(maxScroll, rawScrollLeft)) : 0;
    const canScroll = maxScroll > 1;
    const scrollState = !canScroll
      ? "none"
      : currentLeft <= 1
        ? "start"
        : currentLeft >= maxScroll - 1
          ? "end"
          : "middle";
    if (typeof target.setAttribute === "function") target.setAttribute("data-scroll-state", scrollState);
    const cue = $("#comparisonTableScrollCue");
    if (!cue) return;
    cue.hidden = !canScroll;
    if (typeof cue.setAttribute === "function") cue.setAttribute("data-scroll-state", scrollState);
    const cueText = $("#comparisonTableScrollCueText");
    if (cueText) {
      cueText.textContent = scrollState === "start"
        ? "More columns →"
        : scrollState === "end"
          ? "← More columns"
          : scrollState === "middle"
            ? "← More columns →"
            : "";
    }
  }

  function handleComparisonTableKey(event) {
    const target = event.currentTarget;
    if (!target || event.target !== target || event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key;
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;
    const behavior = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    const maxScroll = Math.max(0, (target.scrollWidth || 0) - (target.clientWidth || 0));
    const rawScrollLeft = Number(target.scrollLeft);
    const currentLeft = Number.isFinite(rawScrollLeft) ? Math.max(0, Math.min(maxScroll, rawScrollLeft)) : 0;
    let nextLeft = currentLeft;
    if (key === "Home" || key === "End") {
      const left = key === "End" ? maxScroll : 0;
      nextLeft = left;
      if (typeof target.scrollTo === "function") target.scrollTo({ left, behavior });
      else target.scrollLeft = left;
    } else {
      const amount = Math.max(120, Math.round((target.clientWidth || 0) * 0.8));
      const delta = key === "ArrowRight" ? amount : -amount;
      nextLeft = Math.max(0, Math.min(maxScroll, currentLeft + delta));
      if (typeof target.scrollBy === "function") target.scrollBy({ left: delta, behavior });
      else target.scrollLeft = nextLeft;
    }
    const status = $("#comparisonTableScrollStatus");
    if (status) {
      status.textContent = maxScroll <= 0
        ? "The comparison table fits within the available width; horizontal scrolling is not needed."
        : nextLeft <= 0
          ? "Comparison table is at the first columns."
          : nextLeft >= maxScroll
            ? "Comparison table is at the last columns."
            : `Comparison table moved ${key === "ArrowLeft" || key === "Home" ? "left" : "right"}.`;
    }
    updateComparisonTableScrollCue(target, nextLeft);
    event.preventDefault();
  }

  function normalizeCatalogQuery(value) {
    return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function queryTerms(value) {
    return normalizeCatalogQuery(value).split(" ").filter(Boolean);
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlightSearchText(value) {
    const text = String(value ?? "");
    const terms = [...new Set(queryTerms(state.query).filter((term) => term.length > 1))]
      .sort((a, b) => b.length - a.length);
    if (!terms.length) return escapeHtml(text);
    const pattern = new RegExp(terms.map(escapeRegExp).join("|"), "gi");
    let cursor = 0;
    let highlighted = "";
    for (const match of text.matchAll(pattern)) {
      const start = match.index ?? cursor;
      highlighted += escapeHtml(text.slice(cursor, start));
      highlighted += `<mark class="search-hit">${escapeHtml(match[0])}</mark>`;
      cursor = start + match[0].length;
    }
    return highlighted + escapeHtml(text.slice(cursor));
  }

  function studySearchDimensions(study) {
    const unit = geometryUnitSymbol();
    return [
      `length ${study.length} ${unit}`,
      `length ${number(study.length)} ${unit}`,
      `span ${study.span} ${unit}`,
      `span ${number(study.span)} ${unit}`,
      `height ${study.height} ${unit}`,
      `height ${number(study.height)} ${unit}`,
      `${study.bayCount} bays`,
      `module ${study.module} ${unit}`,
      `module ${number(study.module)} ${unit}`,
      `radius ${study.radius} ${unit}`,
      `radius ${number(study.radius)} ${unit}`,
    ];
  }

  function studySearchDerivedReadings(study) {
    const floorAreaEstimate = positiveEstimate(study.floorAreaEstimate);
    const volumeEstimate = positiveEstimate(study.volumeEstimate);
    const unit = geometryUnitSymbol();
    return [
      `symmetry ${number(study.symmetry, 2)}`,
      `length / span ${number(study.length / study.span, 2)}`,
      `height / span ${number(study.height / study.span, 2)}`,
      `section ratio ${number(study.height / study.span, 2)}`,
      `module / span ${number(study.module / study.span, 2)}`,
      `radial reach ${number(study.radius)} ${unit}`,
      floorAreaEstimate !== null ? `floor area ${floorAreaEstimate} ${unit}²` : "",
      floorAreaEstimate !== null ? `floor area ${number(floorAreaEstimate, 0)} ${unit}²` : "",
      volumeEstimate !== null ? `volume ${volumeEstimate} ${unit}³` : "",
      volumeEstimate !== null ? `volume ${Number(volumeEstimate).toLocaleString()} ${unit}³` : ""
    ];
  }

  function searchMatchContext(study) {
    const terms = queryTerms(state.query);
    if (!terms.length) return "";
    const details = Array.isArray(study.details) ? study.details.flat() : [];
    const groups = [
      ["reference", [study.churchName]],
      ["provenance", [studySource(study), studySourceNote(study), studyStatus(study), studyStatusDescription(study)]],
      ["reading", [study.axis, studyAxisLabel(study), study.envelope, study.surfaceNote, study.exteriorNote, study.interiorNote, ...details]],
      ["dimensions", studySearchDimensions(study)],
      ["derived ratios", studySearchDerivedReadings(study)]
    ];
    const labels = groups
      .filter(([, values]) => terms.some((term) => values.filter(Boolean).join(" ").toLowerCase().includes(term)))
      .map(([label]) => label);
    return labels.length ? `Found in ${labels.join(" · ")}` : "";
  }

  function studySearchText(study) {
    const details = Array.isArray(study.details) ? study.details.flat() : [];
    const dimensions = studySearchDimensions(study);
    const derivedReadings = studySearchDerivedReadings(study);
    const volumeBasis = positiveEstimate(study.volumeEstimate) !== null ? study.volumeBasis : "";
    return [
      study.name, study.shortName, study.churchName, study.typology, study.place, study.era,
      study.emphasis, study.axis, studyAxisLabel(study), study.envelope, studySource(study), studySourceNote(study),
      study.surfaceNote, study.exteriorNote, study.interiorNote, volumeBasis, studyStatus(study),
      studyStatusDescription(study),
      ...dimensions,
      ...derivedReadings,
      ...details
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function visibleStudies() {
    const result = catalogFilterScopeRecords();
    const naturalCompare = (left, right) => String(left ?? "").localeCompare(String(right ?? ""), undefined, { numeric: true, sensitivity: "base" });
    const stableStudyOrder = (left, right) => {
      const leftIndexText = String((left && left.index) ?? "").trim();
      const rightIndexText = String((right && right.index) ?? "").trim();
      const leftIndex = leftIndexText ? Number(leftIndexText) : NaN;
      const rightIndex = rightIndexText ? Number(rightIndexText) : NaN;
      if (Number.isFinite(leftIndex) && Number.isFinite(rightIndex) && leftIndex !== rightIndex) return leftIndex - rightIndex;
      return naturalCompare(leftIndexText, rightIndexText)
        || naturalCompare(left && left.name, right && right.name)
        || naturalCompare(left && left.id, right && right.id);
    };
    return result.sort((a, b) => {
      let order = 0;
      if (state.sort === "length") order = b.length - a.length;
      if (state.sort === "height") order = b.height - a.height;
      if (state.sort === "span") order = b.span - a.span;
      if (state.sort === "ratio") order = (b.length / b.span) - (a.length / a.span);
      if (state.sort === "symmetry") order = b.symmetry - a.symmetry;
      if (state.sort === "name") order = naturalCompare(a.name, b.name);
      return order || stableStudyOrder(a, b);
    });
  }

  function refreshCatalog() {
    hideManualCopyFallbacks();
    hideDownloadRecovery();
    const visible = visibleStudies();
    const previousId = state.activeId;
    if (visible.length && !visible.some((study) => study.id === state.activeId)) state.activeId = visible[0].id;
    if (state.page === "atlas" && !visible.length) replaceRoute("atlas", false);
    if (previousId !== state.activeId && state.page === "atlas") replaceRoute("atlas");
    renderList();
    if (previousId !== state.activeId) {
      renderStudy();
      renderDrawing();
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
    const route = parseRoute();
    const routeStudyId = route.page === "atlas" ? route.studyId : null;
    renderCatalogFilterOptions();
    const visible = visibleStudies();
    const catalogExport = $("#downloadCatalogView");
    const catalogCsvExport = $("#downloadCatalogCsv");
    const catalogPrint = $("#printCatalog");
    renderCatalogResultCount(visible.length);
    const catalogRoute = $("#catalogRoute");
    if (catalogRoute) renderRouteLink(catalogRoute, ".catalog-route-link", routePath(catalogViewRouteUrl()), "Open current catalog view in Atlas");
    const statusHelp = $("#statusHelp");
    if (statusHelp) statusHelp.textContent = catalogStatusGuidanceText(visible);
    if (catalogExport) catalogExport.disabled = visible.length === 0;
    if (catalogCsvExport) catalogCsvExport.disabled = visible.length === 0;
    if (catalogPrint) catalogPrint.disabled = visible.length === 0;
    if (emptyMessage) emptyMessage.textContent = emptyCatalogMessage();
    renderVisualState(visible);
    renderActiveFilters();
    renderVisibleComparisonAction(visible);
    renderMethodReturnAction(activeStudy(), visible);
    renderMethodContext(activeStudy(), visible);
    renderActiveCatalogContext(activeStudy(), visible);
    updateSearchClear();
    renderStudyNav();
    list.innerHTML = visible.map((study) => {
      const isActive = study.id === state.activeId;
      const isCompared = state.compareIds.includes(study.id);
      const isCurrentRoute = routeStudyId === study.id && isActive;
      const matchContext = searchMatchContext(study);
      const compareLabel = `${isCompared ? "Remove" : "Add"} ${study.name} ${isCompared ? "from" : "to"} comparison`;
      const currentAttribute = isCurrentRoute ? ' aria-current="page"' : "";
      const measureLabel = `${study.length} × ${study.span} × ${study.height} ${geometryUnitSymbol()} · radius ${study.radius} ${geometryUnitSymbol()}`;
      const statusLabel = studyStatusLabel(study);
      return `
        <li class="catalog-entry">
          <a class="catalog-card ${isActive ? "is-active" : ""}" data-study-id="${escapeHtml(study.id)}" href="${escapeHtml(atlasStudyNavigationUrl(study.id))}"${currentAttribute} aria-label="${escapeHtml(catalogStudyAriaLabel(study, isActive))}">
            <span class="catalog-number" aria-hidden="true">${escapeHtml(study.index)}</span>
            <span class="catalog-card-copy">
              <span class="catalog-card-title">${highlightSearchText(study.name)}</span>
              <span class="catalog-card-meta">${highlightSearchText(`${study.typology} · ${study.place}`)}</span>
              <span class="catalog-card-status" data-status="${escapeHtml(studyDataLabel(study))}" title="${escapeHtml(studyStatusDescription(study))}">${highlightSearchText(statusLabel)}</span>
              <span class="catalog-card-detail">${highlightSearchText(`${study.era} · Axis: ${studyAxisLabel(study)} · ${study.emphasis}`)}</span>
              <span class="catalog-card-measure">${escapeHtml(measureLabel)}</span>
              ${matchContext ? `<span class="catalog-card-match">${escapeHtml(matchContext)}</span>` : ""}
            </span>
            ${catalogGlyph(study)}
          </a>
          <button class="compare-toggle ${isCompared ? "is-selected" : ""}" data-compare-id="${escapeHtml(study.id)}" type="button" aria-pressed="${isCompared}" aria-label="${escapeHtml(compareLabel)}" title="${escapeHtml(compareLabel)}">${isCompared ? "✓" : "+"}</button>
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
    const hasSecondaryFilters = state.filter !== "all" || state.filterPlace !== "all" || state.filterEra !== "all" || state.filterAxis !== "all";
    const hasCatalogFilters = hasSecondaryFilters || state.filterStatus !== "all";
    if (state.query && hasCatalogFilters) return `No studies match “${state.query}” within the selected catalog filters.`;
    if (state.query) return `No studies match “${state.query}”.`;
    if (state.filterStatus !== "all" && !hasSecondaryFilters) {
      const statusLabel = statusDisplayName(state.filterStatus).toLowerCase();
      return state.filterStatus === "measured"
        ? "No measured studies are in the atlas yet."
        : `No ${statusLabel} studies are in the atlas yet.`;
    }
    if (hasCatalogFilters) return "No studies match the selected catalog filters.";
    return "No studies are available in the current catalog view.";
  }

  function renderVisualState(visible) {
    const visualColumn = $(".visual-column");
    const emptyState = $("#visualEmptyState");
    if (!visualColumn || !emptyState) return;
    const isEmpty = visible.length === 0;
    const study = activeStudy();
    const hasCatalogScope = Boolean(
      state.query
      || state.filter !== "all"
      || state.filterPlace !== "all"
      || state.filterEra !== "all"
      || state.filterAxis !== "all"
      || state.filterStatus !== "all"
    );
    const activeStudyOutsideCatalog = Boolean(isEmpty && study && hasCatalogScope);
    visualColumn.classList.toggle("is-empty", isEmpty);
    emptyState.hidden = !isEmpty;
    const context = $("#visualEmptyContext");
    if (typeof emptyState.setAttribute === "function") {
      emptyState.setAttribute("aria-describedby", activeStudyOutsideCatalog
        ? "visualEmptyMessage visualEmptyContext"
        : "visualEmptyMessage");
    }
    if (context) {
      context.hidden = !activeStudyOutsideCatalog;
      context.textContent = activeStudyOutsideCatalog
        ? `The active study, ${studyShortName(study)}, is outside the current catalog view.`
        : "";
    }
    const message = $("#visualEmptyMessage");
    if (message && isEmpty) {
      message.textContent = activeStudyOutsideCatalog
        ? `${emptyCatalogMessage()} Clear the catalog filters to restore ${studyShortName(study)}.`
        : `${emptyCatalogMessage()} Clear filters to restore a study drawing.`;
    }
    const recovery = $("#clearVisualFilters");
    if (recovery) {
      const label = activeStudyOutsideCatalog
        ? `Clear catalog filters and show ${studyShortName(study)}`
        : "Clear catalog filters";
      recovery.setAttribute("aria-label", label);
      recovery.title = label;
    }
  }

  function renderStudy() {
    const study = activeStudy();
    if (!study) return;
    hideManualCopyFallbacks();
    const ratio = study.length / study.span;
    $("#activeKicker").textContent = `Study ${study.index} / ${study.typology}`;
    $("#activeName").textContent = study.name;
    $("#activeMeta").textContent = `${study.place} · ${study.era} · Axis: ${studyAxisLabel(study)} · ${study.emphasis.toLowerCase()}`;
    renderActiveProvenance(study);
    renderMethodReturnAction(study);
    renderMethodContext(study);
    renderActiveCatalogContext(study, visibleStudies());
    const measureSummary = $("#activeMeasureSummary");
    const measureText = `Envelope · ${study.length} × ${study.span} × ${study.height} ${geometryUnitSymbol()} · radius ${study.radius} ${geometryUnitSymbol()}`;
    const measureAccessibleText = `Envelope dimensions: ${number(study.length)} ${geometryUnitName()} long, span ${number(study.span)} ${geometryUnitName()}, height ${number(study.height)} ${geometryUnitName()}; primary radius ${number(study.radius)} ${geometryUnitName()}.`;
    const measureVisible = $("#activeMeasureVisible");
    const measureAccessible = $("#activeMeasureAccessible");
    if (measureVisible) measureVisible.textContent = measureText;
    if (measureAccessible) measureAccessible.textContent = measureAccessibleText;
    if (measureSummary && !measureVisible) measureSummary.textContent = measureText;
    const printRoute = $("#printRoute");
    renderRouteLink(printRoute, ".study-route-link", studyRoutePath(study.id), `Open ${studyShortName(study)} route in Atlas`);
    $("#activeReference").textContent = `Reference · ${study.churchName || study.name}`;
    $("#activeSource").textContent = `Source · ${studySource(study)} · ${studySourceNote(study).toLowerCase()}`;
    $("#activeIndex").textContent = study.index;
    $("#activeDescription").textContent = studySurfaceReading(study) || "No interpretive reading supplied.";
    $("#analysisReading").textContent = studySurfaceReading(study) || "No interpretive note supplied.";
    $("#metricLength").textContent = linearMeasure(study.length);
    $("#metricSpan").textContent = linearMeasure(study.span);
    $("#metricHeight").textContent = linearMeasure(study.height);
    $("#metricRatio").textContent = `${number(ratio, 2)} : 1`;
    $("#metricSymmetry").textContent = number(study.symmetry, 2);
    $("#detailGrid").innerHTML = study.details.map(([label, value]) => `
      <div class="detail-item"><span class="detail-item-label">${escapeHtml(label)}</span><span class="detail-item-value">${escapeHtml(value)}</span></div>
    `).join("");
    const floorArea = floorAreaReading(study);
    const area = floorArea.numeric ?? study.length * study.span;
    const sectionRatio = study.height / study.span;
    const moduleRatio = study.module / study.span;
    const volume = volumeReading(study);
    $("#analysisArea").textContent = squareMeasure(area);
    $("#analysisSection").textContent = number(sectionRatio, 2);
    $("#analysisModule").textContent = number(moduleRatio, 2);
    $("#analysisRadius").textContent = linearMeasure(study.radius);
    $("#analysisVolume").textContent = volume.value;
    $("#analysisVolumeBasis").textContent = volume.basis;
    $("#activeEquation").textContent = `R = L ÷ span = ${number(ratio, 2)}`;
    $("#profileRow").innerHTML = profileScores(study).map(([label, score]) => `
      <div class="profile-item" role="listitem"><div class="profile-label" aria-hidden="true"><span>${escapeHtml(label)}</span><b>${score}</b></div><div class="profile-track" role="meter" aria-label="${escapeHtml(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${score}" aria-valuetext="${score} out of 100"><i class="profile-fill" style="--profile:${score}%"></i></div></div>
    `).join("");
  }

  function renderMethodReturnAction(study = activeStudy(), visible = visibleStudies()) {
    const button = $("#methodBackToStudy");
    if (!button) return;
    const canOpenStudy = Boolean(study && visible.some((candidate) => candidate.id === study.id));
    const label = canOpenStudy ? `Open ${studyShortName(study)} in Atlas` : "Return to Atlas catalog";
    button.setAttribute("aria-label", label);
    button.title = label;
    const catalogRoute = catalogViewRouteUrl();
    button.setAttribute("href", canOpenStudy ? atlasStudyNavigationUrl(study.id) : `${catalogRoute.pathname}${catalogRoute.search}${catalogRoute.hash}`);
    const text = button.querySelector("span:last-child");
    if (text) text.textContent = canOpenStudy ? "Open current study" : "Return to Atlas";
  }

  function renderMethodContext(study = activeStudy(), visible = visibleStudies()) {
    const target = $("#methodContextNote");
    if (!target) return;
    const route = parseRoute();
    const hasContext = Boolean(study && route.page === "method" && route.contextStudyId === study.id);
    if (!hasContext) {
      target.textContent = "Notes on the atlas model";
      return;
    }
    const isVisible = visible.some((candidate) => candidate.id === study.id);
    target.textContent = isVisible
      ? `Current study · ${studyShortName(study)}`
      : `Study context · ${studyShortName(study)} · outside current catalog`;
  }

  function renderActiveCatalogContext(study = activeStudy(), visible = visibleStudies()) {
    const target = $("#activeCatalogContext");
    if (!target) return;
    const text = $("#activeCatalogContextText");
    const action = $("#showActiveStudy");
    const outsideCatalog = Boolean(study && visible.length && !visible.some((candidate) => candidate.id === study.id));
    target.hidden = !outsideCatalog;
    if (text) text.textContent = outsideCatalog ? "This study is outside the current catalog view." : "";
    if (action) {
      action.hidden = !outsideCatalog;
      const label = outsideCatalog ? `Show ${studyShortName(study)} in catalog` : "Show current study in catalog";
      action.setAttribute("aria-label", label);
      action.title = label;
    }
    const heading = $("#activeName");
    if (heading) {
      const headingDescriptionIds = ["activeStatusHelp", "activeMeta", "activeMeasureAccessible", "activeSource"];
      if (outsideCatalog) headingDescriptionIds.push("activeCatalogContextText");
      heading.setAttribute("aria-describedby", headingDescriptionIds.join(" "));
    }
  }

  function renderRouteLink(container, selector, route, label) {
    if (!container) return;
    const link = typeof container.querySelector === "function" ? container.querySelector(selector) : null;
    if (!link) {
      container.textContent = `Route · ${route}`;
      return;
    }
    link.href = route;
    link.textContent = route;
    if (typeof link.setAttribute === "function") link.setAttribute("aria-label", label);
    link.title = label;
  }

  function routeLinkHref(selector) {
    const link = $(selector);
    if (!link) return "";
    const rawHref = typeof link.getAttribute === "function" ? link.getAttribute("href") || link.href : link.href;
    if (!rawHref) return "";
    try {
      const base = window.location && typeof window.location.href === "string" ? window.location.href : undefined;
      return typeof URL === "function" ? new URL(rawHref, base).href : rawHref;
    } catch (error) {
      return rawHref;
    }
  }

  async function copyRoute({ linkSelector, buttonSelector, statusSelector, fallbackSelector, fallbackTextSelector, scope, resetAccessibleLabel, feedbackKey }) {
    const button = $(buttonSelector);
    const status = $(statusSelector);
    if (!button || !status || !beginAsyncAction(button)) return false;
    try {
      hideManualCopyFallbacks();
      const href = routeLinkHref(linkSelector);
      if (!href) {
        const message = `Copying the ${scope.toLowerCase()} route is unavailable. Select the visible route link manually.`;
        temporaryButtonFeedback(button, "Unavailable", message, "Copy link", resetAccessibleLabel, feedbackKey);
        status.textContent = message;
        return false;
      }
      const copied = await copyText(href);
      if (copied) {
        const message = `${scope} route copied.`;
        temporaryButtonFeedback(button, "Copied", message, "Copy link", resetAccessibleLabel, feedbackKey);
        status.textContent = message;
        return true;
      }
      const fallbackShown = revealManualCopyFallback(fallbackSelector, fallbackTextSelector, href);
      const message = fallbackShown
        ? `Copying the ${scope.toLowerCase()} route was unavailable. The full route is shown below for manual copying.`
        : `Copying the ${scope.toLowerCase()} route is unavailable. Select the visible route link manually.`;
      temporaryButtonFeedback(button, "Unavailable", message, "Copy link", resetAccessibleLabel, feedbackKey);
      status.textContent = message;
      return false;
    } finally {
      endAsyncAction(button);
    }
  }

  function copyCatalogRoute() {
    return copyRoute({
      linkSelector: ".catalog-route-link",
      buttonSelector: "#copyCatalogRoute",
      statusSelector: "#catalogRouteStatus",
      fallbackSelector: "#catalogRouteFallback",
      fallbackTextSelector: "#catalogRouteFallbackText",
      scope: "Catalog view",
      resetAccessibleLabel: "Copy current catalog route",
      feedbackKey: "catalog-route-copy"
    });
  }

  function copyStudyRoute() {
    return copyRoute({
      linkSelector: ".study-route-link",
      buttonSelector: "#copyStudyRoute",
      statusSelector: "#studyRouteStatus",
      fallbackSelector: "#studyRouteFallback",
      fallbackTextSelector: "#studyRouteFallbackText",
      scope: "Active study",
      resetAccessibleLabel: "Copy active study route",
      feedbackKey: "study-route-copy"
    });
  }

  function copyComparisonRoute() {
    return copyRoute({
      linkSelector: ".comparison-route-link",
      buttonSelector: "#copyComparisonRoute",
      statusSelector: "#comparisonRouteStatus",
      fallbackSelector: "#comparisonRouteFallback",
      fallbackTextSelector: "#comparisonRouteFallbackText",
      scope: "Comparison",
      resetAccessibleLabel: "Copy comparison route",
      feedbackKey: "comparison-route-copy"
    });
  }

  function renderActiveProvenance(study) {
    if (!study) return;
    const status = studyStatus(study);
    const statusLabel = statusDisplayName(status);
    const statusDefinition = studyStatusDescription(study);
    const schema = window.CHURCH_GEOMETRY_SCHEMA || { version: "1.1", units: "meters" };
    const activeStatus = $("#activeStatus");
    const summary = $("#activeProvenanceSummary");
    const explanation = $("#activeProvenanceDefinition");
    const schemaNote = $("#activeSchemaNote");
    if (activeStatus) {
      activeStatus.textContent = statusLabel;
      activeStatus.title = statusDefinition;
      activeStatus.setAttribute("data-status", studyDataLabel(study));
      activeStatus.setAttribute("aria-label", `${statusLabel} (${status}): ${statusDefinition}`);
    }
    const activeStatusHelp = $("#activeStatusHelp");
    if (activeStatusHelp) activeStatusHelp.textContent = `Data status: ${statusLabel} (${status}); ${statusDefinition}`;
    if (summary) summary.textContent = `Data status · ${statusLabel}`;
    if (explanation) explanation.textContent = statusDefinition;
    if (schemaNote) schemaNote.textContent = `Schema ${schema.version || "1.1"} · units: ${schema.units || "meters"}`;
  }

  function volumeReading(study) {
    const estimate = positiveEstimate(study.volumeEstimate);
    return {
      numeric: estimate,
      value: estimate !== null ? cubicMeasure(estimate) : "Not supplied",
      basis: estimate !== null
        ? study.volumeBasis || (studyStatus(study) === "measured" ? "source-supported estimate" : "schematic estimate")
        : "No estimate supplied"
    };
  }

  function floorAreaReading(study) {
    const estimate = positiveEstimate(study.floorAreaEstimate);
    return {
      numeric: estimate,
      value: estimate !== null ? `${Number(estimate).toLocaleString()} ${geometryUnitSymbol()}²` : "Not supplied"
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

  function derivedStudyReadings(study) {
    const floorArea = floorAreaReading(study);
    const volume = volumeReading(study);
    return {
      floorAreaEstimate: floorArea.numeric,
      boundingArea: floorArea.numeric ?? study.length * study.span,
      ratios: {
        lengthToSpan: study.length / study.span,
        heightToSpan: study.height / study.span,
        moduleToSpan: study.module / study.span
      },
      radialReach: study.radius,
      symmetryIndex: study.symmetry,
      volumeEstimate: volume.numeric,
      volumeBasis: volume.basis,
      readingProfile: Object.fromEntries(profileScores(study).map(([label, score]) => [label, score]))
    };
  }

  function renderControls() {
    hideManualCopyFallbacks();
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
      const layer = button.dataset.layer;
      const selected = layer === state.layer;
      const layerLabel = layer === "all" ? "All geometry" : `${layerDisplayName(layer)[0].toUpperCase()}${layerDisplayName(layer).slice(1)} focus`;
      const accessibleLabel = `${layerLabel}: ${layerDescriptions[layer] || "Geometry layer focus."}`;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.setAttribute("aria-label", accessibleLabel);
      button.title = accessibleLabel;
    });
    const drawingState = $("#drawingState");
    if (drawingState) drawingState.textContent = drawingStateLabel();
    $("#zoomReadout").textContent = `${Math.round(state.zoom * 100)}%`;
    const zoomReset = $("#zoomReset");
    if (zoomReset) {
      zoomReset.textContent = `${Math.round(state.zoom * 100)}%`;
      zoomReset.title = "Reset zoom to 100%";
    }
    const zoomOut = $("#zoomOut");
    const zoomIn = $("#zoomIn");
    if (zoomOut) {
      zoomOut.disabled = state.zoom <= MIN_ZOOM;
      const label = zoomOut.disabled ? "Zoom out (minimum 70%)" : "Zoom out";
      zoomOut.setAttribute("aria-label", label);
      zoomOut.title = label;
    }
    if (zoomIn) {
      zoomIn.disabled = state.zoom >= MAX_ZOOM;
      const label = zoomIn.disabled ? "Zoom in (maximum 160%)" : "Zoom in";
      zoomIn.setAttribute("aria-label", label);
      zoomIn.title = label;
    }
  }

  function showPage(page, options = {}) {
    const { updateHash: shouldUpdateHash = true, routeStudy = page === "atlas", scroll = true } = options;
    hideManualCopyFallbacks();
    hideDownloadRecovery();
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
    updateViewNavigationLinks();
    if (page === "method") renderMethodContext();
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

  function handleViewNavigation(event) {
    const link = event.currentTarget || (event.target && typeof event.target.closest === "function" ? event.target.closest('[data-view]') : null);
    if (!link) return;
    if ((event.button !== undefined && event.button !== 0) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    showPage(link.dataset.view, { routeStudy: link.dataset.view === "method" });
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

  function sharePayloadText(payload) {
    return [payload.text, payload.url].filter(Boolean).join("\n");
  }

  async function shareStudy() {
    const study = activeStudy();
    const button = $("#shareStudy");
    const status = $("#shareStatus");
    if (!study || !button || !status || !beginAsyncAction(button)) return;
    try {
      hideManualCopyFallbacks();
      const scope = studyShortName(study);
      const shareUrl = studyRouteUrl();
      const sharePayload = {
        title: `${studyShortName(study)} · Sacred Geometry Atlas`,
        text: `Explore ${study.name} in the Sacred Geometry Atlas — ${studyAxisLabel(study)}, ${state.surface} ${state.mode} view, ${layerFocusLabel()}, ${zoomPercent()} zoom. Data status: ${studyStatusLabel(study).toLowerCase()}. Source: ${studySource(study)}; ${studySourceNote(study)}`,
        url: shareUrl.href
      };

      const nativeShareResult = await attemptNativeShare(sharePayload);
      if (nativeShareResult === "shared") {
        temporaryButtonFeedback(button, "Shared", `Study shared: ${scope}`, "Share study", "Share current study", "share-study");
        status.textContent = `${study.name} shared.`;
        return;
      }
      if (nativeShareResult === "cancelled") {
        status.textContent = "Study sharing cancelled.";
        return;
      }

      const copied = await copyText(sharePayloadText(sharePayload));

      if (copied) {
        button.classList.add("is-copied");
        setButtonFeedback(button, "Copied", `Share text and link copied: ${scope}`);
        status.textContent = `Share text and link for ${study.name} copied.`;
        window.clearTimeout(shareResetTimer);
        shareResetTimer = window.setTimeout(() => {
          button.classList.remove("is-copied");
          setButtonFeedback(button, "Share study", "Share current study");
        }, 2200);
      } else {
        const fallbackShown = revealManualCopyFallback("#shareFallback", "#shareFallbackText", sharePayloadText(sharePayload));
        status.textContent = fallbackShown
          ? "Copying was unavailable. The share message and link are shown below for manual copying."
          : "Copying was unavailable. Use the page URL from the address bar and the study details shown here.";
      }
    } finally {
      endAsyncAction(button);
    }
  }

  function catalogScopeLabel() {
    const parts = [];
    if (state.query) parts.push(`results matching “${state.query}”`);
    if (state.filter !== "all") parts.push(`typology: ${state.filter}`);
    if (state.filterPlace !== "all") parts.push(`location: ${state.filterPlace}`);
    if (state.filterEra !== "all") parts.push(`era: ${state.filterEra}`);
    if (state.filterAxis !== "all") parts.push(`axis: ${axisDisplayLabel(state.filterAxis)}`);
    if (state.filterStatus !== "all") parts.push(`data status: ${statusDisplayName(state.filterStatus).toLowerCase()} records`);
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

  function selectedComparisonStudies() {
    return state.compareIds
      .map((id) => studies.find((study) => study.id === id))
      .filter(Boolean);
  }

  function comparisonSelectionExportContext() {
    const definitions = dataStatusDefinitions();
    return selectedComparisonStudies().map((study) => {
      const status = studyStatus(study);
      return {
        id: study.id,
        name: studyShortName(study),
        axis: study.axis,
        status,
        statusDefinition: definitions[status] || "Data status is not documented.",
        source: studySource(study),
        sourceNote: studySourceNote(study)
      };
    });
  }

  function comparisonSelectionShareText(selection = selectedComparisonStudies()) {
    return selection.length
      ? selection.map((study) => `${studyShortName(study)} (${studyAxisLabel(study)}; ${studyStatusLabel(study).toLowerCase()})`).join("; ")
      : "the full collection";
  }

  function comparisonSelectionProvenanceText(selection = []) {
    if (!selection.length) return "";
    const sourceText = selection.map((study) => `${studyShortName(study)} — ${studySource(study)}; ${studySourceNote(study)}`).join(" | ");
    return `Source context: ${sourceText}${/[.!?]$/.test(sourceText.trim()) ? "" : "."}`;
  }

  function comparisonSelectionCsvText(selection = comparisonSelectionExportContext()) {
    return selection
      .map(({ name, axis, status, statusDefinition, source, sourceNote }) => `${name} (${axisDisplayLabel(axis)}; ${status}; ${statusDefinition}; Source: ${source}; ${sourceNote})`)
      .join("; ");
  }

  function catalogCitationText(records = visibleStudies()) {
    const route = catalogViewRouteUrl();
    const definitions = dataStatusDefinitions();
    const statuses = schemaStatusValues().map((status) =>
      `${statusDisplayName(status)} = ${definitions[status] || "Data status is not documented."}`
    ).join(" ");
    const recordLabel = records.length === 1 ? "1 record" : `${records.length} records`;
    const selected = selectedComparisonStudies();
    const selection = selected.length
      ? ` Comparison selection: ${selected.map((study) => `${studyShortName(study)} (${studyStatusLabel(study).toLowerCase()})`).join("; ")}. Selection provenance: ${selected.map((study) => `${studyShortName(study)} — ${studySource(study)}; ${studySourceNote(study)}`).join(" | ")}.`
      : "";
    const schema = geometrySchema();
    return `Sacred Geometry Atlas. Catalog view: ${catalogScopeLabel()}; ${recordLabel}.${selection} Status definitions: ${statuses || "No documented statuses."} Schema v${schema.version || "1.1"}; units: ${schema.units || "meters"}. Route: ${route.href}`;
  }

  async function copyCatalogCitation() {
    const button = $("#copyCatalogCitation");
    const status = $("#catalogCitationStatus");
    if (!button || !status || !beginAsyncAction(button)) return;
    try {
      hideManualCopyFallbacks();
      const scope = readableScopeLabel(catalogScopeLabel());
      const citation = catalogCitationText();
      const copied = await copyText(citation);
      if (copied) {
        button.classList.add("is-copied");
        setButtonFeedback(button, "Citation copied", `Catalog citation copied: ${scope}`);
        status.textContent = `Citation for ${scope} copied.`;
        window.clearTimeout(catalogCitationResetTimer);
        catalogCitationResetTimer = window.setTimeout(() => {
          button.classList.remove("is-copied");
          setButtonFeedback(button, "Copy citation", "Copy a citation for this catalog view");
        }, 2200);
      } else {
        const fallbackShown = revealManualCopyFallback("#catalogCitationFallback", "#catalogCitationFallbackText", citation);
        status.textContent = fallbackShown
          ? "Copying was unavailable. The catalog citation is shown below for manual copying."
          : "Copying was unavailable. You can copy the catalog citation from the current view details.";
      }
    } finally {
      endAsyncAction(button);
    }
  }

  async function shareCatalog() {
    const button = $("#shareCatalog");
    const status = $("#catalogShareStatus");
    if (!button || !status || !beginAsyncAction(button)) return;
    try {
      hideManualCopyFallbacks();
      const scope = readableScopeLabel(catalogScopeLabel());
      const shareUrl = catalogViewRouteUrl();
      const selected = selectedComparisonStudies();
      const selectionText = selected.length ? ` Selected comparison: ${comparisonSelectionShareText(selected)}. ${comparisonSelectionProvenanceText(selected)}` : "";
      const sharePayload = {
        title: "Sacred Geometry Atlas · catalog view",
        text: `Explore ${catalogScopeLabel()} in the Sacred Geometry Atlas.${selectionText}`,
        url: shareUrl.href
      };

      const nativeShareResult = await attemptNativeShare(sharePayload);
      if (nativeShareResult === "shared") {
        temporaryButtonFeedback(button, "Shared", `Catalog view shared: ${scope}`, "Share view", "Share current catalog view", "share-catalog");
        status.textContent = `Catalog view shared for ${scope}.`;
        return;
      }
      if (nativeShareResult === "cancelled") {
        status.textContent = "Catalog sharing cancelled.";
        return;
      }

      const copied = await copyText(sharePayloadText(sharePayload));
      if (copied) {
        button.classList.add("is-copied");
        setButtonFeedback(button, "Copied", `Catalog share text and link copied: ${scope}`);
        status.textContent = `Catalog share text and link for ${scope} copied.`;
        window.clearTimeout(catalogShareResetTimer);
        catalogShareResetTimer = window.setTimeout(() => {
          button.classList.remove("is-copied");
          setButtonFeedback(button, "Share view", "Share current catalog view");
        }, 2200);
      } else {
        const fallbackShown = revealManualCopyFallback("#catalogShareFallback", "#catalogShareFallbackText", sharePayloadText(sharePayload));
        status.textContent = fallbackShown
          ? "Copying was unavailable. The catalog share message and link are shown below for manual copying."
          : "Copying was unavailable. Use the catalog URL from the address bar and the view details shown here.";
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
      hideManualCopyFallbacks();
      const comparison = comparisonStudies();
      const scope = readableScopeLabel(comparisonScopeLabel(comparison));
      const shareUrl = comparisonRouteUrl();
      const focused = state.compareIds.length >= 2;
      const selected = focused ? comparison : [];
      const selectionLabel = comparisonSelectionShareText(selected);
      const pending = state.compareIds.length === 1 ? selectedComparisonStudies() : [];
      const shareLabel = pending.length
        ? `${comparisonSelectionShareText(pending)} selected; choose one more study for a focused comparison`
        : selectionLabel;
      const selectionProvenance = comparisonSelectionProvenanceText(focused ? selected : pending);
      const sharePayload = {
        title: "Sacred Geometry Atlas comparison",
        text: `Compare ${shareLabel} in the Sacred Geometry Atlas.${selectionProvenance ? ` ${selectionProvenance}` : ""}`,
        url: shareUrl.href
      };

      const nativeShareResult = await attemptNativeShare(sharePayload);
      if (nativeShareResult === "shared") {
        temporaryButtonFeedback(button, "Shared", `Comparison shared: ${scope}`, "Share comparison", "Share this comparison", "share-comparison");
        status.textContent = `Comparison shared for ${scope}.`;
        return;
      }
      if (nativeShareResult === "cancelled") {
        status.textContent = "Comparison sharing cancelled.";
        return;
      }

      const copied = await copyText(sharePayloadText(sharePayload));
      if (copied) {
        button.classList.add("is-copied");
        setButtonFeedback(button, "Copied", `Comparison share text and link copied: ${scope}`);
        status.textContent = `Comparison share text and link for ${scope} copied.`;
        window.clearTimeout(compareShareResetTimer);
        compareShareResetTimer = window.setTimeout(() => {
          button.classList.remove("is-copied");
          setButtonFeedback(button, "Share comparison", "Share this comparison");
        }, 2200);
      } else {
        const fallbackShown = revealManualCopyFallback("#compareShareFallback", "#compareShareFallbackText", sharePayloadText(sharePayload));
        status.textContent = fallbackShown
          ? "Copying was unavailable. The comparison share message and link are shown below for manual copying."
          : "Copying was unavailable. Use the comparison URL from the address bar and the view details shown here.";
      }
    } finally {
      endAsyncAction(button);
    }
  }

  function comparisonCitationText(comparison = comparisonStudies()) {
    const route = comparisonRouteUrl();
    const scope = comparisonScopeLabel(comparison);
    const definitions = dataStatusDefinitions();
    const statuses = [...new Set(comparison.map(studyStatus))].map((status) =>
      `${statusDisplayName(status)} = ${definitions[status] || "Data status is not documented."}`
    ).join(" ");
    const records = comparison.length
      ? comparison.map((study) => `${studyShortName(study)} (${studyAxisLabel(study)}; ${studyStatusLabel(study).toLowerCase()})`).join("; ")
      : "no records";
    const provenance = comparison.length
      ? ` Sources: ${comparison.map((study) => `${studyShortName(study)} — ${studySource(study)}; ${studySourceNote(study)}`).join(" | ")}.`
      : "";
    const schema = geometrySchema();
    return `Sacred Geometry Atlas. Comparison of ${records}.${provenance} Scope: ${scope}. Status definitions: ${statuses || "No documented statuses."} Schema v${schema.version || "1.1"}; units: ${schema.units || "meters"}. Route: ${route.href}`;
  }

  async function copyComparisonCitation() {
    const comparison = comparisonStudies();
    const button = $("#copyComparisonCitation");
    const status = $("#comparisonCitationStatus");
    if (!comparison.length || !button || !status || !beginAsyncAction(button)) return;
    try {
      hideManualCopyFallbacks();
      const scope = readableScopeLabel(comparisonScopeLabel(comparison));
      const citation = comparisonCitationText(comparison);
      const copied = await copyText(citation);
      if (copied) {
        button.classList.add("is-copied");
        setButtonFeedback(button, "Citation copied", `Comparison citation copied: ${scope}`);
        status.textContent = `Citation for ${scope} copied.`;
        window.clearTimeout(comparisonCitationResetTimer);
        comparisonCitationResetTimer = window.setTimeout(() => {
          button.classList.remove("is-copied");
          setButtonFeedback(button, "Copy citation", "Copy a citation for this comparison");
        }, 2200);
      } else {
        const fallbackShown = revealManualCopyFallback("#comparisonCitationFallback", "#comparisonCitationFallbackText", citation);
        status.textContent = fallbackShown
          ? "Copying was unavailable. The comparison citation is shown below for manual copying."
          : "Copying was unavailable. You can copy the citation from the comparison details.";
      }
    } finally {
      endAsyncAction(button);
    }
  }

  function citationText(study) {
    const citationUrl = studyRouteUrl(study.id);
    const surface = state.surface === "interior" ? "inside" : "outside";
    const focus = layerFocusLabel();
    const dimensions = `${linearMeasure(study.length)} length × ${linearMeasure(study.span)} span × ${linearMeasure(study.height)} height; ${study.bayCount} bays at ${linearMeasure(study.module)} module; radius ${linearMeasure(study.radius)}; symmetry ${number(study.symmetry, 2)}`;
    return `${study.name} (${study.churchName || study.name}). ${study.typology} study, ${study.place}, ${study.era}. Axis: ${studyAxisLabel(study)}. ${studySource(study)}; ${studySourceNote(study)}. Data status: ${studyStatusLabel(study).toLowerCase()} (${studyStatus(study)}). Definition: ${studyStatusDescription(study)} Dimensions: ${dimensions}. ${surface} ${state.mode} view, ${focus}, ${zoomPercent()} zoom. Sacred Geometry Atlas. ${citationUrl.href}`;
  }

  async function copyCitation() {
    const study = activeStudy();
    const button = $("#copyCitation");
    const status = $("#citationStatus");
    if (!study || !button || !status || !beginAsyncAction(button)) return;
    try {
      hideManualCopyFallbacks();
      const scope = studyShortName(study);
      const citation = citationText(study);
      const copied = await copyText(citation);
      if (copied) {
        button.classList.add("is-copied");
        setButtonFeedback(button, "Citation copied", `Citation copied: ${scope}`);
        status.textContent = `Citation for ${study.name} copied.`;
        window.clearTimeout(citationResetTimer);
        citationResetTimer = window.setTimeout(() => {
          button.classList.remove("is-copied");
          setButtonFeedback(button, "Copy citation", "Copy a citation for the active study");
        }, 2200);
      } else {
        const fallbackShown = revealManualCopyFallback("#citationFallback", "#citationFallbackText", citation);
        status.textContent = fallbackShown
          ? "Copying was unavailable. The citation is shown below for manual copying."
          : "Copying was unavailable. You can copy the citation from the study details.";
      }
    } finally {
      endAsyncAction(button);
    }
  }

  function printStudy() {
    const study = activeStudy();
    const button = $("#printStudy");
    if (!study) return;
    const scope = studyShortName(study);
    if (typeof window.print !== "function") {
      if (button) temporaryButtonFeedback(button, "Unavailable", "Printing is unavailable in this browser.", "Print sheet", "Print active study sheet", "study-print");
      announceKeyboard("Printing is unavailable in this browser.");
      return;
    }
    announceKeyboard(`Printing ${scope} study sheet.`);
    try {
      window.print();
      if (button) temporaryButtonFeedback(button, "Print opened", `Print dialog opened for ${scope}`, "Print sheet", "Print active study sheet", "study-print");
    } catch (error) {
      if (button) temporaryButtonFeedback(button, "Unavailable", "Printing is unavailable in this browser.", "Print sheet", "Print active study sheet", "study-print");
      announceKeyboard("Printing is unavailable in this browser.");
    }
  }

  function printCatalog() {
    const visible = visibleStudies();
    const button = $("#printCatalog");
    const scope = readableScopeLabel(catalogScopeLabel());
    if (!visible.length) {
      announceKeyboard("There are no visible studies to print.");
      return;
    }
    if (typeof window.print !== "function") {
      if (button) temporaryButtonFeedback(button, "Unavailable", "Printing is unavailable in this browser.", "Print", "Print the current catalog view", "catalog-print");
      announceKeyboard("Printing is unavailable in this browser.");
      return;
    }
    const cleanup = () => {
      document.body.classList.remove("print-catalog");
      if (typeof window.removeEventListener === "function") window.removeEventListener("afterprint", cleanup);
    };
    document.body.classList.add("print-catalog");
    if (typeof window.addEventListener === "function") window.addEventListener("afterprint", cleanup, { once: true });
    announceKeyboard(`Printing the catalog view for ${scope}.`);
    try {
      window.print();
      if (button) temporaryButtonFeedback(button, "Print opened", `Print dialog opened for ${scope}`, "Print", "Print the current catalog view", "catalog-print");
    } catch (error) {
      cleanup();
      if (button) temporaryButtonFeedback(button, "Unavailable", "Printing is unavailable in this browser.", "Print", "Print the current catalog view", "catalog-print");
      announceKeyboard("Printing is unavailable in this browser.");
    }
  }

  function printComparison() {
    const comparison = comparisonStudies();
    const button = $("#printComparison");
    const scope = readableScopeLabel(comparisonScopeLabel(comparison));
    if (!comparison.length) return;
    if (typeof window.print !== "function") {
      if (button) temporaryButtonFeedback(button, "Unavailable", "Printing is unavailable in this browser.", "Print comparison", "Print this comparison", "comparison-print");
      announceKeyboard("Printing is unavailable in this browser.");
      return;
    }
    const panel = $(".comparison-table-panel");
    const wasOpen = panel ? panel.open : false;
    const cleanup = () => {
      document.body.classList.remove("print-comparison");
      if (panel) panel.open = wasOpen;
      if (typeof window.removeEventListener === "function") window.removeEventListener("afterprint", cleanup);
    };
    document.body.classList.add("print-comparison");
    if (panel) panel.open = true;
    if (typeof window.addEventListener === "function") window.addEventListener("afterprint", cleanup, { once: true });
    announceKeyboard(`Printing the comparison for ${scope}.`);
    try {
      window.print();
      if (button) temporaryButtonFeedback(button, "Print opened", `Print dialog opened for ${scope}`, "Print comparison", "Print this comparison", "comparison-print");
    } catch (error) {
      cleanup();
      if (button) temporaryButtonFeedback(button, "Unavailable", "Printing is unavailable in this browser.", "Print comparison", "Print this comparison", "comparison-print");
      announceKeyboard("Printing is unavailable in this browser.");
    }
  }

  function triggerDownload(filename, contents, type) {
    if (
      typeof Blob !== "function"
      || typeof URL === "undefined"
      || typeof URL.createObjectURL !== "function"
      || !document.body
      || typeof document.createElement !== "function"
    ) return false;
    let objectUrl = "";
    let anchor = null;
    const revoke = () => {
      if (!objectUrl || typeof URL.revokeObjectURL !== "function") return;
      try {
        URL.revokeObjectURL(objectUrl);
      } catch (error) {
        // Cleanup is best effort; the download itself has already completed or failed.
      }
    };
    try {
      const blob = new Blob([contents], { type });
      objectUrl = URL.createObjectURL(blob);
      anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      if (typeof anchor.click !== "function") throw new Error("Download activation is unavailable");
      anchor.click();
      if (typeof anchor.remove === "function") anchor.remove();
      if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
        window.setTimeout(revoke, 500);
      } else {
        revoke();
      }
      return true;
    } catch (error) {
      if (anchor && typeof anchor.remove === "function") anchor.remove();
      revoke();
      return false;
    }
  }

  function safeDownloadPart(value, fallback = "study") {
    const safe = String(value ?? "")
      .trim()
      .replace(/[\u0027\u2019]/g, "")
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
    return safe || fallback;
  }

  function downloadDrawing() {
    const study = activeStudy();
    const svgElement = $("#geometryCanvas svg");
    const status = $("#drawingDownloadStatus");
    const button = $("#downloadDrawing");
    hideDownloadRecovery();
    if (!study || !svgElement || !beginAsyncAction(button)) return;
    try {
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
    const filename = `${safeDownloadPart(study.id)}-${state.surface}-${state.mode}-${state.layer}.svg`;
    const downloaded = triggerDownload(filename, `<?xml version="1.0" encoding="UTF-8"?>\n${source}`, "image/svg+xml;charset=utf-8");
    if (!downloaded) {
      if (status) status.textContent = "SVG download is unavailable in this browser. Use Print sheet to preserve the current view instead.";
      showDownloadRecovery("SVG export was blocked. Use Print sheet to preserve the current view, or open the static dataset.", "#downloadDrawing");
      return;
    }
    hideDownloadRecovery();
    if (status) status.textContent = `Current drawing exported as ${filename}. ${exportCompletionScope([study], `${studyShortName(study)} · ${drawingStateLabel()}`)}.`;
    temporaryButtonFeedback(button, "Exported", "Drawing exported", "SVG", "Export the current drawing as SVG", "drawing-export");
    } finally {
      endAsyncAction(button, SYNC_ACTION_COOLDOWN_MS);
    }
  }

  function downloadStudy() {
    const study = activeStudy();
    const status = $("#studyDownloadStatus");
    const button = $("#downloadStudy");
    hideDownloadRecovery();
    if (!study || !beginAsyncAction(button)) return;
    try {
    const filename = `${safeDownloadPart(study.id)}-sacred-geometry-study.json`;
    const payload = JSON.stringify(activeStudyExportPayload(study), null, 2);
    const downloaded = triggerDownload(filename, payload, "application/json");
    if (!downloaded) {
      if (status) status.textContent = "Study JSON download is unavailable in this browser. Use the static dataset link instead.";
      showDownloadRecovery("The study export was blocked. Use Print sheet to preserve the current view, or open the static dataset.", "#downloadStudy");
      return;
    }
    hideDownloadRecovery();
    if (status) status.textContent = `Active study exported as ${filename}. ${exportCompletionScope([study], studyShortName(study))}. Data status: ${studyStatusSummary([study])}.`;
    temporaryButtonFeedback(button, "Downloaded", "Study JSON downloaded", "Study JSON", "Download active study as JSON", "study-download");
    } finally {
      endAsyncAction(button, SYNC_ACTION_COOLDOWN_MS);
    }
  }

  function activeStudyExportPayload(study) {
    const shareUrl = studyRouteUrl(study.id);
    return {
      title: `Sacred Geometry Atlas · ${studyShortName(study)}`,
      schema: window.CHURCH_GEOMETRY_SCHEMA || { version: "1.1", units: "meters" },
      schemaUrl: publishedGeometrySchemaUrl(),
      provenance: exportProvenance([study], "active study"),
      view: {
        studyId: study.id,
        surface: state.surface,
        mode: state.mode,
        layer: state.layer,
        zoom: state.zoom,
        route: shareUrl.href
      },
      derived: derivedStudyReadings(study),
      study
    };
  }

  function fullAtlasExportPayload() {
    return {
      title: "Sacred Geometry Atlas",
      schema: window.CHURCH_GEOMETRY_SCHEMA || { version: "1.1", units: "meters" },
      schemaUrl: publishedGeometrySchemaUrl(),
      provenance: exportProvenance(studies, "full collection"),
      studies,
      records: studies.map((study) => ({
        study,
        studyRoute: studyRouteUrl(study.id).href,
        derived: derivedStudyReadings(study)
      }))
    };
  }

  function catalogViewExportPayload(visible) {
    const shareUrl = catalogViewRouteUrl();
    return {
      title: "Sacred Geometry Atlas · catalog view",
      schema: window.CHURCH_GEOMETRY_SCHEMA || { version: "1.1", units: "meters" },
      schemaUrl: publishedGeometrySchemaUrl(),
      provenance: exportProvenance(visible, catalogScopeLabel()),
      view: {
        scope: catalogScopeLabel(),
        route: shareUrl.href,
        query: state.query || null,
        typology: state.filter,
        place: state.filterPlace,
        era: state.filterEra,
        axis: state.filterAxis,
        status: state.filterStatus,
        sort: state.sort,
        compareIds: [...state.compareIds],
        comparisonSelection: comparisonSelectionExportContext()
      },
      records: visible.map((study) => ({
        study,
        studyRoute: studyRouteUrl(study.id).href,
        derived: derivedStudyReadings(study)
      })),
      studies: visible
    };
  }

  function downloadData() {
    const button = $("#downloadData");
    hideDownloadRecovery();
    if (!beginAsyncAction(button)) return;
    try {
    const payload = JSON.stringify(fullAtlasExportPayload(), null, 2);
    const downloaded = triggerDownload("sacred-geometry-atlas.json", payload, "application/json");
    if (!downloaded) {
      $("#downloadStatus").textContent = "Atlas data download is unavailable in this browser. Open the static JSON dataset link instead.";
      showDownloadRecovery("The file download was blocked. Open the static dataset instead.", "#downloadData");
      return;
    }
    hideDownloadRecovery();
    $("#downloadStatus").textContent = `Atlas data downloaded as sacred-geometry-atlas.json. ${exportCompletionScope(studies, "full collection")}. Data status: ${studyStatusSummary()}.`;
    temporaryButtonFeedback(button, "Downloaded", "Atlas data downloaded", "Download data", "Download full atlas data as JSON", "atlas-download");
    } finally {
      endAsyncAction(button, SYNC_ACTION_COOLDOWN_MS);
    }
  }

  function downloadCatalogView() {
    const visible = visibleStudies();
    const status = $("#catalogDownloadStatus");
    const button = $("#downloadCatalogView");
    hideDownloadRecovery();
    if (!visible.length) {
      if (status) status.textContent = "There are no studies in the current catalog view to export.";
      return;
    }
    if (!beginAsyncAction(button)) return;
    try {
    const filename = "sacred-geometry-atlas-view.json";
    const payload = JSON.stringify(catalogViewExportPayload(visible), null, 2);
    const downloaded = triggerDownload(filename, payload, "application/json");
    if (!downloaded) {
      if (status) status.textContent = "Catalog view download is unavailable in this browser. Share the catalog URL instead.";
      showDownloadRecovery("The catalog export was blocked. Use Share view to preserve this filtered route, or open the static dataset.", "#downloadCatalogView");
      return;
    }
    hideDownloadRecovery();
    if (status) status.textContent = `Catalog view exported as ${filename}. ${exportCompletionScope(visible, catalogScopeLabel())}. Data status: ${studyStatusSummary(visible)}.`;
    temporaryButtonFeedback(button, "Exported", "Catalog view exported", "JSON", "Export current catalog view as JSON", "catalog-download");
    } finally {
      endAsyncAction(button, SYNC_ACTION_COOLDOWN_MS);
    }
  }

  function downloadCatalogCsv() {
    const visible = visibleStudies();
    const status = $("#catalogDownloadStatus");
    const button = $("#downloadCatalogCsv");
    hideDownloadRecovery();
    if (!visible.length) {
      if (status) status.textContent = "There are no studies in the current catalog view to export.";
      return;
    }
    if (!beginAsyncAction(button)) return;
    try {
      const filename = "sacred-geometry-atlas-view.csv";
      const downloaded = triggerDownload(filename, `\uFEFF${catalogCsvPayload(visible)}`, "text/csv;charset=utf-8");
      if (!downloaded) {
        if (status) status.textContent = "Catalog CSV download is unavailable in this browser. Share the catalog URL instead.";
        showDownloadRecovery("The catalog CSV export was blocked. Use Share view to preserve this filtered route, or open the static dataset.", "#downloadCatalogCsv");
        return;
      }
      hideDownloadRecovery();
      if (status) status.textContent = `Catalog CSV exported as ${filename}. ${exportCompletionScope(visible, catalogScopeLabel())}. Data status: ${studyStatusSummary(visible)}.`;
      temporaryButtonFeedback(button, "Exported", "Catalog CSV exported", "CSV", "Export current catalog view as CSV", "catalog-csv-download");
    } finally {
      endAsyncAction(button, SYNC_ACTION_COOLDOWN_MS);
    }
  }

  function csvCell(value) {
    const text = String(value ?? "");
    const safeText = typeof value === "string" && /^[\t\r\n ]*[=+\-@]/.test(text)
      ? `'${text}`
      : text;
    return `"${safeText.replace(/"/g, '""')}"`;
  }

  function comparisonCsvPayload(comparison) {
    const route = comparisonRouteUrl().href;
    const scope = comparisonScopeLabel(comparison);
    const schema = window.CHURCH_GEOMETRY_SCHEMA || { version: "1.1", units: "meters" };
    const statusDefinitions = dataStatusDefinitions();
    const unit = geometryUnitSymbol();
    const schemaUrl = publishedGeometrySchemaUrl();
    const headers = [
      "ID", "Study", "Typology", "Place", "Era", "Axis", "Status", "Status definition", "Reference", "Source", "Source note",
      `Length (${unit})`, `Span (${unit})`, "Length / span", `Height (${unit})`, "Height / span",
      "Bay count", `Module (${unit})`, `Radius (${unit})`, `Floor area estimate (${unit}²)`, `Volume estimate (${unit}³)`, "Volume basis", "Symmetry index", "Scope", "Route", "Study route", "Schema version", "Units", "Schema URL"
    ];
    const rows = comparison.map((study) => {
      const floorArea = floorAreaReading(study);
      const volume = volumeReading(study);
      return [
        study.id,
        studyShortName(study),
        study.typology,
        study.place,
        study.era,
        study.axis,
        studyStatus(study),
        statusDefinitions[studyStatus(study)] || "",
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
        floorArea.numeric !== null ? number(floorArea.numeric, 0) : "",
        volume.numeric !== null ? number(volume.numeric, 0) : "",
        volume.basis,
        number(study.symmetry, 2),
        scope,
        route,
        studyRouteUrl(study.id).href,
        schema.version,
        schema.units,
        schemaUrl
      ];
    });
    return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  }

  function catalogCsvPayload(visible) {
    const route = catalogViewRouteUrl().href;
    const scope = catalogScopeLabel();
    const schema = window.CHURCH_GEOMETRY_SCHEMA || { version: "1.1", units: "meters" };
    const statusDefinitions = dataStatusDefinitions();
    const unit = geometryUnitSymbol();
    const schemaUrl = publishedGeometrySchemaUrl();
    const comparisonSelection = comparisonSelectionExportContext();
    const comparisonIds = comparisonSelection.map(({ id }) => id).join(",");
    const comparisonContext = comparisonSelectionCsvText(comparisonSelection);
    const headers = [
      "ID", "Study", "Typology", "Place", "Era", "Axis", "Status", "Status definition", "Reference", "Source", "Source note",
      `Length (${unit})`, `Span (${unit})`, "Length / span", `Height (${unit})`, "Height / span",
      "Bay count", `Module (${unit})`, `Radius (${unit})`, `Floor area estimate (${unit}²)`, `Volume estimate (${unit}³)`, "Volume basis", "Symmetry index", "Scope", "Comparison IDs", "Comparison selection context", "Route", "Study route", "Schema version", "Units", "Schema URL"
    ];
    const rows = visible.map((study) => {
      const floorArea = floorAreaReading(study);
      const volume = volumeReading(study);
      return [
        study.id,
        studyShortName(study),
        study.typology,
        study.place,
        study.era,
        study.axis,
        studyStatus(study),
        statusDefinitions[studyStatus(study)] || "",
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
        floorArea.numeric !== null ? number(floorArea.numeric, 0) : "",
        volume.numeric !== null ? number(volume.numeric, 0) : "",
        volume.basis,
        number(study.symmetry, 2),
        scope,
        comparisonIds,
        comparisonContext,
        route,
        studyRouteUrl(study.id).href,
        schema.version,
        schema.units,
        schemaUrl
      ];
    });
    return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  }

  function comparisonJsonPayload(comparison) {
    const scope = comparisonScopeLabel(comparison);
    return {
      title: "Sacred Geometry Atlas · comparison",
      schema: window.CHURCH_GEOMETRY_SCHEMA || { version: "1.1", units: "meters" },
      schemaUrl: publishedGeometrySchemaUrl(),
      provenance: exportProvenance(comparison, scope),
      view: {
        scope,
        route: comparisonRouteUrl().href,
        compareIds: [...state.compareIds]
      },
      records: comparison.map((study) => ({
        study,
        studyRoute: studyRouteUrl(study.id).href,
        derived: derivedStudyReadings(study)
      }))
    };
  }

  function downloadComparisonCsv() {
    const comparison = comparisonStudies();
    const status = $("#comparisonDownloadStatus");
    const button = $("#downloadComparison");
    hideDownloadRecovery();
    if (!comparison.length) {
      if (status) status.textContent = "There are no comparison records to export.";
      return;
    }
    if (!beginAsyncAction(button)) return;
    try {
    const filename = "sacred-geometry-comparison.csv";
    const downloaded = triggerDownload(filename, `\uFEFF${comparisonCsvPayload(comparison)}`, "text/csv;charset=utf-8");
    if (!downloaded) {
      if (status) status.textContent = "Comparison CSV download is unavailable in this browser. Share the comparison URL instead.";
      showDownloadRecovery("The comparison export was blocked. Use Share comparison to preserve this selection, or open the static dataset.", "#downloadComparison");
      return;
    }
    hideDownloadRecovery();
    if (status) status.textContent = `Comparison CSV exported as ${filename}. ${exportCompletionScope(comparison, comparisonScopeLabel(comparison))}. Data status: ${studyStatusSummary(comparison)}.`;
    temporaryButtonFeedback(button, "Downloaded", "Comparison CSV downloaded", "CSV", "Download comparison data as CSV", "comparison-download");
    } finally {
      endAsyncAction(button, SYNC_ACTION_COOLDOWN_MS);
    }
  }

  function downloadComparisonJson() {
    const comparison = comparisonStudies();
    const status = $("#comparisonDownloadStatus");
    const button = $("#downloadComparisonJson");
    hideDownloadRecovery();
    if (!comparison.length) {
      if (status) status.textContent = "There are no comparison records to export.";
      return;
    }
    if (!beginAsyncAction(button)) return;
    try {
      const filename = "sacred-geometry-comparison.json";
      const payload = JSON.stringify(comparisonJsonPayload(comparison), null, 2);
      const downloaded = triggerDownload(filename, payload, "application/json");
      if (!downloaded) {
        if (status) status.textContent = "Comparison JSON download is unavailable in this browser. Share the comparison URL instead.";
        showDownloadRecovery("The comparison export was blocked. Use Share comparison to preserve this selection, or open the static dataset.", "#downloadComparisonJson");
        return;
      }
      hideDownloadRecovery();
      if (status) status.textContent = `Comparison JSON exported as ${filename}. ${exportCompletionScope(comparison, comparisonScopeLabel(comparison))}. Data status: ${studyStatusSummary(comparison)}.`;
      temporaryButtonFeedback(button, "Downloaded", "Comparison JSON downloaded", "JSON", "Download comparison data as JSON", "comparison-json-download");
    } finally {
      endAsyncAction(button, SYNC_ACTION_COOLDOWN_MS);
    }
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
    updateViewNavigationLinks();
    updateCompareNavigation();
    const tray = $("#compareTray");
    const count = $("#compareCount");
    const summary = $("#compareSummary");
    const provenance = $("#compareProvenance");
    const open = $("#openCompare");
    const clear = $("#clearCompare");
    if (!tray || !count || !open) return;
    const selectedCount = state.compareIds.length;
    const selectedLabel = `${selectedCount} selected ${selectedCount === 1 ? "study" : "studies"}`;
    const selectedStudies = state.compareIds
      .map((id) => studies.find((study) => study.id === id))
      .filter(Boolean);
    const selectedNames = selectedStudies.map(studyShortName);
    const selectedStatuses = selectedStudies.map((study) => `${studyShortName(study)} (${studyStatusLabel(study).toLowerCase()})`);
    const statusSummary = studyStatusSummary(selectedStudies);
    const statusDefinitions = schemaStatusValues()
      .map((status) => `${statusDisplayName(status)}: ${dataStatusDefinitions()[status]}`)
      .join(" ");
    const preview = selectedNames.slice(0, 2).join(" · ");
    const extra = selectedNames.length > 2 ? ` · +${selectedNames.length - 2} more` : "";
    const compareLabel = selectedCount >= 2
      ? `Compare ${selectedLabel}`
      : selectedCount === 1
        ? "Select one more study to compare"
        : "Compare selected studies (select at least two)";
    tray.hidden = selectedCount === 0;
    count.textContent = `${selectedCount} selected`;
    count.setAttribute("aria-label", selectedStatuses.length ? `${selectedLabel}: ${selectedStatuses.join(", ")}` : selectedLabel);
    if (summary) {
      summary.textContent = preview + extra;
      summary.title = selectedNames.join(" · ");
      summary.hidden = !preview;
    }
    if (provenance) {
      provenance.textContent = selectedCount ? `Data status · ${statusSummary}` : "";
      provenance.title = selectedCount ? statusDefinitions : "";
      provenance.setAttribute("aria-label", selectedCount ? `Data status: ${statusSummary}. ${statusDefinitions}` : "");
      provenance.hidden = selectedCount === 0;
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
    if (state.compareIds.length >= 2) return selectedComparisonStudies();
    return studies;
  }

  function comparisonScopeLabel(comparison = comparisonStudies()) {
    if (state.compareIds.length >= 2) return `${comparison.length} selected studies`;
    if (state.compareIds.length === 1) return "full collection · 1 selected; choose one more for a focused comparison";
    return "full collection";
  }

  function comparisonRouteUrl() {
    const url = clearCatalogParams(new URL(window.location.href));
    if (state.compareIds.length === 1) url.searchParams.set("compare", state.compareIds[0]);
    url.hash = routeHash("compare", false);
    return url;
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
      const editLabel = selected >= 2 ? "Edit comparison selection in Atlas" : selected === 1 ? "Select another study in Atlas" : "Browse studies in Atlas";
      edit.setAttribute("aria-label", editLabel);
      edit.title = editLabel;
      edit.setAttribute("href", atlasStudyNavigationUrl(state.activeId));
      const editText = edit.querySelector("span:last-child");
      if (editText) editText.textContent = selected >= 2 ? "Edit selection" : selected === 1 ? "Select another" : "Browse Atlas";
    }
    if (state.page === "compare") updateDocumentTitle("compare");
  }

  function renderCompareContext() {
    const selected = state.compareIds.length;
    const focused = selected >= 2;
    const partial = selected === 1;
    const compareScopeLabel = focused ? "selected collection" : "full collection";
    const current = activeStudy();
    const currentStudyContext = focused && current
      ? state.compareIds.includes(current.id)
        ? ` The current Atlas study, ${studyShortName(current)}, is marked in the comparison.`
        : ` The current Atlas study, ${studyShortName(current)}, is outside this comparison.`
      : "";
    const sectionNote = $("#compareSectionNote");
    const geometryKicker = $("#geometryCompareKicker");
    const scope = $("#compareScope");
    const helper = $("#compareHelper");
    if (sectionNote) sectionNote.textContent = `Relative readings · ${compareScopeLabel}`;
    if (geometryKicker) geometryKicker.textContent = focused ? "00 / selected geometry" : "00 / collection geometry";
    if (scope) scope.textContent = focused ? `${selected} selected` : partial ? "1 selected · choose one more" : "Full collection";
    if (helper) helper.textContent = focused
      ? `Focused comparison is using the studies you selected in the Atlas.${currentStudyContext} Open a study from a geometry card or its table link.`
      : partial
        ? "One study is selected for comparison. Select one more study in the Atlas to create a focused comparison; the full collection is shown until then."
        : "Select two or more studies with the + controls in the Atlas to create a focused comparison. Without a selection, the full collection is shown; geometry cards and table links open studies in Atlas.";
    const comparisonStatusHelp = $("#comparisonStatusHelp");
    if (comparisonStatusHelp) comparisonStatusHelp.textContent = statusGuidanceText(comparisonStudies(), focused ? `${selected} selected studies` : "the full collection");
    const printRoute = $("#comparisonPrintRoute");
    const comparisonRoute = comparisonRouteUrl();
    renderRouteLink(printRoute, ".comparison-route-link", routePath(comparisonRoute), focused ? `Open the ${selected}-study comparison route` : partial ? "Open the comparison route with the pending selection" : "Open the full collection comparison route");
  }

  function renderCompareSelection() {
    const selection = $("#compareSelection");
    const list = $("#compareSelectionList");
    const clear = $("#clearCompareView");
    if (!selection || !list) return;
    const focused = state.compareIds.length >= 2;
    const comparison = selectedComparisonStudies();
    selection.hidden = !comparison.length;
    const heading = $("#compareSelectionHeading");
    const selectionCount = comparison.length;
    const selectionCountLabel = `${selectionCount} ${selectionCount === 1 ? "study" : "studies"}`;
    if (heading) heading.textContent = `${focused ? "Focused selection" : "Pending selection"} · ${selectionCountLabel}`;
    list.innerHTML = comparison.length ? comparison.map((study) => {
      const axisLabel = studyAxisLabel(study);
      const status = studyDataLabel(study);
      const statusLabel = statusDisplayName(status);
      const isActive = study.id === state.activeId;
      const currentLabel = isActive ? " Current Atlas study." : "";
      const label = `Remove ${study.name} from comparison. Axis: ${axisLabel}. Data status: ${statusLabel} (${status}); ${studyStatusDescription(study)}; Source: ${studySource(study)}; ${studySourceNote(study)}${currentLabel}`;
      const currentCue = isActive ? '<span class="compare-selection-chip-current" title="Current Atlas study">current</span>' : "";
      return `<button class="compare-selection-chip" data-remove-compare-id="${escapeHtml(study.id)}" type="button" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><span>${escapeHtml(studyShortName(study))}</span><span class="compare-selection-chip-axis" title="${escapeHtml(axisLabel)}">${escapeHtml(axisLabel)}</span><span class="compare-selection-chip-status" data-status="${escapeHtml(status)}" title="${escapeHtml(studyStatusDescription(study))}">${escapeHtml(statusLabel)}</span>${currentCue}<span aria-hidden="true">×</span></button>`;
    }).join("") : "";
    if (clear && comparison.length) {
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
    const unit = geometryUnitSymbol();
    const unitHeaders = {
      length: `Length (${unit})`,
      span: `Span (${unit})`,
      height: `Height (${unit})`,
      module: `Module (${unit})`,
      radius: `Radius (${unit})`,
      area: `Floor area (${unit}²)`,
      volume: `Est. volume (${unit}³)`
    };
    $$('[data-unit-header]').forEach((header) => {
      const key = header.dataset.unitHeader;
      if (unitHeaders[key]) header.textContent = unitHeaders[key];
    });
    if (summary) summary.textContent = isFocused
      ? `Read the ${comparison.length} selected study records as a table`
      : `Read the ${comparison.length} study records as a table`;
    if (caption) caption.textContent = isFocused
      ? `Recorded study values for ${comparison.length} selected studies; each row includes its data status and source note.`
      : "Recorded study values for the full collection; each row includes its data status and source note.";
    body.innerHTML = comparison.map((study) => {
      const ratio = study.length / study.span;
      const section = study.height / study.span;
      const floorArea = floorAreaReading(study);
      const volume = volumeReading(study);
      const status = studyDataLabel(study);
      const statusLabel = statusDisplayName(status);
      const isActive = study.id === state.activeId;
      const currentStudyAttribute = isActive ? ' aria-current="true"' : "";
      const studyLinkLabel = `Open ${studyShortName(study)} in Atlas${isActive ? ". Current Atlas study." : "."} Axis: ${studyAxisLabel(study)}; Data status: ${statusLabel} (${status}); ${studyStatusDescription(study)}; Source: ${studySource(study)}; ${studySourceNote(study)}`;
      return `
        <tr>
          <th scope="row"><a class="comparison-table-study-link" data-table-study="${escapeHtml(study.id)}" href="${escapeHtml(atlasStudyNavigationUrl(study.id))}"${currentStudyAttribute} aria-label="${escapeHtml(studyLinkLabel)}">${escapeHtml(studyShortName(study))}${isActive ? ' <span class="comparison-table-study-state">current</span>' : ""} <span aria-hidden="true">↗</span></a></th>
          <td>${escapeHtml(studyAxisLabel(study))}</td>
          <td class="comparison-status" data-status="${escapeHtml(status)}" aria-label="${escapeHtml(`${statusLabel} (${status}): ${studyStatusDescription(study)}`)}" title="${escapeHtml(studyStatusDescription(study))}">${escapeHtml(statusLabel)}</td>
          <td class="comparison-source"><strong>${escapeHtml(studySource(study))}</strong><span>${escapeHtml(studySourceNote(study))}</span></td>
          <td>${escapedLinearMeasure(study.length)}</td>
          <td>${escapedLinearMeasure(study.span)}</td>
          <td>${number(ratio, 2)}</td>
          <td>${escapedLinearMeasure(study.height)}</td>
          <td>${number(section, 2)}</td>
          <td>${study.bayCount}</td>
          <td>${escapedLinearMeasure(study.module)}</td>
          <td>${escapedLinearMeasure(study.radius)}</td>
          <td>${number(study.symmetry, 2)}</td>
          <td>${escapeHtml(floorArea.value)}</td>
          <td>${escapeHtml(volume.value)}</td>
          <td class="comparison-provenance">${escapeHtml(volume.basis)}</td>
        </tr>
      `;
    }).join("");
    updateComparisonTableScrollCue();
  }

  function renderGeometryCompare() {
    const target = $("#geometryCompare");
    if (!target) return;
    target.setAttribute("aria-label", "Study envelopes; each card identifies its schema-defined data status, source, and source note.");
    target.innerHTML = comparisonStudies().map((study) => {
      const ratio = number(study.length / study.span, 2);
      const section = number(study.height / study.span, 2);
      const measureLabel = `${study.length} × ${study.span} × ${study.height} ${geometryUnitSymbol()} · radius ${study.radius} ${geometryUnitSymbol()}`;
      const label = comparisonStudyAriaLabel(study, ratio, section);
      const isActive = study.id === state.activeId;
      const currentStudyAttribute = isActive ? ' aria-current="true"' : "";
      const currentLabel = isActive ? " This is the current Atlas study." : "";
      const status = studyDataLabel(study);
      const statusLabel = statusDisplayName(status);
      return `
      <a class="compare-study-card ${isActive ? "is-active" : ""}" data-compare-study="${escapeHtml(study.id)}" href="${escapeHtml(atlasStudyNavigationUrl(study.id))}" aria-controls="atlas"${currentStudyAttribute} aria-label="${label}${currentLabel}">
        <span class="compare-study-number">${escapeHtml(study.index)} / <span class="compare-study-status" data-status="${escapeHtml(status)}" title="${escapeHtml(studyStatusDescription(study))}">${escapeHtml(statusLabel)}</span></span>
        ${miniPlan(study)}
        <span class="compare-study-title">${escapeHtml(study.name)}</span>
        <span class="compare-study-context">${escapeHtml(study.typology)} · ${escapeHtml(study.place)} · ${escapeHtml(study.era)} · ${escapeHtml(studyAxisLabel(study))}</span>
        <span class="compare-study-measure">${escapeHtml(measureLabel)}</span>
        <span class="compare-study-emphasis">${escapeHtml(study.emphasis)}</span>
        <span class="compare-study-meta">${ratio} ratio · ${section} section</span>
        <span class="compare-study-open">${isActive ? "Current Atlas study · open in Atlas" : "Open in Atlas"} <span aria-hidden="true">↗</span></span>
      </a>
    `;
    }).join("");
  }

  function comparisonStudyAriaLabel(study, ratio, section) {
    const status = studyStatus(study);
    return `Open ${escapeHtml(study.name)} in the Atlas. ${escapeHtml(study.typology)} study at ${escapeHtml(study.place)}, ${escapeHtml(study.era)}; ${escapeHtml(studyAxisLabel(study))}; ${escapeHtml(study.emphasis)}; Data status: ${escapeHtml(statusDisplayName(status))} (${escapeHtml(status)}); ${escapeHtml(studyStatusDescription(study))}; Source: ${escapeHtml(studySource(study))}; ${escapeHtml(studySourceNote(study))}; Dimensions: ${number(study.length)} ${escapeHtml(geometryUnitName())} long, with a span of ${number(study.span)} ${escapeHtml(geometryUnitName())}, and a height of ${number(study.height)} ${escapeHtml(geometryUnitName())}; primary radius ${number(study.radius)} ${escapeHtml(geometryUnitName())}. Length to span ratio ${ratio}; height to span ratio ${section}.`;
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
    const maxModule = Math.max(...comparison.map((study) => study.module));
    const ratioScale = $("#ratioChartScale");
    const heightScale = $("#heightChartScale");
    const moduleScale = $("#moduleChartScale");
    const chartScaleStatus = $("#comparisonChartScaleStatus");
    const compareView = $("#compareView");
    const ratioAxisMid = $("#ratioChartAxisMid");
    const ratioAxisMax = $("#ratioChartAxisMax");
    const heightAxisMid = $("#heightChartAxisMid");
    const heightAxisMax = $("#heightChartAxisMax");
    const moduleAxisMid = $("#moduleChartAxisMid");
    const moduleAxisMax = $("#moduleChartAxisMax");
    const unit = geometryUnitSymbol();
    const unitName = geometryUnitName();
    if (ratioScale) ratioScale.textContent = `Scale 0 → ${number(maxRatio, 2)} · active comparison maximum`;
    if (heightScale) heightScale.textContent = `Scale 0 → ${number(maxHeightRatio, 2)} · active comparison maximum`;
    if (moduleScale) moduleScale.textContent = `Scale 0 → ${number(maxModule)} ${unit} · active comparison maximum`;
    if (chartScaleStatus && (!compareView || !compareView.hidden)) chartScaleStatus.textContent = `Comparison ranges updated: length to span 0 → ${number(maxRatio, 2)}; height to span 0 → ${number(maxHeightRatio, 2)}; module 0 → ${number(maxModule)} ${unit}.`;
    if (ratioAxisMid) ratioAxisMid.textContent = number(maxRatio / 2, 2);
    if (ratioAxisMax) ratioAxisMax.textContent = number(maxRatio, 2);
    if (heightAxisMid) heightAxisMid.textContent = number(maxHeightRatio / 2, 2);
    if (heightAxisMax) heightAxisMax.textContent = number(maxHeightRatio, 2);
    if (moduleAxisMid) moduleAxisMid.textContent = `${number(maxModule / 2, 2)} ${unit}`;
    if (moduleAxisMax) moduleAxisMax.textContent = `${number(maxModule)} ${unit}`;
    const meterAttributes = (label, value, maximum, valueText) => `role="meter" aria-label="${escapeHtml(label)}" aria-valuemin="0" aria-valuemax="${number(maximum, 2)}" aria-valuenow="${number(value, 2)}" aria-valuetext="${escapeHtml(valueText)}"`;
    const currentStudyContext = (study) => {
      const isActive = study.id === state.activeId;
      return {
        className: isActive ? " is-active" : "",
        description: isActive ? ' aria-describedby="comparisonCurrentStudyContext"' : "",
        cue: isActive ? '<span class="chart-current" title="Current Atlas study">current</span>' : ""
      };
    };
    $("#ratioChart").innerHTML = comparison.map((study) => {
      const ratio = study.length / study.span;
      const status = studyDataLabel(study);
      const statusLabel = statusDisplayName(status);
      const axisLabel = studyAxisLabel(study);
      const current = currentStudyContext(study);
      return `<div class="bar-row${current.className}" role="listitem" aria-label="${escapeHtml(studyShortName(study))}: length to span ratio; ${escapeHtml(axisLabel)}; ${escapeHtml(statusLabel)} (${escapeHtml(status)}) record: ${escapeHtml(studyStatusDescription(study))}; Source: ${escapeHtml(studySource(study))}; ${escapeHtml(studySourceNote(study))}"${current.description}><span class="bar-label" aria-hidden="true"><span class="chart-study-name">${escapeHtml(studyShortName(study))}</span><span class="chart-study-meta"><span class="chart-axis-context" title="${escapeHtml(axisLabel)}">${escapeHtml(axisLabel)}</span><span class="chart-status" data-status="${escapeHtml(status)}" title="${escapeHtml(studyStatusDescription(study))}">${escapeHtml(statusLabel)}</span>${current.cue}</span></span><span class="bar-track" ${meterAttributes("Relative length to span ratio", ratio, maxRatio, `${number(ratio, 2)} of ${number(maxRatio, 2)} maximum`)}><i class="bar-fill" style="width:${(ratio / maxRatio) * 100}%"></i></span><span class="bar-value" aria-hidden="true">${number(ratio, 2)}</span></div>`;
    }).join("");
    $("#heightChart").innerHTML = comparison.map((study) => {
      const ratio = study.height / study.span;
      const status = studyDataLabel(study);
      const statusLabel = statusDisplayName(status);
      const axisLabel = studyAxisLabel(study);
      const current = currentStudyContext(study);
      return `<div class="bar-row${current.className}" role="listitem" aria-label="${escapeHtml(studyShortName(study))}: height to span ratio; ${escapeHtml(axisLabel)}; ${escapeHtml(statusLabel)} (${escapeHtml(status)}) record: ${escapeHtml(studyStatusDescription(study))}; Source: ${escapeHtml(studySource(study))}; ${escapeHtml(studySourceNote(study))}"${current.description}><span class="bar-label" aria-hidden="true"><span class="chart-study-name">${escapeHtml(studyShortName(study))}</span><span class="chart-study-meta"><span class="chart-axis-context" title="${escapeHtml(axisLabel)}">${escapeHtml(axisLabel)}</span><span class="chart-status" data-status="${escapeHtml(status)}" title="${escapeHtml(studyStatusDescription(study))}">${escapeHtml(statusLabel)}</span>${current.cue}</span></span><span class="bar-track" ${meterAttributes("Relative height to span ratio", ratio, maxHeightRatio, `${number(ratio, 2)} of ${number(maxHeightRatio, 2)} maximum`)}><i class="bar-fill teal" style="width:${(ratio / maxHeightRatio) * 100}%"></i></span><span class="bar-value" aria-hidden="true">${number(ratio, 2)}</span></div>`;
    }).join("");
    $("#moduleChart").innerHTML = comparison.map((study) => {
      const status = studyDataLabel(study);
      const statusLabel = statusDisplayName(status);
      const moduleWidth = (study.module / maxModule) * 100;
      const axisLabel = studyAxisLabel(study);
      const current = currentStudyContext(study);
      return `
      <div class="module-row${current.className}" role="listitem" aria-label="${escapeHtml(studyShortName(study))}: ${study.bayCount} bays, module length; ${escapeHtml(axisLabel)}; ${escapeHtml(statusLabel)} (${escapeHtml(status)}) record: ${escapeHtml(studyStatusDescription(study))}; Source: ${escapeHtml(studySource(study))}; ${escapeHtml(studySourceNote(study))}"${current.description}>
        <span class="module-name" aria-hidden="true"><span class="chart-study-name">${escapeHtml(studyShortName(study))}</span><span class="chart-study-meta"><span class="chart-axis-context" title="${escapeHtml(axisLabel)}">${escapeHtml(axisLabel)}</span><span class="chart-status" data-status="${escapeHtml(status)}" title="${escapeHtml(studyStatusDescription(study))}">${escapeHtml(statusLabel)}</span>${current.cue}</span></span>
        <span class="module-bars" ${meterAttributes("Relative module length", study.module, maxModule, `${number(study.module)} ${unit} of ${number(maxModule)} ${unit} maximum`)} style="width:${moduleWidth}%">${Array.from({ length: study.bayCount }, () => '<i class="module-bar"></i>').join("")}</span>
        <span class="module-value" aria-hidden="true">${escapedLinearMeasure(study.module)}</span>
      </div>
    `;
    }).join("");
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
    const unitName = geometryUnitName();
    const description = `${surface} ${state.mode} ${studyStatusLabel(study).toLowerCase()} drawing showing the ${layer} for ${study.name} at ${zoomPercent()} zoom. Overall dimensions are length ${study.length} ${unitName}, span ${study.span} ${unitName}, and height ${study.height} ${unitName}. Envelope: ${study.envelope}. Axis: ${studyAxisLabel(study)}. Rhythm: ${study.bayCount} bays at a ${number(study.module)} ${unitName} module. Primary radius: ${number(study.radius)} ${unitName}. Symmetry index: ${number(study.symmetry, 2)}. Reading: ${reading || "No interpretive reading supplied."} Status: ${studyStatusDescription(study)} Reference: ${study.churchName || study.name}.`;
    return `<svg class="geometry-svg focus-${escapeHtml(state.layer)}" viewBox="0 0 820 510" role="img" aria-labelledby="drawing-title" aria-describedby="drawing-description" focusable="false"><title id="drawing-title">${escapeHtml(title)}</title><desc id="drawing-description">${escapeHtml(description)}</desc><defs>
      <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" class="grid-line" fill="none" /></pattern>
      <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path class="dimension-arrow" d="M6 0L0 3L6 6" fill="none" stroke="#e77f62" stroke-width="1" /></marker>
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
    const drawingScale = $("#drawingScale");
    if (drawingScale) {
      drawingScale.textContent = `Illustrative diagram · 1 : ${state.mode === "section" ? "120" : "200"}`;
      drawingScale.title = "Illustrative diagram reference; not a measured survey scale";
    }
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
      content += dimensionLine(x, y - 25, x + width, y - 25, rawMeasure(study.length), x + width / 2, y - 33);
      content += dimensionLine(x - 25, y, x - 25, y + height * 0.72, rawMeasure(study.span), x - 34, y + height * 0.36);
      content += `<text class="small-label" x="${x + width / 2}" y="${y + height + 33}" text-anchor="middle">module ${escapeHtml(linearMeasure(study.module))} · ${study.bayCount} bays · radius ${escapeHtml(linearMeasure(study.radius))}</text>`;
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
      content += dimensionLine(x, y - 25, x + width, y - 25, rawMeasure(study.length), x + width / 2, y - 33);
      content += dimensionLine(x - 25, y + height * 0.42, x - 25, y + height * 0.59, rawMeasure(study.span), x - 34, y + height * 0.51);
      content += `<text class="small-label" x="${x + width / 2}" y="${y + height + 33}" text-anchor="middle">pointed bay · ${study.bayCount} ribs · radius ${escapeHtml(linearMeasure(study.radius))}</text>`;
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
      content += dimensionLine(330 - r * 1.18, 265 + r * 1.55, 330 + r * 1.18, 265 + r * 1.55, rawMeasure(study.span), 330, 265 + r * 1.7);
      content += `<text class="small-label" x="330" y="${265 + r * 1.95}" text-anchor="middle">central radius ${escapeHtml(linearMeasure(study.radius))} · 4 arms · dome field</text>`;
    } else if (study.type === "baroque") {
      const rx = width * 0.37;
      const ry = height * 0.44;
      content += `<rect class="${mainClass}" x="${x}" y="${y + height * 0.2}" width="${width}" height="${height * 0.6}" rx="${height * 0.12}" />`;
      content += `<ellipse class="${inner ? "interior-fill" : "primary-line"}" cx="330" cy="265" rx="${rx}" ry="${ry}" fill="${inner ? "rgba(136,198,186,.08)" : "none"}" />`;
      content += `<line class="secondary-line" x1="330" y1="${y}" x2="330" y2="${y + height}" /><line class="secondary-line" x1="${x}" y1="265" x2="${x + width}" y2="265" />`;
      content += `<circle class="column" cx="${330 - rx}" cy="265" r="4" /><circle class="column" cx="${330 + rx}" cy="265" r="4" />`;
      content += dimensionLine(x, y - 25, x + width, y - 25, rawMeasure(study.length), 330, y - 33);
      content += `<text class="small-label" x="330" y="${y + height + 33}" text-anchor="middle">ellipse ${escapeHtml(linearMeasure(rx / scale))} × ${escapeHtml(linearMeasure(ry / scale))} · 2 focal points</text>`;
    } else if (study.type === "stave") {
      content += `<rect class="${mainClass}" x="${x + width * 0.15}" y="${y + height * 0.16}" width="${width * 0.7}" height="${height * 0.68}" />`;
      content += `<rect class="${mainClass}" x="${x + width * 0.28}" y="${y + height * 0.04}" width="${width * 0.44}" height="${height * 0.92}" />`;
      for (let i = 0; i < study.bayCount; i += 1) {
        const px = x + width * 0.29 + (width * 0.42 / Math.max(1, study.bayCount - 1)) * i;
        content += `<line class="secondary-line" x1="${px}" y1="${y + height * 0.06}" x2="${px}" y2="${y + height * 0.94}" />`;
      }
      content += `<path class="${inner ? "secondary-line" : "primary-line"}" d="M${x + width * 0.13} ${y + height * 0.16}L${x + width * 0.27} ${y}L${x + width * 0.5} ${y + height * 0.13}L${x + width * 0.73} ${y}L${x + width * 0.87} ${y + height * 0.16}" fill="none" />`;
      content += dimensionLine(x + width * 0.15, y + height + 25, x + width * 0.85, y + height + 25, rawMeasure(study.span), 330, y + height + 33);
      content += `<text class="small-label" x="330" y="${y + height + 58}" text-anchor="middle">${study.bayCount} post frames · module ${escapeHtml(linearMeasure(study.module))}</text>`;
    } else {
      const poly = `${x + width * 0.08},${y + height * 0.75} ${x + width * 0.17},${y + height * 0.15} ${x + width * 0.6},${y + height * 0.05} ${x + width * 0.92},${y + height * 0.3} ${x + width * 0.78},${y + height * 0.86} ${x + width * 0.08},${y + height * 0.75}`;
      content += `<polygon class="${mainClass}" points="${poly}" />`;
      for (let i = 1; i < study.bayCount; i += 1) {
        const px = x + width * (0.18 + i * 0.18);
        content += `<line class="secondary-line" x1="${px}" y1="${y + height * 0.14}" x2="${px - 10}" y2="${y + height * 0.78}" />`;
      }
      content += `<line class="axis-line" x1="${x}" y1="${y + height * 0.5}" x2="${x + width}" y2="${y + height * 0.5}" />`;
      content += dimensionLine(x + width * 0.08, y + height + 25, x + width * 0.78, y + height + 25, rawMeasure(study.length), x + width * 0.43, y + height + 33);
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
    content += dimensionLine(x, ground + 30, x + width, ground + 30, rawMeasure(study.length), x + width / 2, ground + 47);
    content += dimensionLine(x + width + 28, ground, x + width + 28, top, rawMeasure(study.height), x + width + 42, (ground + top) / 2);
    content += `<text class="small-label" x="330" y="${ground + 78}" text-anchor="middle">${escapeHtml(study.emphasis.toLowerCase())} · height / span ${number(study.height / study.span, 2)}</text>`;
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
    content += dimensionLine(x, ground + 30, x + width, ground + 30, rawMeasure(study.span), 330, ground + 47);
    content += dimensionLine(x + width + 28, ground, x + width + 28, top, rawMeasure(study.height), x + width + 42, (ground + top) / 2);
    content += `<text class="small-label" x="330" y="${ground + 78}" text-anchor="middle">vault / roof profile · ${study.type === "central" ? "central radius" : `module ${escapeHtml(linearMeasure(study.module))}`}</text>`;
    return content;
  }

  init();
})();
