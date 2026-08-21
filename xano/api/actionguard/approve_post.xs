query "actions/{action_id}/approve" verb=POST {
  api_group = "ActionGuard"
  auth = "user"
  description = "Approve and execute a REVIEW action exactly once"
  input {
    int action_id { table = "action" }
    text reason filters=trim|min:8|max:500
  }
  stack {
    precondition ($auth.role == "reviewer" || $auth.role == "admin") {
      error_type = "accessdenied"
      error = "Reviewer role required"
    }
    db.query "action" {
      where = $db.action.id == $input.action_id && $db.action.organization_id == $auth.organization_id
      return = {type: "single"}
    } as $pending
    precondition ($pending != null) {
      error_type = "notfound"
      error = "Action not found"
    }
    precondition ($pending.decision == "REVIEW" && $pending.status == "PENDING_REVIEW") {
      error_type = "inputerror"
      error = "Action is not pending review"
    }
    var $execution { value = {execution_id: (($pending.id|to_text) ~ "|approved")|sha256, executed_at: now, effect: "Simulated " ~ $pending.action_name ~ " on " ~ $pending.resource} }
    db.transaction {
      stack {
        db.add "review" {
          data = {organization_id: $auth.organization_id, action_id: $pending.id, reviewed_by: $auth.id, outcome: "APPROVED", reason: $input.reason, reviewed_at: now}
        } as $reviewed
        db.edit "action" {
          field_name = "id"
          field_value = $pending.id
          data = {status: "EXECUTED", execution: $execution, updated_at: now}
        } as $updated
        function.run "append_audit_event" {
          input = {organization_id: $auth.organization_id, action_id: $pending.id, actor_ref: $auth.id|to_text, event_type: "APPROVED", event_data: {reason: $input.reason}}
        } as $approved_event
        function.run "append_audit_event" {
          input = {organization_id: $auth.organization_id, action_id: $pending.id, actor_ref: "system", event_type: "EXECUTED", event_data: $execution}
        } as $executed_event
      }
    }
  }
  response = $updated
}
