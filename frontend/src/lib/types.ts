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
  sma_bucket: SmaBucket | null
  priority_score: string | null
  priority_reason: string | null
  priority_action: PriorityAction | null
  is_active: boolean
  created_at: string
  updated_at: string
}
