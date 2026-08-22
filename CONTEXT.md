# Social Media Health Tracker Context

This project helps people understand and control their digital content exposure without requiring the product to retain a private archive of their screens. It combines local content analysis, personal insights, and a future opt-in research pathway.

## Product language

**Person**:
The individual using the product. Use this instead of “user” when discussing wellbeing, consent, or safety.
_Avoid_: Subject, consumer

**Content exposure**:
The content that is visible to a person during a tracked session. Exposure is not the same as endorsement, engagement, or harm.
_Avoid_: Consumption, impression

**Content signal**:
A locally derived classification or observation about exposed content, such as violence, nudity, politics, urgency, or repeated engagement cues.
_Avoid_: Truth, diagnosis, label

**Detection**:
The act of identifying a possible content signal using a deterministic rule, an AI model, or both.
_Avoid_: Moderation, judgment

**Feedback**:
The person’s explicit correction or reaction to a detection, such as “relevant,” “not relevant,” or “not wanted.”
_Avoid_: Ground truth, rating

**Insight**:
A user-facing summary derived from detections, exposure, and feedback over time. An insight describes an observed pattern and must not present itself as a medical diagnosis or causal conclusion.
_Avoid_: Diagnosis, prescription

**Content serving**:
A bounded unit of content analyzed as one interaction, analogous to a food serving in a nutrition tracker. It may be a visible page, post, screen, or short capture window.
_Avoid_: Surveillance sample, recording

**Browser observation**:
Local analysis of supported browser content and interaction movement without creating raw screen media.
_Avoid_: Tracking, recording

**Active-tab analysis**:
A person-triggered local analysis of the currently visible browser tab when DOM information is insufficient.
_Avoid_: Screenshot logging, passive capture

**Research session**:
A separately consented, visible, time-bounded study session that may derive research metrics from browser-tab media.
_Avoid_: Monitoring session, proctoring

**Interaction movement**:
Navigation behavior within a supported content surface, such as scrolling, dwell time, feed transitions, and person-selected actions. It does not mean physical or biometric movement.
_Avoid_: Movement tracking, behavioral surveillance

**Raw capture**:
A screenshot, video frame, audio segment, OCR text, or other directly captured representation of a person’s screen. Raw captures are disposable by default.
_Avoid_: Dataset, evidence

**Local event**:
A minimal structured record retained on the person’s device after raw capture processing.
_Avoid_: Telemetry, surveillance record

**Research export**:
A separately consented, minimized set of de-identified local events prepared for an approved research study.
_Avoid_: Data dump, user data

**Safety action**:
A person-controlled response to a signal, such as dismiss, blur, hide, mute, block, or pause detection.
_Avoid_: Enforcement, punishment

**Model verdict**:
A probabilistic output from a detector, including its category, confidence, and model version. A verdict is never treated as unquestionable truth.
_Avoid_: Fact, diagnosis
