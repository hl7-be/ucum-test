### Purpose

This guide shows how UCUM units of measure are validated in FHIR: what UCUM accepts on its own, what a ValueSet drawn
from UCUM can allow or prevent, and what the validator reports for each binding strength. The question it answers:
can we use, or prevent the use of, units such as `{spoon}` or `{lepel}`?

It is a test guide. Its profiles and value sets exist to test the behaviour, not to be used in implementations.

### In short

* UCUM accepts **any** annotation in curly braces: `{spoon}`, `{lepel}`, `{Package}`, `mL{spoon}`.
* Only a **required binding to an enumerated ValueSet** allows some annotations and not others.
* Excluding annotations does not work: there is always another spelling.
* The validator warns about annotations in UCUM codes, whatever the profile.

See [How UCUM works](ucum.html) for the explanation and the test results.

### Contents

* [How UCUM works](ucum.html) - the explanation, and the results of each example against each profile
* [Running the tests](testing.html) - how to rerun them, from the command line or in Bruno
* [Artifacts](artifacts.html) - the test value sets, profiles and examples
