import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  FilterBar,
  MultiSelect,
  PageHeader,
  SectionCard,
  StatCard,
  StateBanner,
  StatusPill,
} from "@/components/workforce/primitives";
import {
  APPROVALS,
  CARE_GIVERS,
  FLOORS,
  ROLES,
  SHIFTS,
  STATIONS,
  TASKS,
  coverageFor,
  floorName,
} from "@/data/mock";
import { BUILDINGS, HOSPITALS, ROSTER, rosterConflicts } from "@/data/config";
import { useSession } from "@/state/session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Workforce Dashboard — Hospital Care Operations" },
      {
        name: "description",
        content:
          "Live workforce dashboard covering active workforce, station and roster coverage, open tasks, approvals and notifications across hospital locations.",
      },
      { property: "og:title", content: "Workforce Dashboard — Hospital Care Operations" },
      { property: "og:description", content: "Workforce, coverage, task and approval metrics in one operations view." },
    ],
  }),
  component: WorkforceDashboard,
});

const chartColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function WorkforceDashboard() {
  const { user, role, scopeStationIds, scopeFloorIds, scopeBuildingIds, unreadCount, hasCap, scopeLevel } = useSession();
  const [buildings, setBuildings] = useState<string[]>([]);
  const [floors, setFloors] = useState<string[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);

  const visibleStations = STATIONS.filter(
    (s) =>
      scopeStationIds.includes(s.id) &&
      (buildings.length === 0 || BUILDINGS.some((b) => buildings.includes(b.id) && b.floorIds.includes(s.floorId))) &&
      (floors.length === 0 || floors.includes(s.floorId)) &&
      (stations.length === 0 || stations.includes(s.id)),
  );
  const visibleIds = visibleStations.map((s) => s.id);

  const people = CARE_GIVERS.filter(
    (c) =>
      (c.stationIds.length === 0 ? scopeLevel === "Hospital" : c.stationIds.some((s) => scopeStationIds.includes(s))) &&
      (c.stationIds.length === 0 || c.stationIds.some((s) => visibleIds.includes(s))) &&
      (roles.length === 0 || roles.includes(c.role)) &&
      (shifts.length === 0 || shifts.includes(c.shift)),
  );

  const active = people.filter((p) => p.status === "Active");
  const assigned = people.filter((p) => p.stationIds.length > 0);
  const unassigned = people.filter((p) => p.stationIds.length === 0);
  const tasks = TASKS.filter((t) => visibleIds.includes(t.stationId));
  const openTasks = tasks.filter((t) => t.status === "Open" || t.status === "In Progress");
  const overdue = tasks.filter((t) => t.status === "Overdue" || t.status === "Escalated");
  const approvals = APPROVALS.filter((a) => a.status === "Pending" && visibleIds.includes(a.stationId));
  const stationCoverage = visibleStations.length
    ? Math.round(visibleStations.reduce((a, s) => a + coverageFor(s.id), 0) / visibleStations.length)
    : 0;
  const rosterEntries = ROSTER.filter((r) => visibleIds.includes(r.stationId));
  const rosterCoverage = rosterEntries.length
    ? Math.round((rosterEntries.filter((r) => r.status === "Scheduled").length / rosterEntries.length) * 100)
    : 0;
  const conflicts = rosterConflicts(rosterEntries);

  const distribution = ROLES.map((r) => ({ name: r, value: people.filter((p) => p.role === r).length })).filter((d) => d.value);
  const coverageBars = visibleStations.slice(0, 9).map((s) => ({ name: s.name.replace("Ward ", "W"), coverage: coverageFor(s.id) }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Workforce Dashboard"
        description={`${user.name} · ${role} — ${scopeLevel} scope`}
        actions={
          <>
            {hasCap("Station Assignment") ? (
              <Button asChild size="sm"><Link to="/stations">Assign Station</Link></Button>
            ) : null}
            {hasCap("Roster Management") ? (
              <Button asChild size="sm" variant="outline"><Link to="/roster">Configure Roster</Link></Button>
            ) : null}
            {hasCap("Approval") ? (
              <Button asChild size="sm" variant="outline"><Link to="/approvals">Approvals</Link></Button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Workforce" value={people.length} />
        <StatCard label="Active" value={active.length} tone="success" />
        <StatCard label="Assigned" value={assigned.length} />
        <StatCard label="Unassigned" value={unassigned.length} tone="warning" />
        <StatCard label="Station Coverage" value={`${stationCoverage}%`} tone={stationCoverage >= 80 ? "success" : "warning"} />
        <StatCard label="Roster Coverage" value={`${rosterCoverage}%`} tone={rosterCoverage >= 80 ? "success" : "warning"} />
        <StatCard label="Open Tasks" value={openTasks.length} />
        <StatCard label="Overdue Tasks" value={overdue.length} tone="danger" />
        <StatCard label="Pending Approvals" value={approvals.length} tone="warning" />
        <StatCard label="Notifications" value={unreadCount} tone="info" hint="Unread" />
        <StatCard label="Stations in Scope" value={visibleStations.length} />
        <StatCard label="Roster Conflicts" value={conflicts.length} tone={conflicts.length ? "danger" : "success"} />
      </div>

      {conflicts.length > 0 ? (
        <StateBanner
          tone="danger"
          title={`${conflicts.length} roster conflict(s) detected in scope`}
          description="The same worker is double-booked in one shift. Resolve before the roster is published."
          action={<Button asChild size="sm" variant="outline"><Link to="/roster">Open roster</Link></Button>}
        />
      ) : null}

      <FilterBar>
        <MultiSelect label="Hospital" options={HOSPITALS.map((h) => ({ value: h.id, label: h.name }))} selected={[]} onChange={() => {}} />
        <MultiSelect
          label="Building"
          options={BUILDINGS.filter((b) => scopeBuildingIds.includes(b.id)).map((b) => ({ value: b.id, label: b.name }))}
          selected={buildings}
          onChange={setBuildings}
        />
        <MultiSelect
          label="Floor"
          options={FLOORS.filter((f) => scopeFloorIds.includes(f.id)).map((f) => ({ value: f.id, label: f.name }))}
          selected={floors}
          onChange={setFloors}
        />
        <MultiSelect
          label="Station"
          options={STATIONS.filter((s) => scopeStationIds.includes(s.id)).map((s) => ({ value: s.id, label: s.name }))}
          selected={stations}
          onChange={setStations}
        />
        <MultiSelect label="Role" options={ROLES.map((r) => ({ value: r, label: r }))} selected={roles} onChange={setRoles} />
        <MultiSelect label="Shift" options={SHIFTS.map((s) => ({ value: s, label: s }))} selected={shifts} onChange={setShifts} />
      </FilterBar>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Station Coverage" description="Percentage of required staffing met per nursing station">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coverageBars}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={32} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v}%`, "Coverage"]} />
                <Bar dataKey="coverage" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Workforce Distribution" description="By enterprise role">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={38} outerRadius={66} paddingAngle={2}>
                  {distribution.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {distribution.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2 rounded-full" style={{ background: chartColors[i % chartColors.length] }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Shift Coverage" description="Average across stations in scope">
          <div className="space-y-3">
            {SHIFTS.map((sh) => {
              const cov = visibleStations.length
                ? Math.round(visibleStations.reduce((a, s) => a + coverageFor(s.id, sh), 0) / visibleStations.length)
                : 0;
              return (
                <div key={sh}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{sh}</span>
                    <span className="num text-muted-foreground">{cov}%</span>
                  </div>
                  <Progress value={cov} className="h-2" />
                </div>
              );
            })}
          </div>
          <div className="mt-4 space-y-2 border-t border-border pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attention</p>
            {overdue.length === 0 && approvals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No overdue tasks or pending approvals in scope.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {overdue.slice(0, 3).map((t) => (
                  <li key={t.id} className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                    <Link to="/tasks/$taskId" params={{ taskId: t.id }} className="truncate hover:underline">{t.title}</Link>
                  </li>
                ))}
                {approvals.slice(0, 2).map((a) => (
                  <li key={a.id} className="flex items-start gap-2">
                    <StatusPill value="Pending" />
                    <Link to="/approvals" className="truncate hover:underline">{a.change}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Stations in Scope" description="Coverage and workforce count per nursing station">
        {visibleStations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No nursing station is inside your locality scope.</p>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleStations.map((s) => {
              const cov = coverageFor(s.id);
              const count = CARE_GIVERS.filter((c) => c.stationIds.includes(s.id)).length;
              return (
                <div key={s.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{s.name}</p>
                    <StatusPill value={cov >= 80 ? "Adequate" : "Low coverage"} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{floorName(s.floorId)} · {s.department}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={cov} className="h-1.5" />
                    <span className="num text-xs text-muted-foreground">{cov}%</span>
                  </div>
                  <p className="num mt-1 text-xs text-muted-foreground">{count} workforce mapped</p>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
