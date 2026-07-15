import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Upload,
  Sparkles,
  UserCog,
  PhoneCall,
  LineChart,
  LayoutGrid,
  MapPin,
  ChevronRight,
} from "lucide-react"

interface HowItWorksDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STEPS = [
  { icon: Upload, title: "Upload loan data", desc: "A CSV of overdue accounts is imported." },
  { icon: Sparkles, title: "AI scores & ranks", desc: "Each account is prioritized by how overdue it is." },
  { icon: UserCog, title: "Manager assigns", desc: "Accounts go to a telecaller or field agent." },
  { icon: PhoneCall, title: "Team follows up", desc: "They call or visit, and log what happened." },
  { icon: LineChart, title: "Track recovery", desc: "Reports show how much was recovered." },
]

const ROLES = [
  {
    icon: LayoutGrid,
    title: "Collections Manager",
    lines: [
      "Sees every overdue account, ranked by risk.",
      "Assigns accounts to the team and reviews recovery performance.",
    ],
  },
  {
    icon: PhoneCall,
    title: "Telecaller",
    lines: [
      "Sees only the accounts assigned to them.",
      "Calls borrowers and logs the outcome of each call.",
    ],
  },
  {
    icon: MapPin,
    title: "Field Agent",
    lines: [
      "Handles accounts that need an in-person visit.",
      "Logs visit outcomes, including any payment collected.",
    ],
  },
]

const GLOSSARY = [
  { term: "DPD", def: "Days Past Due — how many days late a payment is." },
  { term: "SMA bucket", def: "How overdue an account is, from mild to severe." },
  { term: "PTP", def: "Promise to Pay — a borrower's commitment to pay by a date." },
  { term: "NPA", def: "A seriously overdue account (Non-Performing Asset)." },
]

export function HowItWorksDialog({ open, onOpenChange }: HowItWorksDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>What is RecoverAI?</DialogTitle>
          <DialogDescription>
            NBFCs (small finance companies) lend money, and some borrowers fall behind on
            payments. Someone on the collections team has to follow up — by phone or in person —
            to recover that money. RecoverAI is the tool that team uses to do this in an
            organized, AI-prioritized way instead of a spreadsheet.
          </DialogDescription>
        </DialogHeader>

        <div>
          <div className="mb-3 text-[13px] font-bold">How it works</div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-1">
            {STEPS.map((step, i) => (
              <div key={step.title} className="contents sm:flex sm:flex-1">
                <div className="flex items-center gap-3 sm:flex-1 sm:flex-col sm:gap-0 sm:text-center">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-weak text-primary">
                    <step.icon className="size-4.5" />
                  </div>
                  <div className="sm:mt-2">
                    <div className="text-[12.5px] font-semibold">{step.title}</div>
                    <div className="mt-0.5 text-[11.5px] text-muted-foreground sm:px-1">{step.desc}</div>
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="hidden size-4 shrink-0 self-center text-muted-foreground sm:mt-4.5 sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 text-[13px] font-bold">Who uses which screen</div>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {ROLES.map((role) => (
              <div key={role.title} className="rounded-lg border bg-muted/30 p-3">
                <div className="mb-1.5 flex items-center gap-2">
                  <role.icon className="size-4 text-primary" />
                  <span className="text-[12.5px] font-bold">{role.title}</span>
                </div>
                <ul className="space-y-1">
                  {role.lines.map((line) => (
                    <li key={line} className="text-[11.5px] leading-snug text-muted-foreground">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2.5 text-[13px] font-bold">A few terms you'll see</div>
          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {GLOSSARY.map((g) => (
              <div key={g.term} className="flex gap-2 text-[12px]">
                <span className="shrink-0 font-mono font-semibold text-primary">{g.term}</span>
                <span className="text-muted-foreground">{g.def}</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
