query "actions/{action_id}/audit" verb=GET {
  api_group = "ActionGuard"
  auth = "user"
  description = "Return hash-linked evidence for one tenant-scoped action"
  input { int action_id { table = "action" } }
  stack {
    db.query "action" {
      where = $db.action.id == $input.action_id && $db.action.organization_id == $auth.organization_id
      return = {type: "exists"}
    } as $allowed
    precondition ($allowed) {
      error_type = "notfound"
      error = "Action not found"
    }
    db.query "audit_event" {
      where = $db.audit_event.action_id == $input.action_id && $db.audit_event.organization_id == $auth.organization_id
      sort = {sequence: "asc"}
    } as $events
  }
  response = {events: $events}
}
