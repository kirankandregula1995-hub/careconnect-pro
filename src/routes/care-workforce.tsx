import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
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
  EmptyState,
  FilterBar,
  KeyValue,
  MultiSelect,
  NoPermission,
  PageHeader,
  SearchBox,
  SectionCard,
  Segmented,
  StatCard,
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
  type CareGiver,
  type RoleName,
} from "@/data/mock";
import { ROLE_CAPABILITIES, ROLE_SCOPE, CAPABILITIES, type Capability } from "@/data/config";
import { useRoster } from "@/state/roster";
import { useSession } from "@/state/session";

const TODAY = new Date().toISOString().slice(0, 10);

export const Route = createFileRoute("/care-workforce")({
  head: () => ({
    meta: [
      { title: "Care Workforce — Workforce Master, Roles & Capabilities" },
      {
        name: "description",
        content:
          "Workforce master with employee ID, department, employment status, role, station assignments and shift coverage.",
      },
      { property: "og:title", content: "Care Workforce — Workforce Master & Capabilities" },
      { property: "og:description", content: "Workforce master with roles, station assignments and shift coverage." },
    ],
  }),
  component: CareWorkforcePage,
});

const VIEWS = [
  { value: "all", label: "All" },
  { value: "assigned", label: "Assigned" },
  { value: "unassigned", label: "Unassigned" },
] as const;
type View = (typeof VIEWS)[number]["value"];

function CareWorkforcePage() {
  const { can, scopeStationIds, scopeFloorIds, scopeLevel, hasCap } = useSession();
  const { entries, week } = useRoster();
  const [view, setView] = useState<View>("all");
  const [q, setQ] = useState("");
  const [floors, setFloors] = useState<string[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);
  const [detail, setDetail] = useState<CareGiver | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [added, setAdded] = useState<CareGiver[]>([]);

  if (!can("care-workforce")) return <NoPermission area="the workforce master" />;

  const all = [...added, ...CARE_GIVERS];
  const scoped = all.filter(
    (c) => (c.stationIds.length === 0 ? scopeLevel === "Hospital" : c.stationIds.some((s) => scopeStationIds.includes(s))),
  );

  const filtered = scoped.filter(
    (c) =>
      `${c.name} ${c.empId} ${c.role}`.toLowerCase().includes(q.toLowerCase()) &&
      (floors.length === 0 || c.floorIds.some((f) => floors.includes(f))) &&
      (stations.length === 0 || c.stationIds.some((s) => stations.includes(s))) &&
      (roles.length === 0 || roles.includes(c.role)) &&
      (shifts.length === 0 || shifts.includes(c.shift)),
  );

  const today = week.includes(TODAY) ? TODAY : (week[0] ?? TODAY);
  const todaysRoster = entries.filter((e) => e.date === today && e.status === "Scheduled" && scopeStationIds.includes(e.stationId));
  const shiftCoverage = SHIFTS.map((sh) => {
    const forShift = todaysRoster.filter((e) => e.shift === sh);
    return {
      shift: sh,
      stations: new Set(forShift.map((e) => e.stationId)).size,
      people: new Set(forShift.map((e) => e.careGiverId)).size,
    };
  });

  const downloadToday = () => {
    const header = ["Employee", "Employee ID", "Role", "Date", "Shift", "Shift Time", "Floor", "Nursing Station"];
    const lines = todaysRoster.map((e) => {
      const c = all.find((x) => x.id === e.careGiverId);
      const st = STATIONS.find((x) => x.id === e.stationId);
      return [c?.name ?? "—", c?.empId ?? "—", c?.role ?? "—", e.date, e.shift, SHIFT_TIME[e.shift], floorName(st?.floorId ?? ""), st?.name ?? "—"];
    });
    const csv = [header, ...lines].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `todays-workforce-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded today's workforce — ${lines.length} record(s)`);
  };

  const rows =
    view === "assigned" ? filtered.filter((c) => c.stationIds.length) :
    view === "unassigned" ? filtered.filter((c) => !c.stationIds.length) :
    filtered;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Care Workforce"
        description="Workforce master — role is the enterprise title and capabilities are defined per role under Policies & Access."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={downloadToday}>
              <Download className="size-4" /> Download Today's Workforce
            </Button>
            {hasCap("Care Workforce Management") ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Create Workforce</Button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="Workforce in Scope" value={scoped.length} />
        <StatCard label="Active" value={scoped.filter((c) => c.status === "Active").length} tone="success" />
        <StatCard label="Assigned" value={scoped.filter((c) => c.stationIds.length).length} />
        <StatCard label="Unassigned" value={scoped.filter((c) => !c.stationIds.length).length} tone="warning" />
      </div>

      <SectionCard
        title="Shift coverage today"
        description={`Stations covered per shift on ${today} — station assignment is one-time, the roster decides who works which shift.`}
      >
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {shiftCoverage.map((c) => (
            <div key={c.shift} className="rounded-md border border-border px-3 py-2.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {c.shift} · {SHIFT_TIME[c.shift]}
              </p>
              <p className="num mt-1 text-xl font-semibold">{c.stations} stations</p>
              <p className="text-xs text-muted-foreground">{c.people} workforce member(s) rostered</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented options={VIEWS.map((v) => ({ ...v }))} value={view} onChange={setView} />
        <SearchBox value={q} onChange={setQ} placeholder="Search name, employee ID…" />
      </div>

      <>
          <FilterBar>
            <MultiSelect label="Floor" options={FLOORS.filter((f) => scopeFloorIds.includes(f.id)).map((f) => ({ value: f.id, label: f.name }))} selected={floors} onChange={setFloors} />
            <MultiSelect label="Station" options={STATIONS.filter((s) => scopeStationIds.includes(s.id)).map((s) => ({ value: s.id, label: s.name }))} selected={stations} onChange={setStations} />
            <MultiSelect label="Role" options={ROLES.map((r) => ({ value: r, label: r }))} selected={roles} onChange={setRoles} />
            <MultiSelect label="Shift" options={SHIFTS.map((s) => ({ value: s, label: s }))} selected={shifts} onChange={setShifts} />
          </FilterBar>

          {rows.length === 0 ? (
            <EmptyState title="No workforce records" description="No workforce members match the current filters within your scope." />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Stations Assigned</TableHead>
                    <TableHead>Floor</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium whitespace-nowrap">{c.name}</TableCell>
                      <TableCell className="num">{c.empId}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {c.stationIds[0] ? STATIONS.find((s) => s.id === c.stationIds[0])?.department : "Unallocated"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{c.role}</TableCell>
                      <TableCell className="num">{c.stationIds.length}</TableCell>
                      <TableCell className="whitespace-nowrap">{c.floorIds.map(floorName).join(", ") || "—"}</TableCell>
                      <TableCell className="max-w-[180px] truncate">{c.stationIds.map(stationName).join(", ") || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{c.shift}</TableCell>
                      <TableCell><StatusPill value={c.stationIds.length ? c.status : "Unassigned"} /></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setDetail(c)}>View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
      </>

      <Sheet open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {detail ? (
            <>
              <SheetHeader>
                <SheetTitle>{detail.name}</SheetTitle>
                <SheetDescription>{detail.role} · {detail.stationIds.length} station(s) assigned</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-6">
                <div className="rounded-md border border-border p-3">
                  <KeyValue k="Employee ID" v={detail.empId} />
                  <KeyValue k="Employment" v={detail.status} />
                  <KeyValue k="Shift" v={`${detail.shift} · ${SHIFT_TIME[detail.shift]}`} />
                  <KeyValue k="Locality scope" v={ROLE_SCOPE[detail.role]} />
                  <KeyValue k="Email" v={<span className="break-all">{detail.email}</span>} />
                  <KeyValue k="Phone" v={detail.phone} />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assignment scope</p>
                  {detail.stationIds.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No station assignment — this worker is not eligible for station or patient operations yet.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {detail.stationIds.map((s) => (
                        <li key={s} className="rounded-md border border-border px-3 py-2 text-sm">
                          {stationName(s)} <span className="text-muted-foreground">· {floorName(STATIONS.find((x) => x.id === s)!.floorId)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Separator />
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Capabilities from role</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CAPABILITIES.map((cap) => (
                      <span
                        key={cap}
                        className={`rounded-full border px-2 py-0.5 text-xs ${
                          ROLE_CAPABILITIES[detail.role].includes(cap)
                            ? "border-success/30 bg-success/10 text-success"
                            : "border-border bg-muted text-muted-foreground line-through"
                        }`}
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <CreateWorkforceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={(c) => setAdded((prev) => [c, ...prev])}
      />
    </div>
  );
}

function CreateWorkforceDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (c: CareGiver) => void;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [empId, setEmpId] = useState("EMP-1041");
  const [department, setDepartment] = useState("General Medicine");
  const [role, setRole] = useState<RoleName>("Nurse");
  const [caps, setCaps] = useState<Capability[]>(ROLE_CAPABILITIES["Nurse"]);

  const steps = ["Details", "Role", "Capabilities"];

  const reset = () => { setStep(1); setName(""); };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create workforce member</DialogTitle>
          <DialogDescription>Configuration comes first — the role decides capabilities and eligibility.</DialogDescription>
        </DialogHeader>

        <ol className="flex items-center gap-1 text-xs">
          {steps.map((s, i) => (
            <li key={s} className={`flex flex-1 items-center gap-1.5 rounded-md px-2 py-1 ${step === i + 1 ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground"}`}>
              <span className="num">{i + 1}</span> {s}
            </li>
          ))}
        </ol>

        <div className="space-y-3">
          {step === 1 ? (
            <>
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aparna Rao" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Employee ID</Label>
                  <Input value={empId} onChange={(e) => setEmpId(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
                </div>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <div className="space-y-1.5">
              <Label>Role (enterprise source)</Label>
              <Select value={role} onValueChange={(v) => { setRole(v as RoleName); setCaps(ROLE_CAPABILITIES[v as RoleName]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Locality scope for this role: {ROLE_SCOPE[role]}</p>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-2">
              <Label>Capabilities</Label>
              {CAPABILITIES.map((c) => (
                <div key={c} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="text-sm">{c}</span>
                  <Switch
                    checked={caps.includes(c)}
                    onCheckedChange={(v) => setCaps((p) => (v ? [...p, c] : p.filter((x) => x !== c)))}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          {step > 1 ? <Button variant="outline" onClick={() => setStep((s) => s - 1)}>Back</Button> : null}
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={step === 1 && !name.trim()}>Next</Button>
          ) : (
            <Button
              onClick={() => {
                onCreate({
                  id: `NEW-${empId}`,
                  empId,
                  name: name || "New Worker",
                  role,
                  shift: "Morning",
                  stationIds: [],
                  floorIds: [],
                  status: "Active",
                  nursePatientMappingConfigured: role === "Nurse" || role === "Station In-Charge",
                  phone: "+91 98000 00000",
                  email: `${empId.toLowerCase()}@sunrisehospital.org`,
                });
                toast.success(`${name || "Workforce member"} created — event EV-W1 fired to Nurse Manager`);
                onOpenChange(false);
                reset();
              }}
            >
              Save
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
