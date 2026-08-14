import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, MultiSelect, PageHeader, SearchBox, StatusPill } from "@/components/workforce/primitives";
import { CARE_GIVERS, FLOORS, ROLES, SHIFTS, SHIFT_TIME, STATIONS, floorName, stationName } from "@/data/mock";
import { useSession } from "@/state/session";

export const Route = createFileRoute("/roster")({
  head: () => ({
    meta: [
      { title: "Roster — Shift Coverage by Station" },
      { name: "description", content: "Hospital care giver roster by floor, nursing station, shift and shift time." },
      { property: "og:title", content: "Roster — Shift Coverage by Station" },
      { property: "og:description", content: "Care giver roster by floor, station and shift." },
    ],
  }),
  component: RosterPage,
});

function RosterPage() {
  const { scopeStationIds, scopeFloorIds } = useSession();
  const [q, setQ] = useState("");
  const [floors, setFloors] = useState<string[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);

  const rows = CARE_GIVERS.flatMap((c) =>
    c.stationIds
      .filter((s) => scopeStationIds.includes(s))
      .map((s) => ({ cg: c, stationId: s, floorId: STATIONS.find((x) => x.id === s)!.floorId })),
  ).filter(
    (r) =>
      r.cg.name.toLowerCase().includes(q.toLowerCase()) &&
      (floors.length === 0 || floors.includes(r.floorId)) &&
      (stations.length === 0 || stations.includes(r.stationId)) &&
      (shifts.length === 0 || shifts.includes(r.cg.shift)) &&
      (roles.length === 0 || roles.includes(r.cg.role)),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Roster"
        description="Published roster based on existing hospital shifts — Morning, Evening and Night."
        actions={
          <Button variant="outline" size="sm" onClick={() => toast.success("Roster export queued")}>
            <Download className="size-4" /> Export
          </Button>
        }
      />
      <div className="flex flex-wrap gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search care giver…" />
        <MultiSelect label="Floor" options={FLOORS.filter((f) => scopeFloorIds.includes(f.id)).map((f) => ({ value: f.id, label: f.name }))} selected={floors} onChange={setFloors} />
        <MultiSelect label="Station" options={STATIONS.filter((s) => scopeStationIds.includes(s.id)).map((s) => ({ value: s.id, label: s.name }))} selected={stations} onChange={setStations} />
        <MultiSelect label="Shift" options={SHIFTS.map((s) => ({ value: s, label: s }))} selected={shifts} onChange={setShifts} />
        <MultiSelect label="Role" options={ROLES.map((r) => ({ value: r, label: r }))} selected={roles} onChange={setRoles} />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No roster entries" description="No care givers match the selected filters within your scope." />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Care Giver</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Shift Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium whitespace-nowrap">{r.cg.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.cg.role}</TableCell>
                    <TableCell>{floorName(r.floorId)}</TableCell>
                    <TableCell>{stationName(r.stationId)}</TableCell>
                    <TableCell>{r.cg.shift}</TableCell>
                    <TableCell className="num whitespace-nowrap">{SHIFT_TIME[r.cg.shift]}</TableCell>
                    <TableCell><StatusPill value={r.cg.status} /></TableCell>
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
