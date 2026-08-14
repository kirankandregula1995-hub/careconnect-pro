import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Bell, Building2, CheckCircle2, ClipboardList, Stethoscope, UserMinus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  EmptyState,
  MultiSelect,
  PageHeader,
  ScopeNote,
  StatCard,
  StatusPill,
} from "@/components/workforce/primitives";
import {
  APPROVALS,
  CARE_GIVERS,
  FLOORS,
  PATIENTS,
  RESPONSIBILITIES,
  ROLES,
  SHIFTS,
  STATIONS,
  TASKS,
  coverageFor,
  floorName,
  isPatientAssignmentEligible,
  stationName,
} from "@/data/mock";
import { useSession } from "@/state/session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Care Workforce Platform" },
      {
        name: "description",
        content:
          "Role-aware hospital care workforce dashboard split into Workforce and Patient operational views.",
      },
      { property: "og:title", content: "Dashboard — Care Workforce Platform" },
      {
        property: "og:description",
        content: "Workforce coverage and nurse-patient assignment status in one dashboard.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useSession();
  const [tab, setTab] = useState("workforce");

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Good morning, ${user.name.split(" ")[0]}`}
        description="Workforce operations and nurse-patient operations, kept as two separate views."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="workforce">Workforce Dashboard</TabsTrigger>
          <TabsTrigger value="patient">Patient Dashboard</TabsTrigger>
        </TabsList>
        <TabsContent value="workforce" className="mt-4">
          <WorkforceDashboardTab />
        </TabsContent>
        <TabsContent value="patient" className="mt-4">
          <PatientDashboardTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WorkforceDashboardTab() {
  const { user, role, scopeStationIds, scopeFloorIds, unreadCount, can } = useSession();
  const [floors, setFloors] = useState<string[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [resps, setResps] = useState<string[]>([]);

  const scopedStations = STATIONS.filter((s) => scopeStationIds.includes(s.id));
  const visibleStations = scopedStations.filter(
    (s) => (floors.length === 0 || floors.includes(s.floorId)) && (stations.length === 0 || stations.includes(s.id)),
  );
  const visibleStationIds = visibleStations.map((s) => s.id);

  const people = useMemo(
    () =>
      CARE_GIVERS.filter((c) => {
        const inScope =
          role === "Nurse Manager" ||
          c.stationIds.some((s) => scopeStationIds.includes(s)) ||
          c.stationIds.length === 0;
        const stationMatch =
          c.stationIds.length === 0 ? true : c.stationIds.some((s) => visibleStationIds.includes(s));
        return (
          inScope &&
          stationMatch &&
          (shifts.length === 0 || shifts.includes(c.shift)) &&
          (roles.length === 0 || roles.includes(c.role)) &&
          (resps.length === 0 || resps.includes(c.responsibility))
        );
      }),
    [role, scopeStationIds, visibleStationIds, shifts, roles, resps],
  );

  const assigned = people.filter((p) => p.stationIds.length > 0);
  const unassigned = people.filter((p) => p.stationIds.length === 0);
  const scopedTasks = TASKS.filter((t) => visibleStationIds.includes(t.stationId));
  const openTasks = scopedTasks.filter((t) => t.status === "Open" || t.status === "In Progress");
  const overdue = scopedTasks.filter((t) => t.status === "Overdue" || t.status === "Escalated");
  const approvals = APPROVALS.filter((a) => a.status === "Pending" && visibleStationIds.includes(a.stationId));
  const avgCoverage = visibleStations.length
    ? Math.round(visibleStations.reduce((a, s) => a + coverageFor(s.id), 0) / visibleStations.length)
    : 0;

  const distribution = ROLES.map((r) => ({
    name: r,
    value: people.filter((p) => p.role === r).length,
  })).filter((d) => d.value > 0);

  const coverageByStation = visibleStations.slice(0, 8).map((s) => ({
    name: s.name.replace("Ward ", "W"),
    coverage: coverageFor(s.id),
  }));

  const shiftCoverage = SHIFTS.map((sh) => ({
    name: sh,
    coverage: visibleStations.length
      ? Math.round(visibleStations.reduce((a, s) => a + coverageFor(s.id, sh), 0) / visibleStations.length)
      : 0,
  }));

  const chartColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

  return (
    <div className="space-y-5">
      <PageHeader
        title=""
        description={`${role} · ${user.responsibility} — showing data within your authorised scope.`}
        actions={
          <>
            {can("assignments") ? (
              <Button asChild size="sm">
                <Link to="/assignments" search={{ area: "workforce", tab: "new" }}>
                  Assign Care Giver
                </Link>
              </Button>
            ) : null}
            {can("assignments") ? (
              <Button asChild size="sm" variant="outline">
                <Link to="/assignments" search={{ area: "workforce", tab: "coordinator" }}>
                  Coordinator Mapping
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <ScopeNote
        text={
          role === "Nurse Manager"
            ? `Organisation-wide scope: ${FLOORS.length} floors, ${STATIONS.length} nursing stations, ${CARE_GIVERS.length} care givers.`
            : `Scoped view: ${scopeFloorIds.map(floorName).join(", ") || "no floor"} — ${
                scopeStationIds.map(stationName).join(", ") || "no nursing station assigned"
              }.`
        }
      />

      <div className="flex flex-wrap gap-2">
        <MultiSelect
          label="Floor"
          options={FLOORS.filter((f) => scopeFloorIds.includes(f.id)).map((f) => ({ value: f.id, label: f.name }))}
          selected={floors}
          onChange={setFloors}
        />
        <MultiSelect
          label="Station"
          options={scopedStations.map((s) => ({ value: s.id, label: s.name }))}
          selected={stations}
          onChange={setStations}
        />
        <MultiSelect
          label="Shift"
          options={SHIFTS.map((s) => ({ value: s, label: s }))}
          selected={shifts}
          onChange={setShifts}
        />
        <MultiSelect label="Role" options={ROLES.map((r) => ({ value: r, label: r }))} selected={roles} onChange={setRoles} />
        <MultiSelect
          label="Responsibility"
          options={RESPONSIBILITIES.map((r) => ({ value: r, label: r }))}
          selected={resps}
          onChange={setResps}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard label="Total Care Givers" value={people.length} icon={<Users className="size-4" />} />
        <StatCard label="Assigned" value={assigned.length} tone="success" icon={<CheckCircle2 className="size-4" />} />
        <StatCard label="Unassigned" value={unassigned.length} tone="warning" icon={<UserMinus className="size-4" />} />
        <StatCard label="Active Stations" value={visibleStations.filter((s) => s.status === "Active").length} icon={<Building2 className="size-4" />} />
        <StatCard label="Station Coverage" value={`${avgCoverage}%`} tone={avgCoverage >= 80 ? "success" : "warning"} />
        <StatCard label="Open Tasks" value={openTasks.length} icon={<ClipboardList className="size-4" />} />
        <StatCard label="Overdue Tasks" value={overdue.length} tone="danger" icon={<AlertTriangle className="size-4" />} />
        <StatCard label="Pending Approvals" value={approvals.length} tone="warning" />
        <StatCard label="Notifications" value={unreadCount} tone="info" icon={<Bell className="size-4" />} hint="Unread" />
        <StatCard label="Shifts Covered" value={`${SHIFTS.length}`} hint="Morning, Evening, Night" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Care Giver Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {distribution.map((_, i) => (
                    <Cell key={i} fill={chartColors[i % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {distribution.map((d, i) => (
                <span key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-2 rounded-full" style={{ background: chartColors[i % chartColors.length] }} />
                  {d.name} ({d.value})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Station Coverage</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coverageByStation}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v}%`, "Coverage"]} />
                <Bar dataKey="coverage" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Shift Coverage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {shiftCoverage.map((s) => (
              <div key={s.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{s.name}</span>
                  <span className="num text-muted-foreground">{s.coverage}%</span>
                </div>
                <Progress value={s.coverage} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">
              {role === "Station In-Charge" ? "My Stations" : "Stations in scope"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {visibleStations.slice(0, 6).map((s) => (
              <Link
                key={s.id}
                to="/stations/$stationId"
                params={{ stationId: s.id }}
                className="rounded-md border border-border p-3 transition-colors hover:bg-accent/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{s.name}</p>
                  <StatusPill value={s.status} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {floorName(s.floorId)} · {s.department}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={coverageFor(s.id)} className="h-1.5" />
                  <span className="num text-xs text-muted-foreground">{coverageFor(s.id)}%</span>
                </div>
              </Link>
            ))}
            {visibleStations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No nursing station assigned to your account yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PatientDashboardTab() {
  const { user, scopeStationIds } = useSession();

  const scopedPatients = useMemo(() => PATIENTS.filter((p) => scopeStationIds.includes(p.stationId)), [scopeStationIds]);
  const assignedPatients = scopedPatients.filter((p) => p.careGiverId);
  const unassignedPatients = scopedPatients.filter((p) => !p.careGiverId);

  const eligibleNurses = useMemo(
    () => CARE_GIVERS.filter((c) => isPatientAssignmentEligible(c, scopeStationIds)),
    [scopeStationIds],
  );

  const stationBreakdown = useMemo(() => {
    const stationIds = Array.from(new Set(scopedPatients.map((p) => p.stationId)));
    return stationIds.map((id) => {
      const patients = scopedPatients.filter((p) => p.stationId === id);
      const assigned = patients.filter((p) => p.careGiverId).length;
      return { stationId: id, total: patients.length, assigned };
    });
  }, [scopedPatients]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Patient overview for ${user.name.split(" ")[0]}`}
        description="Nurse-patient assignment status within your authorised scope. Only nurse-capable, mapped, active and rostered care givers count as eligible."
        actions={
          <Button asChild size="sm">
            <Link to="/assignments" search={{ area: "patient" }}>
              <Stethoscope className="size-4" /> Go to Patient Assignment
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Patients in Scope" value={scopedPatients.length} icon={<Users className="size-4" />} />
        <StatCard label="Assigned" value={assignedPatients.length} tone="success" icon={<CheckCircle2 className="size-4" />} />
        <StatCard label="Unassigned" value={unassignedPatients.length} tone="warning" icon={<UserMinus className="size-4" />} />
        <StatCard label="Eligible Nurses" value={eligibleNurses.length} icon={<Stethoscope className="size-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Patient Coverage by Station</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stationBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No patients in scope.</p>
            ) : (
              stationBreakdown.map((row) => {
                const pct = row.total ? Math.round((row.assigned / row.total) * 100) : 0;
                return (
                  <div key={row.stationId}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>{stationName(row.stationId)}</span>
                      <span className="num text-muted-foreground">
                        {row.assigned}/{row.total}
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 gap-3 p-0">
          <div className="p-4 pb-0">
            <p className="text-sm font-semibold">Unassigned Patients</p>
          </div>
          {unassignedPatients.length === 0 ? (
            <div className="p-4">
              <EmptyState title="Every patient in scope has an assigned nurse" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Bed</TableHead>
                    <TableHead>Nursing Station</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unassignedPatients.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="num">{p.bed}</TableCell>
                      <TableCell>{stationName(p.stationId)}</TableCell>
                      <TableCell><StatusPill value="Unassigned" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
