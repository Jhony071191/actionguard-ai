# Data model

| Entity | Essential fields | Invariant |
| --- | --- | --- |
| organization | id, name | tenant root |
| actor | id, organization_id, role | actor belongs to one tenant |
| policy | id, organization_id, version, rules, published_at | versions are immutable |
| action | id, organization_id, idempotency_key, actor_id, decision, status, masked_payload | unique tenant + idempotency key |
| approval | id, action_id, reviewer_id, outcome, reason, reviewed_at | only pending REVIEW actions |
| execution | id, action_id, executed_at, effect | at most one per action |
| audit_event | id, action_id, sequence, previous_hash, event_hash, data | unique action + sequence |

Foreign-key access must always be constrained by the authenticated `organization_id`, including indirect approval and audit lookups.
