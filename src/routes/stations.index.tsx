import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState, MultiSelect, PageHeader, SearchBox, StatusPill } from "@/components/workforce/primitives";
import { CARE_GIVERS, FLOORS, STATIONS, coverageFor, floorById } from "@/data/mock";
import { useSession } from "@/state/session";

export const Route = createFileRoute("/stations/")({
  head: () => ({
    meta: [
      { title: "Station Master — Nursing Stations & Departments" },
      { name: "description", content: "Nursing station master listing hospital, location, floor, station code, department and status." },
      { property: "og:title", content: "Station Master — Nursing Stations" },
      { property: "og:description", content: "Hospital nursing station master with coverage and department detail." },
    ],
  }),
  component: StationsPage,
});

function StationsPage() {
  const { scopeStationIds, scopeFloorIds, role } = useSession();
  const [q, setQ] = useState("");
  const [floors, setFloors] = useState<string[]>([]);

  const list = STATIONS.filter(
    (s) =>
      scopeStationIds.includes(s.id) &&
      (floors.length === 0 || floors.includes(s.floorId)) &&
      `${s.name} ${s.code} ${s.department}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title={role === "Station In-Charge" ? "My Stations" : "Station Master"}
        description="Hospital, location, floor, nursing station, station code, department and status."
      />
      <div className="flex flex-wrap gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search station, code, department…" />
        <MultiSelect
          label="Floor"
          options={FLOORS.filter((f) => scopeFloorIds.includes(f.id)).map((f) => ({ value: f.id, label: f.name }))}
          selected={floors}
          onChange={setFloors}
        />
      </div>

      {list.length === 0 ? (
        <EmptyState title="No nursing station assigned" description="Your account has no nursing station in scope. Contact the Nurse Manager to request access." />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hospital</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Nursing Station</TableHead>
                  <TableHead>Station Code</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Coverage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((s) => {
                  const f = floorById(s.floorId);
                  const cov = coverageFor(s.id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap">{f?.hospital}</TableCell>
                      <TableCell>{f?.location}</TableCell>
                      <TableCell>{f?.name}</TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="num">{s.code}</TableCell>
                      <TableCell className="whitespace-nowrap">{s.department}</TableCell>
                      <TableCell>
                        <div className="flex w-28 items-center gap-2">
                          <Progress value={cov} className="h-1.5" />
                          <span className="num text-xs text-muted-foreground">{cov}%</span>
                        </div>
                      </TableCell>
                      <TableCell><StatusPill value={s.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/stations/$stationId" params={{ stationId: s.id }}>View</Link>
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

      <p className="text-xs text-muted-foreground">
        {CARE_GIVERS.length} care givers mapped across {STATIONS.length} nursing stations in the hospital master.
      </p>
    </div>
  );
}
