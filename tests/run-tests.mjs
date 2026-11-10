// Runs the UCUM tests and writes their results as page includes for the IG.
//
//  1. The FHIR validator, once per test profile (and once for base FHIR), over every example
//     MedicationRequest and the deliberately invalid ones in tests/invalid/.
//  2. $validate-code on a terminology server: each dose unit against UCUM itself and against
//     each of the IG's ValueSets (sent inline).
//
// Run after `sushi build .`:
//   node tests/run-tests.mjs
// Settings (environment variables):
//   VALIDATOR_JAR  path to validator_cli.jar  (default: input-cache/validator_cli.jar)
//   TX             terminology server for step 2 (default: https://178.104.103.200.sslip.io/tx/r4)
//   VALIDATOR_TX   terminology server the validator uses (default: the validator's own, tx.fhir.org)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ig = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const res = path.join(ig, 'fsh-generated', 'resources');
const invalidDir = path.join(ig, 'tests', 'invalid');
const outDir = path.join(ig, 'tests', 'output');
const includes = path.join(ig, 'input', 'includes');
const jar = process.env.VALIDATOR_JAR || path.join(ig, 'input-cache', 'validator_cli.jar');
const tx = (process.env.TX || 'https://178.104.103.200.sslip.io/tx/r4').replace(/\/$/, '');
const UCUM = 'http://unitsofmeasure.org';
fs.mkdirSync(outDir, { recursive: true });

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const inRes = (prefix) => fs.readdirSync(res).filter((f) => f.startsWith(prefix)).map((f) => readJson(path.join(res, f)));
const ig_ = readJson(path.join(res, fs.readdirSync(res).find((f) => f.startsWith('ImplementationGuide-'))));
// Rows and columns in reading order; anything not listed follows in IG order
const preferred = {
  MedicationRequest: ['dose-ml', 'dose-mg', 'dose-tablet', 'dose-spoon', 'dose-lepel', 'dose-Spoon-capital', 'dose-teaspoon',
    'dose-package', 'dose-ml-spoon', 'dose-spoon-per-day', 'dose-snomed-tablet'],
  StructureDefinition: ['BeDoseUcumUnits', 'BeDoseNoSpoon', 'BeDoseNoSpoonExtensible', 'BeDoseNoSpoonPreferred', 'BeDoseNoSpoonExample', 'BeDoseWithSpoon'],
  ValueSet: ['BeUcumAllVS', 'BeDoseUnitsNoSpoonVS', 'BeDoseUnitsWithSpoonVS', 'BeUcumWithoutSpoonVS', 'BeVolumeUnitsVS'],
};
const order = (type) => {
  const ids = ig_.definition.resource.map((r) => r.reference.reference).filter((r) => r.startsWith(type + '/')).map((r) => r.split('/')[1]);
  const rank = (id) => ((preferred[type] || []).indexOf(id) + 1) || Infinity;
  return ids.sort((a, b) => rank(a) - rank(b));
};

// Instances: the IG examples in IG order, then the invalid ones
const instances = [
  ...order('MedicationRequest').map((id) => ({ file: path.join(res, `MedicationRequest-${id}.json`), inIg: true })),
  ...fs.readdirSync(invalidDir).filter((f) => f.endsWith('.json')).map((f) => ({ file: path.join(invalidDir, f), inIg: false })),
].map((x) => {
  const r = readJson(x.file);
  return { ...x, id: r.id, title: r.title, quantity: r.dosageInstruction[0].doseAndRate[0].doseQuantity };
});
const profiles = [{ id: 'base', title: 'Base FHIR (no profile)', url: null, strength: '-', vs: null },
  ...order('StructureDefinition').map((id) => {
    const sd = readJson(path.join(res, `StructureDefinition-${id}.json`));
    const b = sd.differential.element.find((e) => (e.id || '').endsWith('doseQuantity') && e.binding).binding;
    return { id, title: sd.title, url: sd.url, strength: b.strength, vs: b.valueSet };
  })];
const valueSets = order('ValueSet').map((id) => readJson(path.join(res, `ValueSet-${id}.json`)));

// ---- 1. Validator --------------------------------------------------------------------------
if (!fs.existsSync(jar)) {
  console.error(`validator_cli.jar not found at ${jar}. Download it from https://github.com/hapifhir/org.hl7.fhir.core/releases/latest/download/validator_cli.jar or set VALIDATOR_JAR.`);
  process.exit(1);
}
let validatorVersion = '';
const validation = {}; // validation[profile][instance] = [{severity, text}]
for (const p of profiles) {
  const out = path.join(outDir, `validator-${p.id}.json`);
  const args = ['-jar', jar, ...instances.map((i) => i.file), '-version', '4.0.1', '-ig', res, '-output', out];
  if (p.url) args.push('-profile', p.url);
  if (process.env.VALIDATOR_TX) args.push('-tx', process.env.VALIDATOR_TX);
  console.log(`validator: ${p.id}`);
  const run = spawnSync('java', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  validatorVersion ||= ((run.stdout || '').match(/FHIR Validation tool Version (\S+)/) || [])[1] || '';
  if (!fs.existsSync(out)) { console.error(run.stdout, run.stderr); process.exit(1); }
  const bundle = readJson(out);
  validation[p.id] = {};
  for (const e of bundle.entry || [bundle]) {
    const oo = e.resource || e;
    const file = path.resolve(ig, oo.extension.find((x) => x.url.endsWith('operationoutcome-file')).valueString);
    const inst = instances.find((i) => path.resolve(i.file) === file);
    validation[p.id][inst.id] = oo.issue
      .filter((i) => (i.expression || []).some((x) => x.includes('dose')))
      .map((i) => ({ severity: i.severity, text: i.details.text }));
  }
}

// ---- 2. Terminology server ------------------------------------------------------------------
async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (j.resourceType === 'OperationOutcome') return { result: null, message: j.issue.map((i) => i.details?.text || i.diagnostics).join('; ') };
  const p = Object.fromEntries(j.parameter.map((x) => [x.name, x.valueBoolean ?? x.valueString]));
  return { result: p.result, message: p.message || '' };
}
const meta = await (await fetch(`${tx}/metadata`, { headers: { Accept: 'application/fhir+json' } })).json();
const txSoftware = `${meta.software?.name || '?'} ${meta.software?.version || ''}`.trim();
const codes = [...new Set(instances.filter((i) => i.quantity.system === UCUM).map((i) => i.quantity.code))];
const terminology = {}; // terminology[code][column] = {result, message}
for (const code of codes) {
  console.log(`tx: ${code}`);
  terminology[code] = {
    ucum: await post(`${tx}/CodeSystem/$validate-code`, { resourceType: 'Parameters', parameter: [{ name: 'url', valueUri: UCUM }, { name: 'code', valueCode: code }] }),
  };
  for (const vs of valueSets) {
    terminology[code][vs.id] = await post(`${tx}/ValueSet/$validate-code`, { resourceType: 'Parameters', parameter: [
      { name: 'valueSet', resource: vs }, { name: 'system', valueUri: UCUM }, { name: 'code', valueCode: code }] });
  }
}

// ---- Write the results ----------------------------------------------------------------------
const stamp = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify({ date: stamp, tx, txSoftware, validatorVersion, terminology, validation }, null, 2));

const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/</g, '&lt;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
const code = (s) => '<code>' + esc(s) + '</code>';
const table = (header, rows) => [header, header.map(() => '---'), ...rows].map((r) => '| ' + r.join(' | ') + ' |').join('\n') + '\n{:.grid}\n';
const GENERATED = '<!-- GENERATED by tests/run-tests.mjs - rerun it, do not edit -->\n\n';

// Terminology table
const tCell = (r) => (r.result === true ? '✅ in' : r.result === false ? '❌ not in' : '⚠️ ' + esc(r.message));
fs.writeFileSync(path.join(includes, 'results-terminology.md'), GENERATED + table(
  ['Unit', 'UCUM itself', ...valueSets.map((vs) => `[${esc(vs.title)}](ValueSet-${vs.id}.html)`)],
  codes.map((c) => [code(c), terminology[c].ucum.result ? '✅ valid' : '❌ not UCUM', ...valueSets.map((vs) => tCell(terminology[c][vs.id]))]),
));

// Validator table: binding and code issues decide the cell; the annotation warning is its own column
const isAnnotation = (i) => i.text.startsWith('UCUM Codes that contain human readable annotations');
const vCell = (issues) => {
  const real = issues.filter((i) => !isAnnotation(i));
  if (real.some((i) => i.severity === 'error' || i.severity === 'fatal')) return '❌ error';
  if (real.some((i) => i.severity === 'warning')) return '⚠️ warning';
  if (real.some((i) => i.severity === 'information')) return 'ℹ️ info';
  return '✅ valid';
};
const unitOf = (i) => (i.quantity.system === UCUM ? code(i.quantity.code) : `${code(i.quantity.code)} (SNOMED CT)`);
const instLink = (i) => (i.inIg ? `[${unitOf(i)}](MedicationRequest-${i.id}.html)` : `${unitOf(i)} (not an IG example)`);
const profLink = (p) => (p.url ? `[${esc(p.title)}](StructureDefinition-${p.id}.html)` : esc(p.title));
fs.writeFileSync(path.join(includes, 'results-validator.md'), GENERATED + table(
  ['Dose unit', ...profiles.map(profLink), 'Annotation warning'],
  instances.map((i) => [instLink(i), ...profiles.map((p) => vCell(validation[p.id][i.id])),
    validation.base[i.id].some(isAnnotation) ? '⚠️ yes' : 'no']),
));

// What the validator said, per profile and instance, for every cell that is not plain valid
let details = GENERATED;
for (const p of profiles) {
  const rows = instances.flatMap((i) => validation[p.id][i.id].filter((x) => !isAnnotation(x))
    .map((x) => [unitOf(i), x.severity, esc(x.text)]));
  if (!rows.length) continue;
  details += `**${profLink(p)}**${p.url ? ` - binding ${p.strength}` : ''}\n\n` + table(['Dose unit', 'Severity', 'Message'], rows) + '\n';
}
const annotation = Object.values(validation.base).flat().find(isAnnotation);
if (annotation) details += `**On every unit with an annotation, whatever the profile:** warning - ${esc(annotation.text)}\n`;
fs.writeFileSync(path.join(includes, 'results-validator-details.md'), details);

fs.writeFileSync(path.join(includes, 'results-run.md'), GENERATED +
  `Results of the run on ${stamp}: FHIR validator ${esc(validatorVersion)} (terminology server ${esc(process.env.VALIDATOR_TX || 'tx.fhir.org')}), ` +
  `and \`$validate-code\` on ${esc(txSoftware)} at ${tx}.\n`);
console.log(`Wrote results to ${path.relative(ig, includes)} and ${path.relative(ig, outDir)}`);
