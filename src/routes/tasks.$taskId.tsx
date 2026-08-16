import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  EmptyState,
  KeyValue,
  PriorityPill,
  SectionCard,
  StatusPill,
} from "@/components/workforce/primitives";
import { CARE_GIVERS, PATIENTS, TASKS, floorName, stationName, STATIONS } from "@/data/mock";
import { ESCALATION_RULES, TASK_TYPES } from "@/data/config";
import { useSession } from "@/state/session";

export const Route = createFileRoute("/tasks/$taskId")({
  head: () => ({
    meta: [
      { title: "Task Detail — Timeline, SLA and Escalation" },
      { name: "description", content: "Task detail with assignee, patient context, SLA countdown, escalation chain and activity comments." },
      { property: "og:title", content: "Task Detail — Timeline, SLA and Escalation" },
      { property: "og:description", content: "Task detail with SLA and escalation chain." },
    ],
  }),
  component: TaskDetailPage,
});

function TaskDetailPage() {
  const { taskId } = Route.useParams();
  const { hasCap, user } = useSession();
  const task = TASKS.find((t) => t.id === taskId);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState(task?.comments ?? []);
  const [status, setStatus] = useState(task?.status);

  if (!task) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm"><Link to="/tasks"><ArrowLeft className="size-4" /> Back to tasks</Link></Button>
        <EmptyState title="Task not found" description="This task does not exist or is outside your scope." />
      </div>
    );
  }

  const assignee = CARE_GIVERS.find((c) => c.id === task.careGiverId);
  const patient = PATIENTS.find((p) => p.id === task.patientId);
  const station = STATIONS.find((s) => s.id === task.stationId);
  const type = TASK_TYPES.find((t) => t.name.toLowerCase().includes(task.type.split(" ")[0]!.toLowerCase())) ?? TASK_TYPES[0]!;

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/tasks"><ArrowLeft className="size-4" /> Back to tasks</Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="num text-xs text-muted-foreground">{task.id}</p>
          <h1 className="text-xl font-semibold tracking-tight">{task.title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusPill value={status ?? task.status} />
            <PriorityPill value={task.priority} />
            <span className="text-xs text-muted-foreground">Due {task.due}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {hasCap("Task Execution") ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setStatus("In Progress"); toast.success("Task acknowledged"); }}
              >
                Acknowledge
              </Button>
              <Button
                size="sm"
                onClick={() => { setStatus("Completed"); toast.success("Task completed — EV-T3 sent to Station In-Charge"); }}
              >
                Mark Complete
              </Button>
            </>
          ) : null}
          {hasCap("Task Assignment") ? (
            <Button size="sm" variant="outline" onClick={() => toast.success("Task reassigned — EV-T6 sent to both assignees")}>
              Reassign
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <SectionCard title="Description" description="What the assignee must complete">
            <p className="text-sm leading-relaxed text-muted-foreground">{task.description}</p>
          </SectionCard>

          <SectionCard title="Activity" description="Comments and handover notes">
            <ul className="space-y-3">
              {comments.map((c, i) => (
                <li key={`${c.author}-${i}`} className="rounded-md border border-border px-3 py-2">
                  <p className="text-xs text-muted-foreground">{c.author} · {c.at}</p>
                  <p className="mt-0.5 text-sm">{c.text}</p>
                </li>
              ))}
            </ul>
            <Separator className="my-3" />
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" />
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                disabled={!comment.trim()}
                onClick={() => {
                  setComments((p) => [...p, { author: user.name, at: "Just now", text: comment }]);
                  setComment("");
                  toast.success("Comment added");
                }}
              >
                Comment
              </Button>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Context" description="Assignment and location">
            <KeyValue k="Assignee" v={assignee?.name ?? "Unassigned"} />
            <KeyValue k="Role" v={assignee?.role ?? "—"} />
            <KeyValue k="Station" v={stationName(task.stationId)} />
            <KeyValue k="Floor" v={station ? floorName(station.floorId) : "—"} />
            <KeyValue k="Patient" v={patient ? `${patient.name} · ${patient.bed}` : "Not applicable"} />
            <KeyValue k="Task type" v={task.type} />
            <KeyValue k="SLA" v={type.sla} />
          </SectionCard>

          <SectionCard title="Escalation chain" description="Applied when the SLA is breached">
            <ol className="space-y-2 text-sm">
              {[ESCALATION_RULES[0]!].flatMap((r) => [r.level1, r.level2, r.level3, r.level4]).map((lvl, i) => (
                <li key={lvl} className="flex items-start gap-2">
                  <span className="num mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                    {i + 1}
                  </span>
                  <span>{lvl}</span>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
