# Threat Model

## Assets

- Raw screenshots, video frames, OCR text, and audio
- Account names, usernames, URLs, private messages, and contact information
- Content classifications and inferred interests
- Wellbeing check-ins and longitudinal insights
- Research exports and participant identity mappings
- Model prompts, local rules, and feedback history

## Threat actors

- Malicious websites or extension content
- A compromised browser profile or device
- Malware or another local user
- An attacker who obtains cloud credentials or research exports
- An insider with unnecessary access
- The product itself collecting more than the person intended

## High-risk failure modes

1. Raw captures are uploaded without clear consent.
2. Raw captures remain on disk after analysis.
3. OCR accidentally extracts passwords, messages, or payment information.
4. A research export can be re-identified by combining timestamps, platforms, and categories.
5. A model falsely labels sensitive content and causes unnecessary blocking or distress.
6. A minor participates without valid parental permission and child assent.
7. AI prompts or captured text leave the device through a third-party provider.

## Required controls

- Local processing by default
- Raw-capture deletion after successful analysis
- Explicit, visible capture state and a global pause control
- Separate consent for product use, personal insights, and research export
- Client-side redaction before any optional upload
- Encryption at rest and in transit for any retained research data
- Short retention windows and participant deletion controls
- Least-privilege access, audit logs, and two-person review for raw data
- Model/version/confidence recorded with every detection
- Safe fallback when a detector is uncertain
- No automated diagnosis, punishment, or irreversible account action
- Distinct capture modes with independent consent gates
- Always-visible capture indicator and one-click pause/stop controls
- Browser-tab-only scope; no webcam, microphone, or whole-desktop capture

## Security invariants

1. No raw capture leaves the device in normal product mode.
2. A local event contains derived data only and excludes raw text by default.
3. Research export is impossible until a separate research consent is active.
4. A person can pause capture and delete local history.
5. Every model verdict is attributable to a model version and confidence.
