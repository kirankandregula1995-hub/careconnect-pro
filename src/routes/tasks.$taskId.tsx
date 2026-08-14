import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, PageHeader, StatusPill } from "@/components/workforce/primitives";
import { CARE_GIVERS, PATIENTS, TASKS, stationName, type TaskStatus } from "@/data/mock";

export const Route = createFileRoute("/tasks/$taskId")({
  head: () => ({
    meta: [
      { title: "Task Detail — Care Workforce Tasks" },
      { name: "description", content: "Task detail with assignment, responsibility, station, priority, due date, comments and actions." },
      { property: "og:title", content: "Task Detail — Care Workforce Tasks" },
      { property: "og:description", content: "Task detail prototype with start, complete, reassign and escalate actions." },
    ],
  }),
  component: TaskDetail,
});

function TaskDetail() {
  const { taskId } = Route.useParams();
  const task = TASKS.find((t) => t.id === taskId);
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "Open");
  const [comments, setComments] = useState(task?.comments ?? []);
  const [draft, setDraft] = useState("");

  if (!task) return <EmptyState title="Task not found" />;

  const cg = CARE_GIVERS.find((c) => c.id === task.careGiverId)!;
  const patient = PATIENTS.find((p) => p.id === task.patientId);

  const act = (next: TaskStatus, message: string) => {
    setStatus(next);
    toast.success(message);
  };

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/tasks"><ArrowLeft className="size-4" /> Tasks</Link>
      </Button>
      <PageHeader
        title={task.title}
        description={`${task.id} · ${task.type}`}
        actions={
          <>
            <StatusPill value={status} />
            <Button size="sm" onClick={() => act("In Progress", "Task started")} disabled={status === "In Progress"}>Start</Button>
            <Button size="sm" variant="outline" onClick={() => act("Completed", "Task completed")}>Complete</Button>
            <Button size="sm" variant="outline" onClick={() => toast.info("Reassignment request sent for approval")}>Reassign</Button>
            <Button size="sm" variant="outline" onClick={() => act("Escalated", "Task escalated to Nurse Manager")}>Escalate</Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Description</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{task.description}</p>
            <Separator />
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><MessageSquare className="size-4" /> Comments</p>
              <div className="space-y-3">
                {comments.length === 0 ? <p className="text-sm text-muted-foreground">No comments yet.</p> : null}
                {comments.map((c, i) => (
                  <div key={i} className="rounded-md border border-border p-3">
                    <p className="text-xs font-medium">{c.author} <span className="num font-normal text-muted-foreground">· {c.at}</span></p>
                    <p className="mt-1 text-sm">{c.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-2">
                <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a comment…" rows={3} />
                <Button
                  size="sm"
                  onClick={() => {
                    if (!draft.trim()) return;
                    setComments((c) => [...c, { author: "You", at: "Just now", text: draft.trim() }]);
                    setDraft("");
                    toast.success("Comment added");
                  }}
                >
                  Add comment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader><CardTitle className="text-sm">Task Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Detail k="Task Type" v={task.type} />
            <Detail k="Assigned To" v={cg.name} />
            <Detail k="Role" v={cg.role} />
            <Detail k="Responsibility" v={cg.responsibility} />
            <Detail k="Station" v={stationName(task.stationId)} />
            <Detail k="Patient" v={patient ? `${patient.name} · ${patient.bed}` : "Not applicable"} />
            <Detail k="Priority" v={task.priority} />
            <Detail k="Due Date" v={task.due} />
            <Detail k="Status" v={status} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}
