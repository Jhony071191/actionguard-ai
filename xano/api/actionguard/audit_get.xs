query "actions/{action_id}/audit" verb=GET {
  api_group = "ActionGuard"
  auth = "user"
  description = "Return hash-linked evidence for one tenant-scoped action"
  input { int action_id { table = "action" } }
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
      where = $db.action.id == $input.action_id && $db.action.organization_id == $current_user.organization_id
      return = {type: "single"}
    } as $allowed
    precondition ($allowed != null) {
      error_type = "notfound"
      error = "Action not found"
    }
    db.query "audit_event" {
      where = $db.audit_event.action_id == $input.action_id && $db.audit_event.organization_id == $current_user.organization_id
      sort = {sequence: "asc"}
    } as $events
  }
  response = {events: $events}
}
