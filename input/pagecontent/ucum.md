This page explains how UCUM codes are validated in FHIR, and shows it with test cases: every dose unit below is an
[example MedicationRequest](artifacts.html) in this guide, validated against every test profile.
The results are not written by hand: they come from running the tests (see [Running the tests](testing.html)).

{% include results-run.md %}

### UCUM is a grammar, not a list

[UCUM](https://ucum.org/ucum) (system `http://unitsofmeasure.org`) does not have a list of codes. A UCUM code is an
*expression* built from unit atoms, prefixes and operators: `mg`, `mL`, `mg/mL`, `/d`, `10*3/uL`. A UCUM code is valid
when it parses. This is why there is no "expansion" of all of UCUM, and why validating a UCUM code means checking its
grammar, not looking it up.

### Annotations: anything in curly braces

UCUM allows *annotations*: text in curly braces, such as `{tablet}`, `{spoon}` or `{lepel}`.
* An annotation has **no meaning** to UCUM. On its own, `{spoon}` is the unit `1`; so are `{lepel}`, `{Package}` and `{anything}`.
* An annotation on a unit is **ignored for its meaning**: `mL{spoon}` is a millilitre, and can be converted and compared as one.
* **Any** annotation is valid UCUM, alone (`{spoon}`), on a unit (`mL{spoon}`) or in an expression (`{spoon}/d`).
* But as a code, an annotation is **compared as written**: `{Spoon}` is not the same code as `{spoon}`.
* A word without braces is not UCUM: `tablet` is an error, `{tablet}` is valid.

The UCUM specification lists annotations for countable things (*non-units*) such as `{tablet}`, and the FHIR value set
[Common UCUM units](http://hl7.org/fhir/R4/valueset-ucum-common.html) (`ucum-common`) contains several, including
`{Capsule}`, `{Dose}`, `{Package}`, `{Pill}` and `{Vial}`.

### What checks a UCUM unit

| Check | What it does |
| --- | --- |
| UCUM itself (`CodeSystem/$validate-code`, or the validator on any Quantity with `system` = UCUM) | Checks the grammar. Accepts every annotation. |
| A required binding to [`ucum-units`](http://hl7.org/fhir/R4/valueset-ucum-units.html) | `ucum-units` is *all* of UCUM. It adds one thing: the unit must be UCUM - a unit from another code system (e.g. SNOMED CT) is then an error. It does not restrict annotations. |
| A binding to an *enumerated* ValueSet (a closed list of codes) | Only the listed codes are in the value set. This is the only way to allow `{spoon}` and not `{lepel}`. What happens to other codes depends on the binding strength. |
| A ValueSet that *excludes* codes from all of UCUM | Removes only those exact codes. `{Spoon}`, `{teaspoon}`, `mL{spoon}` and `{spoon}/d` remain. A deny-list can never be complete. |
| A ValueSet that *filters* UCUM on its canonical unit (e.g. `canonical = m3`, all volumes) | Keeps units of one kind. Bare annotations have no canonical unit and are out; `mL{spoon}` is a volume and is in. |
{:.grid}

The binding strength decides what the validator reports for a unit that is valid UCUM but not in the bound value set:

| Strength | Unit not in the value set |
| --- | --- |
| required | error |
| extensible | warning |
| preferred | information |
| example | nothing |
{:.grid}

The FHIR validator also gives a best-practice **warning on every UCUM code with an annotation**, whatever the profile
(*"UCUM Codes that contain human readable annotations ... can be misleading"*). It is not an error, and a profile cannot
switch it off.

### Results: each code against UCUM and each value set

`$validate-code` for each dose unit, against UCUM itself and against each ValueSet of this guide (sent inline to the
terminology server).

{% include results-terminology.md %}

### Results: each example against each profile

The FHIR validator, run on each example with each test profile. The cell shows the outcome for the dose unit (code and
binding); the last column shows whether the validator also gave the annotation warning.

{% include results-validator.md %}

<details>
<summary>What the validator said</summary>
<div markdown="1">

{% include results-validator-details.md %}

</div>
</details>

### What this means

* **Requiring UCUM** - Validating a Quantity whose `system` is UCUM always checks the UCUM grammar, with or without a profile.
  To also rule out units from other code systems, bind the element (required) to `ucum-units`.
* **Allowing only some units** - Bind the element (required) to an enumerated ValueSet that lists them, e.g. `{tablet}`,
  `{spoon}`. With an extensible or preferred binding, other UCUM units still pass, with a warning or a note.
* **Preventing some units** - Not reliably possible by excluding them: an annotation can be any text, so there is always
  another spelling. Use a list of what is allowed instead.
* **Meaning** - UCUM does not know what `{spoon}` or `{lepel}` means. If the unit has to be understood or calculated
  with (e.g. "a spoon is 5 mL"), that is agreed outside UCUM: in the value set, in guidance, or with a separate quantity.
