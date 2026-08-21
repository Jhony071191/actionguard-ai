table "user" {
  auth = true
  schema {
    int id
    int organization_id { table = "organization" }
    text name filters=trim
    email email filters=trim|lower { sensitive = true }
    password password { sensitive = true }
    enum role?="member" { values = ["member", "procurement_agent", "reviewer", "privacy_officer", "admin"] }
    bool is_active?=true
    timestamp created_at?=now
  }
  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "email"}]}
    {type: "btree", field: [{name: "organization_id"}, {name: "role"}]}
  ]
}
