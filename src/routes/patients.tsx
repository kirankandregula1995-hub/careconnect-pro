import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  EmptyState,
  MultiSelect,
  NoPermission,
  PageHeader,
  ScopeNote,
  SearchBox,
  StatusPill,
} from "@/components/workforce/primitives";
import { CARE_GIVERS, PATIENTS, SHIFTS, STATIONS, stationName } from "@/data/mock";
import { useSession } from "@/state/session";

export const Route = createFileRoute("/patients")({
  head: () => ({
    meta: [
      { title: "Patient Assignment — Nurse to Patient Mapping" },
      { name: "description", content: "Assign patients to nurses by bed, MRN, nursing station and shift. Applicable roles only." },
      { property: "og:title", content: "Patient Assignment — Nurse to Patient Mapping" },
      { property: "og:description", content: "Patient to care giver mapping for applicable roles." },
    ],
  }),
  component: PatientsPage,
});

function PatientsPage() {
  const { can, scopeStationIds } = useSession();
  const [q, setQ] = useState("");
  const [stations, setStations] = useState<string[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);

  if (!can("patients")) return <NoPermission area="patient assignment" />;

  const rows = PATIENTS.filter(
    (p) =>
      scopeStationIds.includes(p.stationId) &&
      `${p.name} ${p.mrn} ${p.bed}`.toLowerCase().includes(q.toLowerCase()) &&
      (stations.length === 0 || stations.includes(p.stationId)) &&
      (shifts.length === 0 || shifts.includes(p.shift)),
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Patient Assignment" description="Patient to care giver mapping for applicable roles such as Nurse." />
      <ScopeNote text="Clinical Admin, Coordinator and Clinical Pharmacist roles are not required to hold patient assignments — they operate at station and floor level." />
      <div className="flex flex-wrap gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search patient, MRN, bed…" />
        <MultiSelect label="Station" options={STATIONS.filter((s) => scopeStationIds.includes(s.id)).map((s) => ({ value: s.id, label: s.name }))} selected={stations} onChange={setStations} />
        <MultiSelect label="Shift" options={SHIFTS.map((s) => ({ value: s, label: s }))} selected={shifts} onChange={setShifts} />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No patients in scope" description="No patients match the selected filters for your nursing stations." />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>MRN</TableHead>
                  <TableHead>Bed</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Care Giver</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => {
                  const cg = CARE_GIVERS.find((c) => c.id === p.careGiverId);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium whitespace-nowrap">{p.name}</TableCell>
                      <TableCell className="num">{p.mrn}</TableCell>
                      <TableCell className="num">{p.bed}</TableCell>
                      <TableCell>{stationName(p.stationId)}</TableCell>
                      <TableCell className="whitespace-nowrap">{cg?.name ?? "—"}</TableCell>
                      <TableCell>{cg?.role ?? "—"}</TableCell>
                      <TableCell>{p.shift}</TableCell>
                      <TableCell><StatusPill value={cg ? p.status : "Unassigned"} /></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant={cg ? "ghost" : "outline"} onClick={() => toast.success(`${p.name} assignment updated`)}>
                          {cg ? "Reassign" : "Assign Nurse"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
