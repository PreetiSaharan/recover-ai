import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import { useAssignments } from "@/lib/assignment-context"
import { useCurrentUser } from "@/components/app-layout"
import type { AppUser, Borrower, PriorityAction, SmaBucket } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Sparkles, Upload, ChevronLeft, ChevronRight } from "lucide-react"

const SMA_BUCKETS: SmaBucket[] = ["SMA-0", "SMA-1", "SMA-2", "NPA"]

const SMA_BADGE_CLASSES: Record<SmaBucket, string> = {
  "SMA-0": "bg-status-sma0/10 text-status-sma0",
  "SMA-1": "bg-status-sma1/10 text-status-sma1",
  "SMA-2": "bg-status-sma2/10 text-status-sma2",
  NPA: "bg-status-npa/10 text-status-npa",
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

type RowStatus = "unassigned" | "assigned" | "contacted" | "logged"

const STATUS_FILTER_LABELS: Record<string, string> = {
  all: "All Statuses",
  unassigned: "Unassigned",
  assigned: "Assigned",
  contacted: "Contacted",
  logged: "Logged",
}

const PAGE_SIZE = 10

function formatCurrency(value: string | number | null) {
  if (value == null) return "—"
  const n = Number(value)
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [loggedBorrowerIds, setLoggedBorrowerIds] = useState<Set<string>>(new Set())
  const [activePtpCount, setActivePtpCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const { assignments, setAssignee, bulkSetAssignee, markContacted } = useAssignments()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [search, setSearch] = useState("")
  const [smaFilter, setSmaFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [assigneeFilter, setAssigneeFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [bulkAssignee, setBulkAssignee] = useState("")

  async function load() {
    setIsLoading(true)
    try {
      const [borrowerData, userData] = await Promise.all([
        apiFetch("/borrowers/ranked?limit=200"),
        apiFetch("/users/"),
      ])
      setBorrowers(borrowerData)
      setUsers(userData)

      const interactionResults = await Promise.all(
        borrowerData.map((b: Borrower) =>
          apiFetch(`/interactions/${b.id}?limit=5`).catch(() => [])
        )
      )
      const logged = new Set<string>()
      let ptps = 0
      interactionResults.forEach((logs, i) => {
        if (logs.length > 0) logged.add(borrowerData[i].id)
        if (logs.some((l: { outcome: string; ptp_broken: boolean }) => l.outcome === "promise_to_pay" && !l.ptp_broken)) {
          ptps += 1
        }
      })
      setLoggedBorrowerIds(logged)
      setActivePtpCount(ptps)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load dashboard")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (user && user.role === "field_agent") {
      navigate("/my-cases", { replace: true })
    } else if (user && user.role !== "manager") {
      navigate("/my-calls", { replace: true })
    }
  }, [user, navigate])

  function statusOf(borrowerId: string): RowStatus {
    if (loggedBorrowerIds.has(borrowerId)) return "logged"
    const s = assignments[borrowerId]
    if (!s || !s.assigneeId) return "unassigned"
    return s.contacted ? "contacted" : "assigned"
  }

  function assigneeNameOf(borrowerId: string): string {
    const id = assignments[borrowerId]?.assigneeId
    if (!id) return "Unassigned"
    return users.find((u) => u.id === id)?.full_name ?? "Unassigned"
  }

  function eligibleAgentsFor(priorityAction: PriorityAction | null): AppUser[] {
    return priorityAction === "field_visit"
      ? users.filter((u) => u.role === "field_agent")
      : users.filter((u) => u.role === "telecaller")
  }

  async function handleAutoAssign() {
    if (users.length === 0) return
    const unassigned = borrowers.filter((b) => statusOf(b.id) === "unassigned")
    if (unassigned.length === 0) return

    // round-robin distribute unassigned borrowers within their eligible role pool,
    // one bulk call per agent — never assign a field-visit case to a telecaller (or vice versa)
    const byAgent = new Map<string, string[]>()
    let telecallerIdx = 0
    let fieldAgentIdx = 0
    let skipped = 0

    unassigned.forEach((b) => {
      const pool = eligibleAgentsFor(b.priority_action)
      if (pool.length === 0) {
        skipped += 1
        return
      }
      const idx = b.priority_action === "field_visit" ? fieldAgentIdx++ : telecallerIdx++
      const agentId = pool[idx % pool.length].id
      byAgent.set(agentId, [...(byAgent.get(agentId) ?? []), b.id])
    })

    await Promise.all(
      Array.from(byAgent.entries()).map(([agentId, borrowerIds]) => bulkSetAssignee(borrowerIds, agentId))
    )

    const assignedCount = unassigned.length - skipped
    if (skipped > 0) {
      toast.success(`${assignedCount} account${assignedCount === 1 ? "" : "s"} auto-assigned, ${skipped} skipped (no available agents)`)
    } else {
      toast.success(`${assignedCount} account${assignedCount === 1 ? "" : "s"} auto-assigned`)
    }
  }

  async function handleBulkAssign(assigneeId: string) {
    if (!assigneeId) return
    const agent = users.find((u) => u.id === assigneeId)
    await bulkSetAssignee([...selected], assigneeId)
    toast.success(`Assigned ${selected.size} borrower${selected.size === 1 ? "" : "s"} to ${agent?.full_name}`)
    setSelected(new Set())
    setBulkAssignee("")
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return borrowers
      .filter((b) => smaFilter === "all" || b.sma_bucket === smaFilter)
      .filter((b) => statusFilter === "all" || statusOf(b.id) === statusFilter)
      .filter((b) => {
        if (assigneeFilter === "all") return true
        if (assigneeFilter === "unassigned") return statusOf(b.id) === "unassigned"
        return assignments[b.id]?.assigneeId === assigneeFilter
      })
      .filter(
        (b) =>
          !q ||
          b.full_name.toLowerCase().includes(q) ||
          b.loan_account_number.toLowerCase().includes(q)
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borrowers, search, smaFilter, statusFilter, assigneeFilter, assignments, loggedBorrowerIds])

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [search, smaFilter, statusFilter, assigneeFilter])

  const allPagedSelected = pagedRows.length > 0 && pagedRows.every((b) => selected.has(b.id))

  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allPagedSelected) {
        pagedRows.forEach((b) => next.delete(b.id))
      } else {
        pagedRows.forEach((b) => next.add(b.id))
      }
      return next
    })
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalOverdue = useMemo(() => borrowers.filter((b) => (b.dpd_days ?? 0) > 0).length, [borrowers])
  const totalOutstanding = useMemo(
    () => borrowers.reduce((sum, b) => sum + (b.outstanding_balance ? Number(b.outstanding_balance) : 0), 0),
    [borrowers]
  )

  const assignedN = useMemo(
    () => borrowers.filter((b) => statusOf(b.id) !== "unassigned").length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [borrowers, assignments, loggedBorrowerIds]
  )
  const contactedN = useMemo(
    () => borrowers.filter((b) => ["contacted", "logged"].includes(statusOf(b.id))).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [borrowers, assignments, loggedBorrowerIds]
  )
  const loggedN = loggedBorrowerIds.size
  const totalN = borrowers.length
  const unassignedN = totalN - assignedN
  const progressPct = totalN > 0 ? Math.round((assignedN / totalN) * 100) : 0

  if (!user || user.role !== "manager") {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Today's Collections Queue</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Ranked by AI risk model</p>
        </div>
        <div className="ml-auto flex gap-2.5">
          <Button variant="outline" onClick={handleAutoAssign}>
            <Sparkles className="size-3.5" data-icon="inline-start" />
            Auto-assign
          </Button>
          <Button onClick={() => navigate("/upload")}>
            <Upload className="size-4" data-icon="inline-start" />
            Upload CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3.5">
            <p className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">
              Total overdue
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold">{totalOverdue}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3.5">
            <p className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">
              Total outstanding
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold">{formatCurrency(totalOutstanding)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3.5">
            <p className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">
              Active PTPs
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold">{activePtpCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 py-4">
          <div className="min-w-[150px]">
            <p className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">
              Queue assigned today
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono text-[26px] font-semibold">{assignedN}</span>
              <span className="font-mono text-[15px] text-muted-foreground">/ {totalN}</span>
            </div>
          </div>
          <div className="min-w-[220px] flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="mt-2.5 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-xs bg-primary" />
                Assigned <b className="font-mono text-foreground">{assignedN}</b>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-xs bg-status-sma2" />
                Contacted <b className="font-mono text-foreground">{contactedN}</b>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-xs bg-status-current" />
                Outcome logged <b className="font-mono text-foreground">{loggedN}</b>
              </span>
            </div>
          </div>
          {unassignedN > 0 && (
            <button
              onClick={handleAutoAssign}
              className="flex items-center gap-2 rounded-full border border-status-npa/35 bg-status-npa/10 px-3.5 py-1.5 text-[12.5px] font-semibold whitespace-nowrap text-status-npa"
            >
              <span className="size-1.5 rounded-full bg-status-npa" />
              {unassignedN} unassigned — auto-assign
            </button>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden py-0">
        {selected.size > 0 && (
          <div className="flex items-center gap-3.5 border-b bg-primary-weak px-4 py-3">
            <span className="text-[13px] font-semibold text-primary">{selected.size} selected</span>
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] text-muted-foreground">Assign to</span>
              <Select
                value={bulkAssignee}
                onValueChange={(value) => value && handleBulkAssign(value)}
              >
                <SelectTrigger className="w-40" size="sm">
                  <SelectValue placeholder="Choose agent…" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5 border-b p-3.5">
          <div className="relative min-w-[200px] max-w-[300px] flex-1">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or loan no."
              className="pl-8.5"
            />
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select value={smaFilter} onValueChange={(v) => setSmaFilter(v ?? "all")}>
              <SelectTrigger className="w-32" size="sm">
                <SelectValue>{smaFilter === "all" ? "All Buckets" : smaFilter}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buckets</SelectItem>
                {SMA_BUCKETS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
              <SelectTrigger className="w-36" size="sm">
                <SelectValue>{STATUS_FILTER_LABELS[statusFilter]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="logged">Logged</SelectItem>
              </SelectContent>
            </Select>

            <Select value={assigneeFilter} onValueChange={(v) => setAssigneeFilter(v ?? "all")}>
              <SelectTrigger className="w-36" size="sm">
                <SelectValue>
                  {assigneeFilter === "all"
                    ? "All Agents"
                    : assigneeFilter === "unassigned"
                      ? "Unassigned"
                      : (users.find((u) => u.id === assigneeFilter)?.full_name ?? "All Agents")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allPagedSelected} onCheckedChange={toggleAllOnPage} aria-label="Select all" />
              </TableHead>
              <TableHead className="w-9">#</TableHead>
              <TableHead>Borrower</TableHead>
              <TableHead className="text-right">DPD</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Bucket</TableHead>
              <TableHead>Recommended</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  Loading borrowers...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && pagedRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-14 text-center">
                  <div className="text-sm font-semibold">No borrowers match your filters</div>
                  <div className="mt-1.5 text-[13px] text-muted-foreground">
                    Clear filters or upload a CSV to add accounts.
                  </div>
                </TableCell>
              </TableRow>
            )}
            {pagedRows.map((b, idx) => {
              const status = statusOf(b.id)
              const rank = borrowers.findIndex((x) => x.id === b.id) + 1
              return (
                <TableRow key={b.id} data-state={selected.has(b.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(b.id)}
                      onCheckedChange={() => toggleOne(b.id)}
                      aria-label={`Select ${b.full_name}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{rank || idx + 1}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => navigate(`/borrowers/${b.id}`)}
                      className="text-left hover:underline"
                    >
                      <div className="font-medium">{b.full_name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{b.loan_account_number}</div>
                    </button>
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">{b.dpd_days ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(b.outstanding_balance)}</TableCell>
                  <TableCell>
                    {b.sma_bucket ? (
                      <Badge className={SMA_BADGE_CLASSES[b.sma_bucket]}>{b.sma_bucket}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {b.priority_action ? (
                      <Badge className={PRIORITY_ACTION_CLASSES[b.priority_action]}>
                        {PRIORITY_ACTION_LABELS[b.priority_action]}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={assignments[b.id]?.assigneeId ?? "unassigned"}
                      onValueChange={(v) =>
                        setAssignee(
                          b.id,
                          v === "unassigned" ? null : v,
                          b.priority_action === "field_visit" ? "field_visit" : "telecall"
                        )
                      }
                    >
                      <SelectTrigger size="sm" className="w-32">
                        <SelectValue>{assigneeNameOf(b.id)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {eligibleAgentsFor(b.priority_action).map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {status === "unassigned" && <Badge variant="outline">Unassigned</Badge>}
                      {status === "assigned" && (
                        <Badge className="bg-primary/10 text-primary">Assigned</Badge>
                      )}
                      {status === "contacted" && (
                        <Badge className="bg-status-sma2/10 text-status-sma2">Contacted</Badge>
                      )}
                      {status === "logged" && (
                        <Badge className="bg-status-current/10 text-status-current">Logged</Badge>
                      )}
                      {status === "assigned" && (
                        <button
                          onClick={() => markContacted(b.id)}
                          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                        >
                          Mark contacted
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        <div className="flex flex-wrap items-center gap-3.5 border-t p-3.5">
          <span className="text-[12.5px] text-muted-foreground">
            Showing{" "}
            <b className="text-foreground">
              {rows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, rows.length)}
            </b>{" "}
            of <b className="text-foreground">{rows.length}</b>
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="icon-sm"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
