import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
import { CARE_GIVERS, SHIFTS, SHIFT_TIME, STATIONS, floorName, stationName, type Shift } from "@/data/mock";
import { evaluateEligibility, shiftCoverageForStation } from "@/data/config";
import { useRoster } from "@/state/roster";
import { useSession } from "@/state/session";

export const Route = createFileRoute("/workforce-assignment")({
  head: () => ({
    meta: [
      { title: "Workforce Assignment — Station Mapping with Eligibility" },
      {
        name: "description",
        content: "Assign care workforce to nursing stations only after eligibility checks on status, role, capability, scope and roster pass.",
      },
      { property: "og:title", content: "Workforce Assignment — Eligibility-first Station Mapping" },
      { property: "og:description", content: "Station mapping gated by workforce eligibility rules." },
    ],
  }),
  component: WorkforceAssignmentPage,
});

const VIEWS = [
  { value: "new", label: "New Assignment" },
  { value: "current", label: "Current Mapping" },
  { value: "coverage", label: "Coverage" },
] as const;
type View = (typeof VIEWS)[number]["value"];

function WorkforceAssignmentPage() {
  const { can, hasCap, scopeStationIds, scopeLabel } = useSession();
  const { week, hasActiveRoster } = useRoster();
  const [view, setView] = useState<View>("new");
  const [stationId, setStationId] = useState(scopeStationIds[0] ?? STATIONS[0]!.id);
  const [shift, setShift] = useState<Shift>("Morning");
  const [date, setDate] = useState<string>(week[0] ?? "");
  const [workerId, setWorkerId] = useState<string>("");
  const [note, setNote] = useState("");

  if (!can("workforce-assignment")) return <NoPermission area="workforce assignment" />;

  const stations = STATIONS.filter((s) => scopeStationIds.includes(s.id));
  const station = STATIONS.find((s) => s.id === stationId);

  // Eligibility pool: active + active roster for this date/station/shift.
  const pool = CARE_GIVERS.filter((c) => c.status === "Active");
  const eligiblePool = pool.filter((c) => hasActiveRoster(c.id, date, stationId, shift));
  const blockedPool = pool.filter((c) => !eligiblePool.includes(c));


  const result = workerId ? evaluateEligibility({ careGiverId: workerId, capability: "Station Assignment", stationId }) : null;
  const assigned = CARE_GIVERS.filter((c) => c.stationIds.includes(stationId));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Workforce Assignment"
        description="Configuration → Eligibility → Assignment. Only workers who pass every eligibility rule can be mapped to a station."
      />
      <ScopeNote text={`Your locality scope: ${scopeLabel}. Stations outside this scope are not selectable.`} />

      <Segmented options={VIEWS.map((v) => ({ ...v }))} value={view} onChange={setView} />

      {view === "new" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <SectionCard title="Step 1 — Configuration" description="Choose the date, station and shift the assignment applies to">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Select value={date} onValueChange={(v) => { setDate(v); setWorkerId(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {week.map((d) => (
                      <SelectItem key={d} value={d}>
                        {new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
              <div className="space-y-1.5">
                <Label>Shift</Label>
                <Select value={shift} onValueChange={(v) => { setShift(v as Shift); setWorkerId(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SHIFTS.map((s) => <SelectItem key={s} value={s}>{s} · {SHIFT_TIME[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Step 2 — Eligible workforce ({eligiblePool.length}) · roster-gated
              </p>
              {eligiblePool.length === 0 ? (
                <EmptyState
                  title="No eligible workforce"
                  description="No active roster found for this workforce member for the selected station and shift."
                />
              ) : (

                <div className="grid gap-2 sm:grid-cols-2">
                  {eligiblePool.slice(0, 12).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setWorkerId(c.id)}
                      className={`rounded-md border px-3 py-2 text-left transition-colors ${
                        workerId === c.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                      }`}
                    >
                      <span className="block text-sm font-medium">{c.name}</span>
                      <span className="block text-xs text-muted-foreground">{c.role} · {c.responsibility} · {c.shift}</span>
                    </button>
                  ))}
                </div>
              )}
              {blockedPool.length ? (
                <p className="pt-1 text-xs text-muted-foreground">
                  {blockedPool.length} active worker(s) hidden — outside location scope or not rostered.
                </p>
              ) : null}
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
                  onClick={() =>
                    toast.success(`Assigned to ${stationName(stationId)} — EV-S1 sent to worker, Station In-Charge and Floor Manager`)
                  }
                >
                  Step 3 — Confirm Assignment
                </Button>
              </>
            ) : (
              <SectionCard title="Eligibility" description="Select a worker to run the eligibility rules">
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li>Active employment status</li>
                  <li>Role and responsibility</li>
                  <li>Capability: Station Assignment</li>
                  <li>Location scope match</li>
                  <li>Roster availability</li>
                </ul>
              </SectionCard>
            )}
          </div>
        </div>
      ) : null}

      {view === "current" ? (
        <SectionCard title={`Current mapping — ${stationName(stationId)}`} description="Workforce currently mapped to the selected station">
          {assigned.length === 0 ? (
            <EmptyState title="No workforce mapped" description="This station has no active workforce mapping." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Responsibility</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assigned.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium whitespace-nowrap">{c.name}</TableCell>
                      <TableCell className="whitespace-nowrap">{c.role}</TableCell>
                      <TableCell className="whitespace-nowrap">{c.responsibility}</TableCell>
                      <TableCell>{c.shift}</TableCell>
                      <TableCell><StatusPill value={c.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!hasCap("Station Assignment")}
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
            <StatCard label="Mapped Workforce" value={CARE_GIVERS.filter((c) => c.stationIds.some((s) => scopeStationIds.includes(s))).length} />
            <StatCard label="Unmapped Active" value={CARE_GIVERS.filter((c) => c.status === "Active" && !c.stationIds.length).length} tone="warning" />
            <StatCard label="Shifts Covered" value={SHIFTS.length * stations.length} />
          </div>
          <SectionCard title="Shift coverage by station" description="Staffed workforce per shift against the minimum staffing rule">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Station</TableHead>
                    <TableHead>Floor</TableHead>
                    {SHIFTS.map((s) => <TableHead key={s}>{s}</TableHead>)}
                    <TableHead>State</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stations.map((s) => {
                    const cov = shiftCoverageForStation(s.id);
                    const short = cov.some((c) => c.staffed < (c.shift === "Night" ? 2 : 3));
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium whitespace-nowrap">{s.name}</TableCell>
                        <TableCell className="whitespace-nowrap">{floorName(s.floorId)}</TableCell>
                        {cov.map((c) => (
                          <TableCell key={c.shift} className="num">{c.staffed}</TableCell>
                        ))}
                        <TableCell><StatusPill value={short ? "Coverage shortage" : "Adequate"} /></TableCell>
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
