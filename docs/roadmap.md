# Product Roadmap

## Phase 0 — Foundation (current)

- Establish product frames and domain language.
- Define local-event and privacy boundaries.
- Write the threat model and data inventory.
- Keep research collection disabled by default.

## Phase 1 — Local text health signals

- Refactor the current dark-pattern engine behind a detector interface.
- Add platform/session metadata without storing URLs or account names.
- Introduce local event persistence with deletion and pause controls.
- Add explicit user feedback for detections.
- Build a small personal insights view.

## Phase 1A — Capture controls and consent

- Implement Browser Observation start/pause and Delete Local History controls.
- Implement the product consent gate and inspectable local data view.
- Keep all screenshot and video permissions absent.

## Phase 2 — User-controlled content servings

- Add a user-triggered “Analyze this content” action.
- Process a bounded screenshot locally when DOM text is insufficient.
- Add local OCR and image classification behind a capability interface.
- Delete raw capture and OCR output after analysis.
- Show exactly what was analyzed and what was retained.

## Phase 2A — Active-tab analysis

- Add the person-triggered Analyze this content flow.
- Request active-tab capture only at the point of use.
- Process the capture locally and delete raw media after analysis.
- Show a visible capture state and result explanation.

## Phase 3 — Safety actions and quality

- Add blur/hide/mute controls where platform capabilities allow.
- Add confidence-aware explanations.
- Create labeled evaluation fixtures and regression tests.
- Add accessibility, performance, and failure-mode testing.

## Phase 4 — Research readiness (backlog)

- Draft protocol, consent, parental permission, assent, and safety escalation procedures.
- Obtain IRB and institutional privacy review before recruitment.
- Add a separately enabled research-export mode.
- Run a small pilot focused on feasibility and data quality, not causal claims.
- Evaluate a visible, browser-tab-only research session with local video feature extraction; do not add webcam, microphone, desktop capture, or raw-media export by default.

## Explicit non-goals for the first product

- Continuous hidden screen recording
- Uploading raw screenshots by default
- Automated mental-health diagnosis
- Automatic punitive action against accounts or people
- Building a child-facing product before the child-safety and consent model is approved
