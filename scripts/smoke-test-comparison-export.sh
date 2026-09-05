#!/usr/bin/env bash
set -euo pipefail

node - <<'NODE'
const fs = require('fs');
const vm = require('vm');
const context = {
  URL,
  window: {
    location: { href: 'https://example.test/atlas/?q=central%20plan#compare/basilica,gothic' }
  },
  document: { baseURI: 'https://example.test/atlas/', querySelectorAll() { return []; } },
  navigator: {}
};
vm.runInNewContext(fs.readFileSync('data/geometry.js', 'utf8'), context);
const app = fs.readFileSync('app.js', 'utf8').replace('  init();\n})();', '  window.__atlasTest = { state, comparisonStudies, comparisonCitationText, catalogCitationText, comparisonCsvPayload, catalogCsvPayload, comparisonJsonPayload, csvCell, activeStudyExportPayload, activeStudyCsvPayload, fullAtlasExportPayload, catalogViewExportPayload, renderComparisonTable };\n})();');
vm.runInNewContext(app, context);
const { state, comparisonStudies, comparisonCitationText, catalogCitationText, comparisonCsvPayload, catalogCsvPayload, comparisonJsonPayload, csvCell, activeStudyExportPayload, activeStudyCsvPayload, fullAtlasExportPayload, catalogViewExportPayload, renderComparisonTable } = context.window.__atlasTest;
const firstStudy = context.window.CHURCH_GEOMETRY[0];
const secondStudy = context.window.CHURCH_GEOMETRY[1];
const firstStudyLabel = firstStudy.shortName || firstStudy.name;
const secondStudyLabel = secondStudy.shortName || secondStudy.name;
const firstIdentity = 'Study ' + firstStudy.index + ', ' + firstStudyLabel;
const secondIdentity = 'Study ' + secondStudy.index + ', ' + secondStudyLabel;
const schema = context.window.CHURCH_GEOMETRY_SCHEMA;
const schemaUrl = 'https://example.test/atlas/data/geometry.schema.json';
const firstStudyRoute = 'https://example.test/atlas/#atlas/' + firstStudy.id + '/plan/exterior/all';
const secondStudyRoute = 'https://example.test/atlas/#atlas/' + secondStudy.id + '/plan/exterior/all';
for (const formula of ['=SUM(1,2)', ' +CMD', '-1+1', '@A1', '\u00a0=SUM(1,2)', '\u2003+CMD', '\u202f@A1']) {
  if (csvCell(formula) !== JSON.stringify(`'${formula}`)) throw new Error(`Formula-like CSV text was not neutralized: ${formula}`);
}
if (csvCell('plain text') !== JSON.stringify('plain text')) throw new Error('Ordinary CSV text was changed unexpectedly');
state.compareIds = ['basilica', 'gothic'];
const focusedCitation = comparisonCitationText(comparisonStudies());
if (!focusedCitation.includes('Comparison of ' + firstIdentity + ' (' + firstStudy.axis + ' axis; ' + firstStudy.status + ')') || !focusedCitation.includes(secondIdentity + ' (' + secondStudy.axis + ' axis; ' + secondStudy.status + ')') || !focusedCitation.includes('Reading profiles (0–100, interpretive): ' + firstIdentity + ' —') || !focusedCitation.includes(secondIdentity + ' —') || !focusedCitation.includes('Scope: 2 selected studies') || !focusedCitation.includes('Status definitions: Schematic = ' + schema.statusDefinitions.schematic) || !focusedCitation.includes('Schema v' + schema.version + '; units: ' + schema.units) || focusedCitation !== focusedCitation.trim() || !focusedCitation.endsWith('https://example.test/atlas/#compare/basilica,gothic')) {
  throw new Error('Focused comparison citation did not preserve selected records, status definitions, schema, scope, and route');
}
if (!focusedCitation.includes('Sources: ' + firstIdentity + ' — ' + firstStudy.source + '; ' + firstStudy.sourceNote) || !focusedCitation.includes(secondIdentity + ' — ' + secondStudy.source + '; ' + secondStudy.sourceNote)) throw new Error('Focused comparison citation did not preserve source and provenance notes');
const focusedCsv = comparisonCsvPayload(comparisonStudies()); const focusedCsvPrefix = [firstStudy.id, firstStudyLabel, firstStudy.typology, firstStudy.index, firstStudy.place].map(csvCell).join(','); const focusedCsvRoute = [ '2 selected studies', 'https://example.test/atlas/#compare/basilica,gothic', firstStudyRoute ].map(csvCell).join(','); const secondFocusedCsvRoute = [ '2 selected studies', 'https://example.test/atlas/#compare/basilica,gothic', secondStudyRoute ].map(csvCell).join(',');
if (!focusedCsv.includes('"ID","Study","Typology","Index","Place"') || !focusedCsv.includes(focusedCsvPrefix) || !focusedCsv.includes('"Era","Axis","Status","Status definition","Reference"') || !focusedCsv.includes(csvCell(firstStudy.source)) || !focusedCsv.includes(csvCell(secondStudy.source)) || !focusedCsv.includes('"Floor area estimate (m²)","Floor area basis","Volume estimate (m³)","Volume basis","Symmetry index","Scope","Route","Study route","Schema version","Units","Schema URL"') || !focusedCsv.includes(focusedCsvRoute) || !focusedCsv.includes(secondFocusedCsvRoute)) {
  throw new Error('Focused comparison CSV did not preserve axis, estimates, provenance, scope, and route');
}
if (!focusedCsv.includes('"Schema URL","Linearity profile (0–100)","Verticality profile (0–100)","Radiality profile (0–100)","Repetition profile (0–100)","Reading profile basis"') || !focusedCsv.includes('linearity = length ÷ span · verticality = height ÷ span · radiality = typology cue · repetition = bay count; Interpretive proportional tendencies, not empirical measurements.')) throw new Error('Focused comparison CSV did not append self-describing interpretive reading-profile scores');
const focusedJson = comparisonJsonPayload(comparisonStudies());
if (focusedJson.schemaUrl !== schemaUrl || focusedJson.provenance.scope !== '2 selected studies' || focusedJson.provenance.recordCount !== 2 || focusedJson.provenance.statusCounts[firstStudy.status] !== 2 || focusedJson.view.route !== 'https://example.test/atlas/#compare/basilica,gothic' || focusedJson.view.compareIds.join(',') !== 'basilica,gothic' || focusedJson.records[0].study.id !== firstStudy.id || focusedJson.records[0].studyRoute !== firstStudyRoute || focusedJson.records[1].studyRoute !== secondStudyRoute || focusedJson.records[0].derived.ratios.lengthToSpan !== firstStudy.length / firstStudy.span || focusedJson.records[0].derived.volumeBasis !== 'No estimate supplied' || focusedJson.records[0].derived.readingProfileBasis !== 'linearity = length ÷ span · verticality = height ÷ span · radiality = typology cue · repetition = bay count' || focusedJson.records[0].derived.readingProfileNote !== 'Interpretive proportional tendencies, not empirical measurements.') throw new Error('Focused comparison JSON did not preserve selected order, direct study routes, route, provenance, schema URL, and self-describing derived readings');
state.compareIds = [];
const fullCitation = comparisonCitationText(comparisonStudies());
if (!fullCitation.includes('Scope: full collection') || !fullCitation.endsWith('https://example.test/atlas/#compare')) throw new Error('Full comparison citation did not preserve collection scope and route');
const fullCsv = comparisonCsvPayload(comparisonStudies());
if (!fullCsv.includes('"full collection","https://example.test/atlas/#compare"')) throw new Error('Full comparison CSV did not preserve its route');
const fullJson = comparisonJsonPayload(comparisonStudies());
if (fullJson.schemaUrl !== schemaUrl || fullJson.provenance.scope !== 'full collection' || fullJson.provenance.recordCount !== context.window.CHURCH_GEOMETRY.length || fullJson.view.route !== 'https://example.test/atlas/#compare' || fullJson.view.compareIds.length !== 0 || fullJson.records.length !== context.window.CHURCH_GEOMETRY.length) throw new Error('Full comparison JSON did not preserve collection scope, route, and schema URL');
const missingEstimateStudy = { ...context.window.CHURCH_GEOMETRY[0], floorAreaEstimate: undefined, volumeEstimate: undefined, volumeBasis: undefined };
const missingEstimateCsv = comparisonCsvPayload([missingEstimateStudy]); const missingEstimateFields = [Number(firstStudy.radius).toFixed(1), '', 'length × span fallback', '', 'No estimate supplied', Number(firstStudy.symmetry).toFixed(2)].map(csvCell).join(',');
if (!missingEstimateCsv.includes(missingEstimateFields)) throw new Error('Comparison CSV did not describe missing floor-area and volume estimates consistently');
const staleBasisStudy = { ...missingEstimateStudy, volumeBasis: 'stale basis without estimate' };
const staleBasisCsv = comparisonCsvPayload([staleBasisStudy]);
if (!staleBasisCsv.includes('"No estimate supplied"') || staleBasisCsv.includes('"stale basis without estimate"')) throw new Error('Comparison CSV exposed a volume basis without its estimate');
const fullExport = fullAtlasExportPayload();
if (fullExport.schemaUrl !== schemaUrl || fullExport.provenance.scope !== 'full collection' || fullExport.provenance.recordCount !== context.window.CHURCH_GEOMETRY.length || fullExport.provenance.statusCounts[firstStudy.status] !== context.window.CHURCH_GEOMETRY.length || fullExport.provenance.statusDefinitions.schematic !== schema.statusDefinitions.schematic || fullExport.studies.length !== context.window.CHURCH_GEOMETRY.length || fullExport.records.length !== context.window.CHURCH_GEOMETRY.length || fullExport.records[0].studyRoute !== firstStudyRoute || fullExport.records[0].derived.ratios.lengthToSpan !== firstStudy.length / firstStudy.span) throw new Error('Full JSON export did not preserve raw studies, enriched records, direct study routes, schema-backed provenance, and schema URL');
state.query = 'basilica';
state.filterAxis = 'Longitudinal';
state.page = 'atlas';
state.sort = 'name';
state.sortDirection = 'asc';
const catalogCitation = catalogCitationText([context.window.CHURCH_GEOMETRY[0]]);
if (!catalogCitation.includes('Catalog view: results matching “basilica”, axis: Longitudinal axis, sorted by name (A–Z); 1 record') || !catalogCitation.includes('Status definitions: Schematic = Illustrative proportions; not a measured survey.') || !catalogCitation.includes('Schema v1.1; units: meters') || !catalogCitation.endsWith('https://example.test/atlas/?q=basilica&axis=Longitudinal&sort=name#atlas')) throw new Error('Catalog citation did not preserve query, filters, sort, status definitions, schema, and route');
state.compareIds = ['basilica', 'gothic'];
const selectedCatalogCitation = catalogCitationText([context.window.CHURCH_GEOMETRY[0]]);
if (!selectedCatalogCitation.includes('Comparison selection: ' + firstIdentity + ' (' + firstStudy.status + '); ' + secondIdentity + ' (' + secondStudy.status + ').') || !selectedCatalogCitation.includes('compare=basilica,gothic')) throw new Error('Catalog citation did not preserve selected comparison identities and route context');
if (!selectedCatalogCitation.includes('Selection provenance: ' + firstIdentity + ' — ' + firstStudy.source + '; ' + firstStudy.sourceNote) || !selectedCatalogCitation.includes(secondIdentity + ' — ' + secondStudy.source + '; ' + secondStudy.sourceNote)) throw new Error('Catalog citation did not preserve selected source and provenance notes');
const selectedViewExport = catalogViewExportPayload([context.window.CHURCH_GEOMETRY[0]]);
if (selectedViewExport.view.compareIds.join(',') !== 'basilica,gothic' || selectedViewExport.view.comparisonSelection.length !== 2 || selectedViewExport.view.comparisonSelection[0].index !== firstStudy.index || selectedViewExport.view.comparisonSelection[0].name !== firstStudyLabel || selectedViewExport.view.comparisonSelection[1].index !== secondStudy.index || selectedViewExport.view.comparisonSelection[1].axis !== secondStudy.axis || selectedViewExport.view.comparisonSelection[1].status !== secondStudy.status || selectedViewExport.view.comparisonSelection[1].statusDefinition !== schema.statusDefinitions[secondStudy.status] || selectedViewExport.view.comparisonSelection[1].source !== secondStudy.source || selectedViewExport.view.comparisonSelection[1].sourceNote !== secondStudy.sourceNote || selectedViewExport.records[0].studyRoute !== firstStudyRoute || !selectedViewExport.view.route.includes('compare=basilica,gothic')) throw new Error('Catalog JSON export did not preserve indexed study identities, direct study routes, human-readable comparison selection context, and source provenance');
if (selectedViewExport.view.sortDirection !== 'asc') throw new Error('Catalog JSON export did not preserve reversible sort direction');
const selectedViewCsv = catalogCsvPayload([context.window.CHURCH_GEOMETRY[0]]); const selectedViewCsvPrefix = [firstStudy.id, firstStudyLabel, firstStudy.typology, firstStudy.index, firstStudy.place].map(csvCell).join(',');
if (!selectedViewCsv.includes('"ID","Study","Typology","Index","Place"') || !selectedViewCsv.includes(selectedViewCsvPrefix) || !selectedViewCsv.includes('"Scope","Comparison IDs","Comparison selection context","Route","Study route"') || !selectedViewCsv.includes(csvCell(firstStudy.source))) throw new Error('Catalog CSV did not preserve the curated index, human-readable comparison selection context, and source provenance');
if (!selectedViewCsv.includes('"Schema URL","Linearity profile (0–100)","Verticality profile (0–100)","Radiality profile (0–100)","Repetition profile (0–100)","Reading profile basis"') || !selectedViewCsv.includes('linearity = length ÷ span · verticality = height ÷ span · radiality = typology cue · repetition = bay count; Interpretive proportional tendencies, not empirical measurements.')) throw new Error('Catalog CSV did not append self-describing interpretive reading-profile scores');
if (!selectedViewCsv.includes('"Reading profile basis","Sort key","Sort direction"') || !selectedViewCsv.includes('"name","asc"')) throw new Error('Catalog CSV did not preserve explicit sort key and direction');
state.compareIds = [];
state.sort = 'index';
state.sortDirection = 'desc';
const viewExport = catalogViewExportPayload([context.window.CHURCH_GEOMETRY[0]]);
if (viewExport.schemaUrl !== schemaUrl || viewExport.provenance.scope !== 'results matching “basilica”, axis: Longitudinal axis' || viewExport.provenance.recordCount !== 1 || viewExport.provenance.statusCounts[firstStudy.status] !== 1 || viewExport.view.query !== 'basilica' || viewExport.view.axis !== 'Longitudinal' || !viewExport.view.route.includes('axis=Longitudinal') || viewExport.records.length !== 1 || viewExport.records[0].study.id !== firstStudy.id || viewExport.records[0].studyRoute !== firstStudyRoute || viewExport.records[0].derived.ratios.lengthToSpan !== firstStudy.length / firstStudy.span || viewExport.studies[0].id !== firstStudy.id) throw new Error('Catalog JSON export did not preserve filtered provenance, direct study route, raw studies, derived readings, and schema URL');
const viewCsv = catalogCsvPayload([context.window.CHURCH_GEOMETRY[0]]);
if (!viewCsv.includes('"ID","Study","Typology","Index","Place"') || !viewCsv.includes(selectedViewCsvPrefix) || !viewCsv.includes('"Era","Axis","Status","Status definition","Reference"') || !viewCsv.includes(csvCell('results matching “basilica”, axis: Longitudinal axis')) || !viewCsv.includes(csvCell('https://example.test/atlas/?q=basilica&axis=Longitudinal#atlas')) || !viewCsv.includes(csvCell(firstStudyRoute)) || !viewCsv.includes(csvCell(firstStudy.source))) throw new Error('Catalog CSV did not preserve the curated index, filtered route, direct study route, estimates, floor-area basis, and provenance');
if (!viewCsv.includes('"Reading profile basis","Sort key","Sort direction"') || !viewCsv.includes('"index","desc"')) throw new Error('Curated catalog CSV did not preserve explicit sort key and direction');
state.query = '';
state.filterAxis = 'all';
state.activeId = 'basilica';
state.mode = 'section';
state.surface = 'interior';
state.layer = 'axis';
state.zoom = 1.3;
const studyExport = activeStudyExportPayload(context.window.CHURCH_GEOMETRY[0]);
if (studyExport.schemaUrl !== schemaUrl || studyExport.view.route !== 'https://example.test/atlas/#atlas/basilica/section/interior/axis/1.3' || studyExport.provenance.scope !== 'active study' || studyExport.provenance.statusCounts[firstStudy.status] !== 1 || studyExport.derived.boundingArea !== firstStudy.length * firstStudy.span || studyExport.derived.floorAreaBasis !== 'length × span fallback' || studyExport.derived.volumeEstimate !== null || studyExport.derived.volumeBasis !== 'No estimate supplied' || studyExport.derived.ratios.lengthToSpan !== firstStudy.length / firstStudy.span || studyExport.derived.readingProfile.radiality !== 48 || studyExport.derived.readingProfileBasis !== 'linearity = length ÷ span · verticality = height ÷ span · radiality = typology cue · repetition = bay count' || studyExport.derived.readingProfileNote !== 'Interpretive proportional tendencies, not empirical measurements.') throw new Error('Active-study JSON did not preserve view state, provenance, schema URL, floor-area basis, self-describing profile basis, and derived readings');
const studyCsv = activeStudyCsvPayload(context.window.CHURCH_GEOMETRY[0]);
if (!studyCsv.includes('"ID","Study","Typology","Index","Place"') || !studyCsv.includes(selectedViewCsvPrefix) || !studyCsv.includes('"Scope","Route","Study route","View surface","View mode","Layer focus","Zoom","Schema version","Units","Schema URL"') || !studyCsv.includes('"active study","https://example.test/atlas/#atlas/basilica/section/interior/axis/1.3","https://example.test/atlas/#atlas/basilica/section/interior/axis/1.3","interior","section","axis","1.3","1.1","meters","https://example.test/atlas/data/geometry.schema.json"') || !studyCsv.includes('"Schema URL","Linearity profile (0–100)","Verticality profile (0–100)","Radiality profile (0–100)","Repetition profile (0–100)","Reading profile basis"') || !studyCsv.includes('linearity = length ÷ span · verticality = height ÷ span · radiality = typology cue · repetition = bay count; Interpretive proportional tendencies, not empirical measurements.')) throw new Error('Active-study CSV did not preserve the current route, view state, schema provenance, or self-describing reading-profile context');
const missingStudyExport = activeStudyExportPayload(missingEstimateStudy);
if (missingStudyExport.schemaUrl !== 'https://example.test/atlas/data/geometry.schema.json' || missingStudyExport.derived.floorAreaEstimate !== null || missingStudyExport.derived.floorAreaBasis !== 'length × span fallback' || missingStudyExport.derived.volumeEstimate !== null || missingStudyExport.derived.volumeBasis !== 'No estimate supplied') throw new Error('Active-study JSON did not make missing estimates explicit or preserve their basis and schema URL');
const missingStudyCsv = activeStudyCsvPayload(missingEstimateStudy);
if (!missingStudyCsv.includes(missingEstimateFields) || missingStudyCsv.includes('"stale basis without estimate"')) throw new Error('Active-study CSV did not make missing estimates explicit or suppress an orphaned volume basis');
const tableBody = { innerHTML: '' };
context.document.querySelector = (selector) => selector === '#comparisonTableBody' ? tableBody : null;
renderComparisonTable();
if (!tableBody.innerHTML.includes('Not supplied') || !tableBody.innerHTML.includes('No estimate supplied') || !tableBody.innerHTML.includes(firstStudy.source) || !tableBody.innerHTML.includes(schema.statusDefinitions.schematic) || !tableBody.innerHTML.includes('aria-label="Schematic (schematic): ' + schema.statusDefinitions.schematic + '"')) throw new Error('Comparison table did not render estimate readings, source provenance, and status definitions');
const originalFirstStudy = context.window.CHURCH_GEOMETRY[0];
context.window.CHURCH_GEOMETRY[0] = missingEstimateStudy;
const missingTableBody = { innerHTML: '' };
context.document.querySelector = (selector) => selector === '#comparisonTableBody' ? missingTableBody : null;
renderComparisonTable();
context.window.CHURCH_GEOMETRY[0] = originalFirstStudy;
if (!missingTableBody.innerHTML.includes('Not supplied') || !missingTableBody.innerHTML.includes('length × span fallback') || !missingTableBody.innerHTML.includes('No estimate supplied')) throw new Error('Comparison table did not make missing estimates explicit');
console.log('Comparison export context smoke test passed.');
NODE
