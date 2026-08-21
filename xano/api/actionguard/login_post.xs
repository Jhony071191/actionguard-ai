query "auth/login" verb=POST {
  api_group = "ActionGuard"
  description = "Authenticate a demo or production user and return a scoped bearer token"
  input {
    email email filters=trim|lower
    text password { sensitive = true }
  }
  stack {
    db.query "user" {
      where = $db.user.email == $input.email && $db.user.is_active == true
      return = {type: "single"}
    } as $user_record
    precondition ($user_record != null) {
      error_type = "accessdenied"
      error = "Invalid credentials"
    }
    security.check_password {
      text_password = $input.password
      hash_password = $user_record.password
    } as $password_valid
    precondition ($password_valid) {
      error_type = "accessdenied"
      error = "Invalid credentials"
    }
    security.create_auth_token {
      table = "user"
      id = $user_record.id
      extras = {organization_id: $user_record.organization_id, role: $user_record.role}
      expiration = 14400
    } as $auth_token
  }
  response = {authToken: $auth_token, user: {id: $user_record.id, name: $user_record.name, role: $user_record.role, organization_id: $user_record.organization_id}}
}
