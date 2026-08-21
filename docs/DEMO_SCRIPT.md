# Demo script — target 3 minutes

## 0:00–0:20 — Problem

“AI agents can now buy software, create vendors, and export customer data through APIs. Traditional approval portals were built for slow human workflows. ActionGuard AI is the pre-flight control plane that checks every action before it becomes a business consequence.”

Show the command center and the three outcome cards.

## 0:20–0:55 — ALLOW

Run **Approved software renewal**.

“This is a USD 120 renewal with an approved supplier and an authorized procurement role. The deterministic policy returns ALLOW, executes the simulated effect exactly once, and writes evaluation plus execution evidence.”

Open Evidence and show `ALLOW`, the explanation, and the verified two-event hash chain.

## 0:55–1:45 — REVIEW and human decision

Run **New vendor payment**.

“This action combines a new vendor, USD 7,500, and bank data. Sensitive information is masked before storage. REVIEW means no effect exists yet.”

Open Approvals and click **Approve once**.

“A named reviewer must provide a reason. Only then does one execution appear, followed by approval and execution evidence.”

## 1:45–2:10 — DENY

Run **Bulk customer export**.

“A support role requests 10,000 customer records. The privacy policy returns DENY. There is no approval path and no execution.”

Show the critical risk rule in Evidence.

## 2:10–2:35 — Policy Studio

Generate a draft from the default instruction.

“AI helps turn governance language into editable rules, but it cannot publish, approve, or bypass deterministic controls. If the AI provider fails, a transparent deterministic fallback keeps the system safe.”

## 2:35–3:00 — Xano and close

Show the repository `xano/` directory or Xano workspace, then the tests.

“Xano owns tenant-scoped data, authenticated APIs, idempotency, transactional approvals, and audit persistence. The source has fifteen officially validated XanoScript constructs. ActionGuard lets organizations automate faster because the dangerous actions are controlled before execution—not investigated afterward.”

End on: **Fail closed. Execute once. Explain always.**

## Recording checklist

- Record at 1080p with browser zoom around 100%.
- Use only synthetic data and keep tokens, browser tabs, and credentials hidden.
- Demonstrate the live Xano-backed badge only after a real endpoint test.
- Keep the final video between two and four minutes.
- Do not speed up the approval moment; it is the product's central proof.
