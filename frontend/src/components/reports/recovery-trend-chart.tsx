import { useState } from "react"

export interface TrendPoint {
  label: string
  value: number
}

function formatCurrency(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

const WIDTH = 680
const HEIGHT = 170
const TOP_PAD = 10

export function RecoveryTrendChart({ data }: { data: TrendPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const max = Math.max(...data.map((d) => d.value), 1) * 1.15
  const step = data.length > 1 ? WIDTH / (data.length - 1) : 0

  const points = data.map((d, i) => ({
    x: i * step,
    y: TOP_PAD + (HEIGHT - TOP_PAD) * (1 - d.value / max),
    ...d,
  }))

  const linePath = "M" + points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L")
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${HEIGHT} L${points[0].x.toFixed(1)},${HEIGHT} Z`
  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => TOP_PAD + (HEIGHT - TOP_PAD) * f)

  const active = hovered !== null ? points[hovered] : null

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block w-full" style={{ height: 170, overflow: "visible" }}>
        <defs>
          <linearGradient id="recovery-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridLines.map((y) => (
          <line key={y} x1={0} y1={y} x2={WIDTH} y2={y} stroke="var(--border)" strokeWidth={1} />
        ))}
        <path d={areaPath} fill="url(#recovery-trend-fill)" />
        <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={i === points.length - 1 ? 5 : 3.5}
              fill={i === points.length - 1 || hovered === i ? "var(--primary)" : "var(--card)"}
              stroke="var(--primary)"
              strokeWidth={2}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={12}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            />
          </g>
        ))}
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
          style={{
            left: `${(active.x / WIDTH) * 100}%`,
            top: `${(active.y / HEIGHT) * 100}%`,
            marginTop: -8,
          }}
        >
          <div className="font-mono font-semibold">{formatCurrency(active.value)}</div>
          <div className="text-[10px] text-muted-foreground">{active.label}</div>
        </div>
      )}

      <div className="mt-0.5 flex justify-between">
        {data.map((d, i) => (
          <span key={i} className="font-mono text-[10.5px] text-muted-foreground">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}
