import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import type { CsvUploadRecord } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Upload as UploadIcon, Loader2, Check } from "lucide-react"

const STATUS_BADGE_CLASSES: Record<string, string> = {
  complete: "bg-status-current/15 text-status-current",
  processing: "bg-status-sma1/15 text-status-sma1",
  pending: "bg-status-sma1/15 text-status-sma1",
  failed: "bg-status-npa/15 text-status-npa",
}

const STATUS_LABELS: Record<string, string> = {
  complete: "Complete",
  processing: "Processing",
  pending: "Pending",
  failed: "Failed",
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [phase, setPhase] = useState<"idle" | "uploading" | "processing" | "complete">("idle")
  const [result, setResult] = useState<CsvUploadRecord | null>(null)
  const [history, setHistory] = useState<CsvUploadRecord[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function loadHistory() {
    try {
      const data = await apiFetch("/uploads/")
      setHistory(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load upload history")
    }
  }

  useEffect(() => {
    loadHistory()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const pollStatus = useCallback((uploadId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const data: CsvUploadRecord = await apiFetch(`/uploads/${uploadId}/status`)
        if (data.status === "complete" || data.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current)
          setResult(data)
          setPhase("complete")
          loadHistory()
        } else {
          setPhase(data.status === "processing" ? "processing" : "uploading")
        }
      } catch {
        if (pollRef.current) clearInterval(pollRef.current)
      }
    }, 1200)
  }, [])

  async function startUpload() {
    if (!file) return
    setPhase("uploading")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const upload: CsvUploadRecord = await apiFetch("/uploads/csv", {
        method: "POST",
        body: formData,
      })
      pollStatus(upload.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
      setPhase("idle")
    }
  }

  function resetUpload() {
    if (pollRef.current) clearInterval(pollRef.current)
    setFile(null)
    setResult(null)
    setPhase("idle")
  }

  function pickFile(f: File | undefined) {
    if (!f) return
    if (!f.name.endsWith(".csv")) {
      toast.error("Only CSV files are accepted")
      return
    }
    setFile(f)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Upload Borrower Data</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Import a CSV of overdue accounts. We'll validate, score and rank each row.
        </p>
      </div>

      <div className="grid grid-cols-[1.15fr_0.85fr] items-start gap-4">
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="py-1">
              {phase === "idle" && (
                <>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOver(true)
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragOver(false)
                      pickFile(e.dataTransfer.files[0])
                    }}
                    className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-9 text-center transition-colors ${
                      dragOver ? "border-primary bg-primary-weak" : "border-border bg-muted/40"
                    }`}
                  >
                    <UploadIcon className="size-8 text-primary" strokeWidth={1.7} />
                    <div className="mt-3 text-[14.5px] font-semibold">Drag and drop your CSV here</div>
                    <div className="mt-1 text-xs text-muted-foreground">or</div>
                    <Button
                      variant="outline"
                      className="mt-3"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose file
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => pickFile(e.target.files?.[0])}
                    />
                    {file && (
                      <div className="mt-3.5 rounded-md border bg-card px-3 py-1.5 font-mono text-xs">
                        {file.name}
                      </div>
                    )}
                  </div>
                  <Button className="mt-3.5 w-full" disabled={!file} onClick={startUpload}>
                    <UploadIcon className="size-4" data-icon="inline-start" />
                    Upload CSV
                  </Button>
                </>
              )}

              {(phase === "uploading" || phase === "processing") && (
                <div className="flex flex-col items-center py-9">
                  <Loader2 className="size-7 animate-spin text-primary" />
                  <div className="mt-3.5 text-[14.5px] font-semibold">
                    {phase === "uploading" ? "Uploading…" : "Processing…"}
                  </div>
                </div>
              )}

              {phase === "complete" && result && (
                <div className="flex flex-col items-center py-6.5">
                  <div
                    className={`flex size-13 items-center justify-center rounded-full ${
                      result.status === "failed" ? "bg-status-npa/15" : "bg-status-current/15"
                    }`}
                  >
                    <Check
                      className={`size-6.5 ${result.status === "failed" ? "text-status-npa" : "text-status-current"}`}
                    />
                  </div>
                  <div className="mt-3.5 text-[15.5px] font-bold">
                    {result.status === "failed" ? "Upload failed" : "Upload complete"}
                  </div>
                  <div className="mt-1 text-[13px] text-muted-foreground">
                    {result.ingested_count ?? 0} borrowers ingested, {result.skipped_count ?? 0} skipped
                  </div>
                  <Button variant="outline" className="mt-4.5" onClick={resetUpload}>
                    Upload another file
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {phase === "complete" && result?.error_summary && result.error_summary.length > 0 && (
            <Card className="overflow-hidden py-0">
              <div className="flex items-center gap-2 border-b px-4.5 py-3.5">
                <span className="text-[13.5px] font-bold">Skipped rows</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {result.error_summary.length} of {result.row_count}
                </span>
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="w-[70px] px-4 py-2 text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                      Row
                    </th>
                    <th className="px-4 py-2 text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.error_summary.map((e, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{e.row}</td>
                      <td className="px-4 py-2.5 text-xs">{e.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        <Card className="overflow-hidden py-0">
          <div className="border-b px-4.5 py-3.5">
            <span className="text-[13.5px] font-bold">Upload history</span>
          </div>
          <div>
            {history.length === 0 && (
              <div className="px-4.5 py-8 text-center text-sm text-muted-foreground">No uploads yet.</div>
            )}
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 border-t px-4.5 py-3 first:border-t-0">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold">{h.original_filename ?? "upload.csv"}</div>
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {formatTime(h.created_at)}
                    {h.row_count != null && (
                      <>
                        {" · "}
                        <span className="font-mono">{h.row_count} rows</span>
                      </>
                    )}
                  </div>
                </div>
                <Badge className={STATUS_BADGE_CLASSES[h.status]}>{STATUS_LABELS[h.status]}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
