# Data Inventory

| Data | Origin | Default location | Default retention | Research export? |
|---|---|---|---|---|
| Raw screenshot/frame | Browser or device capture | Memory only | Seconds; delete after analysis | No |
| OCR text | Local OCR | Memory only | Delete after classification | No |
| Content signals | Deterministic and AI detectors | Device | Configurable local history | Aggregated only |
| Exposure duration | Local session timer | Device | Session/day summary | Aggregated only |
| Platform category | Browser context | Device | Session/day summary | Yes, minimized |
| User feedback | Person interaction | Device | Until deleted or retention limit | Yes, with consent |
| Wellbeing check-in | Person input | Device | Study-specific | Yes, with consent |
| URL/account/name | Browser or capture | Never by default | None | No |
| Model confidence/version | Detector output | Device | With local event | Yes |
| Raw research image | Explicit study capture | Encrypted research store | Study-specific, short-lived | Only under separate approval |
| Tab-video buffer | Consented research session | Device memory only | Delete after local feature extraction | No, by default |

## Data minimization rules

- Prefer category counts and time buckets over exact timestamps.
- Prefer platform type over exact URL.
- Prefer “account muted by person” over account identity.
- Never retain OCR text when a category and confidence are sufficient.
- Never use research export as a hidden backup of product data.
- Retention, export, and deletion behavior must be visible in settings.
- Video-derived interaction metrics must be stored separately from raw tab-video buffers.
