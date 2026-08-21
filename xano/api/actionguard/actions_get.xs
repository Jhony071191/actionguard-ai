query "actions" verb=GET {
  api_group = "ActionGuard"
  auth = "user"
  description = "List actions for the authenticated organization"
  input {
    int page?=1 filters=min:1
    int per_page?=25 filters=min:1|max:100
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
      where = $db.action.organization_id == $current_user.organization_id
      sort = { created_at: "desc" }
      return = {type: "list", paging: {page: $input.page, per_page: $input.per_page, totals: true}}
    } as $actions
  }
  response = $actions
}
