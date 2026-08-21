table "audit_event" {
  auth = false
  schema {
    int id
    int organization_id { table = "organization" }
    int action_id { table = "action" }
    int sequence filters=min:1
    text actor_ref filters=trim
    enum event_type { values = ["EVALUATED", "APPROVED", "REJECTED", "EXECUTED"] }
    json event_data
    text previous_hash
    text event_hash
    timestamp created_at?=now
  }
  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "action_id"}, {name: "sequence"}]}
    {type: "btree", field: [{name: "organization_id"}, {name: "created_at", op: "desc"}]}
  ]
}
