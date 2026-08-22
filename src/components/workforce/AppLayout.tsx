import { type ReactNode, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  BedDouble,
  Building2,
  CalendarRange,
  ClipboardCheck,
  FileBarChart,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Menu,
  ScrollText,
  ShieldCheck,
  UserSquare2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PERSONAS, useSession, type NavKey } from "@/state/session";

type NavItem = { key: NavKey; to: string; label: string; icon: typeof Users };

const NAV: NavItem[] = [
  { key: "workforce-dashboard", to: "/", label: "Workforce Dashboard", icon: LayoutDashboard },
  { key: "patient-dashboard", to: "/patient-dashboard", label: "Patient Dashboard", icon: BedDouble },
  { key: "care-workforce", to: "/care-workforce", label: "Care Workforce", icon: Users },
  { key: "stations", to: "/stations", label: "Station Master", icon: Building2 },
  { key: "roster", to: "/roster", label: "Roster", icon: CalendarRange },
  { key: "workforce-assignment", to: "/workforce-assignment", label: "Workforce Assignment", icon: MapPin },
  { key: "patient-assignment", to: "/patient-assignment", label: "Patient Assignment", icon: UserSquare2 },
  { key: "policies", to: "/policies", label: "Policies & Access", icon: ShieldCheck },
  { key: "tasks", to: "/tasks", label: "Tasks", icon: ListChecks },
  { key: "approvals", to: "/approvals", label: "Approvals", icon: ClipboardCheck },
  { key: "notifications", to: "/notifications", label: "Events & Notifications", icon: Bell },
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
            to={item.to as never}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              active && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            <Icon className={cn("size-4 shrink-0", active && "text-sidebar-primary")} />
            <span className="flex-1 truncate">{item.label}</span>
            {item.key === "notifications" && unreadCount > 0 ? (
              <span className="num rounded-full bg-sidebar-primary px-1.5 text-[11px] font-semibold text-sidebar-primary-foreground">
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
    <div className="flex items-center gap-2.5 border-b border-sidebar-border px-3 py-3">
      <div className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <Activity className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-sidebar-accent-foreground">Care Workforce</p>
        <p className="truncate text-[11px] text-sidebar-foreground/65">Sunrise General Hospital</p>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, setUserId, unreadCount, scopeLevel, scopeLabel } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col bg-sidebar lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <div className="border-t border-sidebar-border px-3 py-2.5">
          <p className="truncate text-xs font-medium text-sidebar-accent-foreground">{user.name}</p>
          <p className="truncate text-[11px] text-sidebar-foreground/65">
            {user.role}
          </p>
          <p className="truncate text-[11px] text-sidebar-foreground/50">
            Scope: {scopeLevel} — {scopeLabel}
          </p>
        </div>
      </aside>

      <div className="lg:pl-56">
        <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-border bg-card px-3 sm:px-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Brand />
              <NavLinks onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <p className="hidden text-xs font-medium text-muted-foreground sm:block">
            Hospital Operations · Care Giver Management
          </p>

          <div className="ml-auto flex items-center gap-2">
            <Select value={user.id} onValueChange={setUserId}>
              <SelectTrigger className="h-8 w-[180px] text-xs sm:w-[250px]" aria-label="Switch persona">
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
            <Button asChild variant="ghost" size="icon" className="relative size-8" aria-label="Notifications">
              <Link to={"/notifications" as never}>
                <Bell className="size-4" />
                {unreadCount > 0 ? <span className="absolute right-1 top-1 size-2 rounded-full bg-destructive" /> : null}
              </Link>
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] p-3 sm:p-5">{children}</main>
      </div>
    </div>
  );
}
