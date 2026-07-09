import { useState } from "react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import type { InteractionOutcome, InteractionType } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const OUTCOME_OPTIONS: { value: InteractionOutcome; label: string }[] = [
  { value: "promise_to_pay", label: "Promise to Pay" },
  { value: "not_reachable", label: "Not Reachable" },
  { value: "refused", label: "Refused" },
  { value: "dispute", label: "Dispute" },
  { value: "already_paid", label: "Already Paid" },
  { value: "payment_collected", label: "Payment Collected" },
]

interface LogOutcomeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  borrowerId: string
  borrowerName: string
  onLogged: () => void
}

export function LogOutcomeDialog({
  open,
  onOpenChange,
  borrowerId,
  borrowerName,
  onLogged,
}: LogOutcomeDialogProps) {
  const [interactionType, setInteractionType] = useState<InteractionType>("telecall")
  const [outcome, setOutcome] = useState<InteractionOutcome>("promise_to_pay")
  const [ptpDate, setPtpDate] = useState("")
  const [ptpAmount, setPtpAmount] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [note, setNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isFutureDate = (d: string) => {
    if (!d) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return new Date(d) > today
  }

  const ptpDateInvalid = ptpDate !== "" && !isFutureDate(ptpDate)
  const ptpAmountInvalid = ptpAmount !== "" && !(parseFloat(ptpAmount) > 0)
  const submitDisabled =
    outcome === "promise_to_pay" && (!isFutureDate(ptpDate) || !(parseFloat(ptpAmount) > 0))

  function reset() {
    setInteractionType("telecall")
    setOutcome("promise_to_pay")
    setPtpDate("")
    setPtpAmount("")
    setPaymentAmount("")
    setNote("")
  }

  async function handleSubmit() {
    if (submitDisabled) return
    setIsSubmitting(true)
    try {
      await apiFetch("/interactions/", {
        method: "POST",
        body: JSON.stringify({
          borrower_id: borrowerId,
          interaction_type: interactionType,
          outcome,
          ptp_date: outcome === "promise_to_pay" ? ptpDate : undefined,
          ptp_amount: outcome === "promise_to_pay" ? ptpAmount : undefined,
          payment_amount: outcome === "payment_collected" ? paymentAmount : undefined,
          note: note || undefined,
        }),
      })
      toast.success("Outcome logged")
      reset()
      onOpenChange(false)
      onLogged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log outcome")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle>Log Outcome</DialogTitle>
          <span className="font-mono text-xs text-muted-foreground">{borrowerName}</span>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Interaction type</Label>
            <div className="flex gap-1 rounded-lg border bg-muted p-0.5">
              <button
                type="button"
                onClick={() => setInteractionType("telecall")}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${
                  interactionType === "telecall"
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                Telecall
              </button>
              <button
                type="button"
                onClick={() => setInteractionType("field_visit")}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${
                  interactionType === "field_visit"
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                Field Visit
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Outcome</Label>
            <Select value={outcome} onValueChange={(v) => v && setOutcome(v as InteractionOutcome)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTCOME_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {outcome === "promise_to_pay" && (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-xs">PTP date</Label>
                <Input
                  type="date"
                  value={ptpDate}
                  onChange={(e) => setPtpDate(e.target.value)}
                  aria-invalid={ptpDateInvalid}
                />
                {ptpDateInvalid && (
                  <p className="text-xs text-destructive">Must be a future date</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">PTP amount (₹)</Label>
                <Input
                  type="number"
                  value={ptpAmount}
                  onChange={(e) => setPtpAmount(e.target.value)}
                  placeholder="0"
                  aria-invalid={ptpAmountInvalid}
                />
                {ptpAmountInvalid && (
                  <p className="text-xs text-destructive">Must be greater than 0</p>
                )}
              </div>
            </div>
          )}

          {outcome === "payment_collected" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Amount (₹)</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Note (optional)</Label>
              <span className="font-mono text-xs text-muted-foreground">{note.length}/100</span>
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 100))}
              maxLength={100}
              rows={3}
              placeholder="Add context for the next agent…"
            />
          </div>
        </div>

        <DialogFooter className="border-none bg-transparent p-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitDisabled || isSubmitting}>
            {isSubmitting ? "Submitting…" : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
