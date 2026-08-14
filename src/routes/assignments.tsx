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
  SearchBox,
  StatusPill,
} from "@/components/workforce/primitives";
import {
  CARE_GIVERS,
  EMERGENCY_CODES,
  FLOORS,
  INVENTORY_ITEMS,
  PATIENTS,
  SHIFTS,
  SHIFT_TIME,
  STATIONS,
  floorName,
  isPatientAssignmentEligible,
  stationName,
  stationsOfFloor,
  type Patient,
  type Shift,
} from "@/data/mock";
import { useSession } from "@/state/session";

type Search = { area?: string | undefined; tab?: string | undefined; careGiver?: string | undefined };

export const Route = createFileRoute("/assignments")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    area: typeof s["area"] === "string" ? (s["area"] as string) : undefined,
    tab: typeof s["tab"] === "string" ? (s["tab"] as string) : undefined,
    careGiver: typeof s["careGiver"] === "string" ? (s["careGiver"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Assignments — Patient & Workforce Assignment" },
      {
        name: "description",
        content:
          "Assign patients to eligible mapped nurses, or assign care givers floor-wise or nursing station-wise across the workforce.",
      },
      { property: "og:title", content: "Assignments — Patient & Workforce Assignment" },
      { property: "og:description", content: "Split patient and workforce assignment flows." },
    ],
  }),
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const { can } = useSession();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/assignments" });

  if (!can("assignments")) return <NoPermission area="assignment management" />;

  const area = search.area ?? "workforce";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Assignments"
        description="Assign patients to eligible mapped nurses, or assign workforce members to nursing stations and floors."
      />
      <Tabs value={area} onValueChange={(v) => navigate({ search: (p) => ({ ...p, area: v }) })}>
        <TabsList>
          <TabsTrigger value="patient">Patient Assignment</TabsTrigger>
          <TabsTrigger value="workforce">Workforce Assignment</TabsTrigger>
        </TabsList>
        <TabsContent value="patient" className="mt-4">
          <PatientAssignmentTab />
        </TabsContent>
        <TabsContent value="workforce" className="mt-4">
          <WorkforceAssignmentTab tab={search.tab} careGiver={search.careGiver} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PatientAssignmentTab() {
  const { scopeStationIds } = useSession();
  const [q, setQ] = useState("");
  const [stationFilter, setStationFilter] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Record<string, { careGiverId: string; emergencyRoles: string[]; inventoryItems: string[] }>>(
    () =>
      Object.fromEntries(
        PATIENTS.filter((p) => p.careGiverId).map((p) => [
          p.id,
          { careGiverId: p.careGiverId as string, emergencyRoles: p.emergencyRoles ?? [], inventoryItems: p.inventoryItems ?? [] },
        ]),
      ),
  );
  const [target, setTarget] = useState<Patient | null>(null);
  const [nurseId, setNurseId] = useState("");
  const [emergencyRoles, setEmergencyRoles] = useState<string[]>([]);
  const [inventoryItems, setInventoryItems] = useState<string[]>([]);

  const scopedPatients = useMemo(() => PATIENTS.filter((p) => scopeStationIds.includes(p.stationId)), [scopeStationIds]);
  const filtered = scopedPatients.filter((p) => {
    const text = `${p.name} ${p.bed}`.toLowerCase();
    return text.includes(q.toLowerCase()) && (stationFilter.length === 0 || stationFilter.includes(p.stationId));
  });

  const eligibleNurses = useMemo(
    () => CARE_GIVERS.filter((c) => isPatientAssignmentEligible(c, scopeStationIds)),
    [scopeStationIds],
  );
  const eligibleForTarget = useMemo(
    () => (target ? CARE_GIVERS.filter((c) => isPatientAssignmentEligible(c, scopeStationIds, target.stationId)) : []),
    [target, scopeStationIds],
  );

  const assignedCount = filtered.filter((p) => assignments[p.id]).length;

  const openDialog = (patient: Patient) => {
    const existing = assignments[patient.id];
    setTarget(patient);
    setNurseId(existing?.careGiverId ?? "");
    setEmergencyRoles(existing?.emergencyRoles ?? []);
    setInventoryItems(existing?.inventoryItems ?? []);
  };
  const closeDialog = () => {
    setTarget(null);
    setNurseId("");
    setEmergencyRoles([]);
    setInventoryItems([]);
  };
  const confirmAssign = () => {
    if (!target || !nurseId) return;
    setAssignments((prev) => ({ ...prev, [target.id]: { careGiverId: nurseId, emergencyRoles, inventoryItems } }));
    const nurse = CARE_GIVERS.find((c) => c.id === nurseId);
    toast.success(`${nurse?.name} assigned to ${target.name} (Bed ${target.bed})`);
    closeDialog();
  };
  const unassign = (patient: Patient) => {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[patient.id];
      return next;
    });
    toast.info(`${patient.name} unassigned`);
  };

  return (
    <div className="space-y-4">
      <ScopeNote text="Only nurses with a configured nurse-patient mapping, active status, a roster shift and station scope match appear as candidates — Coordinator, Clinical Pharmacist, Clinical Admin, IP Manager and Floor Manager are never eligible for patient assignment." />

      {eligibleNurses.length === 0 ? (
        <EmptyState
          title="No eligible nurses in scope right now"
          description="Check that nurses have nurse-patient mapping configured, are Active, and have a roster shift set before assigning patients."
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <SearchBox value={q} onChange={setQ} placeholder="Search patient, bed…" />
          <MultiSelect
            label="Nursing Station"
            options={Array.from(new Set(scopedPatients.map((p) => p.stationId))).map((id) => ({ value: id, label: stationName(id) }))}
            selected={stationFilter}
            onChange={setStationFilter}
          />
        </div>
        <p className="text-sm text-muted-foreground">{assignedCount} of {filtered.length} patients assigned</p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No patients match the selected filters" />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Bed</TableHead>
                  <TableHead>Nursing Station</TableHead>
                  <TableHead>Assigned Nurse</TableHead>
                  <TableHead>Emergency Codes</TableHead>
                  <TableHead>Inventory</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const record = assignments[p.id];
                  const nurse = record ? CARE_GIVERS.find((c) => c.id === record.careGiverId) : undefined;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="num">{p.bed}</TableCell>
                      <TableCell>{stationName(p.stationId)}</TableCell>
                      <TableCell>
                        {nurse ? <StatusPill value={`${nurse.name} — ${nurse.shift}`} /> : <StatusPill value="Unassigned" />}
                      </TableCell>
                      <TableCell>
                        {record && record.emergencyRoles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {record.emergencyRoles.map((r) => (
                              <StatusPill key={r} value={EMERGENCY_CODES.find((o) => o.value === r)?.label ?? r} />
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record && record.inventoryItems.length > 0 ? (
                          <span className="text-xs" title={record.inventoryItems.join(", ")}>
                            {record.inventoryItems.length} item(s)
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant={nurse ? "outline" : "default"} onClick={() => openDialog(p)}>
                            {nurse ? "Reassign" : "Assign"}
                          </Button>
                          {nurse ? (
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => unassign(p)}>
                              Unassign
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={Boolean(target)} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign patient to nurse</DialogTitle>
            <DialogDescription>
              {target?.name} — Bed {target?.bed} — {target ? stationName(target.stationId) : ""}
            </DialogDescription>
          </DialogHeader>
          {eligibleForTarget.length === 0 ? (
            <EmptyState title="No eligible nurse is mapped to this nursing station" />
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Eligible Nurse</Label>
                <Select value={nurseId} onValueChange={setNurseId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {eligibleForTarget.map((nurse) => (
                      <SelectItem key={nurse.id} value={nurse.id}>
                        {nurse.name} — {nurse.shift} ({SHIFT_TIME[nurse.shift]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Emergency Codes</Label>
                <MultiSelect
                  label="Emergency Codes"
                  options={EMERGENCY_CODES.map((o) => ({ value: o.value, label: o.label }))}
                  selected={emergencyRoles}
                  onChange={setEmergencyRoles}
                  className="w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Inventory Items</Label>
                <MultiSelect
                  label="Inventory Items"
                  options={INVENTORY_ITEMS.map((i) => ({ value: i, label: i }))}
                  selected={inventoryItems}
                  onChange={setInventoryItems}
                  className="w-full"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button disabled={!nurseId} onClick={confirmAssign}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkforceAssignmentTab({ tab, careGiver }: { tab?: string | undefined; careGiver?: string | undefined }) {
  const navigate = useNavigate({ from: "/assignments" });
  const value = tab ?? "new";

  return (
    <Tabs value={value} onValueChange={(v) => navigate({ search: (p) => ({ ...p, tab: v, careGiver: v === "new" ? p.careGiver : undefined }) })}>
      <TabsList className="flex-wrap">
        <TabsTrigger value="new">New Assignment</TabsTrigger>
        <TabsTrigger value="coordinator">Coordinator Mapping</TabsTrigger>
        <TabsTrigger value="unassigned">Unassigned Coordinators</TabsTrigger>
        <TabsTrigger value="clinical-admin">Clinical Admin</TabsTrigger>
        <TabsTrigger value="pharmacist">Clinical Pharmacist</TabsTrigger>
      </TabsList>
      <TabsContent value="new" className="mt-4"><AssignmentForm preselect={careGiver} /></TabsContent>
      <TabsContent value="coordinator" className="mt-4"><CoordinatorMapping /></TabsContent>
      <TabsContent value="unassigned" className="mt-4"><UnassignedCoordinators /></TabsContent>
      <TabsContent value="clinical-admin" className="mt-4"><RoleMapping role="Clinical Admin" /></TabsContent>
      <TabsContent value="pharmacist" className="mt-4"><PharmacistMapping /></TabsContent>
    </Tabs>
  );
}

function AssignmentForm({ preselect }: { preselect?: string | undefined }) {
  const { scopeStationIds, scopeFloorIds, role } = useSession();
  const assignable = CARE_GIVERS.filter((c) => c.role !== "Nurse Manager");
  const [cgId, setCgId] = useState(preselect ?? assignable[0]!.id);
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
