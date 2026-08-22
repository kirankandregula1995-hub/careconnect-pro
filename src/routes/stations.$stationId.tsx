import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { EligibilityPanel, EmptyState, PageHeader, StatCard, StatusPill } from "@/components/workforce/primitives";
import { CARE_GIVERS, PATIENTS, SHIFTS, SHIFT_TIME, STATIONS, coverageFor, floorById, stationById, type RoleName } from "@/data/mock";
import { canConfigureRole, configurersFor, evaluateEligibility } from "@/data/config";
import { useSession } from "@/state/session";

export const Route = createFileRoute("/stations/$stationId")({
  head: () => ({
    meta: [
      { title: "Station Detail — Assigned Care Givers & Coverage" },
      { name: "description", content: "Nursing station detail with assigned coordinators, clinical admins, pharmacists, nurses and shift coverage." },
      { property: "og:title", content: "Station Detail — Assigned Care Givers" },
      { property: "og:description", content: "Nursing station care giver mapping and coverage." },
    ],
  }),
  component: StationDetail,
});

function StationDetail() {
  const { stationId } = Route.useParams();
  const { inScope, hasCap, role: actingRole } = useSession();
  const station = stationById(stationId);
  const [level, setLevel] = useState<"Station" | "Floor">("Station");
  const [workerId, setWorkerId] = useState<string>("");

  if (!station) return <EmptyState title="Station not found" />;
  if (!inScope(station.id))
    return (
      <EmptyState
        title="Station outside your scope"
        description="You are not authorised to view this nursing station."
        action={<Button asChild variant="outline" size="sm"><Link to="/stations">Back to stations</Link></Button>}
      />
    );

  const floor = floorById(station.floorId);
  const people = CARE_GIVERS.filter((c) => c.stationIds.includes(station.id));
  const group = (r: string) => people.filter((p) => p.role === r);
  const patients = PATIENTS.filter((p) => p.stationId === station.id);

  const canAssignHere = hasCap("Station Assignment");
  const targetStationIds =
    level === "Station" ? [station.id] : STATIONS.filter((s) => s.floorId === station.floorId).map((s) => s.id);
  const candidates = CARE_GIVERS.filter(
    (c) => c.status === "Active" && canConfigureRole(actingRole, c.role) && !targetStationIds.every((s) => c.stationIds.includes(s)),
  );
  const result = workerId
    ? evaluateEligibility({
        careGiverId: workerId,
        capability: "Station Assignment",
        actingRole,
        ...(level === "Station" ? { stationId: station.id } : {}),
      })
    : null;

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/stations"><ArrowLeft className="size-4" /> Stations</Link>
      </Button>
      <PageHeader
        title={`${station.name} · ${station.code}`}
        description={`${floor?.hospital} · ${floor?.location} · ${floor?.name} · ${station.department}`}
        actions={<StatusPill value={station.status} />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Assigned Care Givers" value={people.length} />
        <StatCard label="Beds" value={station.beds} />
        <StatCard label="Station Coverage" value={`${coverageFor(station.id)}%`} tone={coverageFor(station.id) >= 80 ? "success" : "warning"} />
        <StatCard label="Inpatients" value={patients.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Assigned Care Givers</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              ["Coordinators", "Coordinator"],
              ["Clinical Admins", "Clinical Admin"],
              ["Clinical Pharmacists", "Clinical Pharmacist"],
              ["Station In-Charge", "Station In-Charge"],
              ["Nurses", "Nurse"],
            ].map(([label, groupRole]) => {
              const list = group(groupRole as string);
              const removable = canConfigureRole(actingRole, groupRole as RoleName);
              return (
                <div key={label}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {label} ({list.length})
                  </p>
                  {list.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None assigned</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {list.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{p.name}</p>
                            <p className="num truncate text-xs text-muted-foreground">
                              {p.empId} · {p.shift} {SHIFT_TIME[p.shift]}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusPill value={p.status} />
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={!canAssignHere || !removable}
                              title={!removable ? `${p.role} can only be configured by ${configurersFor(p.role).join(" or ") || "no role via this workflow"}` : undefined}
                              onClick={() => toast.success(`${p.name} removed from ${station.name} — EV-S2 sent to ${p.name} and Station In-Charge`)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Separator className="mt-4" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Assign workforce</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {!canAssignHere ? (
              <p className="text-sm text-muted-foreground">You don't have the Station Assignment capability.</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Assign to</Label>
                    <Select value={level} onValueChange={(v) => { setLevel(v as "Station" | "Floor"); setWorkerId(""); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Station">This station only</SelectItem>
                        <SelectItem value="Floor">All stations on {floor?.name}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Worker</Label>
                    <Select value={workerId} onValueChange={setWorkerId}>
                      <SelectTrigger><SelectValue placeholder="Select a worker to assign" /></SelectTrigger>
                      <SelectContent>
                        {candidates.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name} · {c.role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {candidates.length === 0 ? (
                  <EmptyState
                    title="No configurable workforce available"
                    description="Every active worker you're allowed to configure is already mapped to this scope, or none exist in your scope."
                  />
                ) : result ? (
                  <>
                    <EligibilityPanel checks={result.checks} eligible={result.eligible} />
                    <Button
                      className="w-full"
                      disabled={!result.eligible}
                      onClick={() => {
                        const scopeLabel = level === "Station" ? station.name : `${targetStationIds.length} station(s) on ${floor?.name}`;
                        toast.success(`Assigned to ${scopeLabel} — EV-S1 sent to worker, Station In-Charge and Floor Manager`);
                        setWorkerId("");
                      }}
                    >
                      Confirm Assignment
                    </Button>
                  </>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader><CardTitle className="text-sm">Shift Coverage</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {SHIFTS.map((s) => {
              const cov = coverageFor(station.id, s);
              return (
                <div key={s}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{s}<span className="num ml-2 text-xs text-muted-foreground">{SHIFT_TIME[s]}</span></span>
                    <span className="num text-muted-foreground">{cov}%</span>
                  </div>
                  <Progress value={cov} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
