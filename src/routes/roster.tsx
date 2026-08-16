import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { CARE_GIVERS, SHIFTS, SHIFT_TIME, STATIONS, stationName, type Shift } from "@/data/mock";
import { ROSTER, ROSTER_WEEK, rosterConflicts, type RosterEntry, type RosterStatus } from "@/data/config";
import { useSession } from "@/state/session";

export const Route = createFileRoute("/roster")({
  head: () => ({
    meta: [
      { title: "Roster — Shift Configuration, Grid & Conflicts" },
      {
        name: "description",
        content: "Configure shifts, publish rosters and resolve double-booking conflicts across nursing stations and floors.",
      },
      { property: "og:title", content: "Roster — Shift Configuration & Conflicts" },
      { property: "og:description", content: "Shift configuration, roster grid and conflict resolution." },
    ],
  }),
  component: RosterPage,
});

const VIEWS = [
  { value: "config", label: "Configuration" },
  { value: "grid", label: "Grid" },
  { value: "list", label: "List" },
  { value: "conflicts", label: "Conflicts" },
] as const;
type View = (typeof VIEWS)[number]["value"];

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit" });

function RosterPage() {
  const { can, hasCap, scopeStationIds } = useSession();
  const [view, setView] = useState<View>("grid");
  const [entries, setEntries] = useState<RosterEntry[]>(ROSTER);
  const [q, setQ] = useState("");
  const [stations, setStations] = useState<string[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);

  if (!can("roster")) return <NoPermission area="the roster" />;

  const canManage = hasCap("Roster Management");
  const scoped = entries.filter(
    (e) =>
      scopeStationIds.includes(e.stationId) &&
      (stations.length === 0 || stations.includes(e.stationId)) &&
      (shifts.length === 0 || shifts.includes(e.shift)) &&
      (q === "" || (CARE_GIVERS.find((c) => c.id === e.careGiverId)?.name ?? "").toLowerCase().includes(q.toLowerCase())),
  );
  const conflicts = rosterConflicts(scoped);
  const people = Array.from(new Set(scoped.map((e) => e.careGiverId)));

  const setStatus = (id: string, status: RosterStatus) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
    toast.success(`Roster updated — event EV-R2 sent to worker and Station In-Charge`);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Roster"
        description="Roster availability is a hard eligibility input — a worker without a scheduled shift cannot be assigned."
        actions={
          canManage ? (
            <Button size="sm" onClick={() => toast.success("Roster published — EV-R1 sent to all workers in scope")}>
              Publish Roster
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="Roster Entries" value={scoped.length} />
        <StatCard label="Scheduled" value={scoped.filter((e) => e.status === "Scheduled").length} tone="success" />
        <StatCard label="Leave / Off" value={scoped.filter((e) => e.status !== "Scheduled").length} tone="warning" />
        <StatCard label="Conflicts" value={conflicts.length} tone={conflicts.length ? "danger" : "success"} />
      </div>

      {conflicts.length ? (
        <StateBanner
          tone="danger"
          title={`${conflicts.length} roster conflict(s) detected`}
          description="The same worker is scheduled in more than one station for the same date and shift. Event EV-R5 notifies both Station In-Charges."
          action={<Button size="sm" variant="outline" onClick={() => setView("conflicts")}>Resolve</Button>}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented options={VIEWS.map((v) => ({ ...v }))} value={view} onChange={setView} />
        <SearchBox value={q} onChange={setQ} placeholder="Search worker…" />
      </div>

      <FilterBar>
        <MultiSelect
          label="Station"
          options={STATIONS.filter((s) => scopeStationIds.includes(s.id)).map((s) => ({ value: s.id, label: s.name }))}
          selected={stations}
          onChange={setStations}
        />
        <MultiSelect label="Shift" options={SHIFTS.map((s) => ({ value: s, label: s }))} selected={shifts} onChange={setShifts} />
      </FilterBar>

      {view === "config" ? (
        <SectionCard title="Shift configuration" description="Shift windows and minimum staffing used by coverage rules">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shift</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Minimum staff / station</TableHead>
                  <TableHead>Overlap handover</TableHead>
                  <TableHead>Change cut-off</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SHIFTS.map((s) => (
                  <TableRow key={s}>
                    <TableCell className="font-medium">{s}</TableCell>
                    <TableCell className="num">{SHIFT_TIME[s]}</TableCell>
                    <TableCell className="num">{s === "Night" ? 2 : 3}</TableCell>
                    <TableCell className="num">30 min</TableCell>
                    <TableCell>12 hours before shift start (approval required inside cut-off)</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      ) : null}

      {view === "grid" ? (
        <SectionCard title="Weekly roster grid" description="Week of 17 Aug 2026">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card">Worker</TableHead>
                  {ROSTER_WEEK.map((d) => (
                    <TableHead key={d} className="whitespace-nowrap">{dayLabel(d)}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.slice(0, 20).map((pid) => {
                  const cg = CARE_GIVERS.find((c) => c.id === pid);
                  return (
                    <TableRow key={pid}>
                      <TableCell className="sticky left-0 bg-card whitespace-nowrap font-medium">
                        {cg?.name}
                        <span className="block text-xs text-muted-foreground">{cg?.role}</span>
                      </TableCell>
                      {ROSTER_WEEK.map((d) => {
                        const day = scoped.filter((e) => e.careGiverId === pid && e.date === d);
                        const conflict = day.filter((e) => e.status === "Scheduled").length > 1;
                        return (
                          <TableCell key={d} className="align-top">
                            {day.length === 0 ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              <div className="space-y-1">
                                {day.map((e) => (
                                  <div
                                    key={e.id}
                                    className={`rounded-md border px-2 py-1 text-[11px] leading-tight ${
                                      conflict && e.status === "Scheduled"
                                        ? "border-destructive/40 bg-destructive/10"
                                        : e.status === "Scheduled"
                                          ? "border-border bg-muted"
                                          : "border-dashed border-border text-muted-foreground"
                                    }`}
                                  >
                                    <span className="block font-medium">{e.status === "Scheduled" ? e.shift : e.status}</span>
                                    <span className="block text-muted-foreground">{stationName(e.stationId)}</span>
                                  </div>
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
        </SectionCard>
      ) : null}

      {view === "list" ? (
        <SectionCard title="Roster entries" description="Flat list of scheduled, off and leave entries">
          {scoped.length === 0 ? (
            <EmptyState title="No roster entries" description="No entries match the current filters." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage ? <TableHead className="text-right">Change</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scoped.slice(0, 60).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {CARE_GIVERS.find((c) => c.id === e.careGiverId)?.name}
                      </TableCell>
                      <TableCell className="num whitespace-nowrap">{dayLabel(e.date)}</TableCell>
                      <TableCell>{e.shift}</TableCell>
                      <TableCell className="whitespace-nowrap">{stationName(e.stationId)}</TableCell>
                      <TableCell><StatusPill value={e.status} /></TableCell>
                      {canManage ? (
                        <TableCell className="text-right">
                          <Select value={e.status} onValueChange={(v) => setStatus(e.id, v as RosterStatus)}>
                            <SelectTrigger className="ml-auto h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(["Scheduled", "Off", "Leave"] as RosterStatus[]).map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      ) : null}

      {view === "conflicts" ? (
        <SectionCard title="Conflicts" description="Double-booked workers in the same date and shift">
          {conflicts.length === 0 ? (
            <EmptyState title="No conflicts" description="Every worker in scope has a single scheduled station per shift." />
          ) : (
            <div className="space-y-3">
              {conflicts.map((group) => {
                const first = group[0]!;
                const cg = CARE_GIVERS.find((c) => c.id === first.careGiverId);
                return (
                  <div key={first.id} className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-sm font-medium">
                      {cg?.name} · {dayLabel(first.date)} · {first.shift as Shift}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Scheduled in {group.map((g) => stationName(g.stationId)).join(" and ")}. Escalates to Nurse Manager after 30 minutes.
                    </p>
                    {canManage ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {group.slice(1).map((g) => (
                          <Button key={g.id} size="sm" variant="outline" onClick={() => setStatus(g.id, "Off")}>
                            Release {stationName(g.stationId)}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      ) : null}
    </div>
  );
}
