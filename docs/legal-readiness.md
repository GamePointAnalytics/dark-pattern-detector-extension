# Legal and Research Readiness

This checklist is a product planning tool, not legal advice. Counsel and the applicable institutional review process must determine legal compliance.

## Product release gate

- Publish a privacy notice that matches the implemented data flows.
- Publish terms of use and an acceptable-use policy.
- Document retention, deletion, export, and breach-response procedures.
- Complete a security review of browser permissions, local storage, telemetry, logs, crash reporting, and third-party dependencies.
- Confirm platform terms permit the supported integration and capture behavior.
- Do not make clinical, diagnostic, or causal mental-health claims.
- Decide whether the code is public or proprietary before adding an open-source license.

## License decision

The repository must not claim a license until the owners choose one. If the source will be public, evaluate Apache-2.0, MIT, and GPL-family options with the owners; Apache-2.0 is a strong default when an explicit patent license matters. If the product implementation will be proprietary, keep the repository private and use a commercial ownership and contributor agreement instead.

## Research release gate

- Finalize the study question, protocol, and analysis plan.
- Obtain the required Columbia/institutional review determination before recruitment or collection.
- Prepare consent materials; add parental permission and child assent only if minors are included.
- Define participant withdrawal, deletion, support, and safety-escalation procedures.
- Define a data-retention schedule for every data class, including backups and derived data.
- Prove that research export is disabled without active study configuration and research consent.
- Complete a re-identification-risk review before exporting data.

## Stop conditions

Do not release a capture-capable mode when any of the following is true:

- The product cannot explain what it captures and retains.
- Pause, Stop Session, or Delete Local History is absent or unreliable.
- Raw media may reach analytics, logs, crash reports, or a third party unexpectedly.
- The applicable review/consent requirements for a research study are not complete.
- A proposed feature relies on covert monitoring, webcam capture, microphone capture, or whole-desktop recording.
