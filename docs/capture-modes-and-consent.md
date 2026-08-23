# Capture Modes and Consent Spec

## Purpose

Define the product’s capture capabilities, the data each capability may create, and the consent required before it can run. This specification applies before any new browser or device capture permission is requested.

## Product rule

The product analyzes bounded content servings to help a person understand and control their exposure. It is not a covert monitoring or proctoring tool.

## Capture modes

### Mode 1 — Browser observation

The MVP mode. The extension analyzes supported browser content through the DOM, accessible labels, and local deterministic detectors.

- Starts only after the extension is active on a supported page.
- May collect local interaction metrics: session duration, feed transitions, scroll depth, scroll velocity, dwell time, and person-selected safety actions.
- Does not record desktop video, webcam video, microphone audio, or raw screenshots.
- Stores only minimized local events.
- Must provide Pause and Delete Local History controls.

### Mode 2 — Analyze this content

A person explicitly requests analysis of the content currently visible in the active tab when DOM data is insufficient.

- Starts only from a deliberate person action.
- Captures the visible active tab only.
- Runs local OCR and/or local image analysis.
- Keeps the raw capture in memory only for the duration of analysis, then deletes it.
- Shows the person what categories were detected, the confidence, and the available safety actions.
- Does not upload the capture, OCR text, URL, or account identity in normal product mode.

Current beta: one visible-tab capture is available only after an in-popup second confirmation. The beta validates local capture and disposal only; no OCR or image classifier is installed yet, so no image-derived signal is retained.

### Mode 3 — Consented research session (backlog)

A separately enabled study mode for an approved research protocol. It may use a visible, time-bounded tab-video stream to derive exposure and interaction metrics.

- Requires separate research consent; product consent is not sufficient.
- Must show an always-visible session indicator, elapsed timer, Pause control, Stop control, and session deletion control.
- Captures browser-tab video only. Webcam, microphone, whole-desktop capture, and background recording are out of scope.
- Defaults to no audio.
- Processes media locally using a short in-memory ring buffer. Raw frames and video are deleted after feature extraction unless the approved study explicitly authorizes short-term encrypted retention.
- Research export contains minimized events by default, not raw media.
- Cannot be enabled until the study protocol, data-retention schedule, security review, consent materials, and institutional review are complete.

## Consent gates

### Product consent gate

Before Mode 1 or Mode 2 is used, the product must explain in plain language:

- Which mode is active
- What the mode can access
- What remains on the device
- What is deleted and when
- That raw media is not uploaded in normal product mode
- How to pause, stop, and delete local history

### Research export gate

Before Mode 3 or any research export is enabled, the participant must separately accept study-specific consent. The consent flow must state the research purpose, duration, data classes, retention period, withdrawal procedure, risks, contacts, and whether any raw media can be retained.

## Safety stops

Every capture-capable mode must have:

1. A one-click Pause control that immediately stops new analysis.
2. A Stop Session control that ends the active session and deletes in-memory media buffers.
3. A Delete Local History control for stored local events.
4. A capture indicator that is visible whenever Mode 2 or Mode 3 is active.
5. A technical research-export gate: no export code path may run without valid research consent and an active approved study configuration.

## Explicit non-goals

- Hidden, background, or continuous desktop recording
- Webcam or microphone recording
- Covert child or employee monitoring
- Uploading raw screenshots or video in normal product mode
- Treating content classification as mental-health diagnosis
- Automatic punitive action against people or accounts

## MVP acceptance criteria

Mode 1 is the first implementation target. It is ready only when a person can start/pause it, inspect what is stored locally, delete that history, submit feedback on a detection, and receive a useful session summary without any raw screen capture leaving the device.
