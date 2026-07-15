import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { CurrentUser } from "@/lib/types"

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function roleLabel(role: string) {
  return role
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ")
}

interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: CurrentUser
}

export function ProfileDialog({ open, onOpenChange, user }: ProfileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-2">
          <Avatar size="lg" className="size-16">
            <AvatarFallback className="bg-primary text-lg text-primary-foreground">
              {initials(user.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <div className="text-base font-bold">{user.full_name}</div>
            <Badge variant="outline" className="mt-1.5">
              {roleLabel(user.role)}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t pt-3 text-[13px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">NBFC</span>
            <span className="font-medium">{user.nbfc_name ?? "—"}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
