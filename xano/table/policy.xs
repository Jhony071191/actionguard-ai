table "policy" {
  auth = false
  schema {
    int id
    int organization_id { table = "organization" }
    int version filters=min:1
    text source_text
    json rules
    enum generated_by { values = ["ai", "deterministic-fallback", "human"] }
    int published_by { table = "user" }
    timestamp published_at?=now
  }
  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "organization_id"}, {name: "version"}]}
  ]
}
