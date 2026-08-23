# Secure AI Analysis Options

## Purpose

This document defines the decision required before the product sends any active-tab screenshot to a remote AI provider. It is not an approval to enable remote analysis.

## What “enterprise-style” should mean here

For this product, it must mean all of the following:

- A person explicitly initiates each capture and sees that remote analysis is enabled before the image leaves the device.
- The application sends only one bounded screenshot per request over TLS; it never sends URLs, browser history, account names, or a continuing screen stream.
- The application does not write the screenshot to its own database, object storage, logs, analytics system, or queue.
- The provider is contractually and technically configured not to use customer content for model training.
- The provider, retention mode, region, model version, request timestamp bucket, and deletion outcome are auditable without logging the image itself.
- The returned result is reduced to approved categories, confidence, and a short bounded explanation before it reaches local product storage.
- Research export is a separate capability. Product inference traffic must never silently become research data.

“No training” alone is insufficient. It does not answer whether a provider retains abuse-monitoring logs, creates stateful conversation records, transfers data outside a chosen region, or permits human review under exceptional safety processes.

## Options

| Option | Screenshot leaves device? | Training posture | Retention/control trade-off | Recommendation |
|---|---:|---|---|---|
| Chrome on-device Prompt API | No | No provider upload | Capability varies by browser/device | Keep as the local-first path |
| Self-hosted vision model in an organization-controlled environment | Yes, but only to organization infrastructure | Controlled by the organization | Highest operational, security, model-evaluation, and cost burden | Long-term option for stringent research/enterprise deployments |
| Azure AI Foundry / Azure-hosted model | Yes, to selected Azure deployment | Prompts/completions are not used to train base models without permission/instruction | Must choose region, deployment type, stateful features, monitoring settings, and contract | Recommended managed-enterprise candidate |
| OpenAI API with approved data controls | Yes, to API endpoint | API data is not used to train models by default | Default abuse-monitoring retention can be up to 30 days; Zero Data Retention requires approval and endpoint discipline | Strong managed candidate if ZDR/data residency are approved |

## Provider facts to validate in contracting

### Azure AI Foundry / Azure-hosted model

Microsoft states that prompts and completions are not used to train or improve base models, and that deployed models are stateless. It also documents that stateful features can create data stores and that abuse monitoring may involve automated review and, in some circumstances, human review. Regional behavior differs for Global and DataZone deployments. Use a regional deployment and avoid stateful conversation, file, batch, or stored-completion features for screenshot inference. Source: [Microsoft Foundry data privacy](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/openai/data-privacy).

### OpenAI API

OpenAI states that API inputs and outputs are not used to train models by default. Its data-controls documentation says standard abuse-monitoring logs can retain customer content for up to 30 days, while eligible organizations can request Modified Abuse Monitoring or Zero Data Retention. ZDR also changes endpoint behavior; do not use stateful conversations, threads, files, background processing, or other incompatible features. Image inputs can still be retained for manual review if automated scanning flags potential CSAM, even with ZDR/MAM. Source: [OpenAI API data controls](https://platform.openai.com/docs/models/default-usage-policies-by-endpoint).

## Recommended managed architecture

Use a dedicated `secure-analysis` backend service, not direct browser-to-provider calls:

```text
Extension
  -> explicit consent + one-time screenshot
  -> secure-analysis API (authenticated, rate-limited, no request-body logging)
  -> configured enterprise vision-model endpoint
  -> structured signal response
  -> immediate raw-image disposal in extension and service memory
  -> minimized local event only
```

The service must be stateless for this request class:

- Do not place screenshots in a job queue, blob storage, database, vector store, conversation/thread, trace, or support log.
- Disable HTTP request-body logging and error reporting that records request payloads.
- Use a provider call that does not create conversation/application state.
- Configure a strict body-size limit, short request timeout, rate limit, and server-side deletion in a `finally` block.
- Return a fixed schema only: `signals[]`, confidence, model version, policy version, and processing outcome.
- Authenticate the extension to the service; never ship the provider API key in the extension.
- Require point-of-use disclosure and a separate remote-analysis toggle. Local-only remains the default.

## Required decisions before implementation

1. Choose the processing boundary: self-hosted, Azure, or OpenAI API.
2. Confirm the organization/account, region, contract/DPA, retention controls, and who may access audit metadata.
3. Decide whether remote analysis is a product option, a research-only option, or both.
4. Approve the category taxonomy and evaluation threshold; do not send images until a human-labeled evaluation set exists.
5. Write the remote-analysis consent text, privacy policy section, deletion behavior, incident response plan, and vendor review.

## Non-negotiable product behavior

- No automatic or background upload.
- No hidden recording, webcam, microphone, or desktop capture.
- No use of remote screenshots for training, fine-tuning, or evaluation without a separately consented program.
- A failed provider call returns no retained signal and never retries in the background with the same image.
