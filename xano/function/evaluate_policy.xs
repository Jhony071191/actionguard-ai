function "evaluate_policy" {
  input {
    text action_name filters=trim
    text actor_role filters=trim
    json payload
    bool approved_provider?=false
    int record_count?=0
  }
  stack {
    var $amount { value = $input.payload|get:"amount":0 }
    var $payload_keys { value = $input.payload|keys }
    var $bank_data {
      value = ($payload_keys|contains:"bankAccount") || ($payload_keys|contains:"iban") || ($payload_keys|contains:"routingNumber")
    }
    var $decision { value = "REVIEW" }
    var $risk_score { value = 50 }
    var $risk_factors { value = [] }
    var $matched_rules { value = ["review-known-action-without-auto-allow"] }
    var $explanation { value = "A person must review this known operation because no auto-allow rule applies." }

    conditional {
      if ($input.action_name == "customer.export" && $input.record_count >= 1000 && $input.actor_role != "admin" && $input.actor_role != "privacy_officer") {
        var.update $decision { value = "DENY" }
        var.update $risk_score { value = 100 }
        var.update $risk_factors { value = [{code: "BULK_EXPORT", label: "Bulk customer export requested", score: 100, severity: "critical"}] }
        var.update $matched_rules { value = ["deny-bulk-export-without-privacy-role"] }
        var.update $explanation { value = "Bulk customer data export is blocked for this role." }
      }
      elseif ($bank_data || $amount > 1000 || $input.action_name == "vendor.create_and_pay") {
        var.update $decision { value = "REVIEW" }
        var.update $risk_score { value = $bank_data ? 80 : 75 }
        var.update $risk_factors { value = [{code: "MATERIAL_RISK", label: "Financial or sensitive-data risk detected", score: $risk_score, severity: "high"}] }
        var.update $matched_rules { value = ["review-material-financial-or-sensitive-data-risk"] }
        var.update $explanation { value = "The action is paused for human approval because it has material financial or sensitive-data risk." }
      }
      elseif ($input.action_name == "software.renew" && $input.approved_provider && $amount > 0 && $amount <= 500 && ($input.actor_role == "procurement_agent" || $input.actor_role == "admin")) {
        var.update $decision { value = "ALLOW" }
        var.update $risk_score { value = 12 }
        var.update $risk_factors { value = [{code: "LOW_VALUE", label: "Low-value renewal with approved supplier", score: 12, severity: "low"}] }
        var.update $matched_rules { value = ["allow-approved-renewal-under-500"] }
        var.update $explanation { value = "The approved low-value renewal can execute automatically." }
      }
      elseif ($input.action_name != "software.renew" && $input.action_name != "vendor.create_and_pay" && $input.action_name != "customer.export") {
        var.update $decision { value = "DENY" }
        var.update $risk_score { value = 95 }
        var.update $risk_factors { value = [{code: "UNKNOWN_ACTION", label: "Action has no published policy", score: 95, severity: "critical"}] }
        var.update $matched_rules { value = ["default-deny-unknown-action"] }
        var.update $explanation { value = "The action is blocked because no published policy authorizes this operation." }
      }
    }
  }
  response = {
    decision: $decision,
    risk_score: $risk_score,
    risk_factors: $risk_factors,
    matched_rules: $matched_rules,
    explanation: $explanation
  }

  test "safe renewal is allowed" {
    input = {action_name: "software.renew", actor_role: "procurement_agent", payload: {amount: 120}, approved_provider: true, record_count: 0}
    expect.to_equal ($response.decision) { value = "ALLOW" }
  }

  test "vendor payment is reviewed" {
    input = {action_name: "vendor.create_and_pay", actor_role: "procurement_agent", payload: {amount: 7500, bankAccount: "SYNTHETIC"}, approved_provider: false, record_count: 0}
    expect.to_equal ($response.decision) { value = "REVIEW" }
  }

  test "bulk export is denied" {
    input = {action_name: "customer.export", actor_role: "member", payload: {recordCount: 10000}, approved_provider: false, record_count: 10000}
    expect.to_equal ($response.decision) { value = "DENY" }
  }
}
