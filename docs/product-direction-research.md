# Product Direction Research

## Working thesis

The project should evolve from a dark-pattern detector into a user-controlled social-media exposure tracker: a local-first tool that classifies what appears in a feed, explains why an item was flagged, lets the user define boundaries, and measures changes in exposure and behavior without retaining raw screens by default.

The product should not begin as an always-on recording system. Periodic screenshots and video are the highest-risk implementation because they capture passwords, private messages, unrelated applications, bystanders, children, and other content outside the research question.

## Recommended product boundary

### Version 1: browser-based exposure tracker

- Observe supported social feeds through browser-extension content scripts.
- Extract visible text, accessible labels, post metadata, and image/video URLs where the platform exposes them in the page.
- Run deterministic rules locally for dark patterns, content categories, risk terms, and account/name watchlists.
- Use local media classification for images where technically practical; send nothing to a server by default.
- Show an explanation and user action: dismiss, hide, mute, block, report, or mark as misclassified.
- Store aggregate events locally: category, confidence, timestamp bucket, platform, and user feedback—not raw screenshots or full post text.

### Version 2: optional participant research mode

- Explicitly opt-in, separately from the consumer safety mode.
- Collect only the minimum fields needed for a preregistered study.
- Give participants a live capture indicator, pause control, export/delete controls, and a clear retention deadline.
- Prefer on-device redaction and feature extraction before upload.
- Upload encrypted, pseudonymous events rather than media unless the IRB-approved protocol specifically requires media.

### Version 3: native platform integrations

Use official APIs or approved research access where available. Do not make scraping private feeds or bypassing platform controls a core dependency. YouTube exposes structured video resources through its Data API, and TikTok provides Research Tools for qualifying independent or academic researchers, subject to approval and terms. See the [YouTube API reference](https://developers.google.com/youtube/v3/docs) and [TikTok Research Tools documentation](https://developers.tiktok.com/docs/en/about-research-api).

## Privacy and security position

The strongest trust claim is not “we encrypt screenshots.” It is “we do not need to possess screenshots.” Encryption remains necessary for any retained data, but data minimization is the primary control.

Recommended defaults:

- No continuous recording.
- No cloud upload of raw screenshots or video.
- No model training on participant data unless separately and explicitly consented to.
- Short-lived in-memory media buffers; securely delete temporary files after inference.
- On-device OCR, image classification, and redaction before any research telemetry leaves the device.
- Store coarse labels and confidence scores, not copied feed content.
- Separate identity/account data from event data using rotating participant identifiers.
- Encrypt data at rest and in transit; keep keys separate from the event store.
- Role-based access, audit logs, least privilege, dependency scanning, and tested deletion/export workflows.
- Treat model prompts, logs, crash reports, analytics, and backups as possible data-exfiltration paths.

NIST’s Privacy Framework specifically emphasizes data minimization, disassociability, selective disclosure, deletion, and evaluating privacy preferences in algorithm design. It is a useful structure for the product’s privacy threat model: [NIST Privacy Framework](https://www.nist.gov/privacy-framework) and [NIST Privacy Framework Core](https://www.nist.gov/system/files/documents/2020/01/16/NIST%20Privacy%20Framework_V1.0.pdf).

## Children and age-restricted content

Do not position the first version as a parental surveillance product. The consent, safety, false-positive, and abuse risks are materially different. A child-safety mode should be a separately designed product surface with age-appropriate explanations, parental controls that cannot become covert monitoring, and a threat model for an abusive parent or guardian.

If the service is directed to children or has actual knowledge it is collecting personal information from children under 13, COPPA issues become central. The FTC treats photos, video, and audio containing a child’s image or voice as personal information and generally requires verifiable parental consent before collection. See the [FTC COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions). Obtain specialized counsel before collecting screen media from minors.

## Research design with Columbia

Separate product telemetry from human-subjects research. A useful first study could ask:

1. How accurately can the system classify exposure categories from locally extracted features?
2. How often do users agree with or correct the classification?
3. Does showing an explanation and control reduce unwanted exposure or improve perceived agency?
4. What is the relationship between exposure patterns and self-reported wellbeing, without claiming clinical diagnosis?

Define outcomes before collection. For example: precision/recall by category, user correction rate, intervention rate, exposure duration buckets, and pre/post self-report measures. Avoid collecting raw media merely because it may be useful later.

Columbia’s Human Research Protection Office states that IRB policies apply to human-subjects research and provides IRB guidance and FAQs. If identifiable behavioral data, audiovisual recordings, or participant feedback will be analyzed for research, route the protocol through the appropriate Columbia IRB/HRPO process before recruitment or collection: [Columbia HRPO/IRB](https://research.columbia.edu/human-research-protection-office-and-irbs) and [Columbia HRPO FAQ](https://research.columbia.edu/frequently-asked-questions-hrpoirb-0).

## Important legal/product caution

Do not describe the product as a mental-health diagnostic or prescriptive tool until clinical, regulatory, and validation questions are resolved. “Insights” should initially mean descriptive summaries such as “you encountered more violence-related content this week,” not “this content caused anxiety” or “you have an unhealthy relationship with social media.”

If the product makes health or wellbeing claims, consult counsel about the FTC Health Breach Notification Rule and related state requirements. The FTC says the rule can apply to many health apps and requires breach notifications for certain unsecured, identifiable health information: [FTC Health Breach Notification Rule guidance](https://www.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0) and [FTC mobile health app tool](https://www.ftc.gov/business-guidance/resources/mobile-health-apps-interactive-tool).

## Technical architecture direction

Use a capability-based pipeline with explicit data classes:

```text
page/feed adapter
  -> local extraction
  -> local deterministic classifiers
  -> optional local media/OCR models
  -> redaction + user feedback
  -> aggregate event store
  -> optional research export
```

Every stage should declare what it can read, what it emits, and whether the output may leave the device. The current extension is a good text/rules prototype, but the next deep module should be a normalized `ContentObservation` model rather than adding more regular expressions directly to `content.js`.

Suggested observation fields:

- `platform`
- `observedAtBucket`
- `contentType`
- `categories[]`
- `riskSignals[]`
- `accountMatch` as a hashed or locally resolved watchlist result
- `confidence`
- `classifierVersion`
- `userFeedback`

Do not include raw screenshot bytes, full post text, direct account identifiers, or URLs in the default research event.

## Immediate roadmap

1. Write the product consent/data contract before adding capture permissions.
2. Refactor the extension’s detection core into testable pure functions.
3. Add a normalized observation schema and a local event store.
4. Add text/image test fixtures with labeled expected outcomes.
5. Prototype local image classification on a small, consented benchmark set.
6. Build a transparent feedback loop: correct, dismiss, mute, block, and report.
7. Conduct a privacy threat model and abuse-case review.
8. Prepare the Columbia study protocol, data-retention schedule, consent language, and IRB submission.
9. Only then evaluate optional, tightly scoped screenshot capture for cases the browser DOM cannot represent.

## Bottom line

There is a credible product here, especially at the intersection of user agency, platform accountability, and digital-behavior research. The differentiator should be trustworthy measurement and user control—not the volume of screen data collected. Start with observable feed content and local inference; treat screenshots as an exceptional research instrument requiring separate consent, controls, redaction, retention, and review.
