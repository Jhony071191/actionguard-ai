query "actions/evaluate" verb=POST {
  api_group = "ActionGuard"
  auth = "user"
  description = "Evaluate an intended agent action once"
  input {
    text idempotency_key filters=trim|min:8|max:120
    text action_name filters=trim
    text resource filters=trim
    json payload
    bool approved_provider?=false
    int record_count?=0 filters=min:0
  }
  stack {
    db.query "user" {
      where = $db.user.id == $auth.id && $db.user.is_active == true
      return = {type: "single"}
    } as $current_user
    precondition ($current_user != null) {
      error_type = "accessdenied"
      error = "Active user required"
    }
    db.query "action" {
      where = $db.action.organization_id == $current_user.organization_id && $db.action.idempotency_key == $input.idempotency_key
      return = { type: "single" }
    } as $existing
    conditional {
      if ($existing != null) {
        return { value = {record: $existing, duplicate: true} }
      }
    }
    function.run "evaluate_policy" {
      input = {
        action_name: $input.action_name,
        actor_role: $current_user.role,
        payload: $input.payload,
        approved_provider: $input.approved_provider,
        record_count: $input.record_count
      }
    } as $evaluation
    var $masked_payload { value = $input.payload }
    conditional {
      if (($masked_payload|has:"bankAccount")) {
        var.update $masked_payload { value = $masked_payload|set:"bankAccount":"[REDACTED]" }
      }
    }
    conditional {
      if (($masked_payload|has:"iban")) {
        var.update $masked_payload { value = $masked_payload|set:"iban":"[REDACTED]" }
      }
    }
    conditional {
      if (($masked_payload|has:"routingNumber")) {
        var.update $masked_payload { value = $masked_payload|set:"routingNumber":"[REDACTED]" }
      }
    }
    var $status { value = $evaluation.decision == "ALLOW" ? "EXECUTED" : ($evaluation.decision == "REVIEW" ? "PENDING_REVIEW" : "DENIED") }
    var $executed_at { value = now }
    var $execution { value = $evaluation.decision == "ALLOW" ? {execution_id: $input.idempotency_key|sha256, executed_at: $executed_at, effect: "Simulated " ~ $input.action_name ~ " on " ~ $input.resource} : null }
    db.transaction {
      stack {
        db.add "action" {
          data = {
            organization_id: $current_user.organization_id,
            actor_id: $auth.id,
            idempotency_key: $input.idempotency_key,
            action_name: $input.action_name,
            resource: $input.resource,
            masked_payload: $masked_payload,
            decision: $evaluation.decision,
            status: $status,
            risk_score: $evaluation.risk_score,
            risk_factors: $evaluation.risk_factors,
            matched_rules: $evaluation.matched_rules,
            explanation: $evaluation.explanation,
            execution: $execution,
            created_at: now
          }
        } as $created
        function.run "append_audit_event" {
          input = {organization_id: $current_user.organization_id, action_id: $created.id, actor_ref: $auth.id|to_text, event_type: "EVALUATED", event_data: {decision: $created.decision, risk_score: $created.risk_score}}
        } as $evaluated_event
        conditional {
          if ($evaluation.decision == "ALLOW") {
            function.run "append_audit_event" {
              input = {organization_id: $current_user.organization_id, action_id: $created.id, actor_ref: "system", event_type: "EXECUTED", event_data: $execution}
            } as $executed_event
          }
        }
      }
    }
  }
  response = {record: $created, duplicate: false}
}
