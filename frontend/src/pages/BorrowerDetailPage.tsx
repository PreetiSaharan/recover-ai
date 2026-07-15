import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import type { Borrower, InteractionLog, SmaBucket } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LogOutcomeDialog } from "@/components/log-outcome-dialog"
import { OUTCOME_LABELS, OUTCOME_BADGE_CLASSES, INTERACTION_TYPE_LABELS } from "@/lib/outcomes"
import { ArrowLeft, Plus, Phone } from "lucide-react"

const SMA_BADGE_CLASSES: Record<SmaBucket, string> = {
  "SMA-0": "bg-status-sma0/10 text-status-sma0",
  "SMA-1": "bg-status-sma1/10 text-status-sma1",
  "SMA-2": "bg-status-sma2/10 text-status-sma2",
  NPA: "bg-status-npa/10 text-status-npa",
}

function formatCurrency(value: string | number | null) {
  if (value == null) return "—"
  const n = Number(value)
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

export default function BorrowerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [borrower, setBorrower] = useState<Borrower | null>(null)
  const [interactions, setInteractions] = useState<InteractionLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  async function loadInteractions() {
    if (!id) return
    try {
      const logs = await apiFetch(`/interactions/${id}?limit=20`)
      setInteractions(logs)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load interaction history")
    }
  }

  async function loadAll() {
    if (!id) return
    setIsLoading(true)
    try {
      const [b] = await Promise.all([apiFetch(`/borrowers/${id}`), loadInteractions()])
      setBorrower(b)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load borrower")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (isLoading) {
    return <div className="py-16 text-center text-muted-foreground">Loading borrower...</div>
  }

  if (!borrower) {
    return <div className="py-16 text-center text-muted-foreground">Borrower not found.</div>
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Queue
      </button>

      <div className="grid grid-cols-[340px_1fr] items-start gap-4">
        <Card>
          <CardContent className="space-y-4 py-1">
            <div>
              <div className="text-[19px] font-bold tracking-tight">{borrower.full_name}</div>
              <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                {borrower.loan_account_number}
                {borrower.state ? ` · ${borrower.state}` : ""}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {borrower.sma_bucket && (
                <Badge className={SMA_BADGE_CLASSES[borrower.sma_bucket]}>{borrower.sma_bucket}</Badge>
              )}
              {borrower.priority_action && (
                <Badge variant="outline">
                  {borrower.priority_action === "telecaller_call"
                    ? "Telecaller Call"
                    : borrower.priority_action === "whatsapp"
                      ? "WhatsApp"
                      : "Field Visit"}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="text-[9.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                  DPD
                </div>
                <div className="mt-1 font-mono text-xl font-bold text-status-npa">
                  {borrower.dpd_days ?? "—"}
                </div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="text-[9.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Outstanding
                </div>
                <div className="mt-1 font-mono text-xl font-bold">
                  {formatCurrency(borrower.outstanding_balance)}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="flex items-center gap-1.5 font-mono">
                  {borrower.phone_number}
                  <Phone className="size-3.5 text-status-current" />
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">EMI</span>
                <span className="font-mono font-semibold">{formatCurrency(borrower.emi_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due date</span>
                <span className="font-mono">{formatDate(borrower.due_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last payment</span>
                <span className="font-mono">
                  {borrower.last_payment_amount
                    ? `${formatCurrency(borrower.last_payment_amount)} · ${formatDate(borrower.last_payment_date)}`
                    : "—"}
                </span>
              </div>
            </div>

            {borrower.priority_reason && (
              <div className="rounded-lg border border-status-npa/25 bg-status-npa/8 p-3">
                <div className="text-[10px] font-semibold tracking-wide text-status-npa uppercase">
                  Priority reason
                </div>
                <div className="mt-1 text-[12.5px] leading-relaxed">{borrower.priority_reason}</div>
              </div>
            )}

            <Button className="w-full" onClick={() => setModalOpen(true)}>
              <Plus className="size-4" data-icon="inline-start" />
              Log Outcome
            </Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden py-0">
          <div className="border-b px-5 py-4">
            <span className="text-[14.5px] font-bold">Interaction history</span>
          </div>
          <div className="py-1.5">
            {interactions.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                No interactions logged yet.
              </div>
            )}
            {interactions.map((it) => (
              <div key={it.id} className="flex gap-3.5 border-t px-5 py-4 first:border-t-0">
                <div className="flex flex-col items-center pt-1">
                  <span
                    className={`size-2 rounded-full ${
                      it.outcome === "refused" || it.outcome === "dispute"
                        ? "bg-status-npa"
                        : it.outcome === "not_reachable"
                          ? "bg-muted-foreground"
                          : "bg-status-current"
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={OUTCOME_BADGE_CLASSES[it.outcome] ?? "bg-muted text-muted-foreground"}>
                      {OUTCOME_LABELS[it.outcome] ?? it.outcome}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{INTERACTION_TYPE_LABELS[it.interaction_type]}</span>
                    <span className="ml-auto text-[11.5px] text-muted-foreground">
                      {formatDate(it.created_at)}
                    </span>
                  </div>
                  {it.note && <div className="mt-1.5 text-[13px] leading-relaxed">{it.note}</div>}
                  {it.outcome === "promise_to_pay" && (
                    <div
                      className={`mt-2 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                        it.ptp_broken
                          ? "border-status-npa/30 bg-status-npa/10 text-status-npa"
                          : "border-status-current/25 bg-status-current/10 text-status-current"
                      }`}
                    >
                      <span>
                        PTP: <b className="font-mono">{formatCurrency(it.ptp_amount)}</b> by{" "}
                        <b className="font-mono">{formatDate(it.ptp_date)}</b>
                      </span>
                      {it.ptp_broken && <span className="font-bold">— BROKEN</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <LogOutcomeDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        borrowerId={borrower.id}
        borrowerName={borrower.full_name}
        onLogged={loadInteractions}
      />
    </div>
  )
}
