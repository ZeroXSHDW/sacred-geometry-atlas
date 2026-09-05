#!/usr/bin/env bash
set -euo pipefail

node - <<'NODE'
const fs = require('fs');
const vm = require('vm');
const location = { href: 'https://example.test/atlas/?q=central%20plan#compare/basilica,gothic', hash: '#compare/basilica,gothic' };
const historyCalls = [];
const elements = new Map([
  ['#atlas', { hidden: false }],
  ['#compareView', { hidden: false }],
  ['#methodView', { hidden: false }]
]);
const move = (url) => {
  const next = new URL(url, location.href);
  location.href = next.href;
  location.hash = next.hash;
};
const context = {
  URL,
  window: {
    location,
    history: {
      pushState(state, title, url) {
        historyCalls.push(['pushState', state, url]);
        move(url);
      },
      replaceState(state, title, url) {
        historyCalls.push(['replaceState', state, url]);
        move(url);
      }
    },
    addEventListener() {}
  },
  document: {
    title: '',
    body: { classList: { contains() { return false; } } },
    querySelector(selector) { return elements.get(selector) || null; },
    querySelectorAll() { return []; }
  }
};
vm.runInNewContext(fs.readFileSync('data/geometry.js', 'utf8'), context);
const app = fs.readFileSync('app.js', 'utf8').replace('  init();\n})();', '  window.__atlasTest = { state, showPage, comparisonStudies, renderCompareSelection, renderCompareContext, renderCharts, renderGeometryCompare, renderComparisonTable, axisDisplayLabel, studyAxisLabel, catalogStudyAriaLabel, comparisonStudyAriaLabel, comparisonSelectionShareText, comparisonSelectionExportContext, comparisonSelectionCsvText, comparisonCitationText };\n})();');
vm.runInNewContext(app, context);
const { state, showPage, comparisonStudies, renderCompareSelection, renderCompareContext, renderCharts, renderGeometryCompare, renderComparisonTable, axisDisplayLabel, studyAxisLabel, catalogStudyAriaLabel, comparisonStudyAriaLabel, comparisonSelectionShareText, comparisonSelectionExportContext, comparisonSelectionCsvText, comparisonCitationText } = context.window.__atlasTest;
const firstStudy = context.window.CHURCH_GEOMETRY[0];
const secondStudy = context.window.CHURCH_GEOMETRY[1];
const firstStudyLabel = firstStudy.shortName || firstStudy.name;
const secondStudyLabel = secondStudy.shortName || secondStudy.name;
const firstAxisLabel = studyAxisLabel(firstStudy);
const firstStatus = firstStudy.status;
const firstStatusLabel = firstStatus.charAt(0).toUpperCase() + firstStatus.slice(1);
const firstStatusDefinition = context.window.CHURCH_GEOMETRY_SCHEMA.statusDefinitions[firstStatus];
const firstRoute = '#atlas/' + encodeURIComponent(firstStudy.id) + '/plan/exterior/all';
state.page = 'compare';
state.activeId = 'basilica';
state.compareIds = ['basilica', 'gothic'];
state.compareIds = ['gothic', 'basilica'];
if (comparisonStudies().map((study) => study.id).join(',') !== 'gothic,basilica') throw new Error('Focused comparison did not preserve selection order');
state.compareIds = ['basilica', 'gothic'];
const selection = { hidden: true };
const selectionList = { innerHTML: '' };
const selectionHeading = { textContent: '' };
const clearSelection = { setAttribute(name, value) { this[name] = value; } };
elements.set('#compareSelection', selection);
elements.set('#compareSelectionList', selectionList);
elements.set('#compareSelectionHeading', selectionHeading);
elements.set('#clearCompareView', clearSelection);
renderCompareSelection();
if (selection.hidden || selectionHeading.textContent !== 'Focused selection · 2 studies' || !selectionList.innerHTML.includes('data-remove-compare-id="' + firstStudy.id + '"') || !selectionList.innerHTML.includes(firstStudyLabel.replace(/'/g, '&#39;')) || !selectionList.innerHTML.includes('class="compare-selection-chip-axis" title="' + firstAxisLabel + '">' + firstAxisLabel + '</span>') || !selectionList.innerHTML.includes('class="compare-selection-chip-status" data-status="' + firstStatus + '" title="' + firstStatusDefinition + '">' + firstStatusLabel + '</span>') || !selectionList.innerHTML.includes('class="compare-selection-chip-current" title="Current Atlas study">current</span>') || !selectionList.innerHTML.includes('Axis: ' + firstAxisLabel + '. Data status: ' + firstStatusLabel + ' (' + firstStatus + '); ' + firstStatusDefinition) || !selectionList.innerHTML.includes('Source: ' + firstStudy.source + '; ' + firstStudy.sourceNote) || clearSelection['aria-label'] !== 'Clear 2 selected studies') throw new Error('Focused selection did not render its count-aware scope heading, removable study names with axis, status, source provenance, and current-study context');
state.compareIds = ['baroque', 'concrete'];
if (!selectionList.innerHTML.includes('class="compare-selection-study-link" data-compare-selection-study="' + firstStudy.id + '"') || !selectionList.innerHTML.includes('href="/atlas/?compare=') || !selectionList.innerHTML.includes(' aria-current="true" aria-label="Open study ' + firstStudy.index + ', ' + firstStudy.name.replace(/'/g, '&#39;') + ' in Atlas.') || !selectionList.innerHTML.includes(firstRoute + '"') || !selectionList.innerHTML.includes('class="compare-selection-chip-remove" data-remove-compare-id="' + firstStudy.id + '" type="button" aria-label="Remove study ' + firstStudy.index + ', ' + firstStudy.name.replace(/'/g, '&#39;') + ' from comparison"')) throw new Error('Focused selection did not expose a route-native Atlas link and a separate, indexed, labeled removal control for each study');
renderCompareSelection();
if (!selectionList.innerHTML.includes('title="Compressed axis">Compressed axis</span>') || !selectionList.innerHTML.includes('title="Offset axis">Offset axis</span>') || selectionList.innerHTML.includes('axis axis')) throw new Error('Focused selection axis badges must avoid duplicate axis labels');
const baroqueStudy = context.window.CHURCH_GEOMETRY.find((study) => study.id === 'baroque');
const concreteStudy = context.window.CHURCH_GEOMETRY.find((study) => study.id === 'concrete');
const normalizedSelectionContext = comparisonSelectionCsvText(comparisonSelectionExportContext());
if (axisDisplayLabel('Compressed axis') !== 'Compressed axis' || studyAxisLabel(baroqueStudy) !== 'Compressed axis' || studyAxisLabel(concreteStudy) !== 'Offset axis' || catalogStudyAriaLabel(baroqueStudy, false).includes('Compressed axis axis') || comparisonStudyAriaLabel(baroqueStudy, 1.44, 0.81).includes('Compressed axis axis') || comparisonSelectionShareText([baroqueStudy, concreteStudy]).includes('axis axis') || normalizedSelectionContext.includes('axis axis') || comparisonCitationText([baroqueStudy]).includes('axis axis')) throw new Error('Human-facing axis labels retained duplicate axis wording across catalog, comparison, share, CSV, or citation surfaces');
state.compareIds = ['basilica', 'gothic'];
const originalBasilicaStatus = context.window.CHURCH_GEOMETRY[0].status;
context.window.CHURCH_GEOMETRY[0].status = 'measured';
renderCompareSelection();
if (!selectionList.innerHTML.includes('class="compare-selection-chip-status" data-status="measured" title="Source-supported dimensions.">Measured</span>')) throw new Error('Focused selection provenance badge did not follow a measured record');
context.window.CHURCH_GEOMETRY[0].status = originalBasilicaStatus;
state.compareIds = [];
renderCompareSelection();
if (!selection.hidden || selectionList.innerHTML !== '') throw new Error('Focused selection did not hide after clearing its scope');
state.compareIds = ['basilica', 'gothic'];
const sectionNote = { textContent: '' };
const geometryKicker = { textContent: '' };
const compareScope = { textContent: '' };
const compareHelper = { textContent: '' };
const comparisonPrintRoute = { textContent: '' };
elements.set('#compareSectionNote', sectionNote);
elements.set('#geometryCompareKicker', geometryKicker);
elements.set('#compareScope', compareScope);
elements.set('#compareHelper', compareHelper);
elements.set('#comparisonPrintRoute', comparisonPrintRoute);
const geometryCompare = { innerHTML: '', setAttribute(name, value) { this[name] = value; } };
const ratioChart = { innerHTML: '' };
const heightChart = { innerHTML: '' };
const moduleChart = { innerHTML: '' };
const ratioScale = { textContent: '' };
const heightScale = { textContent: '' };
const moduleScale = { textContent: '' };
const chartScaleStatus = { textContent: '' };
const ratioAxisMid = { textContent: '' };
const ratioAxisMax = { textContent: '' };
const heightAxisMid = { textContent: '' };
const heightAxisMax = { textContent: '' };
const moduleAxisMid = { textContent: '' };
const moduleAxisMax = { textContent: '' };
elements.set('#geometryCompare', geometryCompare);
elements.set('#ratioChart', ratioChart);
elements.set('#heightChart', heightChart);
elements.set('#moduleChart', moduleChart);
elements.set('#ratioChartScale', ratioScale);
elements.set('#heightChartScale', heightScale);
elements.set('#moduleChartScale', moduleScale);
elements.set('#comparisonChartScaleStatus', chartScaleStatus);
elements.set('#ratioChartAxisMid', ratioAxisMid);
elements.set('#ratioChartAxisMax', ratioAxisMax);
elements.set('#heightChartAxisMid', heightAxisMid);
elements.set('#heightChartAxisMax', heightAxisMax);
elements.set('#moduleChartAxisMid', moduleAxisMid);
elements.set('#moduleChartAxisMax', moduleAxisMax);
const tableBody = { innerHTML: '' };
const tableCaption = { textContent: '' };
const tableSummary = { textContent: '' };
elements.set('#comparisonTableBody', tableBody);
elements.set('#comparisonTableCaption', tableCaption);
elements.set('#comparisonTableSummary', tableSummary);
renderCompareContext();
if (sectionNote.textContent !== 'Relative readings · selected collection' || geometryKicker.textContent !== '00 / selected geometry' || compareScope.textContent !== '2 selected' || !compareHelper.textContent.includes('Focused comparison') || !compareHelper.textContent.includes('The current Atlas study, ' + firstStudyLabel + ', is marked in the comparison.') || comparisonPrintRoute.textContent !== 'Route · /atlas/#compare/basilica,gothic') throw new Error('Focused comparison scope, current-study context, or reproducible print route did not update');
state.activeId = 'baroque';
renderCompareContext();
const baroqueLabel = (context.window.CHURCH_GEOMETRY.find((study) => study.id === 'baroque') || {}).shortName; if (!compareHelper.textContent.includes('The current Atlas study, ' + baroqueLabel + ', is outside this comparison.')) throw new Error('Focused comparison did not explain when the current Atlas study was outside the selected set');
state.activeId = 'basilica';
renderCompareContext();
state.compareIds = ['basilica'];
renderCompareSelection();
renderCompareContext();
if (!selectionList.innerHTML.includes('class="compare-selection-study-link" data-compare-selection-study="basilica"') || !selectionList.innerHTML.includes('class="compare-selection-chip-index" aria-hidden="true">01</span>') || !selectionList.innerHTML.includes('class="compare-selection-chip-remove" data-remove-compare-id="basilica"')) throw new Error('Pending comparison selection lost its visible curated index, direct Atlas link, or removal control');
if (selection.hidden || selectionHeading.textContent !== 'Pending selection · 1 study' || !selectionList.innerHTML.includes('data-remove-compare-id="' + firstStudy.id + '"') || !selectionList.innerHTML.includes('aria-label="Open study ' + firstStudy.index + ', ' + firstStudy.name.replace(/'/g, '&#39;') + ' in Atlas.') || clearSelection['aria-label'] !== 'Clear 1 selected study' || compareScope.textContent !== '1 selected · choose one more' || !compareHelper.textContent.includes('Select one more study') || !compareHelper.textContent.includes('Add visible to compare') || comparisonPrintRoute.textContent !== 'Route · /atlas/?compare=basilica#compare') throw new Error('Partial comparison state did not expose its count-aware pending selection, curated index, next-step action, or recovery route');
const pendingCitation = comparisonCitationText(comparisonStudies());
if (!pendingCitation.includes('Scope: full collection · 1 selected; choose one more for a focused comparison') || !pendingCitation.endsWith('https://example.test/atlas/?compare=basilica#compare')) throw new Error('Partial comparison citation did not preserve pending selection context and route');
state.compareIds = ['basilica', 'gothic'];
renderCompareSelection();
renderCharts();
if (!ratioChart.innerHTML.includes('class="bar-label" aria-hidden="true"') || !heightChart.innerHTML.includes('class="bar-label" aria-hidden="true"') || !moduleChart.innerHTML.includes('class="module-name" aria-hidden="true"') || !ratioChart.innerHTML.includes('class="chart-study-index" aria-hidden="true">01</span>') || !heightChart.innerHTML.includes('class="chart-study-index" aria-hidden="true">01</span>') || !moduleChart.innerHTML.includes('class="chart-study-index" aria-hidden="true">01</span>') || !ratioChart.innerHTML.includes('class="bar-value" aria-hidden="true"') || !heightChart.innerHTML.includes('class="bar-value" aria-hidden="true"') || !moduleChart.innerHTML.includes('class="module-value" aria-hidden="true"')) throw new Error('Comparison chart visual labels, curated indexes, and readouts must stay hidden from the accessibility tree');
// Dynamic comparison-chart expectations follow the current records.
const firstStudyHtmlLabel = firstStudyLabel.replace(/'/g, '&#39;'); if (!ratioChart.innerHTML.includes('aria-label="Study ' + firstStudy.index + ', ' + firstStudyHtmlLabel + ': length to span ratio;') || !heightChart.innerHTML.includes('aria-label="Study ' + firstStudy.index + ', ' + firstStudyHtmlLabel + ': height to span ratio;') || !moduleChart.innerHTML.includes('aria-label="Study ' + firstStudy.index + ', ' + firstStudyHtmlLabel + ': ' + firstStudy.bayCount + ' bays, module length;') || !ratioChart.innerHTML.includes('class="chart-axis-context" title="' + firstAxisLabel + '">' + firstAxisLabel + '</span>') || !heightChart.innerHTML.includes('class="chart-axis-context" title="' + firstAxisLabel + '">' + firstAxisLabel + '</span>') || !moduleChart.innerHTML.includes('class="chart-axis-context" title="' + firstAxisLabel + '">' + firstAxisLabel + '</span>') || !ratioChart.innerHTML.includes('class="chart-status" data-status="' + firstStatus + '"') || !heightChart.innerHTML.includes('class="chart-status" data-status="' + firstStatus + '"') || !moduleChart.innerHTML.includes('class="chart-status" data-status="' + firstStatus + '"') || !ratioChart.innerHTML.includes('Source: ' + firstStudy.source + '; ' + firstStudy.sourceNote) || !heightChart.innerHTML.includes('Source: ' + firstStudy.source + '; ' + firstStudy.sourceNote) || !moduleChart.innerHTML.includes('Source: ' + firstStudy.source + '; ' + firstStudy.sourceNote) || !ratioChart.innerHTML.includes('class="bar-row is-active"') || !heightChart.innerHTML.includes('class="bar-row is-active"') || !moduleChart.innerHTML.includes('class="module-row is-active"') || !ratioChart.innerHTML.includes('aria-describedby="comparisonCurrentStudyContext"') || !heightChart.innerHTML.includes('aria-describedby="comparisonCurrentStudyContext"') || !moduleChart.innerHTML.includes('aria-describedby="comparisonCurrentStudyContext"') || !moduleChart.innerHTML.includes('class="chart-current" title="Current Atlas study">current</span>') || !ratioChart.innerHTML.includes('role="meter" aria-label="Study ' + firstStudy.index + ', ' + firstStudyHtmlLabel + ': Relative length to span ratio"') || !heightChart.innerHTML.includes('role="meter" aria-label="Study ' + firstStudy.index + ', ' + firstStudyHtmlLabel + ': Relative height to span ratio"') || !moduleChart.innerHTML.includes('role="meter" aria-label="Study ' + firstStudy.index + ', ' + firstStudyHtmlLabel + ': Relative module length"') || !ratioScale.textContent.startsWith('Scale 0 → ') || !heightScale.textContent.startsWith('Scale 0 → ') || !moduleScale.textContent.startsWith('Scale 0 → ') || !chartScaleStatus.textContent.startsWith('Comparison ranges updated: length to span 0 → ') || !ratioAxisMid.textContent || !ratioAxisMax.textContent || !heightAxisMid.textContent || !heightAxisMax.textContent || !moduleAxisMid.textContent || !moduleAxisMax.textContent) throw new Error('Comparison charts did not expose visible axis, curated study identity, provenance, current-study context, meter ranges, live range announcements, and active maximum context');
// End dynamic comparison-chart expectations.
// Data-driven chart assertions above cover the active collection ranges and provenance.
const moduleWidths = [...moduleChart.innerHTML.matchAll(/<span class="module-bars"[^>]*style="width:([^%]+)%">/g)].map((match) => Number(match[1]));
if (moduleWidths.length !== 2 || !(moduleWidths[0] < moduleWidths[1]) || Math.abs(moduleWidths[1] - 100) > 0.0001 || !moduleChart.innerHTML.includes('<i class="module-bar"></i>')) throw new Error('Module chart did not normalize group length or use equal bay markers');
if (!ratioChart.innerHTML.includes('record: ' + firstStatusDefinition + '; Source: ' + firstStudy.source + '; ' + firstStudy.sourceNote) || !heightChart.innerHTML.includes('record: ' + firstStatusDefinition + '; Source: ' + firstStudy.source + '; ' + firstStudy.sourceNote) || !moduleChart.innerHTML.includes('record: ' + firstStatusDefinition + '; Source: ' + firstStudy.source + '; ' + firstStudy.sourceNote)) throw new Error('Comparison chart accessible labels did not expose the schematic status definition and source provenance');
const compareView = elements.get('#compareView');
compareView.hidden = true;
chartScaleStatus.textContent = '';
renderCharts();
if (chartScaleStatus.textContent !== '') throw new Error('Hidden comparison view consumed its live range announcement');
compareView.hidden = false;
renderCharts();
if (!chartScaleStatus.textContent.startsWith('Comparison ranges updated: length to span 0 → ')) throw new Error('Visible comparison view did not restore its live range announcement');
const originalGothicStatus = context.window.CHURCH_GEOMETRY[1].status;
context.window.CHURCH_GEOMETRY[1].status = 'measured';
renderCharts();
if (!ratioChart.innerHTML.includes('class="chart-status" data-status="measured" title="Source-supported dimensions.">Measured</span>') || !heightChart.innerHTML.includes('data-status="measured"') || !moduleChart.innerHTML.includes('data-status="measured"')) throw new Error('Comparison chart provenance chips did not follow a measured record');
renderComparisonTable();
if (!tableBody.innerHTML.includes('class="comparison-status" data-status="measured" aria-label="Measured (measured): Source-supported dimensions."')) throw new Error('Comparison table status styling did not follow a measured record');
if (!ratioChart.innerHTML.includes('record: Source-supported dimensions.') || !heightChart.innerHTML.includes('record: Source-supported dimensions.') || !moduleChart.innerHTML.includes('record: Source-supported dimensions.')) throw new Error('Comparison chart accessible labels did not expose the measured status definition');
renderGeometryCompare();
if (!geometryCompare.innerHTML.includes('class="compare-study-status" data-status="measured" title="Source-supported dimensions.">Measured</span>')) throw new Error('Comparison card provenance badge did not follow a measured record');
context.window.CHURCH_GEOMETRY[1].status = originalGothicStatus;
renderCharts();
renderGeometryCompare();
if (!geometryCompare.innerHTML.includes(firstStudy.typology + ' · ' + firstStudy.place + ' · ' + firstStudy.era + ' · ' + firstAxisLabel) || !geometryCompare.innerHTML.includes(secondStudy.typology + ' · ' + secondStudy.place + ' · ' + secondStudy.era + ' · ' + studyAxisLabel(secondStudy)) || !geometryCompare.innerHTML.includes('class="compare-study-status" data-status="' + firstStatus + '"') || !geometryCompare.innerHTML.includes('Source: ' + firstStudy.source + '; ' + firstStudy.sourceNote) || !geometryCompare.innerHTML.includes(firstAxisLabel) || !geometryCompare.innerHTML.includes('Open in Atlas') || !geometryCompare.innerHTML.includes('compare-study-card is-active') || !geometryCompare.innerHTML.includes('aria-current="true"') || geometryCompare.innerHTML.includes('aria-current="page"') || !geometryCompare.innerHTML.includes('Current Atlas study · open in Atlas')) throw new Error('Comparison cards did not render place, era, axis, visible provenance, destination context, source note, and generic current-study state');
if (!geometryCompare.innerHTML.includes('class="compare-study-measure">' + firstStudy.length + ' × ' + firstStudy.span + ' × ' + firstStudy.height + ' ' + context.window.CHURCH_GEOMETRY_SCHEMA.unitSymbol + ' · radius ' + firstStudy.radius + ' ' + context.window.CHURCH_GEOMETRY_SCHEMA.unitSymbol + '</span>') || !geometryCompare.innerHTML.includes('class="compare-study-emphasis">' + firstStudy.emphasis + '</span>') || !geometryCompare.innerHTML.includes('primary radius ' + Number(firstStudy.radius).toFixed(1) + ' ' + context.window.CHURCH_GEOMETRY_SCHEMA.units)) throw new Error('Comparison cards did not render compact envelope, emphasis, and accessible radius context');
renderComparisonTable();
if (tableSummary.textContent !== 'Read the 2 selected study records as a table' || !tableCaption.textContent.includes('2 selected studies') || !tableCaption.textContent.includes('curated study index') || !tableCaption.textContent.includes('interpretive 0–100 reading-profile scores') || !tableBody.innerHTML.includes('class="comparison-table-study-link"') || !tableBody.innerHTML.includes('class="comparison-table-study-index" aria-hidden="true">' + firstStudy.index + '</span>') || !tableBody.innerHTML.includes('data-table-study="' + firstStudy.id + '"') || !tableBody.innerHTML.includes('aria-label="Open study ' + firstStudy.index + ', ' + firstStudyHtmlLabel + ' in Atlas.') || !tableBody.innerHTML.includes('aria-label="Open study ' + secondStudy.index + ', ' + secondStudyLabel.replace(/'/g, '&#39;') + ' in Atlas.') || !tableBody.innerHTML.includes('data-profile="linearity"') || !tableBody.innerHTML.includes('Study ' + firstStudy.index + ', ' + firstStudyHtmlLabel + ' Linearity profile:') || !tableBody.innerHTML.includes('aria-current="true"') || tableBody.innerHTML.includes('aria-current="page"') || !tableBody.innerHTML.includes('class="comparison-table-study-state">current</span>') || !tableBody.innerHTML.includes('<td>' + firstAxisLabel + '</td>')) throw new Error('Focused comparison table scope, visible curated index, axis context, status, source provenance, basis-specific profile labels, or Atlas links did not update');
state.compareIds = [];
renderCompareContext();
if (sectionNote.textContent !== 'Relative readings · full collection' || geometryKicker.textContent !== '00 / collection geometry' || compareScope.textContent !== 'Full collection' || !compareHelper.textContent.includes('full collection') || !compareHelper.textContent.includes('Add visible to compare') || comparisonPrintRoute.textContent !== 'Route · /atlas/#compare') throw new Error('Full collection scope, next-step action, or reproducible print route did not update');
renderCharts();
if (!ratioScale.textContent.startsWith('Scale 0 → ') || !heightScale.textContent.startsWith('Scale 0 → ') || !moduleScale.textContent.startsWith('Scale 0 → ') || !chartScaleStatus.textContent.startsWith('Comparison ranges updated: length to span 0 → ') || !ratioAxisMid.textContent || !ratioAxisMax.textContent || !heightAxisMid.textContent || !heightAxisMax.textContent || !moduleAxisMid.textContent || !moduleAxisMax.textContent) throw new Error('Comparison chart scales, live range announcement, and visual axis guides did not follow the full collection');
renderComparisonTable();
if (tableSummary.textContent !== 'Read the ' + context.window.CHURCH_GEOMETRY.length + ' study records as a table' || !tableCaption.textContent.includes('full collection')) throw new Error('Full collection table scope copy did not update');
state.compareIds = ['basilica', 'gothic'];
showPage('atlas', { scroll: false });
const finalUrl = new URL(location.href);
if (finalUrl.hash !== '#atlas/basilica/plan/exterior/all') throw new Error(`Unexpected Atlas return route: ${finalUrl.hash}`);
if (finalUrl.searchParams.get('compare') !== 'basilica,gothic') throw new Error(`Comparison selection was not preserved: ${finalUrl.search}`);
if (historyCalls.length !== 2 || historyCalls[0][0] !== 'pushState' || historyCalls[1][0] !== 'replaceState') throw new Error(`Unexpected handoff history sequence: ${JSON.stringify(historyCalls)}`);
showPage('method', { routeStudy: true, scroll: false });
const methodUrl = new URL(location.href);
if (methodUrl.hash !== '#method/basilica' || methodUrl.searchParams.get('compare') !== 'basilica,gothic') throw new Error(`Method navigation dropped the selected comparison context: ${methodUrl.href}`);
state.compareIds = ['basilica'];
showPage('compare', { scroll: false });
const partialCompareUrl = new URL(location.href);
if (partialCompareUrl.hash !== '#compare' || partialCompareUrl.searchParams.get('compare') !== 'basilica') throw new Error(`Compare navigation dropped a partial selection: ${partialCompareUrl.href}`);
console.log('Comparison edit handoff smoke test passed.');
NODE
