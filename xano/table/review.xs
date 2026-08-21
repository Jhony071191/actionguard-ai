table "review" {
  auth = false
  schema {
    int id
    int organization_id { table = "organization" }
    int action_id { table = "action" }
    int reviewed_by { table = "user" }
    enum outcome { values = ["APPROVED", "REJECTED"] }
    text reason filters=trim
    timestamp reviewed_at?=now
  }
  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "action_id"}]}
    {type: "btree", field: [{name: "organization_id"}, {name: "reviewed_at", op: "desc"}]}
  ]
}
