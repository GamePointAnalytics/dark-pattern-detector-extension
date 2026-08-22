# Local Event Schema

This is the initial conceptual schema for local events. It is intentionally smaller than the raw material used to derive it.

```json
{
  "schemaVersion": "0.1",
  "eventId": "device-generated-random-id",
  "occurredAtBucket": "2026-08-21T17:00:00-04:00",
  "sessionId": "device-local-session-id",
  "source": {
    "surface": "browser_tab",
    "platformType": "short_video",
    "captureMode": "dom_text"
  },
  "exposure": {
    "durationSeconds": 18,
    "contentServingCount": 1
  },
  "signals": [
    {
      "category": "violence",
      "subtype": "graphic",
      "confidence": 0.87,
      "detector": "deterministic|ai|hybrid",
      "modelVersion": "local-0.1.0"
    }
  ],
  "feedback": {
    "relevance": "relevant|not_relevant|unknown",
    "wantedness": "wanted|not_wanted|unknown",
    "safetyAction": "none|dismiss|blur|hide|mute|block|pause"
  },
  "privacy": {
    "rawCaptureDeleted": true,
    "ocrTextDeleted": true,
    "researchExportEligible": false
  }
}
```

## Schema rules

- Do not add raw text, screenshots, exact URLs, usernames, or account names to this schema without a new privacy review.
- `signals` records model outputs, not confirmed facts.
- Confidence expresses detector certainty about its local signal, not whether a design is manipulative or harmful. Current deterministic text rules use `0.75`; visual heuristics use `0.60`.
- `feedback` is separate from `signals`; a person correcting the model must not silently rewrite detector performance history.
- `researchExportEligible` is false unless research consent and study policy allow the event.
