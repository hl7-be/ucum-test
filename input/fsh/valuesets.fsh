Alias: $UCUM = http://unitsofmeasure.org

// Each ValueSet is one way of saying which units a dose may use.
// tests/run-tests.mjs and the Bruno collection check the test codes against each of them.

ValueSet: BeUcumAllVS
Id: BeUcumAllVS
Title: "All of UCUM"
Description: "Every valid UCUM expression. Annotations such as `{spoon}` and `{lepel}` are valid UCUM, so this allows them. Same content as the FHIR ValueSet `ucum-units`."
* ^experimental = true
* include codes from system $UCUM

ValueSet: BeDoseUnitsNoSpoonVS
Id: BeDoseUnitsNoSpoonVS
Title: "Dose units - enumerated, no spoons"
Description: "A closed list of dose units. Any code not listed, including `{spoon}`, `{lepel}` and `mL{spoon}`, is outside the value set."
* ^experimental = true
* $UCUM#mg "milligram"
* $UCUM#g "gram"
* $UCUM#mL "milliliter"
* $UCUM#"{tablet}" "tablet"

ValueSet: BeDoseUnitsWithSpoonVS
Id: BeDoseUnitsWithSpoonVS
Title: "Dose units - enumerated, with {spoon}"
Description: "A closed list that allows `{spoon}` but not `{lepel}`. Annotations are matched as written: the server compares the code text, not its meaning."
* ^experimental = true
* $UCUM#mL "milliliter"
* $UCUM#"{spoon}" "spoon"

ValueSet: BeUcumWithoutSpoonVS
Id: BeUcumWithoutSpoonVS
Title: "All of UCUM except {spoon} and {lepel}"
Description: "All of UCUM, minus the two annotations. The exclusion only removes those two exact codes: `mL{spoon}`, `{spoon}/d`, `{Spoon}` and `{teaspoon}` are still in the value set."
* ^experimental = true
* include codes from system $UCUM
* exclude $UCUM#"{spoon}" "spoon"
* exclude $UCUM#"{lepel}" "lepel"

ValueSet: BeVolumeUnitsVS
Id: BeVolumeUnitsVS
Title: "Volume units (UCUM canonical = m3)"
Description: "All UCUM units whose canonical unit is m3. A bare annotation has no canonical unit and is outside the value set, but an annotation on a volume unit (`mL{spoon}`) has the same canonical unit as mL and is inside."
* ^experimental = true
* include codes from system $UCUM where canonical = "m3"
