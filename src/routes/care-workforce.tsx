import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpDown, Download, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CountBadge,
  EmptyState,
  MultiSelect,
  NoPermission,
  PageHeader,
  SearchBox,
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
  coverageFor,
  floorName,
  stationName,
  type CareGiver,
} from "@/data/mock";
import { useSession } from "@/state/session";

export const Route = createFileRoute("/care-workforce")({
  head: () => ({
    meta: [
      { title: "Care Workforce — Care Givers, Assignments & Coverage" },
      {
        name: "description",
        content:
          "Search, filter and manage hospital care givers by role, responsibility, floor, nursing station and shift.",
      },
      { property: "og:title", content: "Care Workforce — Care Givers, Assignments & Coverage" },
      { property: "og:description", content: "Manage hospital care givers by role, station and shift." },
    ],
  }),
  component: CareWorkforcePage,
});

const PAGE_SIZE = 10;

function CareWorkforcePage() {
  const { can, scopeStationIds, scopeFloorIds, role } = useSession();
  const [q, setQ] = useState("");
  const [floors, setFloors] = useState<string[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [resps, setResps] = useState<string[]>([]);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);

  if (!can("care-workforce")) return <NoPermission area="the Care Workforce module" />;

  const scoped = CARE_GIVERS.filter(
    (c) =>
      role === "Nurse Manager" ||
      c.stationIds.length === 0 ||
      c.stationIds.some((s) => scopeStationIds.includes(s)),
  );

  const filtered = useMemo(() => {
    const list = scoped.filter((c) => {
      const text = `${c.name} ${c.empId} ${c.role} ${c.responsibility}`.toLowerCase();
      return (
        text.includes(q.toLowerCase()) &&
        (floors.length === 0 || c.floorIds.some((f) => floors.includes(f))) &&
        (stations.length === 0 || c.stationIds.some((s) => stations.includes(s))) &&
        (shifts.length === 0 || shifts.includes(c.shift)) &&
        (roles.length === 0 || roles.includes(c.role)) &&
        (resps.length === 0 || resps.includes(c.responsibility))
      );
    });
    return list.sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
  }, [scoped, q, floors, stations, shifts, roles, resps, sortAsc]);

  const assigned = filtered.filter((c) => c.stationIds.length > 0);
  const unassigned = filtered.filter((c) => c.stationIds.length === 0);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const scopedStations = STATIONS.filter((s) => scopeStationIds.includes(s.id));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Care Workforce"
        description="Care givers, their responsibilities, station mapping, shifts and coverage."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => toast.success("Export queued — Care Workforce.xlsx")}>
              <Download className="size-4" /> Export
            </Button>
            {can("assignments") ? (
              <Button asChild size="sm">
                <Link to="/assignments" search={{ tab: "new" }}>
                  <UserPlus className="size-4" /> Assign Care Giver
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name, employee ID…" />
        <MultiSelect
          label="Floor"
          options={FLOORS.filter((f) => scopeFloorIds.includes(f.id)).map((f) => ({ value: f.id, label: f.name }))}
          selected={floors}
          onChange={setFloors}
        />
        <MultiSelect label="Station" options={scopedStations.map((s) => ({ value: s.id, label: s.name }))} selected={stations} onChange={setStations} />
        <MultiSelect label="Shift" options={SHIFTS.map((s) => ({ value: s, label: s }))} selected={shifts} onChange={setShifts} />
        <MultiSelect label="Role" options={ROLES.map((r) => ({ value: r, label: r }))} selected={roles} onChange={setRoles} />
        <MultiSelect label="Responsibility" options={RESPONSIBILITIES.map((r) => ({ value: r, label: r }))} selected={resps} onChange={setResps} />
      </div>

      <Tabs defaultValue="all">
        <TabsList className="flex-wrap">
          <TabsTrigger value="all" className="gap-1.5">Care Givers <CountBadge n={filtered.length} /></TabsTrigger>
          <TabsTrigger value="assignments" className="gap-1.5">Assignments <CountBadge n={assigned.length} /></TabsTrigger>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          <TabsTrigger value="unassigned" className="gap-1.5">Unassigned <CountBadge n={unassigned.length} /></TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {pageItems.length === 0 ? (
            <EmptyState title="No care givers match your filters" description="Try clearing one or more filters." />
          ) : (
            <>
              <PeopleTable people={pageItems} onSort={() => setSortAsc((v) => !v)} />
              <div className="mt-3 flex items-center justify-between text-sm">
                <p className="text-muted-foreground">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Care Giver</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assignment Type</TableHead>
                    <TableHead>Floor</TableHead>
                    <TableHead>Nursing Stations</TableHead>
                    <TableHead>Shift</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assigned.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.role}</TableCell>
                      <TableCell>{c.stationIds.length > 2 ? "Floor Wise" : "Nursing Station Wise"}</TableCell>
                      <TableCell>{c.floorIds.map(floorName).join(", ")}</TableCell>
                      <TableCell className="max-w-[260px] truncate">{c.stationIds.map(stationName).join(", ")}</TableCell>
                      <TableCell>{c.shift}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="coverage" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scopedStations.map((s) => {
              const cov = coverageFor(s.id);
              const count = CARE_GIVERS.filter((c) => c.stationIds.includes(s.id)).length;
              return (
                <Card key={s.id} className="gap-2 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{s.name}</p>
                    <StatusPill value={cov >= 80 ? "Adequate" : "Low coverage"} />
                  </div>
                  <p className="text-xs text-muted-foreground">{floorName(s.floorId)} · {s.department}</p>
                  <Progress value={cov} className="h-2" />
                  <p className="num text-xs text-muted-foreground">{cov}% · {count} care givers</p>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="unassigned" className="mt-4">
          {unassigned.length === 0 ? (
            <EmptyState title="No unassigned care givers" description="Everyone in your scope has an active nursing station assignment." />
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee Name</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Responsibility</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unassigned.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="num">{c.empId}</TableCell>
                        <TableCell>{c.role}</TableCell>
                        <TableCell>{c.responsibility}</TableCell>
                        <TableCell><StatusPill value="Unassigned" /></TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link to="/assignments" search={{ tab: "new", careGiver: c.id }}>Assign Now</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PeopleTable({ people, onSort }: { people: CareGiver[]; onSort: () => void }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button className="inline-flex items-center gap-1" onClick={onSort}>
                  Employee Name <ArrowUpDown className="size-3.5" />
                </button>
              </TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Responsibility</TableHead>
              <TableHead>Floor</TableHead>
              <TableHead>Nursing Station</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Shift Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium whitespace-nowrap">{c.name}</TableCell>
                <TableCell className="num">{c.empId}</TableCell>
                <TableCell className="whitespace-nowrap">{c.role}</TableCell>
                <TableCell className="whitespace-nowrap">{c.responsibility}</TableCell>
                <TableCell className="whitespace-nowrap">{c.floorIds.map(floorName).join(", ") || "—"}</TableCell>
                <TableCell className="max-w-[200px] truncate">{c.stationIds.map(stationName).join(", ") || "—"}</TableCell>
                <TableCell>{c.shift}</TableCell>
                <TableCell className="num whitespace-nowrap">{SHIFT_TIME[c.shift]}</TableCell>
                <TableCell><StatusPill value={c.stationIds.length ? c.status : "Unassigned"} /></TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/assignments" search={{ tab: "new", careGiver: c.id }}>Manage</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
