import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import type { AssignmentRecord, CaseAssignmentType } from "@/lib/types"

export interface AssignmentState {
  assigneeId: string | null
  contacted: boolean
}

interface AssignmentContextValue {
  assignments: Record<string, AssignmentState>
  isLoading: boolean
  setAssignee: (borrowerId: string, assigneeId: string | null, assignmentType?: CaseAssignmentType) => Promise<void>
  bulkSetAssignee: (borrowerIds: string[], assigneeId: string, assignmentType?: CaseAssignmentType) => Promise<void>
  markContacted: (borrowerId: string) => void
}

const AssignmentContext = createContext<AssignmentContextValue | null>(null)

export function AssignmentProvider({ children }: { children: ReactNode }) {
  const [assignments, setAssignments] = useState<Record<string, AssignmentState>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    apiFetch("/assignments/today")
      .then((records: AssignmentRecord[]) => {
        const next: Record<string, AssignmentState> = {}
        records.forEach((r) => {
          next[r.borrower_id] = { assigneeId: r.assigned_to, contacted: false }
        })
        setAssignments(next)
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to load today's assignments")
      })
      .finally(() => setIsLoading(false))
  }, [])

  async function setAssignee(
    borrowerId: string,
    assigneeId: string | null,
    assignmentType: CaseAssignmentType = "telecall"
  ) {
    if (!assigneeId) {
      // no backend "unassign" endpoint available — local only
      setAssignments((prev) => ({ ...prev, [borrowerId]: { assigneeId: null, contacted: false } }))
      return
    }

    try {
      const record: AssignmentRecord = await apiFetch("/assignments/", {
        method: "POST",
        body: JSON.stringify({
          borrower_id: borrowerId,
          assigned_to: assigneeId,
          assignment_type: assignmentType,
        }),
      })
      setAssignments((prev) => ({
        ...prev,
        [record.borrower_id]: { assigneeId: record.assigned_to, contacted: prev[record.borrower_id]?.contacted ?? false },
      }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign borrower")
    }
  }

  async function bulkSetAssignee(
    borrowerIds: string[],
    assigneeId: string,
    assignmentType: CaseAssignmentType = "telecall"
  ) {
    if (borrowerIds.length === 0) return
    try {
      const records: AssignmentRecord[] = await apiFetch("/assignments/bulk", {
        method: "POST",
        body: JSON.stringify({
          borrower_ids: borrowerIds,
          assigned_to: assigneeId,
          assignment_type: assignmentType,
        }),
      })
      setAssignments((prev) => {
        const next = { ...prev }
        records.forEach((r) => {
          next[r.borrower_id] = { assigneeId: r.assigned_to, contacted: prev[r.borrower_id]?.contacted ?? false }
        })
        return next
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign borrowers")
    }
  }

  function markContacted(borrowerId: string) {
    setAssignments((prev) => ({
      ...prev,
      [borrowerId]: { assigneeId: prev[borrowerId]?.assigneeId ?? null, contacted: true },
    }))
  }

  return (
    <AssignmentContext.Provider value={{ assignments, isLoading, setAssignee, bulkSetAssignee, markContacted }}>
      {children}
    </AssignmentContext.Provider>
  )
}

export function useAssignments() {
  const ctx = useContext(AssignmentContext)
  if (!ctx) throw new Error("useAssignments must be used within an AssignmentProvider")
  return ctx
}
