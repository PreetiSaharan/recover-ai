export type RangeOption = "today" | "7d" | "30d" | "custom"

export const RANGE_OPTIONS: { value: RangeOption; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "custom", label: "Custom" },
]

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function addDays(dateStr: string, delta: number) {
  const d = new Date(dateStr + "T00:00:00")
  d.setDate(d.getDate() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function dateOnly(iso: string) {
  return iso.slice(0, 10)
}

export function isWithinRange(iso: string, dateFrom: string, dateTo: string) {
  const day = dateOnly(iso)
  return day >= dateFrom && day <= dateTo
}

export function daysBetween(from: string, to: string) {
  const a = new Date(from + "T00:00:00")
  const b = new Date(to + "T00:00:00")
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export function displayDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

export function computeRange(
  range: RangeOption,
  customFrom: string,
  customTo: string
): { dateFrom: string; dateTo: string } {
  const today = todayStr()
  if (range === "today") return { dateFrom: today, dateTo: today }
  if (range === "7d") return { dateFrom: addDays(today, -6), dateTo: today }
  if (range === "30d") return { dateFrom: addDays(today, -29), dateTo: today }
  return { dateFrom: customFrom, dateTo: customTo }
}

export function rangeLabel(range: RangeOption, dateFrom: string, dateTo: string) {
  if (range === "today") return "Today"
  if (range === "7d") return "Last 7 Days"
  if (range === "30d") return "Last 30 Days"
  return `${displayDate(dateFrom)} – ${displayDate(dateTo)}`
}
