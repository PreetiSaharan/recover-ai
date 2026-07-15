import type { InteractionOutcome, InteractionType } from "@/lib/types"

export const OUTCOME_LABELS: Record<InteractionOutcome, string> = {
  promise_to_pay: "Promise to Pay",
  not_reachable: "Not Reachable",
  refused: "Refused",
  dispute: "Dispute",
  already_paid: "Already Paid",
  payment_collected: "Payment Collected",
  not_found: "Not Found",
  message_sent: "Message Sent",
  message_delivered: "Message Delivered",
  message_read: "Message Read",
}

export const OUTCOME_BADGE_CLASSES: Record<string, string> = {
  promise_to_pay: "bg-status-current/15 text-status-current",
  refused: "bg-status-npa/15 text-status-npa",
  dispute: "bg-status-sma2/15 text-status-sma2",
  not_reachable: "bg-muted text-muted-foreground",
  already_paid: "bg-status-current/15 text-status-current",
  payment_collected: "bg-status-current/15 text-status-current",
}

// status-color CSS variable name (without the leading "--"), for chart segments etc.
export const OUTCOME_COLOR_VAR: Record<InteractionOutcome, string> = {
  promise_to_pay: "status-current",
  not_reachable: "muted-foreground",
  refused: "status-npa",
  dispute: "status-sma2",
  already_paid: "status-current",
  payment_collected: "status-current",
  not_found: "muted-foreground",
  message_sent: "status-sma0",
  message_delivered: "status-sma0",
  message_read: "status-sma0",
}

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  telecall: "Telecall",
  field_visit: "Field Visit",
  whatsapp_outbound: "WhatsApp",
  system: "System",
}

const PRODUCTIVE_OUTCOMES: InteractionOutcome[] = ["payment_collected", "already_paid", "promise_to_pay"]

export function isWastedOutcome(outcome: InteractionOutcome) {
  return !PRODUCTIVE_OUTCOMES.includes(outcome)
}
