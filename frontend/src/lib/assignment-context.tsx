import { createContext, useContext, useState, type ReactNode } from "react"

export interface AssignmentState {
  assigneeId: string | null
  contacted: boolean
}

interface AssignmentContextValue {
  assignments: Record<string, AssignmentState>
  setAssignee: (borrowerId: string, assigneeId: string | null) => void
  markContacted: (borrowerId: string) => void
}

const AssignmentContext = createContext<AssignmentContextValue | null>(null)

export function AssignmentProvider({ children }: { children: ReactNode }) {
  const [assignments, setAssignments] = useState<Record<string, AssignmentState>>({})

  function setAssignee(borrowerId: string, assigneeId: string | null) {
    setAssignments((prev) => {
      const cur = prev[borrowerId]
      if (!assigneeId) return { ...prev, [borrowerId]: { assigneeId: null, contacted: false } }
      return { ...prev, [borrowerId]: { assigneeId, contacted: cur?.contacted ?? false } }
    })
  }

  function markContacted(borrowerId: string) {
    setAssignments((prev) => ({
      ...prev,
      [borrowerId]: { assigneeId: prev[borrowerId]?.assigneeId ?? null, contacted: true },
    }))
  }

  return (
    <AssignmentContext.Provider value={{ assignments, setAssignee, markContacted }}>
      {children}
    </AssignmentContext.Provider>
  )
}

export function useAssignments() {
  const ctx = useContext(AssignmentContext)
  if (!ctx) throw new Error("useAssignments must be used within an AssignmentProvider")
  return ctx
}
