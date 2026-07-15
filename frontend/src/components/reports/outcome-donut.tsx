export interface DonutSegment {
  label: string
  count: number
  colorVar: string // CSS variable name without leading --
}

export function OutcomeDonut({ segments, centerLabel }: { segments: DonutSegment[]; centerLabel: string }) {
  const total = segments.reduce((a, s) => a + s.count, 0)
  const circumference = 2 * Math.PI * 52
  let acc = 0

  return (
    <div className="flex flex-wrap items-center gap-7">
      <svg viewBox="0 0 140 140" className="size-[140px] shrink-0">
        {total === 0 ? (
          <circle cx={70} cy={70} r={52} fill="none" stroke="var(--muted)" strokeWidth={20} />
        ) : (
          segments.map((s, i) => {
            const frac = s.count / total
            const dash = frac * circumference
            const rotation = acc * 360 - 90
            acc += frac
            return (
              <circle
                key={i}
                cx={70}
                cy={70}
                r={52}
                fill="none"
                stroke={`var(--${s.colorVar})`}
                strokeWidth={20}
                strokeDasharray={`${dash.toFixed(1)} ${(circumference - dash).toFixed(1)}`}
                transform={`rotate(${rotation.toFixed(1)} 70 70)`}
              />
            )
          })
        )}
        <text x={70} y={66} textAnchor="middle" className="font-mono" style={{ fontSize: 22, fontWeight: 700, fill: "var(--foreground)" }}>
          {total}
        </text>
        <text x={70} y={84} textAnchor="middle" style={{ fontSize: 10, fill: "var(--muted-foreground)" }}>
          {centerLabel}
        </text>
      </svg>

      <div className="flex min-w-[200px] flex-1 flex-col gap-2">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: `var(--${s.colorVar})` }} />
            <span className="flex-1 text-[12.5px] font-semibold">{s.label}</span>
            <span className="font-mono text-[13px] font-bold">{s.count}</span>
            <span className="w-9 shrink-0 text-right font-mono text-[11.5px] text-muted-foreground">
              {total > 0 ? Math.round((s.count / total) * 100) : 0}%
            </span>
          </div>
        ))}
        {segments.length === 0 && <div className="text-xs text-muted-foreground">No outcomes yet.</div>}
      </div>
    </div>
  )
}
