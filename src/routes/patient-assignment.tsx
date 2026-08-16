import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { CARE_GIVERS, PATIENTS, STATIONS, floorName, stationName } from "@/data/mock";
import { evaluateEligibility, isRosteredToday } from "@/data/config";
import { useSession } from "@/state/session";

export const Route = createFileRoute("/patient-assignment")({
  head: () => ({
    meta: [
      { title: "Patient Assignment — Nurse to Patient Mapping" },
      {
        name: "description",
        content: "Map inpatients to eligible nurses with capability, station scope and roster checks, and route multi-nurse requests for approval.",
      },
      { property: "og:title", content: "Patient Assignment — Nurse to Patient Mapping" },
      { property: "og:description", content: "Eligibility-checked nurse to patient assignment." },
    ],
  }),
  component: PatientAssignmentPage,
});

const VIEWS = [
  { value: "assign", label: "Assign" },
  { value: "current", label: "Current Mapping" },
  { value: "unassigned", label: "Unassigned" },
] as const;
type View = (typeof VIEWS)[number]["value"];

function PatientAssignmentPage() {
  const { can, hasCap, scopeStationIds, scopeLabel } = useSession();
  const [view, setView] = useState<View>("assign");
  const [stationId, setStationId] = useState(scopeStationIds[0] ?? STATIONS[0]!.id);
  const [patientId, setPatientId] = useState<string>("");
  const [nurseId, setNurseId] = useState<string>("");

  if (!can("patient-assignment")) return <NoPermission area="patient assignment" />;

  const stations = STATIONS.filter((s) => scopeStationIds.includes(s.id));
  const patients = PATIENTS.filter((p) => p.stationId === stationId);
  const patient = PATIENTS.find((p) => p.id === patientId);

  const nurses = CARE_GIVERS.filter(
    (c) =>
      c.status === "Active" &&
      c.nursePatientMappingConfigured &&
      c.stationIds.includes(stationId) &&
      isRosteredToday(c.id),
  );

  const result =
    nurseId && patientId
      ? evaluateEligibility({ careGiverId: nurseId, capability: "Patient Assignment", stationId, patientId })
      : null;
  const alreadyAssigned = Boolean(patient?.careGiverId && patient.careGiverId !== nurseId);

  const scopedPatients = PATIENTS.filter((p) => scopeStationIds.includes(p.stationId));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Patient Assignment"
        description="Only nurses with nurse-patient mapping configured, an active roster and matching station scope can take a patient."
      />
      <ScopeNote text={`Your locality scope: ${scopeLabel}. A second nurse on the same patient requires Station In-Charge approval (EV-P3).`} />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="Patients in Scope" value={scopedPatients.length} />
        <StatCard label="Assigned" value={scopedPatients.filter((p) => p.careGiverId).length} tone="success" />
        <StatCard label="Unassigned" value={scopedPatients.filter((p) => !p.careGiverId).length} tone="warning" />
        <StatCard label="Eligible Nurses Here" value={nurses.length} />
      </div>

      <Segmented options={VIEWS.map((v) => ({ ...v }))} value={view} onChange={setView} />

      {view === "assign" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <SectionCard title="Configuration and selection" description="Station → patient → eligible nurse">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nursing station</Label>
                <Select value={stationId} onValueChange={(v) => { setStationId(v); setPatientId(""); setNurseId(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} · {floorName(s.floorId)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Patient</Label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger><SelectValue placeholder="Select a patient" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · Bed {p.bed}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Eligible nurses ({nurses.length})</p>
              {nurses.length === 0 ? (
                <EmptyState title="No eligible nurses" description="No rostered nurse with patient-mapping capability is mapped to this station." />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {nurses.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNurseId(c.id)}
                      className={`rounded-md border px-3 py-2 text-left transition-colors ${
                        nurseId === c.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                      }`}
                    >
                      <span className="block text-sm font-medium">{c.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {c.role} · {c.shift} · {PATIENTS.filter((p) => p.careGiverId === c.id).length} patients
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>

          <div className="space-y-3">
            {result ? (
              <>
                <EligibilityPanel checks={result.checks} eligible={result.eligible} />
                {alreadyAssigned ? (
                  <StateBanner
                    tone="warning"
                    title="Patient already has a nurse"
                    description={`${CARE_GIVERS.find((c) => c.id === patient?.careGiverId)?.name} is assigned. Adding a second nurse raises an approval request to the Station In-Charge.`}
                  />
                ) : null}
                <Button
                  className="w-full"
                  disabled={!result.eligible || !hasCap("Patient Assignment")}
                  onClick={() =>
                    toast.success(
                      alreadyAssigned
                        ? "Approval requested — EV-P3 sent to Station In-Charge"
                        : "Patient assigned — EV-P1 sent to nurse and Station In-Charge",
                    )
                  }
                >
                  {alreadyAssigned ? "Request Multi-Nurse Approval" : "Confirm Patient Assignment"}
                </Button>
              </>
            ) : (
              <SectionCard title="Eligibility" description="Select a patient and nurse to run the rules">
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li>Active employment status</li>
                  <li>Capability: Patient Assignment</li>
                  <li>Nurse-patient mapping configured</li>
                  <li>Patient belongs to the station</li>
                  <li>Roster availability</li>
                </ul>
              </SectionCard>
            )}
          </div>
        </div>
      ) : null}

      {view !== "assign" ? (
        <SectionCard
          title={view === "current" ? "Current patient mapping" : "Unassigned patients"}
          description={view === "current" ? "Patients with an assigned care giver in your scope" : "Patients waiting for a nurse"}
        >
          {(() => {
            const rows = scopedPatients.filter((p) => (view === "current" ? p.careGiverId : !p.careGiverId));
            if (rows.length === 0)
              return <EmptyState title="Nothing to show" description="No patients match this view within your scope." />;
            return (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Bed</TableHead>
                      <TableHead>Station</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>{view === "current" ? "Nurse" : "Status"}</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium whitespace-nowrap">{p.name}</TableCell>
                        <TableCell className="num">{p.bed}</TableCell>
                        <TableCell className="whitespace-nowrap">{stationName(p.stationId)}</TableCell>
                        <TableCell>{p.shift}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {view === "current" ? CARE_GIVERS.find((c) => c.id === p.careGiverId)?.name : <StatusPill value="Unassigned" />}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setView("assign"); setStationId(p.stationId); setPatientId(p.id); setNurseId(""); }}
                          >
                            {view === "current" ? "Reassign" : "Assign"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
          })()}
        </SectionCard>
      ) : null}
    </div>
  );
}
