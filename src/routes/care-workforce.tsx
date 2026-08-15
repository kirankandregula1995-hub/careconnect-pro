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
  Segmented,
  StatCard,
  StatusPill,
} from "@/components/workforce/primitives";
import {
  CARE_GIVERS,
  FLOORS,
  RESPONSIBILITIES,
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
import { useSession } from "@/state/session";

export const Route = createFileRoute("/care-workforce")({
  head: () => ({
    meta: [
      { title: "Care Workforce — Workforce Master, Roles & Capabilities" },
      {
        name: "description",
        content:
          "Workforce master with employee ID, department, employment status, role, responsibility and capability configuration.",
      },
      { property: "og:title", content: "Care Workforce — Workforce Master & Capabilities" },
      { property: "og:description", content: "Workforce master with role, responsibility and capability configuration." },
    ],
  }),
  component: CareWorkforcePage,
});

const VIEWS = [
  { value: "all", label: "All" },
  { value: "assigned", label: "Assigned" },
  { value: "unassigned", label: "Unassigned" },
  { value: "capabilities", label: "Capabilities" },
] as const;
type View = (typeof VIEWS)[number]["value"];

function CareWorkforcePage() {
  const { can, scopeStationIds, scopeFloorIds, scopeLevel, hasCap } = useSession();
  const [view, setView] = useState<View>("all");
  const [q, setQ] = useState("");
  const [floors, setFloors] = useState<string[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [resps, setResps] = useState<string[]>([]);
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
      `${c.name} ${c.empId} ${c.role} ${c.responsibility}`.toLowerCase().includes(q.toLowerCase()) &&
      (floors.length === 0 || c.floorIds.some((f) => floors.includes(f))) &&
      (stations.length === 0 || c.stationIds.some((s) => stations.includes(s))) &&
      (roles.length === 0 || roles.includes(c.role)) &&
      (resps.length === 0 || resps.includes(c.responsibility)) &&
      (shifts.length === 0 || shifts.includes(c.shift)),
  );

  const rows =
    view === "assigned" ? filtered.filter((c) => c.stationIds.length) :
    view === "unassigned" ? filtered.filter((c) => !c.stationIds.length) :
    filtered;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Care Workforce"
        description="Workforce master — role is the enterprise title, responsibility is the operational function, capabilities drive what each role can do."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => toast.success("Workforce export queued — Workforce-Master.xlsx")}>
              <Download className="size-4" /> Export
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented options={VIEWS.map((v) => ({ ...v }))} value={view} onChange={setView} />
        <SearchBox value={q} onChange={setQ} placeholder="Search name, employee ID…" />
      </div>

      {view !== "capabilities" ? (
        <>
          <FilterBar>
            <MultiSelect label="Floor" options={FLOORS.filter((f) => scopeFloorIds.includes(f.id)).map((f) => ({ value: f.id, label: f.name }))} selected={floors} onChange={setFloors} />
            <MultiSelect label="Station" options={STATIONS.filter((s) => scopeStationIds.includes(s.id)).map((s) => ({ value: s.id, label: s.name }))} selected={stations} onChange={setStations} />
            <MultiSelect label="Role" options={ROLES.map((r) => ({ value: r, label: r }))} selected={roles} onChange={setRoles} />
            <MultiSelect label="Responsibility" options={RESPONSIBILITIES.map((r) => ({ value: r, label: r }))} selected={resps} onChange={setResps} />
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
                    <TableHead>Responsibility</TableHead>
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
                      <TableCell className="whitespace-nowrap">{c.responsibility}</TableCell>
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
      ) : (
        <CapabilityMatrix />
      )}

      <Sheet open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {detail ? (
            <>
              <SheetHeader>
                <SheetTitle>{detail.name}</SheetTitle>
                <SheetDescription>{detail.role} · {detail.responsibility}</SheetDescription>
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

function CapabilityMatrix() {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const key = (r: RoleName, c: Capability) => `${r}|${c}`;
  const enabled = (r: RoleName, c: Capability) => overrides[key(r, c)] ?? ROLE_CAPABILITIES[r].includes(c);

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-card">Role</TableHead>
            {CAPABILITIES.map((c) => (
              <TableHead key={c} className="whitespace-nowrap text-xs">{c}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ROLES.map((r) => (
            <TableRow key={r}>
              <TableCell className="sticky left-0 bg-card font-medium whitespace-nowrap">{r}</TableCell>
              {CAPABILITIES.map((c) => (
                <TableCell key={c}>
                  <Switch
                    checked={enabled(r, c)}
                    onCheckedChange={(v) => {
                      setOverrides((o) => ({ ...o, [key(r, c)]: v }));
                      toast.success(`${c} ${v ? "enabled" : "disabled"} for ${r}`);
                    }}
                    aria-label={`${c} for ${r}`}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
  const [responsibility, setResponsibility] = useState<string>("Bedside Nursing");
  const [caps, setCaps] = useState<Capability[]>(ROLE_CAPABILITIES["Nurse"]);

  const steps = ["Details", "Role", "Responsibility", "Capabilities"];

  const reset = () => { setStep(1); setName(""); };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create workforce member</DialogTitle>
          <DialogDescription>Configuration comes first — role and responsibility decide capabilities and eligibility.</DialogDescription>
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
            <div className="space-y-1.5">
              <Label>Responsibility (operational function)</Label>
              <Select value={responsibility} onValueChange={setResponsibility}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RESPONSIBILITIES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ) : null}

          {step === 4 ? (
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
          {step < 4 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={step === 1 && !name.trim()}>Next</Button>
          ) : (
            <Button
              onClick={() => {
                onCreate({
                  id: `NEW-${empId}`,
                  empId,
                  name: name || "New Worker",
                  role,
                  responsibility: responsibility as CareGiver["responsibility"],
                  shift: "Morning",
                  stationIds: [],
                  floorIds: [],
                  status: "Active",
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
