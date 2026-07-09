import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import type { Borrower, PriorityAction, SmaBucket } from "@/lib/types"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { LogOut, RefreshCw } from "lucide-react"

const SMA_BUCKETS: SmaBucket[] = ["SMA-0", "SMA-1", "SMA-2", "NPA"]
const PRIORITY_ACTIONS: PriorityAction[] = [
  "telecaller_call",
  "whatsapp",
  "field_visit",
]

const SMA_BADGE_CLASSES: Record<SmaBucket, string> = {
  "SMA-0": "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  "SMA-1": "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-400",
  "SMA-2": "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
  NPA: "bg-red-200 text-red-900 dark:bg-red-500/25 dark:text-red-300",
}

const PRIORITY_ACTION_LABELS: Record<PriorityAction, string> = {
  telecaller_call: "Call",
  whatsapp: "WhatsApp",
  field_visit: "Field visit",
}

function formatCurrency(value: string | null) {
  if (value == null) return "—"
  const n = Number(value)
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [smaFilter, setSmaFilter] = useState<string>("all")
  const [actionFilter, setActionFilter] = useState<string>("all")

  async function loadBorrowers() {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (smaFilter !== "all") params.set("sma_bucket", smaFilter)
      if (actionFilter !== "all") params.set("priority_action", actionFilter)
      const data = await apiFetch(`/borrowers/ranked?${params.toString()}`)
      setBorrowers(data)
      setSelected(new Set())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load borrowers")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadBorrowers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smaFilter, actionFilter])

  const allSelected = borrowers.length > 0 && selected.size === borrowers.length

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(borrowers.map((b) => b.id)))
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleBulkAssign() {
    toast.success(`Assigned ${selected.size} borrower${selected.size === 1 ? "" : "s"} to queue`)
    setSelected(new Set())
  }

  function handleLogout() {
    localStorage.removeItem("access_token")
    navigate("/login")
  }

  const totalOutstanding = useMemo(
    () =>
      borrowers.reduce((sum, b) => sum + (b.outstanding_balance ? Number(b.outstanding_balance) : 0), 0),
    [borrowers]
  )
  const npaCount = useMemo(() => borrowers.filter((b) => b.sma_bucket === "NPA").length, [borrowers])

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">RecoverAI</h1>
          <p className="text-sm text-muted-foreground">Collections queue</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Log out">
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 p-6">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="space-y-1 py-4">
              <p className="text-sm text-muted-foreground">Accounts in queue</p>
              <p className="text-2xl font-semibold">{borrowers.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-1 py-4">
              <p className="text-sm text-muted-foreground">NPA accounts</p>
              <p className="text-2xl font-semibold">{npaCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-1 py-4">
              <p className="text-sm text-muted-foreground">Outstanding balance</p>
              <p className="text-2xl font-semibold">{formatCurrency(String(totalOutstanding))}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={smaFilter} onValueChange={(value) => setSmaFilter(value ?? "all")}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="SMA bucket" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All buckets</SelectItem>
              {SMA_BUCKETS.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={actionFilter} onValueChange={(value) => setActionFilter(value ?? "all")}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {PRIORITY_ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {PRIORITY_ACTION_LABELS[a]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={loadBorrowers} disabled={isLoading}>
            <RefreshCw className="size-3.5" data-icon="inline-start" />
            Refresh
          </Button>

          {selected.size > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{selected.size} selected</span>
              <Button size="sm" onClick={handleBulkAssign}>
                Assign to me
              </Button>
            </div>
          )}
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                </TableHead>
                <TableHead>Borrower</TableHead>
                <TableHead>Loan account</TableHead>
                <TableHead>DPD</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>SMA bucket</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Loading borrowers...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && borrowers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No borrowers match these filters.
                  </TableCell>
                </TableRow>
              )}
              {borrowers.map((b) => (
                <TableRow key={b.id} data-state={selected.has(b.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(b.id)}
                      onCheckedChange={() => toggleOne(b.id)}
                      aria-label={`Select ${b.full_name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{b.full_name}</div>
                    <div className="text-xs text-muted-foreground">{b.phone_number}</div>
                  </TableCell>
                  <TableCell>{b.loan_account_number}</TableCell>
                  <TableCell>{b.dpd_days ?? "—"}</TableCell>
                  <TableCell>{formatCurrency(b.outstanding_balance)}</TableCell>
                  <TableCell>
                    {b.sma_bucket ? (
                      <Badge className={SMA_BADGE_CLASSES[b.sma_bucket]}>{b.sma_bucket}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {b.priority_action ? (
                      <Badge variant="outline">{PRIORITY_ACTION_LABELS[b.priority_action]}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  )
}
