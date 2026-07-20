import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import { useCurrentUser } from "@/components/app-layout"
import { OUTCOME_LABELS, OUTCOME_COLOR_VAR, isWastedOutcome } from "@/lib/outcomes"
import {
  type RangeOption,
  todayStr,
  addDays,
  dateOnly,
  isWithinRange,
  daysBetween,
  displayDate,
  computeRange,
  rangeLabel,
} from "@/lib/date-range"
import { DateRangeControl, CustomDateRangeInputs } from "@/components/date-range-control"
import type { AppUser, AssignmentRecord, Borrower, InteractionLog } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RecoveryTrendChart } from "@/components/reports/recovery-trend-chart"
import { OutcomeDonut } from "@/components/reports/outcome-donut"
import { Skeleton } from "@/components/ui/skeleton"
import { Download, AlertTriangle, Check } from "lucide-react"

const BUCKET_TEXT_CLASSES: Record<string, string> = {
  Current: "text-status-current",
  "SMA-0": "text-status-sma0",
  "SMA-1": "text-status-sma1",
  "SMA-2": "text-status-sma2",
  NPA: "text-status-npa",
}

const BUCKET_BAR_CLASSES: Record<string, string> = {
  Current: "bg-status-current",
  "SMA-0": "bg-status-sma0",
  "SMA-1": "bg-status-sma1",
  "SMA-2": "bg-status-sma2",
  NPA: "bg-status-npa",
}

const BUCKET_ORDER = ["Current", "SMA-0", "SMA-1", "SMA-2", "NPA"]

function formatCurrency(value: number | string | null) {
  if (value == null) return "—"
  const n = Number(value)
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

function displayTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
}

interface EnrichedInteraction extends InteractionLog {
  borrowerId: string
}

export default function ReportsPage() {
  const user = useCurrentUser()
  const [range, setRange] = useState<RangeOption>("7d")
  const [customFrom, setCustomFrom] = useState(addDays(todayStr(), -6))
  const [customTo, setCustomTo] = useState(todayStr())
  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [interactionsByBorrower, setInteractionsByBorrower] = useState<Record<string, InteractionLog[]>>({})
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true)
  const [summarySubmitted, setSummarySubmitted] = useState(false)

  const { dateFrom, dateTo } = useMemo(
    () => computeRange(range, customFrom, customTo),
    [range, customFrom, customTo]
  )

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const [borrowerData, userData] = await Promise.all([
          apiFetch("/borrowers/ranked?limit=200"),
          apiFetch("/users/"),
        ])
        setBorrowers(borrowerData)
        setUsers(userData)

        const results = await Promise.all(
          borrowerData.map((b: Borrower) => apiFetch(`/interactions/${b.id}?limit=50`).catch(() => []))
        )
        const map: Record<string, InteractionLog[]> = {}
        results.forEach((logs: InteractionLog[], i) => {
          map[borrowerData[i].id] = logs
        })
        setInteractionsByBorrower(map)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load report data")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    async function loadAssignments() {
      if (!dateFrom || !dateTo) return
      setIsLoadingAssignments(true)
      try {
        const data = await apiFetch(`/assignments/?date_from=${dateFrom}&date_to=${dateTo}`)
        setAssignments(data)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load assignments")
      } finally {
        setIsLoadingAssignments(false)
      }
    }
    loadAssignments()
  }, [dateFrom, dateTo])

  const borrowersById = useMemo(() => {
    const map: Record<string, Borrower> = {}
    borrowers.forEach((b) => (map[b.id] = b))
    return map
  }, [borrowers])

  const allInteractions: EnrichedInteraction[] = useMemo(
    () =>
      Object.entries(interactionsByBorrower).flatMap(([borrowerId, logs]) =>
        logs.map((l) => ({ ...l, borrowerId }))
      ),
    [interactionsByBorrower]
  )

  const interactionsInRange = useMemo(
    () => allInteractions.filter((i) => isWithinRange(i.created_at, dateFrom, dateTo)),
    [allInteractions, dateFrom, dateTo]
  )

  const recoveryInRange = useMemo(
    () =>
      interactionsInRange.reduce((sum, i) => sum + (i.payment_amount ? Number(i.payment_amount) : 0), 0),
    [interactionsInRange]
  )
  const contactedInRange = useMemo(
    () => new Set(interactionsInRange.map((i) => i.borrowerId)).size,
    [interactionsInRange]
  )

  // for each borrower, find the most recent interaction as-of the end of the selected range
  const latestAsOfDate = useMemo(() => {
    const map: Record<string, EnrichedInteraction> = {}
    borrowers.forEach((b) => {
      const logs = (interactionsByBorrower[b.id] ?? [])
        .filter((l) => dateOnly(l.created_at) <= dateTo)
        .sort((a, c) => (a.created_at < c.created_at ? 1 : -1))
      if (logs.length > 0) map[b.id] = { ...logs[0], borrowerId: b.id }
    })
    return map
  }, [borrowers, interactionsByBorrower, dateTo])

  const activePtps = useMemo(
    () =>
      Object.values(latestAsOfDate).filter(
        (l) => l.outcome === "promise_to_pay" && l.ptp_date && l.ptp_date >= dateTo
      ),
    [latestAsOfDate, dateTo]
  )
  const brokenPtps = useMemo(
    () =>
      Object.values(latestAsOfDate).filter(
        (l) => l.outcome === "promise_to_pay" && l.ptp_date && l.ptp_date < dateTo
      ),
    [latestAsOfDate, dateTo]
  )
  const ptpValueCommitted = useMemo(
    () => activePtps.reduce((sum, p) => sum + (p.ptp_amount ? Number(p.ptp_amount) : 0), 0),
    [activePtps]
  )

  const bucketRows = useMemo(() => {
    const counts: Record<string, number> = { Current: 0, "SMA-0": 0, "SMA-1": 0, "SMA-2": 0, NPA: 0 }
    borrowers.forEach((b) => {
      counts[b.sma_bucket ?? "Current"] = (counts[b.sma_bucket ?? "Current"] ?? 0) + 1
    })
    const max = Math.max(...Object.values(counts), 1)
    return BUCKET_ORDER.map((label) => ({ label, count: counts[label] ?? 0, pct: Math.round(((counts[label] ?? 0) / max) * 100) }))
  }, [borrowers])

  const recoveryTrend = useMemo(() => {
    const spanDays = Math.max(1, daysBetween(dateFrom, dateTo) + 1)
    return Array.from({ length: spanDays }, (_, i) => {
      const day = addDays(dateFrom, i)
      const value = allInteractions
        .filter((l) => dateOnly(l.created_at) === day)
        .reduce((sum, l) => sum + (l.payment_amount ? Number(l.payment_amount) : 0), 0)
      return { label: displayDate(day), value: value / 1e5 } // in lakhs for chart scale
    })
  }, [allInteractions, dateFrom, dateTo])

  const telecallers = useMemo(() => users.filter((u) => u.role === "telecaller"), [users])
  const fieldAgents = useMemo(() => users.filter((u) => u.role === "field_agent"), [users])

  const tcRows = useMemo(
    () =>
      telecallers.map((u) => {
        const assigned = assignments.filter((a) => a.assigned_to === u.id).length
        const mine = interactionsInRange.filter((i) => i.logged_by === u.id)
        const contacted = new Set(mine.map((i) => i.borrowerId)).size
        const logged = mine.length
        const ptps = mine.filter((i) => i.outcome === "promise_to_pay").length
        return {
          name: u.full_name,
          assigned,
          called: contacted,
          logged,
          pct: assigned > 0 ? Math.round((logged / assigned) * 100) : 0,
          ptps,
        }
      }),
    [telecallers, assignments, interactionsInRange]
  )

  const faRows = useMemo(
    () =>
      fieldAgents.map((u) => {
        const assigned = assignments.filter((a) => a.assigned_to === u.id).length
        const mine = interactionsInRange.filter((i) => i.logged_by === u.id)
        const visited = new Set(mine.map((i) => i.borrowerId)).size
        const collected = mine
          .filter((i) => i.outcome === "payment_collected")
          .reduce((sum, i) => sum + (i.payment_amount ? Number(i.payment_amount) : 0), 0)
        const wasted = mine.filter((i) => isWastedOutcome(i.outcome)).length
        return { name: u.full_name, assigned, visited, collected, wasted }
      }),
    [fieldAgents, assignments, interactionsInRange]
  )

  function exportCsv() {
    const lines: string[] = []
    lines.push("Telecaller Performance")
    lines.push("Name,Assigned,Called,Outcome Logged,Completion %,PTPs Raised")
    tcRows.forEach((r) => lines.push(`${r.name},${r.assigned},${r.called},${r.logged},${r.pct}%,${r.ptps}`))
    lines.push("")
    lines.push("Field Agent Performance")
    lines.push("Name,Visits Assigned,Visited,Payment Collected,Wasted Visits")
    faRows.forEach((r) => lines.push(`${r.name},${r.assigned},${r.visited},${r.collected},${r.wasted}`))

    const blob = new Blob([lines.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `recoverai-report-${dateFrom}_to_${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // self-scoped data for telecaller / field agent views
  const myInteractionsInRange = useMemo(
    () => (user ? interactionsInRange.filter((i) => i.logged_by === user.id) : []),
    [interactionsInRange, user]
  )
  const myAssignedInRange = useMemo(
    () => (user ? assignments.filter((a) => a.assigned_to === user.id).length : 0),
    [assignments, user]
  )
  const myOutcomeSegments = useMemo(() => {
    const counts: Partial<Record<string, number>> = {}
    myInteractionsInRange.forEach((i) => {
      counts[i.outcome] = (counts[i.outcome] ?? 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1]! - a[1]!)
      .map(([outcome, count]) => ({
        label: OUTCOME_LABELS[outcome as keyof typeof OUTCOME_LABELS] ?? outcome,
        count: count!,
        colorVar: OUTCOME_COLOR_VAR[outcome as keyof typeof OUTCOME_COLOR_VAR] ?? "muted-foreground",
      }))
  }, [myInteractionsInRange])

  const myActivePtps = useMemo(
    () => (user ? activePtps.filter((p) => p.logged_by === user.id) : []),
    [activePtps, user]
  )
  const myBrokenPtps = useMemo(
    () => (user ? brokenPtps.filter((p) => p.logged_by === user.id) : []),
    [brokenPtps, user]
  )
  const myPayments = useMemo(
    () => myInteractionsInRange.filter((i) => i.outcome === "payment_collected"),
    [myInteractionsInRange]
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-3.5 w-40" />
          </div>
          <Skeleton className="h-8 w-56 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i}>
              <CardContent className="space-y-2 py-3.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="space-y-3 py-4.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-[170px] w-full" />
          </CardContent>
        </Card>
        <Card className="overflow-hidden py-0">
          <div className="space-y-2.5 p-5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </Card>
      </div>
    )
  }

  const rangeControl = <DateRangeControl value={range} onChange={setRange} />
  const customRangeRow = range === "custom" && (
    <CustomDateRangeInputs from={customFrom} to={customTo} onFromChange={setCustomFrom} onToChange={setCustomTo} />
  )
  const currentRangeLabel = rangeLabel(range, dateFrom, dateTo)

  if (user?.role === "manager") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">Daily Collections Report</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">{user.nbfc_name} · portfolio-wide</p>
          </div>
          <div className="flex items-center gap-2.5">
            {rangeControl}
            <Button onClick={exportCsv}>
              <Download className="size-3.5" data-icon="inline-start" />
              Export CSV
            </Button>
          </div>
        </div>

        {customRangeRow}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card>
            <CardContent className="py-3.5">
              <p className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">Recovery in range</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-status-current">{formatCurrency(recoveryInRange)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3.5">
              <p className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">Active PTPs</p>
              <p className="mt-1 font-mono text-2xl font-semibold">{activePtps.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3.5">
              <p className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">PTP value committed</p>
              <p className="mt-1 font-mono text-2xl font-semibold">{formatCurrency(ptpValueCommitted)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3.5">
              <p className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">Contacted in range</p>
              <p className="mt-1 font-mono text-2xl font-semibold">{contactedInRange}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="py-4.5">
            <div className="mb-2 flex items-baseline justify-between">
              <div>
                <div className="text-sm font-bold">Recovery Trend</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{currentRangeLabel}, ₹ lakh</div>
              </div>
              <div className="font-mono text-lg font-bold text-status-current">
                {formatCurrency(recoveryInRange)} <span className="text-xs font-semibold text-muted-foreground">total</span>
              </div>
            </div>
            <RecoveryTrendChart data={recoveryTrend} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4.5">
            <div className="text-sm font-bold">DPD Bucket Distribution</div>
            <div className="mb-3.5 mt-0.5 text-xs text-muted-foreground">Borrower count by severity bucket</div>
            <div className="flex flex-col gap-2.5">
              {bucketRows.map((b) => (
                <div key={b.label} className="flex items-center gap-3">
                  <span className={`w-16 shrink-0 text-[12.5px] font-bold ${BUCKET_TEXT_CLASSES[b.label] ?? ""}`}>
                    {b.label}
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded-md bg-muted">
                    <div
                      className={`h-full rounded-md ${BUCKET_BAR_CLASSES[b.label] ?? "bg-muted-foreground"}`}
                      style={{ width: `${b.pct}%` }}
                    />
                  </div>
                  <span className="w-11 shrink-0 text-right font-mono text-[13px] font-semibold">{b.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden py-0">
          <div className="px-5 pt-3.5 pb-3 text-sm font-bold">Telecaller Performance</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Name</TableHead>
                <TableHead className="text-right">Assigned</TableHead>
                <TableHead className="text-right">Called</TableHead>
                <TableHead className="text-right">Outcome logged</TableHead>
                <TableHead className="w-[150px]">Completion</TableHead>
                <TableHead className="pr-5 text-right">PTPs raised</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingAssignments &&
                Array.from({ length: 3 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-5">
                      <Skeleton className="h-3.5 w-24" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-3.5 w-6" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-3.5 w-6" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-3.5 w-6" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-1.5 w-full rounded-full" />
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Skeleton className="ml-auto h-3.5 w-6" />
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoadingAssignments && tcRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    No telecallers found.
                  </TableCell>
                </TableRow>
              )}
              {!isLoadingAssignments && tcRows.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="pl-5 font-semibold">{r.name}</TableCell>
                  <TableCell className="text-right font-mono">{r.assigned}</TableCell>
                  <TableCell className="text-right font-mono">{r.called}</TableCell>
                  <TableCell className="text-right font-mono">{r.logged}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${r.pct}%` }} />
                      </div>
                      <span className="w-8 shrink-0 font-mono text-[11.5px] text-muted-foreground">{r.pct}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="pr-5 text-right font-mono font-semibold text-status-current">{r.ptps}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="overflow-hidden py-0">
          <div className="px-5 pt-3.5 pb-3 text-sm font-bold">Field Agent Performance</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Name</TableHead>
                <TableHead className="text-right">Visits assigned</TableHead>
                <TableHead className="text-right">Visited</TableHead>
                <TableHead className="text-right">Payment collected</TableHead>
                <TableHead className="pr-5 text-right">Wasted visits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingAssignments &&
                Array.from({ length: 3 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-5">
                      <Skeleton className="h-3.5 w-24" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-3.5 w-6" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-3.5 w-6" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-3.5 w-14" />
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Skeleton className="ml-auto h-5 w-8 rounded-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoadingAssignments && faRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    No field agents found.
                  </TableCell>
                </TableRow>
              )}
              {!isLoadingAssignments && faRows.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="pl-5 font-semibold">{r.name}</TableCell>
                  <TableCell className="text-right font-mono">{r.assigned}</TableCell>
                  <TableCell className="text-right font-mono">{r.visited}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-status-current">
                    {formatCurrency(r.collected)}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <Badge className={r.wasted >= 4 ? "bg-status-npa/15 text-status-npa" : "bg-muted text-muted-foreground"}>
                      {r.wasted}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    )
  }

  if (user?.role === "telecaller") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">My Performance</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">{currentRangeLabel} · {user.full_name}</p>
          </div>
          {rangeControl}
        </div>

        {customRangeRow}

        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="py-3.5">
              <p className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">Calls assigned</p>
              <p className="mt-1 font-mono text-2xl font-semibold">{myAssignedInRange}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3.5">
              <p className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">Outcomes logged</p>
              <p className="mt-1 font-mono text-2xl font-semibold">{myInteractionsInRange.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3.5">
              <p className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">Completion %</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-status-current">
                {myAssignedInRange > 0 ? Math.round((myInteractionsInRange.length / myAssignedInRange) * 100) : 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="py-4.5">
            <div className="text-sm font-bold">Outcome Breakdown</div>
            <div className="mb-3.5 mt-0.5 text-xs text-muted-foreground">
              {myInteractionsInRange.length} outcomes logged in {currentRangeLabel}
            </div>
            <OutcomeDonut segments={myOutcomeSegments} centerLabel="logged" />
          </CardContent>
        </Card>

        {myBrokenPtps.length > 0 && (
          <Card className="border-status-npa/35 bg-status-npa/8">
            <CardContent className="py-4">
              <div className="mb-2 flex items-center gap-2.5">
                <AlertTriangle className="size-4.5 text-status-npa" />
                <span className="text-sm font-bold text-status-npa">{myBrokenPtps.length} Broken PTPs</span>
              </div>
              <div className="flex flex-col">
                {myBrokenPtps.map((p) => {
                  const b = borrowersById[p.borrowerId]
                  return (
                    <div key={p.id} className="flex items-center gap-3 border-t border-status-npa/20 py-2 first:border-t-0">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold">{b?.full_name ?? "Unknown"}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{b?.loan_account_number}</div>
                      </div>
                      <span className="font-mono text-[12.5px] text-muted-foreground">Was due {displayDate(p.ptp_date!)}</span>
                      <span className="font-mono text-[13px] font-semibold">{formatCurrency(p.ptp_amount)}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="overflow-hidden py-0">
          <div className="px-5 pt-3.5 pb-3 text-sm font-bold">Active PTP Pipeline</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Borrower</TableHead>
                <TableHead>Loan A/C</TableHead>
                <TableHead>PTP date</TableHead>
                <TableHead className="text-right">PTP amount</TableHead>
                <TableHead className="pr-5 text-right">Days until due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myActivePtps.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    No active PTPs.
                  </TableCell>
                </TableRow>
              )}
              {myActivePtps
                .slice()
                .sort((a, b) => daysBetween(dateTo, a.ptp_date!) - daysBetween(dateTo, b.ptp_date!))
                .map((p) => {
                  const b = borrowersById[p.borrowerId]
                  const days = daysBetween(dateTo, p.ptp_date!)
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="pl-5 font-semibold">{b?.full_name ?? "Unknown"}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{b?.loan_account_number}</TableCell>
                      <TableCell className="font-mono">{displayDate(p.ptp_date!)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatCurrency(p.ptp_amount)}</TableCell>
                      <TableCell className="pr-5 text-right">
                        <Badge className={days <= 2 ? "bg-status-sma2/15 text-status-sma2" : "bg-muted text-muted-foreground"}>
                          {days === 1 ? "Tomorrow" : days === 0 ? "Today" : `${days} days`}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </Card>
      </div>
    )
  }

  // field agent view
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">My Performance</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{currentRangeLabel} · {user?.full_name}</p>
        </div>
        {rangeControl}
      </div>

      {customRangeRow}

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3.5">
            <p className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">Visits assigned</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{myAssignedInRange}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3.5">
            <p className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">Visited</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{new Set(myInteractionsInRange.map((i) => i.borrowerId)).size}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3.5">
            <p className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">Cash collected</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-status-current">
              {formatCurrency(myPayments.reduce((s, p) => s + (p.payment_amount ? Number(p.payment_amount) : 0), 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-4.5">
          <div className="text-sm font-bold">Outcome Breakdown</div>
          <div className="mb-3.5 mt-0.5 text-xs text-muted-foreground">
            {new Set(myInteractionsInRange.map((i) => i.borrowerId)).size} visits completed in {currentRangeLabel}
          </div>
          <OutcomeDonut segments={myOutcomeSegments} centerLabel="visits" />
        </CardContent>
      </Card>

      <Card className="overflow-hidden py-0">
        <div className="px-5 pt-3.5 pb-3 text-sm font-bold">Payments Collected</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Borrower</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="pr-5 text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {myPayments.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                  No payments collected in {currentRangeLabel}.
                </TableCell>
              </TableRow>
            )}
            {myPayments.map((p) => {
              const b = borrowersById[p.borrowerId]
              return (
                <TableRow key={p.id}>
                  <TableCell className="pl-5 font-semibold">{b?.full_name ?? "Unknown"}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-status-current">
                    {formatCurrency(p.payment_amount)}
                  </TableCell>
                  <TableCell className="pr-5 text-right font-mono text-xs text-muted-foreground">
                    {displayTime(p.created_at)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      <div className="flex justify-end">
        <Button
          className={summarySubmitted ? "bg-status-current hover:bg-status-current/90" : ""}
          onClick={() => {
            setSummarySubmitted(true)
            toast.success("Day summary submitted")
          }}
        >
          {summarySubmitted ? <Check className="size-4" data-icon="inline-start" /> : null}
          {summarySubmitted ? "Summary submitted" : "Submit Day Summary"}
        </Button>
      </div>
    </div>
  )
}
