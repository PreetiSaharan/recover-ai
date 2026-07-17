import { RANGE_OPTIONS, type RangeOption } from "@/lib/date-range"
import { Input } from "@/components/ui/input"

interface DateRangeControlProps {
  value: RangeOption
  onChange: (range: RangeOption) => void
}

export function DateRangeControl({ value, onChange }: DateRangeControlProps) {
  return (
    <div className="flex gap-1 rounded-lg border bg-muted p-0.5">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            value === opt.value ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

interface CustomDateRangeInputsProps {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
}

export function CustomDateRangeInputs({ from, to, onFromChange, onToChange }: CustomDateRangeInputsProps) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} className="w-36" />
      <span className="text-xs text-muted-foreground">to</span>
      <Input type="date" value={to} onChange={(e) => onToChange(e.target.value)} className="w-36" />
    </div>
  )
}
