import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  EmptyState,
  FilterBar,
  MultiSelect,
  NoPermission,
  PageHeader,
  PriorityPill,
  SearchBox,
  SectionCard,
  Segmented,
  StatCard,
  StatusPill,
} from "@/components/workforce/primitives";
import { CARE_GIVERS, PATIENTS, STATIONS, TASKS, stationName } from "@/data/mock";
import { TASK_TYPES } from "@/data/config";
import { useSession } from "@/state/session";

export const Route = createFileRoute("/tasks/")({
  head: () => ({
    meta: [
      { title: "Tasks — Assignment, SLA and Escalation" },
      {
        name: "description",
        content: "Task queue with configured task types, SLA targets, escalation rules and role-based routing across nursing stations.",
      },
      { property: "og:title", content: "Tasks — Assignment, SLA and Escalation" },
      { property: "og:description", content: "Task queue with SLA and escalation rules." },
    ],
  }),
  component: TasksPage,
});

const VIEWS = [
  { value: "queue", label: "Task Queue" },
  { value: "mine", label: "My Tasks" },
  { value: "types", label: "Task Types" },
] as const;
type View = (typeof VIEWS)[number]["value"];

function TasksPage() {
  const { can, hasCap, user, scopeStationIds } = useSession();
  const [view, setView] = useState<View>("queue");
  const [q, setQ] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [stations, setStations] = useState<string[]>([]);

  if (!can("tasks")) return <NoPermission area="tasks" />;

  const scoped = TASKS.filter((t) => scopeStationIds.includes(t.stationId));
  const base = view === "mine" ? scoped.filter((t) => t.careGiverId === user.id) : scoped;
  const rows = base.filter(
    (t) =>
      `${t.title} ${t.id} ${t.type}`.toLowerCase().includes(q.toLowerCase()) &&
      (statuses.length === 0 || statuses.includes(t.status)) &&
      (priorities.length === 0 || priorities.includes(t.priority)) &&
      (stations.length === 0 || stations.includes(t.stationId)),
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tasks"
        description="Tasks are routed by task type, role and responsibility, then tracked against SLA with automatic escalation."
        actions={
          hasCap("Task Assignment") ? (
            <Button size="sm" onClick={() => toast.success("Task created — EV-T1 sent to matching role in the station")}>
              Create Task
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
        <StatCard label="Tasks in Scope" value={scoped.length} />
        <StatCard label="Open" value={scoped.filter((t) => t.status === "Open").length} />
        <StatCard label="In Progress" value={scoped.filter((t) => t.status === "In Progress").length} />
        <StatCard label="Overdue" value={scoped.filter((t) => t.status === "Overdue").length} tone="warning" />
        <StatCard label="Escalated" value={scoped.filter((t) => t.status === "Escalated").length} tone="danger" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented options={VIEWS.map((v) => ({ ...v }))} value={view} onChange={setView} />
        {view !== "types" ? <SearchBox value={q} onChange={setQ} placeholder="Search task, ID or type…" /> : null}
      </div>

      {view === "types" ? (
        <SectionCard title="Task type configuration" description="Each type defines who receives it, whether a patient is required, its SLA and its escalation chain">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task type</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Responsibility</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Escalation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TASK_TYPES.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {t.name}
                      <span className="block text-xs text-muted-foreground">{t.description}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{t.role}</TableCell>
                    <TableCell className="whitespace-nowrap">{t.responsibility}</TableCell>
                    <TableCell className="whitespace-nowrap">{t.patientRequirement}</TableCell>
                    <TableCell><PriorityPill value={t.priority} /></TableCell>
                    <TableCell className="num whitespace-nowrap">{t.sla}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.escalationRule}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      ) : (
        <>
          <FilterBar>
            <MultiSelect
              label="Status"
              options={["Open", "In Progress", "Completed", "Overdue", "Escalated"].map((s) => ({ value: s, label: s }))}
              selected={statuses}
              onChange={setStatuses}
            />
            <MultiSelect
              label="Priority"
              options={["Low", "Medium", "High", "Critical"].map((s) => ({ value: s, label: s }))}
              selected={priorities}
              onChange={setPriorities}
            />
            <MultiSelect
              label="Station"
              options={STATIONS.filter((s) => scopeStationIds.includes(s.id)).map((s) => ({ value: s.id, label: s.name }))}
              selected={stations}
              onChange={setStations}
            />
          </FilterBar>

          {rows.length === 0 ? (
            <EmptyState title="No tasks" description="No tasks match the current filters in your scope." />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="max-w-[280px] font-medium">
                        {t.title}
                        <span className="num block text-xs text-muted-foreground">{t.id}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{t.type}</TableCell>
                      <TableCell className="whitespace-nowrap">{CARE_GIVERS.find((c) => c.id === t.careGiverId)?.name ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{stationName(t.stationId)}</TableCell>
                      <TableCell className="whitespace-nowrap">{PATIENTS.find((p) => p.id === t.patientId)?.name ?? "—"}</TableCell>
                      <TableCell><PriorityPill value={t.priority} /></TableCell>
                      <TableCell className="num whitespace-nowrap">{t.due}</TableCell>
                      <TableCell><StatusPill value={t.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/tasks/$taskId" params={{ taskId: t.id }}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
