import { useEffect, useState } from "react"
import { NavLink, Outlet, useNavigate, useOutletContext } from "react-router-dom"
import { LayoutGrid, Upload, BarChart3, Phone, MapPin, Bell, ChevronDown, LogOut, Menu, X } from "lucide-react"
import { apiFetch } from "@/lib/api"
import type { CurrentUser } from "@/lib/types"
import { ThemeToggle } from "@/components/theme-toggle"
import { AssignmentProvider } from "@/lib/assignment-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

const MANAGER_NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/upload", label: "Upload CSV", icon: Upload },
  { to: "/reports", label: "Reports", icon: BarChart3 },
]

const TELECALLER_NAV_ITEMS = [
  { to: "/my-calls", label: "My Calls", icon: Phone },
  { to: "/reports", label: "Reports", icon: BarChart3 },
]

const FIELD_AGENT_NAV_ITEMS = [
  { to: "/my-cases", label: "My Cases", icon: MapPin },
  { to: "/reports", label: "Reports", icon: BarChart3 },
]

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function useCurrentUser() {
  return useOutletContext<CurrentUser>()
}

export function AppLayout() {
  const navigate = useNavigate()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    apiFetch("/auth/me").then(setUser).catch(() => setUser(null))
  }, [])

  function handleLogout() {
    localStorage.removeItem("access_token")
    navigate("/login")
  }

  const navItems = !user
    ? []
    : user.role === "manager"
      ? MANAGER_NAV_ITEMS
      : user.role === "field_agent"
        ? FIELD_AGENT_NAV_ITEMS
        : TELECALLER_NAV_ITEMS

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[236px] shrink-0 -translate-x-full flex-col border-r bg-card transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : ""
        }`}
      >
        <div className="flex items-center gap-3 px-5 pt-5 pb-4">
          <div className="flex size-7.5 shrink-0 items-center justify-center rounded-lg bg-primary">
            <div className="size-3 rotate-[-45deg] rounded-sm border-2 border-r-transparent border-primary-foreground" />
          </div>
          <div>
            <div className="text-[16px] leading-none font-bold tracking-tight">RecoverAI</div>
            <div className="mt-0.5 text-[10.5px] text-muted-foreground">Collections OS</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden"
            aria-label="Close menu"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="size-4.5" />
          </Button>
        </div>

        <nav className="flex flex-col gap-0.5 px-3 py-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors ${
                  isActive
                    ? "bg-primary-weak text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <Icon className="size-4.5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-2 p-3">
          <ThemeToggle />
          <div className="flex items-center gap-2.5 border-t pt-3">
            <Avatar>
              <AvatarFallback>{user ? initials(user.full_name) : "?"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold">{user?.full_name ?? "Loading…"}</div>
              <div className="truncate text-[11.5px] text-muted-foreground capitalize">
                {user?.role ?? ""}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-15 shrink-0 items-center gap-4 border-b bg-card px-6">
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            aria-label="Open menu"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="size-4.5" />
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-[14.5px] font-semibold">{user?.nbfc_name ?? "—"}</span>
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] font-semibold tracking-wide text-muted-foreground">
              NBFC
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="icon" className="relative" aria-label="Notifications">
              <Bell className="size-4.5" />
              <span className="absolute top-1.5 right-2 size-1.5 rounded-full bg-status-npa" />
            </Button>
            <div className="h-6 w-px bg-border" />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted">
                <Avatar size="sm">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user ? initials(user.full_name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[13px] font-medium">{user?.full_name.split(" ")[0] ?? ""}</span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleLogout} variant="destructive">
                  <LogOut className="size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-7">
          <AssignmentProvider>
            <Outlet context={user} />
          </AssignmentProvider>
        </main>
      </div>
    </div>
  )
}
