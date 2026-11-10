// Generates the Bruno collection from the SUSHI output, so the ValueSets and examples
// sent to the server are the ones the IG defines.
// Run after `sushi build .`:   node bruno/generate.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ig = path.resolve(here, '..');
const res = path.join(ig, 'fsh-generated', 'resources');
const UCUM = 'http://unitsofmeasure.org';
const load = (f) => JSON.parse(fs.readFileSync(path.join(res, f), 'utf8'));

// The codes under test, and whether each ValueSet should accept them.
// T = in the value set, F = not. The UCUM column is the code system itself.
const codes = ['{spoon}', '{lepel}', '{Spoon}', 'mL{spoon}', '{spoon}/d', '{teaspoon}', '{Package}', '{tablet}', 'mL', 'mg', 'spoon'];
const expected = {
  //                      {spoon} {lepel} {Spoon} mL{spoon} {spoon}/d {teaspoon} {Package} {tablet} mL mg spoon
  'ucum':                   'T T T T T T T T T T F',
  'BeUcumAllVS':            'T T T T T T T T T T F',
  'BeDoseUnitsNoSpoonVS':   'F F F F F F F T T T F',
  'BeDoseUnitsWithSpoonVS': 'T F F F F F F F T F F',
  'BeUcumWithoutSpoonVS':   'F F T T T T T T T T F',
  'BeVolumeUnitsVS':        'F F F T F F F F T F F',
};
const isIn = (key, code) => expected[key].split(' ')[codes.indexOf(code)] === 'T';

// Why a result is worth a look - shown in the request docs.
const notes = {
  '{Spoon}': 'Annotations are compared as written: `{Spoon}` is not `{spoon}`.',
  'mL{spoon}': 'An annotation on a unit is a new code: excluding `{spoon}` does not exclude `mL{spoon}`, and its canonical unit is still m3.',
  '{spoon}/d': 'Excluding `{spoon}` does not exclude expressions built from it.',
  '{teaspoon}': 'Any annotation is valid UCUM, so a deny-list can never be complete.',
  'spoon': 'Without braces this is not UCUM at all (no such unit atom).',
};

const valueSets = ['BeUcumAllVS', 'BeDoseUnitsNoSpoonVS', 'BeDoseUnitsWithSpoonVS', 'BeUcumWithoutSpoonVS', 'BeVolumeUnitsVS']
  .map((id) => load(`ValueSet-${id}.json`));
// Resources folder: the UCUM-coded examples, against the profiles with a required binding to one of the IG's value sets
const doseOf = (ex) => ex.dosageInstruction[0].doseAndRate[0].doseQuantity;
const bindingOf = (sd) => sd.differential.element.find((e) => (e.id || '').endsWith('doseQuantity') && e.binding).binding;
const examples = fs.readdirSync(res).filter((f) => f.startsWith('MedicationRequest-')).map(load)
  .filter((ex) => doseOf(ex).system === UCUM && codes.includes(doseOf(ex).code));
const profiles = fs.readdirSync(res).filter((f) => f.startsWith('StructureDefinition-')).map(load)
  .filter((sd) => bindingOf(sd).strength === 'required' && valueSets.some((vs) => vs.url === bindingOf(sd).valueSet));

const out = here;
for (const e of fs.readdirSync(out)) {
  if (/^\d+\. /.test(e)) fs.rmSync(path.join(out, e), { recursive: true });
}

const indent = (text, n = 2) => text.split('\n').map((l) => (l ? ' '.repeat(n) + l : l)).join('\n');
// The sequence prefix keeps {spoon} and {Spoon} apart on case-insensitive file systems.
const fileName = (seq, s) => String(seq).padStart(2, '0') + ' ' + s.replace(/\//g, ' per ').replace(/[<>:"\\|?*]/g, '_');

function bru({ name, seq, url, body, expect, docs }) {
  return `meta {
  name: ${name}
  type: http
  seq: ${seq}
}

post {
  url: ${url}
  body: json
  auth: none
}

headers {
  Content-Type: application/fhir+json
  Accept: application/fhir+json
}

body:json {
${indent(JSON.stringify(body, null, 2))}
}

assert {
  res.status: eq 200
}

tests {
  const p = (res.body.parameter || []);
  const result = p.find(x => x.name === 'result');
  const message = p.find(x => x.name === 'message');
  test("result is ${expect}", function() {
    expect(result && result.valueBoolean, message && message.valueString).to.equal(${expect});
  });
}

docs {
${indent(docs)}
}
`;
}

function folder(dir, name, seq, docs) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'folder.bru'), `meta {\n  name: ${name}\n  seq: ${seq}\n}\n\ndocs {\n${indent(docs)}\n}\n`);
}

const params = (...p) => ({ resourceType: 'Parameters', parameter: p });

// 1. The code system on its own
{
  const dir = path.join(out, '1. UCUM itself');
  folder(dir, '1. UCUM itself', 1,
    'CodeSystem/$validate-code against http://unitsofmeasure.org with no value set.\n' +
    'This answers: does UCUM itself accept the code?');
  codes.forEach((code, i) => {
    const ok = isIn('ucum', code);
    const name = `${code} is ${ok ? 'valid' : 'not valid'} UCUM`;
    fs.writeFileSync(path.join(dir, fileName(i + 1, name) + '.bru'), bru({
      name, seq: i + 1, url: '{{txBase}}/CodeSystem/$validate-code', expect: ok,
      body: params({ name: 'url', valueUri: UCUM }, { name: 'code', valueCode: code }),
      docs: notes[code] || `\`${code}\` against UCUM itself.`,
    }));
  });
}

// 2..n. One folder per ValueSet; the ValueSet is sent inline
valueSets.forEach((vs, v) => {
  const seq = v + 2;
  const dir = path.join(out, `${seq}. ${vs.title}`);
  folder(dir, `${seq}. ${vs.title}`, seq,
    `ValueSet/$validate-code with the IG's ValueSet \`${vs.id}\` sent inline (the server does not have the IG).\n\n${vs.description}`);
  codes.forEach((code, i) => {
    const ok = isIn(vs.id, code);
    const name = `${code} is ${ok ? 'in' : 'not in'} ${vs.id}`;
    fs.writeFileSync(path.join(dir, fileName(i + 1, name) + '.bru'), bru({
      name, seq: i + 1, url: '{{txBase}}/ValueSet/$validate-code', expect: ok,
      body: params({ name: 'valueSet', resource: vs }, { name: 'system', valueUri: UCUM }, { name: 'code', valueCode: code }),
      docs: notes[code] || `\`${code}\` against \`${vs.id}\`.`,
    }));
  });
});

// Last: each example's dose quantity against each profile's bound value set -
// the check the validator makes for a required binding on Quantity.
{
  const seq = valueSets.length + 2;
  const dir = path.join(out, `${seq}. Resources`);
  folder(dir, `${seq}. Resources`, seq,
    'Each example MedicationRequest from the IG, checked against the value set bound (required) to\n' +
    '`dosageInstruction.doseAndRate.doseQuantity` in each profile. The coding sent is the dose quantity\n' +
    'of the example, as the validator would send it.');
  let i = 0;
  for (const ex of examples) {
    const q = doseOf(ex);
    for (const sd of profiles) {
      const vsId = bindingOf(sd).valueSet.split('/').pop();
      const vs = valueSets.find((x) => x.id === vsId);
      const ok = isIn(vsId, q.code);
      const name = `${ex.id} ${ok ? 'conforms to' : 'fails'} ${sd.id}`;
      fs.writeFileSync(path.join(dir, fileName(i + 1, name) + '.bru'), bru({
        name, seq: ++i, url: '{{txBase}}/ValueSet/$validate-code', expect: ok,
        body: params({ name: 'valueSet', resource: vs }, { name: 'coding', valueCoding: { system: q.system, code: q.code, display: q.unit } }),
        docs: `MedicationRequest/${ex.id} doses ${q.value} \`${q.code}\`. Profile \`${sd.id}\` binds the dose to \`${vsId}\`.`,
      }));
    }
  }
}

console.log(`Wrote ${codes.length * (valueSets.length + 1) + examples.length * profiles.length} requests to ${out}`);
