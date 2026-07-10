import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import { useCurrentUser } from "@/components/app-layout"
import type { AssignmentRecord, Borrower, InteractionLog, SmaBucket } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LogOutcomeDialog } from "@/components/log-outcome-dialog"
import { MapPin } from "lucide-react"

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

function formatCurrency(value: string | number | null) {
  if (value == null) return "—"
  const n = Number(value)
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export default function MyCasesPage() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [latestOutcome, setLatestOutcome] = useState<Record<string, InteractionLog>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [activeBorrower, setActiveBorrower] = useState<Borrower | null>(null)

  async function load() {
    if (!user?.id) return
    setIsLoading(true)
    try {
      const assignments: AssignmentRecord[] = await apiFetch("/assignments/today")
      const mine = assignments.filter((a) => a.assigned_to === user.id)

      const borrowerResults = await Promise.all(
        mine.map((a) => apiFetch(`/borrowers/${a.borrower_id}`).catch(() => null))
      )
      const myBorrowers = borrowerResults
        .filter((b): b is Borrower => b !== null)
        .filter((b) => b.priority_action === "field_visit")
      myBorrowers.sort((a, b) => (b.dpd_days ?? 0) - (a.dpd_days ?? 0))
      setBorrowers(myBorrowers)

      const outcomeResults = await Promise.all(
        myBorrowers.map((b) => apiFetch(`/interactions/${b.id}?limit=1`).catch(() => []))
      )
      const map: Record<string, InteractionLog> = {}
      outcomeResults.forEach((logs: InteractionLog[], i) => {
        if (logs.length > 0) map[myBorrowers[i].id] = logs[0]
      })
      setLatestOutcome(map)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load your cases")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    if (user && user.role !== "field_agent") {
      navigate("/my-calls", { replace: true })
    }
  }, [user, navigate])

  if (user && user.role !== "field_agent") {
    return null
  }

  function loadOutcomeFor(borrowerId: string) {
    apiFetch(`/interactions/${borrowerId}?limit=1`)
      .then((logs: InteractionLog[]) => {
        setLatestOutcome((prev) => {
          const next = { ...prev }
          if (logs.length > 0) next[borrowerId] = logs[0]
          else delete next[borrowerId]
          return next
        })
      })
      .catch(() => {})
  }

  const totalN = borrowers.length
  const actionedN = borrowers.filter((b) => {
    const outcome = latestOutcome[b.id]
    return outcome && isToday(outcome.created_at)
  }).length
  const progressPct = totalN > 0 ? Math.round((actionedN / totalN) * 100) : 0

  const onHold = borrowers.filter((b) => {
    const outcome = latestOutcome[b.id]
    return outcome && outcome.outcome === "promise_to_pay" && !outcome.ptp_broken
  })
  const onHoldIds = new Set(onHold.map((b) => b.id))
  const visitRequired = borrowers.filter((b) => {
    if (onHoldIds.has(b.id)) return false
    const outcome = latestOutcome[b.id]
    return !(outcome && isToday(outcome.created_at))
  })

  function renderCard(b: Borrower) {
    return (
      <Card
        key={b.id}
        className="cursor-pointer transition-colors hover:border-primary/40"
        onClick={() => navigate(`/borrowers/${b.id}`)}
      >
        <CardContent className="flex items-center gap-3.5 py-3.5">
          <span
            className={`w-1 shrink-0 self-stretch rounded ${
              b.sma_bucket ? SMA_BUCKET_BAR_CLASSES[b.sma_bucket] : "bg-muted"
            }`}
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">{b.full_name}</div>
            <div className="mt-0.5 font-mono text-xs text-muted-foreground">{b.loan_account_number}</div>
          </div>
          <Badge variant="outline" className="font-mono">
            {b.dpd_days ?? "—"} DPD
          </Badge>
          <div className="min-w-[74px] text-right">
            <div className="font-mono text-xs text-muted-foreground">Outstanding</div>
            <div className="font-mono text-[15px] font-bold">{formatCurrency(b.outstanding_balance)}</div>
          </div>
          {b.sma_bucket && <Badge className={SMA_BADGE_CLASSES[b.sma_bucket]}>{b.sma_bucket}</Badge>}
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setActiveBorrower(b)
            }}
          >
            <MapPin className="size-3.5" data-icon="inline-start" />
            Log Visit
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">My Cases — Today</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Field visits assigned to you</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-5 py-4">
          <div className="min-w-[220px]">
            <p className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">
              Visits actioned today
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-bold">{actionedN}</span>
              <span className="font-mono text-sm text-muted-foreground">of {totalN}</span>
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

      {isLoading && <div className="py-10 text-center text-muted-foreground">Loading your cases...</div>}

      {!isLoading && totalN === 0 && (
        <div className="py-10 text-center text-muted-foreground">
          No field visits assigned to you today.
        </div>
      )}

      {!isLoading && totalN > 0 && (
        <>
          <div className="space-y-2.5">
            <h2 className="text-[13px] font-semibold text-muted-foreground">
              Visit Required <span className="font-mono opacity-70">{visitRequired.length}</span>
            </h2>
            {visitRequired.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No pending visits.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">{visitRequired.map(renderCard)}</div>
            )}
          </div>

          <div className="space-y-2.5">
            <h2 className="text-[13px] font-semibold text-muted-foreground">
              On Hold — PTP Active <span className="font-mono opacity-70">{onHold.length}</span>
            </h2>
            {onHold.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No accounts on hold.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">{onHold.map(renderCard)}</div>
            )}
          </div>
        </>
      )}

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
