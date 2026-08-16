import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FilterBar,
  MultiSelect,
  NoPermission,
  PageHeader,
  SectionCard,
  Segmented,
  StatCard,
} from "@/components/workforce/primitives";
import { CARE_GIVERS, FLOORS, REPORTS, ROLES, SHIFTS, STATIONS, TASKS, coverageFor, floorName } from "@/data/mock";
import { useSession } from "@/state/session";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Coverage, Mapping and Task Performance" },
      {
        name: "description",
        content: "Operational reports for workforce coverage, station mapping, unassigned workforce and task performance with export.",
      },
      { property: "og:title", content: "Reports — Coverage and Task Performance" },
      { property: "og:description", content: "Operational workforce and task reports with export." },
    ],
  }),
  component: ReportsPage,
});

const VIEWS = [
  { value: "coverage", label: "Coverage" },
  { value: "performance", label: "Task Performance" },
  { value: "library", label: "Report Library" },
] as const;
type View = (typeof VIEWS)[number]["value"];

const PIE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function ReportsPage() {
  const { can, scopeStationIds, scopeFloorIds } = useSession();
  const [view, setView] = useState<View>("coverage");
  const [floors, setFloors] = useState<string[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);

  if (!can("reports")) return <NoPermission area="reports" />;

  const stations = STATIONS.filter(
    (s) => scopeStationIds.includes(s.id) && (floors.length === 0 || floors.includes(s.floorId)),
  );

  const coverageData = stations.map((s) => ({ name: s.name.replace("Ward ", "W"), coverage: coverageFor(s.id) }));
  const roleData = ROLES.map((r) => ({
    name: r,
    value: CARE_GIVERS.filter((c) => c.role === r && c.stationIds.some((s) => scopeStationIds.includes(s))).length,
  })).filter((d) => d.value > 0);

  const scopedTasks = TASKS.filter((t) => scopeStationIds.includes(t.stationId));
  const perf = ROLES.map((r) => {
    const ids = CARE_GIVERS.filter((c) => c.role === r).map((c) => c.id);
    const list = scopedTasks.filter((t) => ids.includes(t.careGiverId));
    return {
      name: r,
      completed: list.filter((t) => t.status === "Completed").length,
      overdue: list.filter((t) => t.status === "Overdue" || t.status === "Escalated").length,
      open: list.filter((t) => t.status === "Open" || t.status === "In Progress").length,
    };
  }).filter((p) => p.completed + p.overdue + p.open > 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        description="Every report respects your locality scope — you only see rows for the floors and stations you are authorised for."
        actions={
          <Button size="sm" variant="outline" onClick={() => toast.success("Export queued — report will download shortly")}>
            <Download className="size-4" /> Export all
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="Stations Reported" value={stations.length} />
        <StatCard
          label="Average Coverage"
          value={`${coverageData.length ? Math.round(coverageData.reduce((a, c) => a + c.coverage, 0) / coverageData.length) : 0}%`}
        />
        <StatCard label="Tasks Tracked" value={scopedTasks.length} />
        <StatCard label="Reports Available" value={REPORTS.length} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented options={VIEWS.map((v) => ({ ...v }))} value={view} onChange={setView} />
      </div>

      <FilterBar>
        <MultiSelect
          label="Floor"
          options={FLOORS.filter((f) => scopeFloorIds.includes(f.id)).map((f) => ({ value: f.id, label: f.name }))}
          selected={floors}
          onChange={setFloors}
        />
        <MultiSelect label="Shift" options={SHIFTS.map((s) => ({ value: s, label: s }))} selected={shifts} onChange={setShifts} />
      </FilterBar>

      {view === "coverage" ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <SectionCard title="Coverage by station" description="Percentage of required staffing met">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={coverageData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={30} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="coverage" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>
          <SectionCard title="Workforce mix" description="Distribution by role in scope">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={roleData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {roleData.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
          <div className="xl:col-span-3">
            <SectionCard title="Station coverage detail" description="Floor, department and staffed workforce">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Station</TableHead>
                      <TableHead>Floor</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Workforce</TableHead>
                      <TableHead>Coverage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stations.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium whitespace-nowrap">{s.name}</TableCell>
                        <TableCell className="whitespace-nowrap">{floorName(s.floorId)}</TableCell>
                        <TableCell className="whitespace-nowrap">{s.department}</TableCell>
                        <TableCell className="num">{CARE_GIVERS.filter((c) => c.stationIds.includes(s.id)).length}</TableCell>
                        <TableCell className="num">{coverageFor(s.id)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}

      {view === "performance" ? (
        <SectionCard title="Task performance by role" description="Completed, open and overdue or escalated tasks">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perf}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" interval={0} angle={-12} height={50} textAnchor="end" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={28} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="completed" stackId="a" fill="var(--chart-2)" />
                <Bar dataKey="open" stackId="a" fill="var(--chart-3)" />
                <Bar dataKey="overdue" stackId="a" fill="var(--chart-5)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      ) : null}

      {view === "library" ? (
        <SectionCard title="Report library" description="Scheduled operational extracts">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Last updated</TableHead>
                  <TableHead className="text-right">Export</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {REPORTS.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.description}</TableCell>
                    <TableCell className="num">{r.rows}</TableCell>
                    <TableCell className="num whitespace-nowrap">{r.updated}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => toast.success(`${r.name} export queued`)}>
                        <Download className="size-4" /> CSV
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
