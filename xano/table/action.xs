table "action" {
  auth = false
  schema {
    int id
    int organization_id { table = "organization" }
    int actor_id { table = "user" }
    text idempotency_key filters=trim
    text action_name filters=trim
    text resource filters=trim
    json masked_payload
    enum decision { values = ["ALLOW", "REVIEW", "DENY"] }
    enum status { values = ["EXECUTED", "PENDING_REVIEW", "DENIED", "REJECTED"] }
    int risk_score filters=min:0|max:100
    json risk_factors?
    json matched_rules?
    text explanation
    json execution?
    timestamp created_at?=now
    timestamp updated_at?
  }
  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "organization_id"}, {name: "idempotency_key"}]}
    {type: "btree", field: [{name: "organization_id"}, {name: "created_at", op: "desc"}]}
    {type: "btree", field: [{name: "organization_id"}, {name: "status"}]}
  ]
}
