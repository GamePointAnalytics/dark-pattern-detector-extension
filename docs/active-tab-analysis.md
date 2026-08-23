# Active-Tab Analysis (Beta)

## Current capability

The beta adds a two-step, person-triggered active-tab capture flow using the existing `activeTab` permission. A person first opens the capture explanation and then explicitly confirms one visible-tab capture. It analyzes rendered pixels rather than DOM content, so a visible web page, image, or rendered PDF can use the same local pipeline.

The capture module returns only a receipt containing `captureMode`, image dimensions, an image-analysis availability state, approved category signals (if any), and `rawCaptureDeleted: true`. The PNG data URL exists only in memory while it is decoded and assessed. It is never written to extension storage or uploaded.

When Chrome's on-device Prompt API supports image input on the person's device, the extension makes a one-shot local assessment. The retained output is limited to `sexual_nudity`, `graphic_violence`, or `visual_dark_pattern` plus normalized confidence. Model prose, image captions, OCR text, URLs, account names, and the capture itself are discarded. If the capability is unavailable or fails, no image signal is stored.

Before capture, the popup checks and explains the local model state: ready, downloadable, downloading, or unavailable. This is advisory status only; it does not start a download or capture by itself.

On ordinary web pages, explicit active-tab analysis first runs the extension's deterministic DOM and visual-interference rules. Those local findings appear immediately in the popup and use the existing minimized-event store. This one-off analysis does not start an observation session or timer. Rendered PDFs and image-only tabs may not expose a page DOM; those tabs skip this step and continue to the screenshot model path.

This is an advisory signal, not a moderation decision, age assessment, or mental-health conclusion. It must be evaluated against labeled examples before product claims are made.

## Module interface

`active-tab-capture.js` exposes one interface: `captureOnce({ getActiveTab, ensureReady, captureVisibleTab, decodeImage, analyzeCapture })`.

The interface keeps Chrome-specific access, image decoding, and on-device model access in adapters supplied by the popup. The module returns a minimal receipt and never returns raw capture data. `image-signal-core.js` is the retention boundary: it rejects every model field except approved category labels and confidence values.

## Why not tabCapture yet

`tabCapture` is intentionally not requested. It is for tab media streams and carries a broader permission surface. The product will revisit it only for a separately consented, visible, time-bounded research session after the study protocol and privacy review are complete.
