import { type ReactNode, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  CalendarDays,
  ClipboardList,
  FileBarChart,
  Hospital,
  LayoutDashboard,
  ListChecks,
  Menu,
  ScrollText,
  Shield,
  Stethoscope,
  UserSquare2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PERSONAS, useSession, type NavKey } from "@/state/session";

type NavItem = { key: NavKey; to: string; label: string; icon: typeof Users };

const NAV: NavItem[] = [
  { key: "dashboard", to: "/", label: "Dashboard", icon: LayoutDashboard },
  { key: "care-workforce", to: "/care-workforce", label: "Care Workforce", icon: Users },
  { key: "assignments", to: "/assignments", label: "Assignments", icon: UserSquare2 },
  { key: "roster", to: "/roster", label: "Roster", icon: CalendarDays },
  { key: "stations", to: "/stations", label: "Stations", icon: Hospital },
  { key: "patients", to: "/patients", label: "Patients", icon: Stethoscope },
  { key: "tasks", to: "/tasks", label: "Tasks", icon: ListChecks },
  { key: "policies", to: "/policies", label: "Policies", icon: Shield },
  { key: "approvals", to: "/approvals", label: "Approvals", icon: ClipboardList },
  { key: "notifications", to: "/notifications", label: "Notifications", icon: Bell },
  { key: "reports", to: "/reports", label: "Reports", icon: FileBarChart },
  { key: "audit", to: "/audit", label: "Audit", icon: ScrollText },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { can, unreadCount } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-col gap-0.5 p-2">
      {NAV.filter((n) => can(n.key)).map((item) => {
        const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              active && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            <Icon className={cn("size-4 shrink-0", active && "text-sidebar-primary")} />
            <span className="flex-1 truncate">{item.label}</span>
            {item.key === "notifications" && unreadCount > 0 ? (
              <span className="num rounded-full bg-sidebar-primary px-1.5 py-0.5 text-[11px] font-semibold text-sidebar-primary-foreground">
                {unreadCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 border-b border-sidebar-border px-4 py-3.5">
      <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <Activity className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">Care Workforce</p>
        <p className="truncate text-[11px] text-sidebar-foreground/65">Sunrise General Hospital</p>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, setUserId, unreadCount } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-sidebar lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <div className="border-t border-sidebar-border px-4 py-3">
          <p className="truncate text-xs font-medium text-sidebar-accent-foreground">{user.name}</p>
          <p className="truncate text-[11px] text-sidebar-foreground/65">
            {user.role} · {user.responsibility}
          </p>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-card/95 px-3 backdrop-blur sm:px-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Brand />
              <NavLinks onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <p className="hidden text-sm font-medium text-muted-foreground sm:block">
            Care Giver Management
          </p>

          <div className="ml-auto flex items-center gap-2">
            <Select value={user.id} onValueChange={setUserId}>
              <SelectTrigger className="h-9 w-[190px] text-xs sm:w-[260px] sm:text-sm" aria-label="Switch persona">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {PERSONAS.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-sm">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Link to="/notifications">
                <Bell className="size-5" />
                {unreadCount > 0 ? (
                  <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
                ) : null}
              </Link>
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
