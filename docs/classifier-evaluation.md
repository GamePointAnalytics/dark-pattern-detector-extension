# Classifier Evaluation Plan

## Detector families

1. Deterministic rules: existing dark-pattern patterns and future offline safety rules.
2. Local image/text models: optional classifiers for categories such as nudity, violence, or self-harm.
3. Hybrid verdicts: a deterministic candidate reviewed by an on-device model, with uncertainty preserved.

## Evaluation requirements

- Define each category with positive, negative, borderline, and “insufficient evidence” examples.
- Build a human-labeled evaluation set that is separate from development examples.
- Measure precision, recall, F1, false-positive rate, and false-negative rate per category.
- Report confidence calibration, not only accuracy.
- Test across platforms, languages, image styles, text density, skin tones, accessibility settings, and content contexts.
- Test adversarial inputs such as slang, cropping, memes, coded language, and intentionally misleading layouts.
- Record detector version and evaluation version with every result.

## Product behavior

- High-confidence safety signals may offer a warning or blur, subject to the person’s settings.
- Medium-confidence signals should explain uncertainty and ask for feedback.
- Low-confidence signals should normally remain advisory and should not trigger irreversible actions.
- A model must never claim that exposure caused a mental-health outcome.

## Feedback loop

Feedback becomes a labeled example only after it is separated from the person’s identity and reviewed under the applicable product or research policy. It should improve evaluation and rule quality, not silently train a model from private content.
