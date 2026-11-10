// Test profiles: they differ only in the binding on the dose quantity.

Profile: BeDoseNoSpoon
Parent: MedicationRequest
Id: BeDoseNoSpoon
Title: "Dose without spoons (required)"
Description: "The dose quantity is bound (required) to the enumerated dose units, which leave out `{spoon}` and `{lepel}`."
* ^experimental = true
* dosageInstruction.doseAndRate.doseQuantity from BeDoseUnitsNoSpoonVS (required)

Profile: BeDoseNoSpoonExtensible
Parent: MedicationRequest
Id: BeDoseNoSpoonExtensible
Title: "Dose without spoons (extensible)"
Description: "As BeDoseNoSpoon, with an extensible binding."
* ^experimental = true
* dosageInstruction.doseAndRate.doseQuantity from BeDoseUnitsNoSpoonVS (extensible)

Profile: BeDoseNoSpoonPreferred
Parent: MedicationRequest
Id: BeDoseNoSpoonPreferred
Title: "Dose without spoons (preferred)"
Description: "As BeDoseNoSpoon, with a preferred binding."
* ^experimental = true
* dosageInstruction.doseAndRate.doseQuantity from BeDoseUnitsNoSpoonVS (preferred)

Profile: BeDoseWithSpoon
Parent: MedicationRequest
Id: BeDoseWithSpoon
Title: "Dose in mL or {spoon} (required)"
Description: "The dose quantity is bound (required) to a list that allows `{spoon}` but not `{lepel}`."
* ^experimental = true
* dosageInstruction.doseAndRate.doseQuantity from BeDoseUnitsWithSpoonVS (required)

Profile: BeDoseUcumUnits
Parent: MedicationRequest
Id: BeDoseUcumUnits
Title: "Dose in any UCUM unit (required)"
Description: "The dose quantity is bound (required) to the FHIR ValueSet `ucum-units`, which is all of UCUM."
* ^experimental = true
* dosageInstruction.doseAndRate.doseQuantity from http://hl7.org/fhir/ValueSet/ucum-units (required)

Profile: BeDoseNoSpoonExample
Parent: MedicationRequest
Id: BeDoseNoSpoonExample
Title: "Dose without spoons (example)"
Description: "As BeDoseNoSpoon, with an example binding."
* ^experimental = true
* dosageInstruction.doseAndRate.doseQuantity from BeDoseUnitsNoSpoonVS (example)
