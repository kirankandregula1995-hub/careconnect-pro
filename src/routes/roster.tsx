import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, MultiSelect, PageHeader, SearchBox, StatusPill } from "@/components/workforce/primitives";
import { CARE_GIVERS, FLOORS, ROLES, SHIFTS, SHIFT_TIME, STATIONS, floorName, stationName, type Shift } from "@/data/mock";
import { useSession } from "@/state/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/roster")({
  head: () => ({
    meta: [
      { title: "Roster — Shift Configuration & Coverage" },
      { name: "description", content: "Configure workforce roster shifts by day, and review published coverage by floor, nursing station, shift and shift time." },
      { property: "og:title", content: "Roster — Shift Configuration & Coverage" },
      { property: "og:description", content: "Care giver roster configuration and coverage by floor, station and shift." },
    ],
  }),
  component: RosterPage,
});

function RosterPage() {
  const [tab, setTab] = useState("config");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Roster"
        description="Define a shift for every workforce member before they can be assigned to a nursing station or patient."
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>
        <TabsContent value="config" className="mt-4">
          <RosterConfigTab />
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <RosterListTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type DailyShiftValue = Shift | "OFF";
type ShiftGrid = Record<string, DailyShiftValue>;

const SHIFT_TONE: Record<DailyShiftValue, string> = {
  Morning: "bg-[color-mix(in_oklch,var(--chart-1)_16%,transparent)] text-[var(--chart-1)] border-[color-mix(in_oklch,var(--chart-1)_40%,transparent)]",
  Evening: "bg-[color-mix(in_oklch,var(--chart-4)_16%,transparent)] text-[var(--chart-4)] border-[color-mix(in_oklch,var(--chart-4)_40%,transparent)]",
  Night: "bg-[color-mix(in_oklch,var(--chart-3)_16%,transparent)] text-[var(--chart-3)] border-[color-mix(in_oklch,var(--chart-3)_40%,transparent)]",
  OFF: "bg-muted text-muted-foreground border-border",
};

const toIso = (d: Date) => format(d, "yyyy-MM-dd");
const startOfLocalDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const isEditable = (d: Date) => {
  const min = startOfLocalDay(new Date());
  min.setDate(min.getDate() - 1);
  return startOfLocalDay(d) >= min;
};

/**
 * Roster > Config — adapted from the old nurse-mapper RosterTab.jsx's week/
 * month grid, per-cell shift editor, shift-master legend and roster-lock
 * rule, generalized to every workforce role instead of Nurse only. The
 * bed/patient-assignment blocking logic from the old file has no equivalent
 * here (no per-bed patient assignment concept in this app) so it isn't
 * ported. Editing today's cell is a local prototype edit only (no shared
 * store in this design project, matching the rest of the app's toast-only
 * convention) - it does not mutate CARE_GIVERS.
 */
function RosterConfigTab() {
  const { scopeStationIds } = useSession();
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [q, setQ] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [grid, setGrid] = useState<ShiftGrid>({});
  const [openCell, setOpenCell] = useState<string | null>(null);

  const rows = useMemo(() => {
    const scoped = CARE_GIVERS.filter(
      (c) => c.stationIds.length === 0 || c.stationIds.some((s) => scopeStationIds.includes(s)),
    );
    return scoped.filter((c) => {
      const text = c.name.toLowerCase();
      return text.includes(q.toLowerCase()) && (roles.length === 0 || roles.includes(c.role));
    });
  }, [scopeStationIds, q, roles]);

  const dates = useMemo(() => {
    if (viewMode === "week") {
      const start = startOfWeek(referenceDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    }
    return eachDayOfInterval({ start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) });
  }, [viewMode, referenceDate]);

  const headerLabel =
    viewMode === "week"
      ? `${format(dates[0]!, "MMM d")} – ${format(dates[dates.length - 1]!, "MMM d, yyyy")}`
      : format(referenceDate, "MMMM yyyy");

  const navigate = (dir: 1 | -1) =>
    setReferenceDate((prev) => (viewMode === "week" ? (dir > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1)) : dir > 0 ? addMonths(prev, 1) : subMonths(prev, 1)));

  const cellValue = (careGiverId: string, date: Date): DailyShiftValue | undefined => {
    const iso = toIso(date);
    const stored = grid[`${careGiverId}|${iso}`];
    if (stored) return stored;
    const cg = CARE_GIVERS.find((c) => c.id === careGiverId);
    return toIso(new Date()) === iso ? cg?.shift : undefined;
  };

  const setCell = (careGiverId: string, date: Date, value: DailyShiftValue) => {
    const iso = toIso(date);
    setGrid((prev) => ({ ...prev, [`${careGiverId}|${iso}`]: value }));
    const cg = CARE_GIVERS.find((c) => c.id === careGiverId);
    toast.success(`${cg?.name} rostered ${value === "OFF" ? "Off" : value} on ${iso}`);
    setOpenCell(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <SearchBox value={q} onChange={setQ} placeholder="Search care giver…" />
          <MultiSelect label="Role" options={ROLES.map((r) => ({ value: r, label: r }))} selected={roles} onChange={setRoles} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{headerLabel}</span>
          <div className="flex rounded-md border border-border p-0.5">
            {(["week", "month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={cn("rounded-[5px] px-3 py-1 text-xs font-medium", viewMode === v ? "bg-secondary text-secondary-foreground" : "text-muted-foreground")}
              >
                {v === "week" ? "Week" : "Month"}
              </button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="size-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}><ChevronRight className="size-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => toast.success("Roster export queued")}>
            <Download className="size-4" /> Export
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Shift master:</span>
        {SHIFTS.map((s) => (
          <span key={s} className={cn("rounded-md border px-2 py-0.5 text-xs font-medium", SHIFT_TONE[s])}>
            {s} ({SHIFT_TIME[s]})
          </span>
        ))}
        <span className={cn("rounded-md border px-2 py-0.5 text-xs font-medium", SHIFT_TONE.OFF)}>Off</span>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="min-w-[220px] border-b border-border px-3 py-2 text-left font-medium">Care Giver</th>
                {dates.map((d) => (
                  <th
                    key={d.toISOString()}
                    className={cn("min-w-16 border-b border-border px-2 py-2 text-center", viewMode === "month" && !isSameMonth(d, referenceDate) && "opacity-50")}
                  >
                    <div className="text-[10px] uppercase text-muted-foreground">{format(d, "EEE")}</div>
                    <div className="text-xs font-semibold">{format(d, "d")}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={dates.length + 1} className="px-3 py-6 text-center text-muted-foreground">
                    No workforce members match the current search or role filter.
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id}>
                    <td className="border-b border-border px-3 py-2">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.empId} · {c.role}</p>
                    </td>
                    {dates.map((d) => {
                      const iso = toIso(d);
                      const key = `${c.id}|${iso}`;
                      const value = cellValue(c.id, d);
                      const editable = isEditable(d);
                      return (
                        <td key={key} className="border-b border-border px-1.5 py-1.5 text-center">
                          <Popover open={openCell === key} onOpenChange={(o) => setOpenCell(o ? key : null)}>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                disabled={!editable}
                                title={editable ? "Set roster" : "Roster locked for this date"}
                                className={cn(
                                  "flex h-8 w-full min-w-12 items-center justify-center rounded-md border text-[11px] font-semibold",
                                  editable ? (value ? SHIFT_TONE[value] : "border-dashed border-border text-muted-foreground") : "cursor-not-allowed border-border bg-muted/60 text-muted-foreground/50",
                                )}
                              >
                                {value ? (value === "OFF" ? "Off" : value.slice(0, 3)) : "–"}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent align="center" className="w-40 p-1">
                              {SHIFTS.map((s) => (
                                <button
                                  key={s}
                                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                                  onClick={() => setCell(c.id, d, s)}
                                >
                                  <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", SHIFT_TONE[s])}>{s.slice(0, 3)}</span>
                                  {s}
                                </button>
                              ))}
                              <button
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                                onClick={() => setCell(c.id, d, "OFF")}
                              >
                                <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", SHIFT_TONE.OFF)}>Off</span>
                                Not working
                              </button>
                            </PopoverContent>
                          </Popover>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        Roster can be updated only for today, future dates, and the previous one day. Setting today's shift is what
        the Assignments tab reads for patient-assignment eligibility.
      </p>
    </div>
  );
}

/** Roster > List — the original published-roster table this page shipped with. */
function RosterListTab() {
  const { scopeStationIds, scopeFloorIds } = useSession();
  const [q, setQ] = useState("");
  const [floors, setFloors] = useState<string[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);

  const rows = CARE_GIVERS.flatMap((c) =>
    c.stationIds
      .filter((s) => scopeStationIds.includes(s))
      .map((s) => ({ cg: c, stationId: s, floorId: STATIONS.find((x) => x.id === s)!.floorId })),
  ).filter(
    (r) =>
      r.cg.name.toLowerCase().includes(q.toLowerCase()) &&
      (floors.length === 0 || floors.includes(r.floorId)) &&
      (stations.length === 0 || stations.includes(r.stationId)) &&
      (shifts.length === 0 || shifts.includes(r.cg.shift)) &&
      (roles.length === 0 || roles.includes(r.cg.role)),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search care giver…" />
        <MultiSelect label="Floor" options={FLOORS.filter((f) => scopeFloorIds.includes(f.id)).map((f) => ({ value: f.id, label: f.name }))} selected={floors} onChange={setFloors} />
        <MultiSelect label="Station" options={STATIONS.filter((s) => scopeStationIds.includes(s.id)).map((s) => ({ value: s.id, label: s.name }))} selected={stations} onChange={setStations} />
        <MultiSelect label="Shift" options={SHIFTS.map((s) => ({ value: s, label: s }))} selected={shifts} onChange={setShifts} />
        <MultiSelect label="Role" options={ROLES.map((r) => ({ value: r, label: r }))} selected={roles} onChange={setRoles} />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No roster entries" description="No care givers match the selected filters within your scope." />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Care Giver</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Shift Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium whitespace-nowrap">{r.cg.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.cg.role}</TableCell>
                    <TableCell>{floorName(r.floorId)}</TableCell>
                    <TableCell>{stationName(r.stationId)}</TableCell>
                    <TableCell>{r.cg.shift}</TableCell>
                    <TableCell className="num whitespace-nowrap">{SHIFT_TIME[r.cg.shift]}</TableCell>
                    <TableCell><StatusPill value={r.cg.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
