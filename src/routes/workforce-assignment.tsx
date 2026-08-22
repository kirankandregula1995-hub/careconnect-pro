import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  EligibilityPanel,
  EmptyState,
  NoPermission,
  PageHeader,
  ScopeNote,
  SectionCard,
  Segmented,
  StatCard,
  StateBanner,
  StatusPill,
} from "@/components/workforce/primitives";
import { CARE_GIVERS, FLOORS, SHIFTS, SHIFT_TIME, STATIONS, floorName, stationName } from "@/data/mock";
import { canConfigureRole, configurersFor, evaluateEligibility } from "@/data/config";
import { useRoster } from "@/state/roster";
import { useSession } from "@/state/session";

export const Route = createFileRoute("/workforce-assignment")({
  head: () => ({
    meta: [
      { title: "Workforce Assignment — Floor & Station Mapping" },
      {
        name: "description",
        content:
          "One-time workforce assignment to floors or nursing stations, with role capability and locality scope checks. Shift coverage comes from the roster.",
      },
      { property: "og:title", content: "Workforce Assignment — Floor & Station Mapping" },
      { property: "og:description", content: "One-time station or floor mapping for the care workforce." },
    ],
  }),
  component: WorkforceAssignmentPage,
});

const VIEWS = [
  { value: "new", label: "New Assignment" },
  { value: "current", label: "Current Mapping" },
  { value: "coverage", label: "Shift Coverage" },
] as const;
type View = (typeof VIEWS)[number]["value"];

const TODAY = new Date().toISOString().slice(0, 10);

function WorkforceAssignmentPage() {
  const { can, hasCap, role, scopeStationIds, scopeFloorIds, scopeLabel } = useSession();
  const { entries, week } = useRoster();
  const [view, setView] = useState<View>("new");
  const [level, setLevel] = useState<"Station" | "Floor">("Station");
  const [stationId, setStationId] = useState(scopeStationIds[0] ?? STATIONS[0]!.id);
  const [floorId, setFloorId] = useState(scopeFloorIds[0] ?? FLOORS[0]!.id);
  const [workerId, setWorkerId] = useState<string>("");
  const [note, setNote] = useState("");

  const today = week.includes(TODAY) ? TODAY : (week[0] ?? TODAY);

  const stations = STATIONS.filter((s) => scopeStationIds.includes(s.id));
  const floors = FLOORS.filter((f) => scopeFloorIds.includes(f.id));
  const targetStationIds = useMemo(
    () => (level === "Station" ? [stationId] : STATIONS.filter((s) => s.floorId === floorId).map((s) => s.id)),
    [level, stationId, floorId],
  );

  const pool = CARE_GIVERS.filter((c) => c.status === "Active" && canConfigureRole(role, c.role));
  const unmapped = pool.filter((c) => !targetStationIds.every((s) => c.stationIds.includes(s)));

  const result = workerId
    ? evaluateEligibility({
        careGiverId: workerId,
        capability: "Station Assignment",
        actingRole: role,
        ...(level === "Station" ? { stationId } : {}),
      })
    : null;

  const assigned = CARE_GIVERS.filter((c) => targetStationIds.some((s) => c.stationIds.includes(s)));

  const todaysRoster = entries.filter(
    (e) => e.date === today && e.status === "Scheduled" && scopeStationIds.includes(e.stationId),
  );

  const downloadToday = () => {
    const header = ["Employee", "Employee ID", "Role", "Date", "Shift", "Shift Time", "Floor", "Nursing Station"];
    const lines = todaysRoster.map((e) => {
      const c = CARE_GIVERS.find((x) => x.id === e.careGiverId);
      const st = STATIONS.find((x) => x.id === e.stationId);
      return [c?.name ?? "—", c?.empId ?? "—", c?.role ?? "—", e.date, e.shift, SHIFT_TIME[e.shift], floorName(st?.floorId ?? ""), st?.name ?? "—"];
    });
    const csv = [header, ...lines]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `todays-workforce-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded today's workforce — ${lines.length} record(s)`);
  };

  if (!can("workforce-assignment")) return <NoPermission area="workforce assignment" />;

  const targetLabel = level === "Station" ? stationName(stationId) : floorName(floorId);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Workforce Assignment"
        description="A one-time mapping of workforce to a floor or nursing station. It is not shift or date based — the roster decides which shift they work."
        actions={
          <Button size="sm" variant="outline" onClick={downloadToday}>
            <Download className="size-4" /> Download Today's Workforce
          </Button>
        }
      />
      <ScopeNote text={`Your locality scope: ${scopeLabel}. Floors and stations outside this scope are not selectable.`} />

      <Segmented options={VIEWS.map((v) => ({ ...v }))} value={view} onChange={setView} />

      {view === "new" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <SectionCard title="Step 1 — Assignment scope" description="Assign floor-wise or station-wise">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Assignment level</Label>
                <Select value={level} onValueChange={(v) => { setLevel(v as "Station" | "Floor"); setWorkerId(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Station">Station-wise</SelectItem>
                    <SelectItem value="Floor">Floor-wise (all stations on the floor)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {level === "Station" ? (
                <div className="space-y-1.5">
                  <Label>Nursing station</Label>
                  <Select value={stationId} onValueChange={(v) => { setStationId(v); setWorkerId(""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {stations.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name} · {floorName(s.floorId)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Floor</Label>
                  <Select value={floorId} onValueChange={(v) => { setFloorId(v); setWorkerId(""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {floors.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name} · {f.location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {level === "Floor" ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {targetStationIds.length} station(s) on {floorName(floorId)} will be mapped in one action.
              </p>
            ) : null}

            <div className="mt-5 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Step 2 — Select workforce ({unmapped.length} active, not yet mapped here)
              </p>
              {unmapped.length === 0 ? (
                <EmptyState title="Everyone is already mapped" description="Every active workforce member is already mapped to this scope." />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {unmapped.slice(0, 12).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setWorkerId(c.id)}
                      className={`rounded-md border px-3 py-2 text-left transition-colors ${
                        workerId === c.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                      }`}
                    >
                      <span className="block text-sm font-medium">{c.name}</span>
                      <span className="block text-xs text-muted-foreground">{c.role} · {c.stationIds.length} station(s) mapped</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 space-y-1.5">
              <Label>Assignment note</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for this mapping (stored in audit)…" />
            </div>
          </SectionCard>

          <div className="space-y-3">
            {result ? (
              <>
                <EligibilityPanel checks={result.checks} eligible={result.eligible} />
                {!result.eligible ? (
                  <StateBanner tone="warning" title="Assignment blocked" description="Resolve every failing check before this worker can be mapped." />
                ) : null}
                <Button
                  className="w-full"
                  disabled={!result.eligible || !hasCap("Station Assignment")}
                  onClick={() => toast.success(`Assigned to ${targetLabel} — EV-S1 sent to worker, Station In-Charge and Floor Manager`)}
                >
                  Step 3 — Confirm Assignment
                </Button>
              </>
            ) : (
              <SectionCard title="Eligibility" description="Select a worker to run the eligibility rules">
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li>Active employment status</li>
                  <li>Role</li>
                  <li>Capability: Station Assignment</li>
                  <li>Configuration authority (who can configure this role)</li>
                  <li>Location scope match</li>
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  Assignment is one-time. Shift availability is handled separately in the Roster.
                </p>
              </SectionCard>
            )}
          </div>
        </div>
      ) : null}

      {view === "current" ? (
        <SectionCard title={`Current mapping — ${targetLabel}`} description="Workforce currently mapped to the selected scope">
          {assigned.length === 0 ? (
            <EmptyState title="No workforce mapped" description="This scope has no active workforce mapping." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Stations Assigned</TableHead>
                    <TableHead>Floors</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assigned.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium whitespace-nowrap">{c.name}</TableCell>
                      <TableCell className="whitespace-nowrap">{c.role}</TableCell>
                      <TableCell className="num">{c.stationIds.length}</TableCell>
                      <TableCell className="whitespace-nowrap">{c.floorIds.map(floorName).join(", ") || "—"}</TableCell>
                      <TableCell><StatusPill value={c.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!hasCap("Station Assignment") || !canConfigureRole(role, c.role)}
                          title={!canConfigureRole(role, c.role) ? `${c.role} can only be configured by ${configurersFor(c.role).join(" or ") || "no role via this workflow"}` : undefined}
                          onClick={() => toast.success(`Mapping removed — EV-S2 sent to ${c.name} and Station In-Charge`)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      ) : null}

      {view === "coverage" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            <StatCard label="Stations in Scope" value={stations.length} />
            <StatCard label="Floors in Scope" value={floors.length} />
            <StatCard
              label="Mapped Workforce"
              value={CARE_GIVERS.filter((c) => c.stationIds.some((s) => scopeStationIds.includes(s))).length}
            />
            <StatCard
              label="Unmapped Active"
              value={CARE_GIVERS.filter((c) => c.status === "Active" && !c.stationIds.length).length}
              tone="warning"
            />
          </div>
          <SectionCard
            title={`Stations assigned per shift — ${today}`}
            description="How many stations each shift covers today, taken from the published roster"
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shift</TableHead>
                    <TableHead>Shift Time</TableHead>
                    <TableHead>Stations Assigned</TableHead>
                    <TableHead>Workforce Rostered</TableHead>
                    <TableHead>State</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SHIFTS.map((sh) => {
                    const forShift = todaysRoster.filter((e) => e.shift === sh);
                    const stationCount = new Set(forShift.map((e) => e.stationId)).size;
                    const people = new Set(forShift.map((e) => e.careGiverId)).size;
                    return (
                      <TableRow key={sh}>
                        <TableCell className="font-medium">{sh}</TableCell>
                        <TableCell className="whitespace-nowrap">{SHIFT_TIME[sh]}</TableCell>
                        <TableCell className="num">{stationCount} / {stations.length}</TableCell>
                        <TableCell className="num">{people}</TableCell>
                        <TableCell>
                          <StatusPill value={stationCount < stations.length ? "Coverage shortage" : "Adequate"} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
          <SectionCard title="Floor-wise mapping" description="Workforce mapped per floor across your scope">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Floor</TableHead>
                    <TableHead>Stations</TableHead>
                    <TableHead>Mapped Workforce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {floors.map((f) => {
                    const ids = STATIONS.filter((s) => s.floorId === f.id).map((s) => s.id);
                    return (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium whitespace-nowrap">{f.name}</TableCell>
                        <TableCell className="num">{ids.length}</TableCell>
                        <TableCell className="num">
                          {CARE_GIVERS.filter((c) => c.stationIds.some((s) => ids.includes(s))).length}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}
