table "organization" {
  auth = false
  schema {
    int id
    text name filters=trim
    text slug filters=trim|lower
    timestamp created_at?=now
  }
  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "slug"}]}
  ]
}
