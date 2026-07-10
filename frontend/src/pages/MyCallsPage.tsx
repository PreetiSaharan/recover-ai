import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import { useCurrentUser } from "@/components/app-layout"
import type { AssignmentRecord, Borrower, InteractionLog, PriorityAction, SmaBucket } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle } from "lucide-react"

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

const PRIORITY_ACTION_CLASSES: Record<PriorityAction, string> = {
  telecaller_call: "bg-status-sma0/10 text-status-sma0",
  whatsapp: "bg-status-whatsapp/10 text-status-whatsapp",
  field_visit: "bg-status-npa/10 text-status-npa",
}

const PRIORITY_ACTION_LABELS: Record<PriorityAction, string> = {
  telecaller_call: "Telecaller Call",
  whatsapp: "WhatsApp",
  field_visit: "Field Visit",
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

type Filter = "all" | "pending" | "logged"

export default function MyCallsPage() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [loggedToday, setLoggedToday] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("all")

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
        .filter((b) => b.priority_action === "telecaller_call" || b.priority_action === "whatsapp")
      myBorrowers.sort((a, b) => (b.dpd_days ?? 0) - (a.dpd_days ?? 0))
      setBorrowers(myBorrowers)

      const outcomeResults = await Promise.all(
        myBorrowers.map((b) => apiFetch(`/interactions/${b.id}?limit=1`).catch(() => []))
      )
      const logged = new Set<string>()
      outcomeResults.forEach((logs: InteractionLog[], i) => {
        if (logs.length > 0 && isToday(logs[0].created_at)) {
          logged.add(myBorrowers[i].id)
        }
      })
      setLoggedToday(logged)
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

  useEffect(() => {
    if (user && user.role === "field_agent") {
      navigate("/my-cases", { replace: true })
    }
  }, [user, navigate])

  const totalN = borrowers.length
  const loggedN = loggedToday.size
  const pendingN = totalN - loggedN
  const progressPct = totalN > 0 ? Math.round((loggedN / totalN) * 100) : 0

  const filtered = useMemo(() => {
    return borrowers.filter((b) => {
      if (filter === "pending") return !loggedToday.has(b.id)
      if (filter === "logged") return loggedToday.has(b.id)
      return true
    })
  }, [borrowers, loggedToday, filter])

  if (user && user.role === "field_agent") {
    return null
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">My Calls — Today</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Assigned by AI risk model</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-5 py-4">
          <div className="min-w-[220px]">
            <p className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">
              Accounts actioned today
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-bold">{loggedN}</span>
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

      <div className="flex gap-2">
        {(
          [
            ["all", "All", totalN],
            ["pending", "Not Yet Called", pendingN],
            ["logged", "Logged", loggedN],
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
              ? "No borrowers assigned to you today."
              : "No borrowers match this filter."}
          </div>
        )}
        {filtered.map((b) => {
          const done = loggedToday.has(b.id)
          return (
            <Card
              key={b.id}
              className={`cursor-pointer transition-colors hover:border-primary/40 ${done ? "opacity-60" : ""}`}
              onClick={() => navigate(`/borrowers/${b.id}`)}
            >
              <CardContent className="flex items-center gap-3.5 py-3.5">
                <span
                  className={`w-1 shrink-0 self-stretch rounded ${
                    b.sma_bucket ? SMA_BUCKET_BAR_CLASSES[b.sma_bucket] : "bg-muted"
                  }`}
                />
                {done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-status-current" />
                ) : (
                  <Circle className="size-5 shrink-0 text-muted-foreground" />
                )}
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
                {b.priority_action && (
                  <Badge className={PRIORITY_ACTION_CLASSES[b.priority_action]}>
                    {PRIORITY_ACTION_LABELS[b.priority_action]}
                  </Badge>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
