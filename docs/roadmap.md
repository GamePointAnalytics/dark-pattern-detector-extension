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
- [x] Implement the product consent gate and inspectable local data view.
- Keep all screenshot and video permissions absent.

## Product operating modes and priority

1. **Observation and insights (default):** locally measure content signals, exposure buckets, and person feedback. This is the primary MVP and the future research-baseline path.
2. **Personal protection (optional):** person-triggered actions such as Blur may help someone respond to a signal, but they are not part of the observational baseline and must never activate automatically.
3. **Research (backlog):** a separately consented study mode. Observational studies should keep personal-protection actions disabled or record them as an explicit intervention variable.

This ordering protects the core question: what patterns are observed in content exposure and self-reported outcomes? The product must not imply that a detection caused an outcome.

## Phase 1B — Measurement and local insights (current priority)

- [x] Aggregate local signals by category, session, and recorded hour.
- [x] Track local visibility-aware observation time in minimized session summaries.
- [x] Explain the observation window, local-only scope, and deletion control.
- [x] Add a short recent-hours category trend without displaying raw content.
- [x] Keep self-reported wellbeing out of the desktop MVP; reserve it for separately approved research design.
- [x] Define an observation-only default where personal-protection actions are opt-in and can be measured separately.

## Tomorrow — focused implementation checklist

The goal for the next work session is to strengthen the existing browser MVP before expanding its capture surface.

### 1. Confirm the current baseline

- [ ] Reload the unpacked extension from the Columbia working copy.
- [ ] Open `test_page.html` and confirm Start Observation, Scan Current Page, pause/resume, and Delete Local History.
- [ ] Confirm that clearing history followed by another scan repopulates Local events.
- [ ] Mark one detection **Not relevant**, close and reopen the popup, and confirm it remains **Marked**.
- [ ] Open the popup on `chrome://extensions` and confirm no “Receiving end does not exist” error appears.

### 2. Make feedback useful and explainable

- [ ] Decide whether **Not relevant** should hide a detection immediately or only improve future confidence.
- [ ] Add a visible local feedback summary: relevant, not relevant, and unanswered.
- [ ] Ensure feedback is never treated as medical, psychological, or definitive truth.
- [ ] Add a clear “Reset feedback” or equivalent control only after defining its deletion semantics.

### 3. Improve detection quality without changing the product boundary

- [ ] Review false positives in `test_context.html` and add a small labeled fixture set.
- [ ] Add context-aware matching for negation, quotations, navigation/footer text, and benign urgency language.
- [ ] Record detector version and confidence consistently in local events.
- [ ] Add regression tests for every corrected false positive and missed detection.

### 4. Prepare the first personal insights view

- [ ] Define two or three non-diagnostic summaries, such as detections by category and exposure over time.
- [x] Show a local category-and-session summary from minimized events in the popup.
- [x] Display the observation window and local-data scope beside every summary.
- [x] Make insufficient-data states explicit instead of implying a conclusion.
- [x] Keep all calculations local and make the result deletable.

### 5. Defer intentionally

- [ ] Do not add webcam, microphone, desktop capture, continuous video, or cloud upload.
- [ ] Do not begin participant research, research export, or health-correlation claims.
- [ ] Keep screenshot/OCR/image analysis in Phase 2 until the consent, deletion, and capability design is reviewed.

### Definition of done for tomorrow

- The manual baseline checks pass.
- Feedback survives popup reopening and remains local.
- At least five false-positive or context cases have regression coverage.
- A short personal-insights design is written before implementation begins.
- The working tree is tested and committed with a focused message.

## Phase 2 — User-controlled content servings

- [x] Add a two-step, user-triggered “Analyze visible content” action using activeTab.
- [x] Process one bounded visible-tab screenshot locally and discard it after a capture receipt is derived.
- [x] Process a bounded screenshot locally when DOM text is insufficient.
- [x] Add local image classification behind a capability interface; defer OCR until it has a specific validated use case.
- [x] Delete raw capture and any model prose after analysis.
- [x] Show exactly what was analyzed and what was retained.

## Phase 2A — Active-tab analysis

- [x] Add the person-triggered Analyze this content flow.
- [x] Request active-tab capture only at the point of use.
- [x] Process the capture locally and delete raw media after analysis.
- [x] Show a visible capture state and result explanation.
- [x] Show local image-model readiness before a person chooses to capture.
- [ ] Select and approve a secure remote-analysis boundary before implementing any remote screenshot inference.

## Phase 3 — Optional personal-protection actions and quality

- [x] Add a person-controlled, reversible blur action for extension-highlighted text.
- [ ] Do not expand hide/mute controls until their platform scope, reversibility, and effect on observational data are clear.
- [x] Add confidence-aware explanations that describe local rules or heuristics as advisory candidates.
- [x] Create labeled development fixtures and regression tests for every configured category.
- [x] Add an MVP accessibility, performance, and failure-mode test checklist.

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
