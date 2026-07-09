import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import { useCurrentUser } from "@/components/app-layout"
import { useAssignments } from "@/lib/assignment-context"
import type { Borrower, InteractionLog, SmaBucket } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LogOutcomeDialog } from "@/components/log-outcome-dialog"
import { Phone } from "lucide-react"

const SMA_BADGE_CLASSES: Record<SmaBucket, string> = {
  "SMA-0": "bg-status-sma0/10 text-status-sma0",
  "SMA-1": "bg-status-sma1/10 text-status-sma1",
  "SMA-2": "bg-status-sma2/10 text-status-sma2",
  NPA: "bg-status-npa/10 text-status-npa",
}

const SMA_BUCKET_BAR_CLASSES: Record<SmaBucket, string> = {
  "SMA-0": "bg-status-sma0",
  "SMA-1": "bg-status-sma1",
  "SMA-2": "bg-status-sma2",
  NPA: "bg-status-npa",
}

const OUTCOME_LABELS: Record<string, string> = {
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

const OUTCOME_CLASSES: Record<string, string> = {
  promise_to_pay: "bg-status-current/15 text-status-current",
  refused: "bg-status-npa/15 text-status-npa",
  dispute: "bg-status-sma2/15 text-status-sma2",
  not_reachable: "bg-muted text-muted-foreground",
  already_paid: "bg-status-current/15 text-status-current",
  payment_collected: "bg-status-current/15 text-status-current",
}

function formatCurrency(value: string | number | null) {
  if (value == null) return "—"
  const n = Number(value)
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

type Filter = "all" | "pending" | "completed"

export default function MyCallsPage() {
  const user = useCurrentUser()
  const { assignments } = useAssignments()
  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [latestOutcome, setLatestOutcome] = useState<Record<string, InteractionLog>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("all")
  const [activeBorrower, setActiveBorrower] = useState<Borrower | null>(null)

  async function loadOutcomeFor(borrowerId: string) {
    const logs: InteractionLog[] = await apiFetch(`/interactions/${borrowerId}?limit=1`).catch(() => [])
    setLatestOutcome((prev) => {
      const next = { ...prev }
      if (logs.length > 0) next[borrowerId] = logs[0]
      else delete next[borrowerId]
      return next
    })
  }

  async function load() {
    setIsLoading(true)
    try {
      const data: Borrower[] = await apiFetch("/borrowers/ranked?limit=200")
      setBorrowers(data)
      const myBorrowers = data.filter((b) => assignments[b.id]?.assigneeId === user?.id)
      const results = await Promise.all(
        myBorrowers.map((b) => apiFetch(`/interactions/${b.id}?limit=1`).catch(() => []))
      )
      const map: Record<string, InteractionLog> = {}
      results.forEach((logs, i) => {
        if (logs.length > 0) map[myBorrowers[i].id] = logs[0]
      })
      setLatestOutcome(map)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load your calls")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const myBorrowers = useMemo(
    () => borrowers.filter((b) => assignments[b.id]?.assigneeId === user?.id),
    [borrowers, assignments, user?.id]
  )

  const totalN = myBorrowers.length
  const completedN = myBorrowers.filter((b) => latestOutcome[b.id]).length
  const pendingN = totalN - completedN
  const progressPct = totalN > 0 ? Math.round((completedN / totalN) * 100) : 0

  const filtered = myBorrowers.filter((b) => {
    if (filter === "pending") return !latestOutcome[b.id]
    if (filter === "completed") return !!latestOutcome[b.id]
    return true
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">My Calls — Today</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Assigned by AI risk model</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-5 py-4">
          <div className="min-w-[150px]">
            <p className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">
              Completed today
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-bold">{completedN}</span>
              <span className="font-mono text-sm text-muted-foreground">/ {totalN}</span>
            </div>
          </div>
          <div className="min-w-[220px] flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-status-current transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {(
          [
            ["all", "All", totalN],
            ["pending", "Pending", pendingN],
            ["completed", "Completed", completedN],
          ] as [Filter, string, number][]
        ).map(([value, label, count]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-[13px] font-semibold ${
              filter === value
                ? "border-primary bg-primary-weak text-primary"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {label} <span className="font-mono opacity-70">{count}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        {isLoading && <div className="py-10 text-center text-muted-foreground">Loading your calls...</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="py-10 text-center text-muted-foreground">
            {totalN === 0
              ? "No borrowers assigned to you yet."
              : "No borrowers match this filter."}
          </div>
        )}
        {filtered.map((b) => {
          const outcome = latestOutcome[b.id]
          const done = !!outcome
          return (
            <Card key={b.id} className={done ? "opacity-60" : undefined}>
              <CardContent className="flex items-center gap-3.5 py-3.5">
                <span
                  className={`w-1 shrink-0 self-stretch rounded ${
                    b.sma_bucket ? SMA_BUCKET_BAR_CLASSES[b.sma_bucket] : "bg-muted"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className={`font-bold text-sm ${done ? "text-muted-foreground line-through" : ""}`}>
                    {b.full_name}
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-muted-foreground">{b.loan_account_number}</div>
                </div>
                <div className="min-w-[74px] text-right">
                  <div className="font-mono text-[15px] font-bold">
                    {b.dpd_days ?? "—"}
                    <span className="text-[9px] font-normal text-muted-foreground"> dpd</span>
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {formatCurrency(b.outstanding_balance)}
                  </div>
                </div>
                {b.sma_bucket && <Badge className={SMA_BADGE_CLASSES[b.sma_bucket]}>{b.sma_bucket}</Badge>}
                {done ? (
                  <Badge className={OUTCOME_CLASSES[outcome.outcome] ?? "bg-muted text-muted-foreground"}>
                    {OUTCOME_LABELS[outcome.outcome] ?? outcome.outcome}
                  </Badge>
                ) : (
                  <Button size="sm" onClick={() => setActiveBorrower(b)}>
                    <Phone className="size-3.5" data-icon="inline-start" />
                    Call Now
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {activeBorrower && (
        <LogOutcomeDialog
          open={!!activeBorrower}
          onOpenChange={(open) => !open && setActiveBorrower(null)}
          borrowerId={activeBorrower.id}
          borrowerName={activeBorrower.full_name}
          onLogged={() => loadOutcomeFor(activeBorrower.id)}
        />
      )}
    </div>
  )
}
