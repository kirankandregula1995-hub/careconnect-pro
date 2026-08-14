import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CountBadge,
  EmptyState,
  MultiSelect,
  NoPermission,
  PageHeader,
  ScopeNote,
  StatusPill,
} from "@/components/workforce/primitives";
import { CARE_GIVERS, FLOORS, ROLES, SHIFTS, STATIONS, TASKS, stationName, type Task } from "@/data/mock";
import { useSession } from "@/state/session";

export const Route = createFileRoute("/tasks/")({
  head: () => ({
    meta: [
      { title: "Tasks — My Tasks & Team Tasks" },
      { name: "description", content: "Lightweight care workforce task board with priority, due time, station and escalation status." },
      { property: "og:title", content: "Tasks — My Tasks & Team Tasks" },
      { property: "og:description", content: "Care workforce task board prototype with priority and escalation." },
    ],
  }),
  component: TasksPage,
});

const STATUSES = ["Open", "In Progress", "Completed", "Overdue", "Escalated"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

function TasksPage() {
  const { can, user, scopeStationIds } = useSession();
  const [floors, setFloors] = useState<string[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);

  if (!can("tasks")) return <NoPermission area="task management" />;

  const apply = (list: Task[]) =>
    list.filter((t) => {
      const st = STATIONS.find((s) => s.id === t.stationId)!;
      const cg = CARE_GIVERS.find((c) => c.id === t.careGiverId)!;
      return (
        (floors.length === 0 || floors.includes(st.floorId)) &&
        (stations.length === 0 || stations.includes(t.stationId)) &&
        (shifts.length === 0 || shifts.includes(cg.shift)) &&
        (roles.length === 0 || roles.includes(cg.role)) &&
        (priorities.length === 0 || priorities.includes(t.priority)) &&
        (statuses.length === 0 || statuses.includes(t.status))
      );
    });

  const team = apply(TASKS.filter((t) => scopeStationIds.includes(t.stationId)));
  const mine = apply(TASKS.filter((t) => t.careGiverId === user.id));
  const escalated = team.filter((t) => t.status === "Escalated" || t.status === "Overdue");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Task Management"
        description="Future capability preview — task routing, escalation and SLA are visual prototypes only."
      />
      {escalated.length > 0 ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm">
          <AlertTriangle className="mt-0.5 size-4 text-destructive" />
          <span>
            {escalated.length} task(s) are overdue or escalated in your scope.{" "}
            <Link to="/escalation" className="font-medium text-primary hover:underline">View escalation timeline</Link>
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <MultiSelect label="Floor" options={FLOORS.map((f) => ({ value: f.id, label: f.name }))} selected={floors} onChange={setFloors} />
        <MultiSelect label="Station" options={STATIONS.filter((s) => scopeStationIds.includes(s.id)).map((s) => ({ value: s.id, label: s.name }))} selected={stations} onChange={setStations} />
        <MultiSelect label="Shift" options={SHIFTS.map((s) => ({ value: s, label: s }))} selected={shifts} onChange={setShifts} />
        <MultiSelect label="Role" options={ROLES.map((r) => ({ value: r, label: r }))} selected={roles} onChange={setRoles} />
        <MultiSelect label="Priority" options={PRIORITIES.map((p) => ({ value: p, label: p }))} selected={priorities} onChange={setPriorities} />
        <MultiSelect label="Status" options={STATUSES.map((s) => ({ value: s, label: s }))} selected={statuses} onChange={setStatuses} />
      </div>

      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine" className="gap-1.5">My Tasks <CountBadge n={mine.length} /></TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5">Team Tasks <CountBadge n={team.length} /></TabsTrigger>
        </TabsList>
        <TabsContent value="mine" className="mt-4">
          {mine.length === 0 ? (
            <EmptyState title="No tasks assigned to you" description="New tasks routed to your role and station will appear here." />
          ) : (
            <TaskTable tasks={mine} />
          )}
        </TabsContent>
        <TabsContent value="team" className="mt-4">
          {team.length === 0 ? (
            <EmptyState title="No team tasks" description="No tasks match the selected filters within your stations." />
          ) : (
            <TaskTable tasks={team} />
          )}
        </TabsContent>
      </Tabs>

      <ScopeNote text="Task processing, SLA timers and workflow rules are not implemented in this prototype." />
    </div>
  );
}

function TaskTable({ tasks }: { tasks: Task[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Responsibility</TableHead>
              <TableHead>Station</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((t) => {
              const cg = CARE_GIVERS.find((c) => c.id === t.careGiverId)!;
              return (
                <TableRow key={t.id}>
                  <TableCell className="max-w-[280px]">
                    <p className="truncate font-medium">{t.title}</p>
                    <p className="num text-xs text-muted-foreground">{t.id} · {t.type}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{cg.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{cg.role}</TableCell>
                  <TableCell className="whitespace-nowrap">{cg.responsibility}</TableCell>
                  <TableCell>{stationName(t.stationId)}</TableCell>
                  <TableCell><StatusPill value={t.priority} /></TableCell>
                  <TableCell className="num whitespace-nowrap text-xs">{t.due}</TableCell>
                  <TableCell><StatusPill value={t.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/tasks/$taskId" params={{ taskId: t.id }}>Open</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
