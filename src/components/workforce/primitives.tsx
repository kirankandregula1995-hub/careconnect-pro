import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Inbox, Lock, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  icon?: ReactNode;
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
    info: "text-info",
  }[tone];
  return (
    <Card className="gap-0 py-4">
      <CardContent className="px-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        </div>
        <p className={cn("num mt-2 text-2xl font-semibold", toneClass)}>{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function StatusPill({ value }: { value: string }) {
  const v = value.toLowerCase();
  const cls = v.includes("active") && !v.includes("in")
    ? "bg-success/12 text-success border-success/25"
    : ["completed", "approved", "delivered", "acknowledged"].some((k) => v.includes(k))
      ? "bg-success/12 text-success border-success/25"
      : ["overdue", "rejected", "critical", "inactive", "unassigned", "breached"].some((k) => v.includes(k))
        ? "bg-destructive/10 text-destructive border-destructive/25"
        : ["pending", "escalated", "on leave", "high", "in progress", "triggered"].some((k) => v.includes(k))
          ? "bg-warning/15 text-warning-foreground border-warning/40"
          : "bg-secondary text-secondary-foreground border-border";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", cls)}>
      {value}
    </span>
  );
}

export function PriorityPill({ value }: { value: string }) {
  return <StatusPill value={value} />;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center">
      <div className="mb-3 rounded-full bg-muted p-3 text-muted-foreground">{icon ?? <Inbox className="size-5" />}</div>
      <p className="text-sm font-semibold">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function NoPermission({ area }: { area: string }) {
  return (
    <div className="p-4 sm:p-6">
      <EmptyState
        icon={<Lock className="size-5" />}
        title="You don't have access to this area"
        description={`Your current role is not authorised to view ${area}. Switch persona from the top bar to explore other role experiences.`}
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/">Back to dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 pl-8"
        aria-label={placeholder}
      />
    </div>
  );
}

export type Option = { value: string; label: string; group?: string };

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  className,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  className?: string;
}) {
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  const summary =
    selected.length === 0
      ? `All ${label.toLowerCase()}`
      : selected.length === options.length
        ? `All ${label.toLowerCase()}`
        : selected.length === 1
          ? (options.find((o) => o.value === selected[0])?.label ?? "1 selected")
          : `${selected.length} selected`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-9 justify-between gap-2 font-normal", className)}
        >
          <span className="text-muted-foreground">{label}:</span>
          <span className="truncate font-medium">{summary}</span>
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => onChange(options.map((o) => o.value))}
          >
            Select all
          </button>
          <button
            type="button"
            className="text-xs font-medium text-muted-foreground hover:underline"
            onClick={() => onChange([])}
          >
            Clear all
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-[4px] border",
                  selected.includes(o.value) ? "border-primary bg-primary text-primary-foreground" : "border-input",
                )}
              >
                {selected.includes(o.value) ? <Check className="size-3" /> : null}
              </span>
              <span className="truncate">{o.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CheckRow({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 transition-colors hover:bg-accent/40",
        checked && "border-primary/50 bg-primary/5",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{label}</span>
        {hint ? <span className="block truncate text-xs text-muted-foreground">{hint}</span> : null}
      </span>
    </label>
  );
}

export function CountBadge({ n }: { n: number }) {
  return (
    <Badge variant="secondary" className="num rounded-full px-1.5 text-[11px]">
      {n}
    </Badge>
  );
}

export function ScopeNote({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-info/25 bg-info/8 px-3 py-2 text-xs text-muted-foreground">{text}</p>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-md border border-border bg-card p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "whitespace-nowrap rounded-[5px] px-3 font-medium transition-colors",
            size === "sm" ? "py-1 text-xs" : "py-1.5 text-sm",
            value === o.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {o.label}
          {typeof o.count === "number" ? <span className="num ml-1.5 opacity-75">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
      {children}
    </div>
  );
}

export function StateBanner({
  tone,
  title,
  description,
  action,
}: {
  tone: "info" | "success" | "warning" | "danger";
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const cls = {
    info: "border-info/30 bg-info/8",
    success: "border-success/30 bg-success/10",
    warning: "border-warning/40 bg-warning/12",
    danger: "border-destructive/30 bg-destructive/8",
  }[tone];
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 rounded-md border px-3 py-2.5", cls)}>
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EligibilityPanel({
  checks,
  eligible,
}: {
  checks: { label: string; ok: boolean; detail: string }[];
  eligible: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Eligibility check</p>
        <StatusPill value={eligible ? "Eligible" : "Not eligible"} />
      </div>
      <ul className="divide-y divide-border">
        {checks.map((c) => (
          <li key={c.label} className="flex items-start gap-2 px-3 py-2">
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                c.ok ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
              )}
            >
              {c.ok ? "✓" : "!"}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{c.label}</span>
              <span className={cn("block text-xs", c.ok ? "text-muted-foreground" : "text-destructive")}>{c.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function KeyValue({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{k}</span>
      <span className="text-right text-sm font-medium">{v}</span>
    </div>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {actions}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
