export type SmaBucket = "SMA-0" | "SMA-1" | "SMA-2" | "NPA"
export type PriorityAction = "telecaller_call" | "whatsapp" | "field_visit"
export type PreferredLanguage = "hindi" | "english"

export interface Borrower {
  id: string
  loan_account_number: string
  full_name: string
  phone_number: string
  state: string | null
  preferred_language: PreferredLanguage | null
  emi_amount: string | null
  outstanding_balance: string | null
  due_date: string | null
  dpd_days: number | null
  last_payment_date: string | null
  last_payment_amount: string | null
  sma_bucket: SmaBucket | null
  priority_score: string | null
  priority_reason: string | null
  priority_action: PriorityAction | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AppUser {
  id: string
  email: string
  full_name: string
  role: string
}

export interface CurrentUser extends AppUser {
  nbfc_name: string | null
}

export type InteractionType = "telecall" | "field_visit" | "whatsapp_outbound" | "system"
export type InteractionOutcome =
  | "promise_to_pay"
  | "not_reachable"
  | "dispute"
  | "already_paid"
  | "payment_collected"
  | "not_found"
  | "refused"
  | "message_sent"
  | "message_delivered"
  | "message_read"

export type UploadStatus = "pending" | "processing" | "complete" | "failed"

export interface CsvUploadRecord {
  id: string
  status: UploadStatus
  original_filename: string | null
  row_count: number | null
  ingested_count: number | null
  skipped_count: number | null
  error_summary: { row: number; field: string; reason: string }[] | null
  minio_object_key: string
  created_at: string
  completed_at: string | null
}

export interface InteractionLog {
  id: string
  borrower_id: string
  logged_by: string
  interaction_type: InteractionType
  outcome: InteractionOutcome
  ptp_date: string | null
  ptp_amount: string | null
  ptp_broken: boolean
  payment_amount: string | null
  note: string | null
  is_offline_log: boolean
  created_at: string
  server_created_at: string
}
