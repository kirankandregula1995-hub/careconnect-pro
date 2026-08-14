import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Download, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckRow,
  CountBadge,
  EmptyState,
  MultiSelect,
  NoPermission,
  PageHeader,
  ScopeNote,
  StatusPill,
} from "@/components/workforce/primitives";
import {
  CARE_GIVERS,
  FLOORS,
  SHIFTS,
  SHIFT_TIME,
  STATIONS,
  floorName,
  stationName,
  stationsOfFloor,
  type Shift,
} from "@/data/mock";
import { useSession } from "@/state/session";

type Search = { tab?: string; careGiver?: string };

export const Route = createFileRoute("/assignments")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    tab: typeof s.tab === "string" ? s.tab : undefined,
    careGiver: typeof s.careGiver === "string" ? s.careGiver : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Assignments — Coordinator, Clinical Admin & Pharmacist Mapping" },
      {
        name: "description",
        content:
          "Assign care givers floor-wise or nursing station-wise and review coordinator, clinical admin and clinical pharmacist mapping.",
      },
      { property: "og:title", content: "Assignments — Care Giver Station Mapping" },
      { property: "og:description", content: "Floor-wise and station-wise care giver assignment with mapping views." },
    ],
  }),
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const { can } = useSession();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/assignments" });

  if (!can("assignments")) return <NoPermission area="assignment management" />;

  const tab = search.tab ?? "new";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Assignments"
        description="Map care givers to floors and nursing stations, and review responsibility-wise mapping."
      />
      <Tabs value={tab} onValueChange={(v) => navigate({ search: (p) => ({ ...p, tab: v }) })}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="new">New Assignment</TabsTrigger>
          <TabsTrigger value="coordinator">Coordinator Mapping</TabsTrigger>
          <TabsTrigger value="unassigned">Unassigned Coordinators</TabsTrigger>
          <TabsTrigger value="clinical-admin">Clinical Admin</TabsTrigger>
          <TabsTrigger value="pharmacist">Clinical Pharmacist</TabsTrigger>
        </TabsList>
        <TabsContent value="new" className="mt-4"><AssignmentForm preselect={search.careGiver} /></TabsContent>
        <TabsContent value="coordinator" className="mt-4"><CoordinatorMapping /></TabsContent>
        <TabsContent value="unassigned" className="mt-4"><UnassignedCoordinators /></TabsContent>
        <TabsContent value="clinical-admin" className="mt-4"><RoleMapping role="Clinical Admin" /></TabsContent>
        <TabsContent value="pharmacist" className="mt-4"><PharmacistMapping /></TabsContent>
      </Tabs>
    </div>
  );
}

function AssignmentForm({ preselect }: { preselect?: string }) {
  const { scopeStationIds, scopeFloorIds, role } = useSession();
  const assignable = CARE_GIVERS.filter((c) => c.role !== "Nurse Manager");
  const [cgId, setCgId] = useState(preselect ?? assignable[0].id);
  const [type, setType] = useState<"floor" | "station">("station");
  const [floorId, setFloorId] = useState(scopeFloorIds[0] ?? "F3");
  const [stationIds, setStationIds] = useState<string[]>([]);
  const [shift, setShift] = useState<Shift>("Morning");
  const [done, setDone] = useState(false);

  const cgv = CARE_GIVERS.find((c) => c.id === cgId)!;
  const floorStations = stationsOfFloor(floorId).filter(
    (s) => role === "Nurse Manager" || scopeStationIds.includes(s.id),
  );
  const allSelected = floorStations.length > 0 && floorStations.every((s) => stationIds.includes(s.id));

  const submit = () => {
    if (stationIds.length === 0) {
      toast.error("Select at least one nursing station");
      return;
    }
    setDone(true);
    toast.success(`${cgv.name} assigned to ${stationIds.length} nursing station(s)`);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm">Care Giver Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Care Giver</Label>
              <Select value={cgId} onValueChange={(v) => { setCgId(v); setStationIds([]); setDone(false); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {assignable.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} — {c.empId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Shift</Label>
              <Select value={shift} onValueChange={(v) => setShift(v as Shift)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHIFTS.map((s) => (
                    <SelectItem key={s} value={s}>{s} · {SHIFT_TIME[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <div className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-3 text-sm">{cgv.role}</div>
            </div>
            <div className="space-y-1.5">
              <Label>Responsibility</Label>
              <div className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-3 text-sm">{cgv.responsibility}</div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Assignment Type</Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => { setType(v as "floor" | "station"); setStationIds([]); }}
              className="grid gap-2 sm:grid-cols-2"
            >
              {[
                { v: "floor", t: "Floor Wise", d: "Assign across all stations on a floor" },
                { v: "station", t: "Nursing Station Wise", d: "Pick individual nursing stations" },
              ].map((o) => (
                <label
                  key={o.v}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${type === o.v ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <RadioGroupItem value={o.v} className="mt-0.5" />
                  <span>
                    <span className="block text-sm font-medium">{o.t}</span>
                    <span className="block text-xs text-muted-foreground">{o.d}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <Label>Floor</Label>
            <Select value={floorId} onValueChange={(v) => { setFloorId(v); setStationIds([]); }}>
              <SelectTrigger className="sm:w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FLOORS.filter((f) => role === "Nurse Manager" || scopeFloorIds.includes(f.id)).map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name} — {f.location}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Nursing Stations on {floorName(floorId)}</Label>
              <div className="flex gap-3 text-xs">
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => setStationIds(floorStations.map((s) => s.id))}
                >
                  Select all
                </button>
                <button type="button" className="font-medium text-muted-foreground hover:underline" onClick={() => setStationIds([])}>
                  Clear all
                </button>
              </div>
            </div>
            {floorStations.length === 0 ? (
              <EmptyState title="No nursing stations in scope for this floor" />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {floorStations.map((s) => (
                  <CheckRow
                    key={s.id}
                    label={s.name}
                    hint={`${s.code} · ${s.department}`}
                    checked={type === "floor" ? allSelected || stationIds.includes(s.id) : stationIds.includes(s.id)}
                    onChange={(v) =>
                      setStationIds((prev) => (v ? [...prev, s.id] : prev.filter((x) => x !== s.id)))
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={submit}>Assign</Button>
            <Button variant="outline" onClick={() => { setStationIds([]); setDone(false); }}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader><CardTitle className="text-sm">Assignment Summary</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row k="Care Giver" v={cgv.name} />
          <Row k="Employee ID" v={cgv.empId} />
          <Row k="Role" v={cgv.role} />
          <Row k="Responsibility" v={cgv.responsibility} />
          <Row k="Assignment Type" v={type === "floor" ? "Floor Wise" : "Nursing Station Wise"} />
          <Row k="Floor" v={floorName(floorId)} />
          <Row k="Shift" v={`${shift} · ${SHIFT_TIME[shift]}`} />
          <Separator />
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Nursing Stations</p>
            {stationIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">None selected</p>
            ) : (
              <ul className="space-y-1">
                {stationIds.map((s) => (
                  <li key={s} className="flex items-center gap-1.5 text-sm">
                    <CheckCircle2 className="size-3.5 text-success" /> {stationName(s)}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {done ? (
            <div className="rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success">
              Assignment saved. A notification was sent to the Nurse Manager and station in-charge.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{k}</span>
      <span className="text-right text-sm font-medium">{v}</span>
    </div>
  );
}

function useMappingFilters() {
  const { scopeStationIds, scopeFloorIds } = useSession();
  const [floors, setFloors] = useState<string[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);
  const bar = (
    <div className="flex flex-wrap gap-2">
      <MultiSelect
        label="Floor"
        options={FLOORS.filter((f) => scopeFloorIds.includes(f.id)).map((f) => ({ value: f.id, label: f.name }))}
        selected={floors}
        onChange={setFloors}
      />
      <MultiSelect
        label="Nursing Station"
        options={STATIONS.filter((s) => scopeStationIds.includes(s.id)).map((s) => ({ value: s.id, label: s.name }))}
        selected={stations}
        onChange={setStations}
      />
      <MultiSelect label="Shift" options={SHIFTS.map((s) => ({ value: s, label: s }))} selected={shifts} onChange={setShifts} />
    </div>
  );
  return { floors, stations, shifts, bar };
}

function useMappedRows(roleName: string, floors: string[], stations: string[], shifts: string[]) {
  const { scopeStationIds } = useSession();
  return useMemo(() => {
    const rows: { cgId: string; name: string; empId: string; floorId: string; stationId: string; shift: Shift; status: string }[] = [];
    CARE_GIVERS.filter((c) => c.role === roleName).forEach((c) => {
      c.stationIds
        .filter((s) => scopeStationIds.includes(s))
        .forEach((s) => {
          const st = STATIONS.find((x) => x.id === s)!;
          rows.push({ cgId: c.id, name: c.name, empId: c.empId, floorId: st.floorId, stationId: s, shift: c.shift, status: c.status });
        });
    });
    return rows.filter(
      (r) =>
        (floors.length === 0 || floors.includes(r.floorId)) &&
        (stations.length === 0 || stations.includes(r.stationId)) &&
        (shifts.length === 0 || shifts.includes(r.shift)),
    );
  }, [roleName, floors, stations, shifts, scopeStationIds]);
}

function CoordinatorMapping() {
  const { floors, stations, shifts, bar } = useMappingFilters();
  const rows = useMappedRows("Coordinator", floors, stations, shifts);
  const [view, setView] = useState<"station" | "floor">("station");
  const [exporting, setExporting] = useState<null | "running" | "done">(null);

  const runExport = () => {
    setExporting("running");
    setTimeout(() => {
      setExporting("done");
      toast.success("Coordinator-Mapping.xlsx ready to download");
    }, 900);
  };

  const byFloor = FLOORS.map((f) => ({ floor: f, rows: rows.filter((r) => r.floorId === f.id) })).filter((g) => g.rows.length);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {bar}
        <div className="flex gap-2">
          <div className="flex rounded-md border border-border p-0.5">
            {(["station", "floor"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-[5px] px-3 py-1 text-xs font-medium ${view === v ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"}`}
              >
                {v === "station" ? "Station View" : "Floor View"}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={runExport}>
            <Download className="size-4" /> Export Excel
          </Button>
        </div>
      </div>

      {exporting ? (
        <div className="rounded-md border border-border bg-card px-3 py-2 text-sm">
          {exporting === "running" ? (
            <span className="text-muted-foreground">Preparing export with the selected floor, station and shift filters…</span>
          ) : (
            <span className="text-success">
              Export ready — Coordinator-Mapping.xlsx ({rows.length} rows, filters applied).
            </span>
          )}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState title="No coordinator mapping found" description="No coordinators match the selected filters within your scope." />
      ) : view === "station" ? (
        <MappingTable rows={rows} />
      ) : (
        <div className="space-y-4">
          {byFloor.map((g) => (
            <Card key={g.floor.id} className="gap-3 p-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{g.floor.name}</p>
                <CountBadge n={g.rows.length} />
                <span className="text-xs text-muted-foreground">{g.floor.location}</span>
              </div>
              <MappingTable rows={g.rows} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function MappingTable({
  rows,
}: {
  rows: { cgId: string; name: string; empId: string; floorId: string; stationId: string; shift: Shift; status: string }[];
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Coordinator Name</TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Floor</TableHead>
              <TableHead>Nursing Station</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Shift Time</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={`${r.cgId}-${r.stationId}-${i}`}>
                <TableCell className="font-medium whitespace-nowrap">{r.name}</TableCell>
                <TableCell className="num">{r.empId}</TableCell>
                <TableCell>{floorName(r.floorId)}</TableCell>
                <TableCell>{stationName(r.stationId)}</TableCell>
                <TableCell>{r.shift}</TableCell>
                <TableCell className="num whitespace-nowrap">{SHIFT_TIME[r.shift]}</TableCell>
                <TableCell><StatusPill value={r.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function UnassignedCoordinators() {
  const list = CARE_GIVERS.filter((c) => c.role === "Coordinator" && c.stationIds.length === 0);
  const [target, setTarget] = useState<string | null>(null);
  const [stationId, setStationId] = useState("S301");
  const [shift, setShift] = useState<Shift>("Morning");
  const [assignedIds, setAssignedIds] = useState<string[]>([]);

  const remaining = list.filter((c) => !assignedIds.includes(c.id));

  return (
    <div className="space-y-4">
      <ScopeNote text="An unassigned coordinator has no active nursing station assignment for any shift." />
      {remaining.length === 0 ? (
        <EmptyState title="All coordinators are assigned" description="Every coordinator in scope now has an active nursing station." />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coordinator Name</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {remaining.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="num">{c.empId}</TableCell>
                    <TableCell>{c.shift}</TableCell>
                    <TableCell><StatusPill value="Unassigned" /></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => setTarget(c.id)}>Assign Now</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={Boolean(target)} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign nursing station</DialogTitle>
            <DialogDescription>
              {CARE_GIVERS.find((c) => c.id === target)?.name} — Coordinator
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nursing Station</Label>
              <Select value={stationId} onValueChange={setStationId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATIONS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} — {floorName(s.floorId)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Shift</Label>
              <Select value={shift} onValueChange={(v) => setShift(v as Shift)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHIFTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
            <Button
              onClick={() => {
                setAssignedIds((p) => [...p, target!]);
                toast.success(`Assigned to ${stationName(stationId)} · ${shift} shift`);
                setTarget(null);
              }}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoleMapping({ role }: { role: "Clinical Admin" }) {
  const { floors, stations, shifts, bar } = useMappingFilters();
  const rows = useMappedRows(role, floors, stations, shifts);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {bar}
        <Button size="sm" onClick={() => toast.success("Clinical Admin mapping row added (prototype)")}>Add Mapping</Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No clinical admin mapping" description="No clinical admins match the selected filters." />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Nursing Station</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="num">{r.empId}</TableCell>
                    <TableCell>{floorName(r.floorId)}</TableCell>
                    <TableCell>{stationName(r.stationId)}</TableCell>
                    <TableCell>{r.shift}</TableCell>
                    <TableCell><StatusPill value={r.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => toast.info("Edit mapping (prototype)")}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => toast.warning("Removal sent for approval")}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
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

function PharmacistMapping() {
  const { floors, stations, shifts, bar } = useMappingFilters();
  const rows = useMappedRows("Clinical Pharmacist", floors, stations, shifts);
  return (
    <div className="space-y-4">
      {bar}
      <ScopeNote text="Patient assignment is not mandatory for Clinical Pharmacists. Station and floor cover drives future pharmacy task routing." />
      {rows.length === 0 ? (
        <EmptyState title="No clinical pharmacist mapping" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r, i) => (
            <Card key={i} className="gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{r.name}</p>
                  <p className="num text-xs text-muted-foreground">{r.empId}</p>
                </div>
                <StatusPill value={r.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {floorName(r.floorId)} · {stationName(r.stationId)} · {r.shift} ({SHIFT_TIME[r.shift]})
              </p>
              <p className="text-xs">Responsibility: <span className="font-medium">Clinical Pharmacy</span></p>
              <div className="rounded-md border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground">
                Future capability: medication review &amp; stewardship tasks will route to this mapping.
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
