import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  EmptyState,
  FilterBar,
  MultiSelect,
  NoPermission,
  PageHeader,
  SectionCard,
  StatCard,
  StatusPill,
} from "@/components/workforce/primitives";
import { CARE_GIVERS, FLOORS, PATIENTS, SHIFTS, STATIONS, floorName, stationName } from "@/data/mock";
import { BUILDINGS } from "@/data/config";
import { useSession } from "@/state/session";

export const Route = createFileRoute("/patient-dashboard")({
  head: () => ({
    meta: [
      { title: "Patient Dashboard — Assignment & Care Giver Coverage" },
      {
        name: "description",
        content: "Patient assignment overview by nursing station, floor and shift with care giver coverage and unassigned patients.",
      },
      { property: "og:title", content: "Patient Dashboard — Assignment & Coverage" },
      { property: "og:description", content: "Patient assignment coverage by station, floor and shift." },
    ],
  }),
  component: PatientDashboard,
});

function PatientDashboard() {
  const { can, scopeStationIds, scopeFloorIds, scopeBuildingIds } = useSession();
  const [buildings, setBuildings] = useState<string[]>([]);
  const [floors, setFloors] = useState<string[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);

  if (!can("patient-dashboard")) return <NoPermission area="patient information" />;

  const visibleStations = STATIONS.filter(
    (s) =>
      scopeStationIds.includes(s.id) &&
      (buildings.length === 0 || BUILDINGS.some((b) => buildings.includes(b.id) && b.floorIds.includes(s.floorId))) &&
      (floors.length === 0 || floors.includes(s.floorId)) &&
      (stations.length === 0 || stations.includes(s.id)),
  );
  const ids = visibleStations.map((s) => s.id);

  const patients = PATIENTS.filter((p) => ids.includes(p.stationId) && (shifts.length === 0 || shifts.includes(p.shift)));
  const assigned = patients.filter((p) => p.careGiverId);
  const unassigned = patients.filter((p) => !p.careGiverId);

  const byStation = visibleStations.map((s) => ({
    name: s.name.replace("Ward ", "W"),
    assigned: patients.filter((p) => p.stationId === s.id && p.careGiverId).length,
    unassigned: patients.filter((p) => p.stationId === s.id && !p.careGiverId).length,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Patient Dashboard"
        description="Inpatient assignment coverage across your authorised nursing stations."
        actions={
          <Button asChild size="sm"><Link to="/patient-assignment">Open Patient Assignment</Link></Button>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Patients" value={patients.length} />
        <StatCard label="Assigned" value={assigned.length} tone="success" />
        <StatCard label="Unassigned" value={unassigned.length} tone="warning" />
        <StatCard label="Stations" value={visibleStations.length} />
        <StatCard
          label="Care Giver Coverage"
          value={patients.length ? `${Math.round((assigned.length / patients.length) * 100)}%` : "0%"}
          tone={assigned.length === patients.length ? "success" : "warning"}
        />
        <StatCard label="Nurses in Scope" value={CARE_GIVERS.filter((c) => c.role === "Nurse" && c.stationIds.some((s) => ids.includes(s))).length} />
      </div>

      <FilterBar>
        <MultiSelect label="Building" options={BUILDINGS.filter((b) => scopeBuildingIds.includes(b.id)).map((b) => ({ value: b.id, label: b.name }))} selected={buildings} onChange={setBuildings} />
        <MultiSelect label="Floor" options={FLOORS.filter((f) => scopeFloorIds.includes(f.id)).map((f) => ({ value: f.id, label: f.name }))} selected={floors} onChange={setFloors} />
        <MultiSelect label="Station" options={STATIONS.filter((s) => scopeStationIds.includes(s.id)).map((s) => ({ value: s.id, label: s.name }))} selected={stations} onChange={setStations} />
        <MultiSelect label="Shift" options={SHIFTS.map((s) => ({ value: s, label: s }))} selected={shifts} onChange={setShifts} />
      </FilterBar>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Patients by Station" description="Assigned versus unassigned inpatients">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStation}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={28} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="assigned" stackId="a" fill="var(--chart-1)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="unassigned" stackId="a" fill="var(--chart-5)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Coverage by Shift" description="Share of patients with an assigned care giver">
          <div className="space-y-3">
            {SHIFTS.map((s) => {
              const list = patients.filter((p) => p.shift === s);
              const pct = list.length ? Math.round((list.filter((p) => p.careGiverId).length / list.length) * 100) : 0;
              return (
                <div key={s}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{s}</span>
                    <span className="num text-muted-foreground">{pct}% of {list.length}</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Coverage by Floor" description="Patients per floor in scope">
          <div className="space-y-2">
            {FLOORS.filter((f) => scopeFloorIds.includes(f.id)).map((f) => {
              const list = patients.filter((p) => STATIONS.find((s) => s.id === p.stationId)?.floorId === f.id);
              return (
                <div key={f.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span>{f.name}</span>
                  <span className="num text-muted-foreground">
                    {list.filter((p) => p.careGiverId).length}/{list.length} assigned
                  </span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Inpatients" description="Patient, bed, station, care giver and shift">
        {patients.length === 0 ? (
          <EmptyState title="No patients in scope" description="No inpatients match the selected filters." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>MRN</TableHead>
                  <TableHead>Bed</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Care Giver</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((p) => {
                  const cg = CARE_GIVERS.find((c) => c.id === p.careGiverId);
                  const st = STATIONS.find((s) => s.id === p.stationId)!;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium whitespace-nowrap">{p.name}</TableCell>
                      <TableCell className="num">{p.mrn}</TableCell>
                      <TableCell className="num">{p.bed}</TableCell>
                      <TableCell>{floorName(st.floorId)}</TableCell>
                      <TableCell>{stationName(p.stationId)}</TableCell>
                      <TableCell className="whitespace-nowrap">{cg?.name ?? "—"}</TableCell>
                      <TableCell>{p.shift}</TableCell>
                      <TableCell><StatusPill value={cg ? p.status : "Unassigned"} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
