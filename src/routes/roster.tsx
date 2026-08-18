import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  EmptyState,
  FilterBar,
  MultiSelect,
  NoPermission,
  PageHeader,
  SearchBox,
  SectionCard,
  Segmented,
  StatCard,
  StateBanner,
  StatusPill,
} from "@/components/workforce/primitives";
import {
  CARE_GIVERS,
  FLOORS,
  ROLES,
  SHIFTS,
  SHIFT_TIME,
  STATIONS,
  floorName,
  stationName,
  stationById,
  type Shift,
} from "@/data/mock";
import type { RosterEntry } from "@/data/config";
import { CELL_VALUES, isShiftValue, useRoster, type CellValue } from "@/state/roster";
import { useSession } from "@/state/session";

export const Route = createFileRoute("/roster")({
  head: () => ({
    meta: [
      { title: "Roster — Grid Configuration & Configured Entries" },
      {
        name: "description",
        content:
          "Configure shifts directly in the roster grid, catch overlapping shifts inline, bulk upload from Excel/CSV and export configured roster entries.",
      },
      { property: "og:title", content: "Roster — Grid Configuration & Configured Entries" },
      { property: "og:description", content: "Grid-based shift configuration with inline conflicts, bulk upload and export." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RosterPage,
});

const VIEWS = [
  { value: "grid", label: "Grid" },
  { value: "list", label: "List" },
] as const;
type View = (typeof VIEWS)[number]["value"];

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit" });
const dateLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const cellTone = (value: CellValue, conflict: boolean) => {
  if (conflict) return "border-destructive/50 bg-destructive/10 text-destructive";
  switch (value) {
    case "Morning":
      return "border-primary/30 bg-primary/10 text-primary";
    case "Afternoon":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "Night":
      return "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400";
    case "Leave":
      return "border-dashed border-border bg-muted text-muted-foreground";
    default:
      return "border-dashed border-border text-muted-foreground";
  }
};

const entryValue = (e: RosterEntry): CellValue => (e.status === "Scheduled" ? e.shift : e.status);

/* ------------------------------- Grid cell editor ------------------------------- */

function ShiftCell({
  entry,
  conflict,
  conflictText,
  canManage,
}: {
  entry: RosterEntry;
  conflict: boolean;
  conflictText: string | null;
  canManage: boolean;
}) {
  const { updateEntry } = useRoster();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = entryValue(entry);

  const badge = (
    <span
      className={`block w-full rounded-md border px-2 py-1 text-left text-[11px] font-medium leading-tight ${cellTone(value, conflict)}`}
    >
      <span className="flex items-center gap-1">
        {conflict ? <AlertTriangle className="h-3 w-3 shrink-0" /> : null}
        {value}
      </span>
      <span className="block truncate text-[10px] font-normal opacity-80">{stationName(entry.stationId)}</span>
    </span>
  );

  if (!canManage) {
    return (
      <div className="space-y-1">
        {badge}
        {conflictText ? <p className="text-[10px] leading-tight text-destructive">{conflictText}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setError(null);
        }}
      >
        <PopoverTrigger asChild>
          <button type="button" className="w-full text-left transition-opacity hover:opacity-80">
            {badge}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-52 p-2">
          <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {dayLabel(entry.date)} · {stationName(entry.stationId)}
          </p>
          <div className="space-y-0.5">
            {CELL_VALUES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  const err = updateEntry(entry.id, v);
                  if (err) {
                    setError(err);
                    return;
                  }
                  setError(null);
                  setOpen(false);
                  toast.success(`Roster updated — ${v} on ${dateLabel(entry.date)}`);
                }}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent ${
                  v === value ? "bg-accent font-medium" : ""
                }`}
              >
                <span>{v}</span>
                <span className="text-[10px] text-muted-foreground">{isShiftValue(v) ? SHIFT_TIME[v] : "—"}</span>
              </button>
            ))}
          </div>
          {error ? (
            <p className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-[11px] leading-tight text-destructive">
              {error}
            </p>
          ) : null}
        </PopoverContent>
      </Popover>
      {conflictText ? <p className="text-[10px] leading-tight text-destructive">{conflictText}</p> : null}
    </div>
  );
}

/* --------------------------------- Bulk upload --------------------------------- */

type ParsedRow = { entry: RosterEntry | null; raw: string; error: string | null };

function parseBulk(text: string, allowedStationIds: string[]): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const rows = lines.filter((l, i) => !(i === 0 && /employee/i.test(l)));
  const seen = new Set<string>();
  return rows.map((raw) => {
    const cols = raw.split(/[,;\t]/).map((c) => c.trim());
    const [empId, date, stationCode, shiftRaw] = cols;
    if (!empId || !date || !stationCode || !shiftRaw) {
      return { entry: null, raw, error: "Expected 4 columns: Employee ID, Date, Station, Shift" };
    }
    const cg = CARE_GIVERS.find((c) => c.empId.toLowerCase() === empId.toLowerCase());
    if (!cg) return { entry: null, raw, error: `Unknown employee ID "${empId}"` };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { entry: null, raw, error: `Date must be yyyy-mm-dd (got "${date}")` };
    const station = STATIONS.find(
      (s) => s.code.toLowerCase() === stationCode.toLowerCase() || s.name.toLowerCase() === stationCode.toLowerCase(),
    );
    if (!station) return { entry: null, raw, error: `Unknown nursing station "${stationCode}"` };
    if (!allowedStationIds.includes(station.id)) return { entry: null, raw, error: `${station.name} is outside your locality scope` };
    const value = CELL_VALUES.find((v) => v.toLowerCase() === shiftRaw.toLowerCase());
    if (!value) return { entry: null, raw, error: `Shift must be Morning, Afternoon, Night, Off or Leave (got "${shiftRaw}")` };

    const key = `${cg.id}|${date}|${value}`;
    if (isShiftValue(value) && seen.has(key)) {
      return { entry: null, raw, error: `${cg.name} already has the ${value} shift on ${date} in this file` };
    }
    seen.add(key);

    return {
      raw,
      error: null,
      entry: {
        id: `R-${cg.id}-${date}-${station.id}-${value}`,
        careGiverId: cg.id,
        stationId: station.id,
        date,
        shift: isShiftValue(value) ? value : cg.shift,
        status: isShiftValue(value) ? "Scheduled" : value,
      },
    };
  });
}

const SAMPLE = `Employee ID,Date,Station,Shift
EMP1003,2026-08-17,S301,Morning
EMP1016,2026-08-18,S302,Night`;

function BulkUpload({ allowedStationIds }: { allowedStationIds: string[] }) {
  const { importEntries } = useRoster();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const valid = rows?.filter((r) => r.entry) ?? [];
  const invalid = rows?.filter((r) => !r.entry) ?? [];

  const reset = () => {
    setText("");
    setRows(null);
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Upload className="mr-1.5 h-4 w-4" /> Bulk Upload
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk roster upload</DialogTitle>
            <DialogDescription>
              Upload → Validate → Preview → Confirm Import. Excel/CSV columns: Employee ID, Date (yyyy-mm-dd), Station, Shift.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,.xls,.xlsx"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (/\.xlsx?$/i.test(file.name)) {
                    toast.error("This prototype reads CSV text — export the sheet as CSV and upload again.");
                    return;
                  }
                  const content = await file.text();
                  setText(content);
                  setRows(null);
                }}
              />
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                Choose file
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setText(SAMPLE)}>
                Use sample
              </Button>
            </div>

            <Textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setRows(null);
              }}
              rows={6}
              placeholder={SAMPLE}
              className="font-mono text-xs"
            />

            {rows ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md border border-border bg-muted px-2 py-1">{rows.length} row(s)</span>
                  <span className="rounded-md border border-success/30 bg-success/10 px-2 py-1 text-success">{valid.length} valid</span>
                  <span className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-destructive">
                    {invalid.length} with errors
                  </span>
                </div>
                <div className="max-h-64 overflow-auto rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Result</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-[11px]">{r.raw}</TableCell>
                          <TableCell className={r.error ? "text-xs text-destructive" : "text-xs text-success"}>
                            {r.error ??
                              `${CARE_GIVERS.find((c) => c.id === r.entry!.careGiverId)?.name} · ${dateLabel(r.entry!.date)} · ${entryValue(r.entry!)}`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            {!rows ? (
              <Button
                size="sm"
                disabled={!text.trim()}
                onClick={() => {
                  const parsed = parseBulk(text, allowedStationIds);
                  setRows(parsed);
                  if (parsed.length === 0) toast.error("Nothing to validate — the file has no data rows.");
                }}
              >
                Validate
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setRows(null)}>
                  Back
                </Button>
                <Button
                  size="sm"
                  disabled={valid.length === 0}
                  onClick={() => {
                    importEntries(valid.map((r) => r.entry!));
                    toast.success(`${valid.length} roster row(s) imported${invalid.length ? `, ${invalid.length} skipped` : ""}`);
                    setOpen(false);
                    reset();
                  }}
                >
                  Confirm Import ({valid.length})
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ------------------------------------ Page ------------------------------------- */

function RosterPage() {
  const { can, hasCap, scopeStationIds } = useSession();
  const { entries, week, conflictIds, conflictMessage, updateEntry } = useRoster();
  const [view, setView] = useState<View>("grid");
  const [q, setQ] = useState("");
  const [floors, setFloors] = useState<string[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [shiftFilter, setShiftFilter] = useState<string[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [editing, setEditing] = useState<RosterEntry | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<RosterEntry | null>(null);

  const scoped = useMemo(
    () =>
      entries.filter((e) => {
        const cg = CARE_GIVERS.find((c) => c.id === e.careGiverId);
        const station = stationById(e.stationId);
        if (!cg || !station) return false;
        if (!scopeStationIds.includes(e.stationId)) return false;
        if (floors.length && !floors.includes(station.floorId)) return false;
        if (stations.length && !stations.includes(e.stationId)) return false;
        if (roles.length && !roles.includes(cg.role)) return false;
        if (shiftFilter.length && !shiftFilter.includes(entryValue(e))) return false;
        if (dates.length && !dates.includes(e.date)) return false;
        if (q && !`${cg.name} ${cg.empId}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [entries, scopeStationIds, floors, stations, roles, shiftFilter, dates, q],
  );

  if (!can("roster")) return <NoPermission area="the roster" />;

  const canManage = hasCap("Roster Management");


  const conflictCount = scoped.filter((e) => conflictIds.has(e.id)).length;
  const people = Array.from(new Set(scoped.map((e) => e.careGiverId))).slice(0, 25);
  const gridDates = dates.length ? week.filter((d) => dates.includes(d)) : week;

  const exportCsv = () => {
    const header = [
      "Employee",
      "Employee ID",
      "Role",
      "Responsibility",
      "Date",
      "Floor",
      "Nursing Station",
      "Shift",
      "Shift Time",
      "Status",
    ];
    const lines = scoped.map((e) => {
      const cg = CARE_GIVERS.find((c) => c.id === e.careGiverId)!;
      const station = stationById(e.stationId)!;
      return [
        cg.name,
        cg.empId,
        cg.role,
        cg.responsibility,
        e.date,
        floorName(station.floorId),
        station.name,
        e.status === "Scheduled" ? e.shift : "—",
        e.status === "Scheduled" ? SHIFT_TIME[e.shift] : "—",
        e.status,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roster-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${scoped.length} configured roster row(s) exported`);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Roster"
        description="The roster determines current workforce availability and controls eligibility for Workforce Assignment and Patient Assignment."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canManage && view === "grid" ? <BulkUpload allowedStationIds={scopeStationIds} /> : null}
            {view === "list" ? (
              <Button size="sm" variant="outline" onClick={exportCsv}>
                <Download className="mr-1.5 h-4 w-4" /> Export
              </Button>
            ) : null}
          </div>
        }
      />

      <StateBanner
        tone={conflictCount ? "danger" : "info"}
        title={
          conflictCount
            ? `${conflictCount} overlapping roster cell(s) — highlighted in the grid`
            : "Roster drives assignment eligibility"
        }
        description="A worker is selectable for Station Assignment and Patient Assignment only when an active roster exists for that date, station and shift."
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="Configured Entries" value={scoped.length} />
        <StatCard label="Scheduled" value={scoped.filter((e) => e.status === "Scheduled").length} tone="success" />
        <StatCard label="Leave / Off" value={scoped.filter((e) => e.status !== "Scheduled").length} tone="warning" />
        <StatCard label="Overlaps" value={conflictCount} tone={conflictCount ? "danger" : "success"} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented options={VIEWS.map((v) => ({ ...v }))} value={view} onChange={setView} />
        <SearchBox value={q} onChange={setQ} placeholder="Search employee or ID…" />
      </div>

      <FilterBar>
        <MultiSelect
          label="Floor"
          options={FLOORS.map((f) => ({ value: f.id, label: f.name }))}
          selected={floors}
          onChange={setFloors}
        />
        <MultiSelect
          label="Station"
          options={STATIONS.filter((s) => scopeStationIds.includes(s.id)).map((s) => ({ value: s.id, label: s.name }))}
          selected={stations}
          onChange={setStations}
        />
        <MultiSelect label="Role" options={ROLES.map((r) => ({ value: r, label: r }))} selected={roles} onChange={setRoles} />
        <MultiSelect
          label="Shift"
          options={CELL_VALUES.map((s) => ({ value: s, label: s }))}
          selected={shiftFilter}
          onChange={setShiftFilter}
        />
        <MultiSelect
          label="Date"
          options={week.map((d) => ({ value: d, label: dateLabel(d) }))}
          selected={dates}
          onChange={setDates}
        />
      </FilterBar>

      {view === "grid" ? (
        <SectionCard
          title="Roster grid"
          description="Click any shift badge to configure it. Overlapping shifts are blocked and flagged inline."
        >
          {people.length === 0 ? (
            <EmptyState title="No roster rows" description="No entries match the current filters." />
          ) : (
            <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 bg-card">Workforce</TableHead>
                    {gridDates.map((d) => (
                      <TableHead key={d} className="whitespace-nowrap">
                        {dayLabel(d)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {people.map((pid) => {
                    const cg = CARE_GIVERS.find((c) => c.id === pid);
                    return (
                      <TableRow key={pid}>
                        <TableCell className="sticky left-0 z-10 whitespace-nowrap bg-card font-medium">
                          {cg?.name}
                          <span className="block text-xs text-muted-foreground">
                            {cg?.empId} · {cg?.role}
                          </span>
                        </TableCell>
                        {gridDates.map((d) => {
                          const day = scoped.filter((e) => e.careGiverId === pid && e.date === d);
                          return (
                            <TableCell key={d} className="min-w-[128px] align-top">
                              {day.length === 0 ? (
                                <span className="text-xs text-muted-foreground">—</span>
                              ) : (
                                <div className="space-y-1">
                                  {day.map((e) => (
                                    <ShiftCell
                                      key={e.id}
                                      entry={e}
                                      conflict={conflictIds.has(e.id)}
                                      conflictText={
                                        conflictIds.has(e.id)
                                          ? `${cg?.name?.split(" ")[0]} already has the ${e.shift} shift on this date.`
                                          : null
                                      }
                                      canManage={canManage}
                                    />
                                  ))}
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      ) : (
        <SectionCard title="Configured roster entries" description="Only configured records are listed — empty roster cells are excluded.">
          {scoped.length === 0 ? (
            <EmptyState title="No configured entries" description="No roster records match the current filters." />
          ) : (
            <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Responsibility</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Floor</TableHead>
                    <TableHead>Nursing Station</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Shift Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scoped.slice(0, 80).map((e) => {
                    const cg = CARE_GIVERS.find((c) => c.id === e.careGiverId)!;
                    const station = stationById(e.stationId)!;
                    return (
                      <TableRow key={e.id} className={conflictIds.has(e.id) ? "bg-destructive/5" : undefined}>
                        <TableCell className="whitespace-nowrap font-medium">{cg.name}</TableCell>
                        <TableCell className="num">{cg.empId}</TableCell>
                        <TableCell className="whitespace-nowrap">{cg.role}</TableCell>
                        <TableCell className="whitespace-nowrap">{cg.responsibility}</TableCell>
                        <TableCell className="num whitespace-nowrap">{dateLabel(e.date)}</TableCell>
                        <TableCell className="whitespace-nowrap">{floorName(station.floorId)}</TableCell>
                        <TableCell className="whitespace-nowrap">{station.name}</TableCell>
                        <TableCell>{e.status === "Scheduled" ? e.shift : "—"}</TableCell>
                        <TableCell className="num whitespace-nowrap">{e.status === "Scheduled" ? SHIFT_TIME[e.shift] : "—"}</TableCell>
                        <TableCell>
                          <StatusPill value={e.status} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <Button size="sm" variant="ghost" onClick={() => setViewing(e)}>
                            View
                          </Button>
                          {canManage ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditing(e);
                                setEditError(null);
                              }}
                            >
                              Edit
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      )}

      {/* View entry */}
      <Dialog open={Boolean(viewing)} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Roster entry</DialogTitle>
            <DialogDescription>Configured roster record and its assignment impact.</DialogDescription>
          </DialogHeader>
          {viewing ? (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Employee", CARE_GIVERS.find((c) => c.id === viewing.careGiverId)?.name],
                ["Employee ID", CARE_GIVERS.find((c) => c.id === viewing.careGiverId)?.empId],
                ["Role", CARE_GIVERS.find((c) => c.id === viewing.careGiverId)?.role],
                ["Date", dateLabel(viewing.date)],
                ["Floor", floorName(stationById(viewing.stationId)?.floorId ?? "")],
                ["Nursing Station", stationName(viewing.stationId)],
                ["Shift", viewing.status === "Scheduled" ? `${viewing.shift} · ${SHIFT_TIME[viewing.shift]}` : "—"],
                ["Status", viewing.status],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
              <div className="col-span-2 rounded-md border border-border bg-muted/50 p-2 text-xs text-muted-foreground">
                {viewing.status === "Scheduled"
                  ? "Active roster — this worker is eligible for Workforce and Patient Assignment in this station and shift."
                  : "No active roster for this date — the worker will not appear as eligible for assignment."}
              </div>
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Edit entry */}
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit roster entry</DialogTitle>
            <DialogDescription>
              {editing ? `${CARE_GIVERS.find((c) => c.id === editing.careGiverId)?.name} · ${dateLabel(editing.date)} · ${stationName(editing.stationId)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <div className="space-y-3">
              <Select
                value={entryValue(editing)}
                onValueChange={(v) => {
                  const err = updateEntry(editing.id, v as CellValue);
                  if (err) {
                    setEditError(err);
                    return;
                  }
                  setEditError(null);
                  toast.success("Roster entry updated");
                  setEditing(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CELL_VALUES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                      {isShiftValue(v) ? ` · ${SHIFT_TIME[v]}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editError ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">{editError}</p>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
