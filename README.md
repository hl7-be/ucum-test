# UCUM units - how validation works

A test implementation guide showing how UCUM units are validated in FHIR: what UCUM accepts on its own
(any `{annotation}`), what a ValueSet drawn from UCUM can allow or prevent, and what the validator reports
for each binding strength.

- `input/fsh/` - test value sets, profiles and one example MedicationRequest per dose unit
- `tests/run-tests.mjs` - runs the validator and a terminology server over the examples and writes the
  results into the "How UCUM works" page (`input/includes/results-*.md`)
- `bruno/` - a Bruno collection with the same terminology checks as single requests

Build: `sushi build .`, `node tests/run-tests.mjs`, then `_genonce`.
