query "actions" verb=GET {
  api_group = "ActionGuard"
  auth = "user"
  description = "List actions for the authenticated organization"
  input {
    int page?=1 filters=min:1
    int per_page?=25 filters=min:1|max:100
  }
  stack {
    db.query "action" {
      where = $db.action.organization_id == $auth.organization_id
      sort = { created_at: "desc" }
      return = {type: "list", paging: {page: $input.page, per_page: $input.per_page, totals: true}}
    } as $actions
  }
  response = $actions
}
