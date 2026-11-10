Alias: $UCUM = http://unitsofmeasure.org

// One MedicationRequest per unit under test. They declare no profile: each is valid base FHIR,
// and tests/run-tests.mjs validates each against every test profile (see "How UCUM works").
// A unit that is not valid UCUM at all (tablet, without braces) cannot be a valid example;
// it is in tests/invalid/ instead.

RuleSet: DoseIn(code, unit, text)
* status = #active
* intent = #order
* medicationCodeableConcept.text = "Paracetamol syrup 24 mg/mL"
* subject.display = "Test patient"
* dosageInstruction[0].text = "{text}"
* dosageInstruction[0].doseAndRate[0].doseQuantity = 1 $UCUM#{code} "{unit}"

Instance: dose-spoon
InstanceOf: MedicationRequest
Title: "Dose: 1 {spoon}"
Usage: #example
* insert DoseIn("{spoon}", spoon, 1 spoon)

Instance: dose-lepel
InstanceOf: MedicationRequest
Title: "Dose: 1 {lepel}"
Usage: #example
* insert DoseIn("{lepel}", lepel, 1 lepel)

Instance: dose-Spoon-capital
InstanceOf: MedicationRequest
Title: "Dose: 1 {Spoon}"
Usage: #example
* insert DoseIn("{Spoon}", Spoon, 1 Spoon)

Instance: dose-ml-spoon
InstanceOf: MedicationRequest
Title: "Dose: 1 mL{spoon}"
Usage: #example
* insert DoseIn("mL{spoon}", mL spoon, 1 spoon of 1 mL)

Instance: dose-spoon-per-day
InstanceOf: MedicationRequest
Title: "Dose: 1 {spoon}/d"
Usage: #example
* insert DoseIn("{spoon}/d", spoon per day, 1 spoon per day)

Instance: dose-teaspoon
InstanceOf: MedicationRequest
Title: "Dose: 1 {teaspoon}"
Usage: #example
* insert DoseIn("{teaspoon}", teaspoon, 1 teaspoon)

Instance: dose-package
InstanceOf: MedicationRequest
Title: "Dose: 1 {Package}"
Usage: #example
* insert DoseIn("{Package}", package, 1 package)

Instance: dose-tablet
InstanceOf: MedicationRequest
Title: "Dose: 1 {tablet}"
Usage: #example
* insert DoseIn("{tablet}", tablet, 1 tablet)

Instance: dose-ml
InstanceOf: MedicationRequest
Title: "Dose: 1 mL"
Usage: #example
* insert DoseIn(mL, mL, 1 mL)

Instance: dose-mg
InstanceOf: MedicationRequest
Title: "Dose: 1 mg"
Usage: #example
* insert DoseIn(mg, mg, 1 mg)

Instance: dose-snomed-tablet
InstanceOf: MedicationRequest
Title: "Dose: 1 tablet in SNOMED CT"
Description: "A unit from SNOMED CT instead of UCUM. Valid base FHIR; only a required binding to a UCUM value set rules it out."
Usage: #example
* status = #active
* intent = #order
* medicationCodeableConcept.text = "Paracetamol 500 mg tablet"
* subject.display = "Test patient"
* dosageInstruction[0].text = "1 tablet"
* dosageInstruction[0].doseAndRate[0].doseQuantity = 1 http://snomed.info/sct#732936001 "Tablet (unit of presentation)"
