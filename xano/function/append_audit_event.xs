function "append_audit_event" {
  input {
    int organization_id { table = "organization" }
    int action_id { table = "action" }
    text actor_ref filters=trim
    text event_type filters=trim
    json event_data
  }
  stack {
    db.query "audit_event" {
      where = $db.audit_event.action_id == $input.action_id && $db.audit_event.organization_id == $input.organization_id
      sort = { sequence: "desc" }
      return = { type: "single" }
    } as $previous
    var $sequence { value = ($previous.sequence ?? 0) + 1 }
    var $previous_hash { value = $previous.event_hash ?? "0000000000000000000000000000000000000000000000000000000000000000" }
    var $canonical {
      value = ($input.action_id|to_text) ~ "|" ~ ($sequence|to_text) ~ "|" ~ $input.event_type ~ "|" ~ ($input.event_data|json_encode) ~ "|" ~ $previous_hash
    }
    var $event_hash { value = $canonical|sha256 }
    db.add "audit_event" {
      data = {
        organization_id: $input.organization_id,
        action_id: $input.action_id,
        sequence: $sequence,
        actor_ref: $input.actor_ref,
        event_type: $input.event_type,
        event_data: $input.event_data,
        previous_hash: $previous_hash,
        event_hash: $event_hash,
        created_at: now
      }
    } as $event
  }
  response = $event
}
