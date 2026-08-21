# ADR-001 — Hackathon eligibility and clean-room build

- **Status:** Accepted
- **Decision time:** 2026-08-17 19:01 CEST
- **Competition:** DevNetwork [API + Cloud + AI] Hackathon 2026

## Decision

ActionGuard AI is being built in a new repository after the official submission window opened. No source code, components, automated tests, or datasets from earlier projects are copied into this repository. Product planning completed before the opening is treated as requirements only.

## Evidence

The official Devpost schedule lists the submission window as August 17, 2026 at 10:00 PDT through September 3, 2026 at 10:00 PDT. This repository was initialized after 19:00 CEST on August 17, 2026.

## Consequences

- All implementation history is retained in this repository.
- Demo data is synthetic and was authored for this project.
- External services are represented by explicit adapters; an integration is never described as complete without a verified live call.

