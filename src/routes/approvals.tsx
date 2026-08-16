import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  EmptyState,
  NoPermission,
  PageHeader,
  PriorityPill,
  SectionCard,
  Segmented,
  StatCard,
  StatusPill,
} from "@/components/workforce/primitives";
import { APPROVALS, ESCALATION_TIMELINE, stationName, type Approval } from "@/data/mock";
import { APPROVAL_RULES } from "@/data/config";
import { useSession } from "@/state/session";

export const Route = createFileRoute("/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals — Requests, SLA and Escalation Timeline" },
      {
        name: "description",
        content: "Review assignment and roster approval requests with policy-resolved approvers, SLA tracking and escalation timeline.",
      },
      { property: "og:title", content: "Approvals — Requests, SLA and Escalation" },
      { property: "og:description", content: "Approval queue with policy-resolved approvers and SLA." },
    ],
  }),
  component: ApprovalsPage,
});

const VIEWS = [
  { value: "pending", label: "Pending" },
  { value: "decided", label: "Decided" },
  { value: "rules", label: "Approval Rules" },
] as const;
type View = (typeof VIEWS)[number]["value"];

function ApprovalsPage() {
  const { can, scopeStationIds } = useSession();
  const [view, setView] = useState<View>("pending");
  const [items, setItems] = useState<Approval[]>(APPROVALS);

  if (!can("approvals")) return <NoPermission area="approvals" />;

  const scoped = items.filter((a) => scopeStationIds.includes(a.stationId));
  const rows = scoped.filter((a) => (view === "pending" ? a.status === "Pending" : a.status !== "Pending"));

  const decide = (id: string, status: "Approved" | "Rejected") => {
    setItems((p) => p.map((a) => (a.id === id ? { ...a, status } : a)));
    toast.success(`${status} — ${status === "Approved" ? "EV-A2" : "EV-A3"} sent to requester and affected workers`);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Approvals"
        description="Every approval is created by a policy rule that resolves the approver from role, station and floor."
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="In Scope" value={scoped.length} />
        <StatCard label="Pending" value={scoped.filter((a) => a.status === "Pending").length} tone="warning" />
        <StatCard label="Approved" value={scoped.filter((a) => a.status === "Approved").length} tone="success" />
        <StatCard label="Rejected" value={scoped.filter((a) => a.status === "Rejected").length} tone="danger" />
      </div>

      <Segmented options={VIEWS.map((v) => ({ ...v }))} value={view} onChange={setView} />

      {view === "rules" ? (
        <SectionCard title="Approval rules" description="Condition, resolved approver, SLA and breach behaviour">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Approver</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>On breach</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {APPROVAL_RULES.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="num font-medium">{r.id}</TableCell>
                    <TableCell>{r.when}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.approver}</TableCell>
                    <TableCell className="num whitespace-nowrap">{r.sla}</TableCell>
                    <TableCell className="text-muted-foreground">{r.onBreach}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
          <div className="space-y-3">
            {rows.length === 0 ? (
              <EmptyState title="Nothing here" description="No approval requests match this view in your scope." />
            ) : (
              rows.map((a) => (
                <SectionCard
                  key={a.id}
                  title={a.change}
                  description={`${a.id} · ${a.requestedBy} (${a.role}) · ${stationName(a.stationId)} · ${a.date}`}
                  actions={<div className="flex items-center gap-2"><PriorityPill value={a.priority} /><StatusPill value={a.status} /></div>}
                >
                  <p className="text-sm text-muted-foreground">{a.reason}</p>
                  {a.status === "Pending" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => decide(a.id, "Approved")}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => decide(a.id, "Rejected")}>Reject</Button>
                      <Button size="sm" variant="ghost" onClick={() => toast.success("Changes requested — EV-A4 sent to requester")}>
                        Request Changes
                      </Button>
                    </div>
                  ) : null}
                </SectionCard>
              ))
            )}
          </div>

          <SectionCard title="Escalation timeline" description="Most recent SLA breach path">
            <ol className="space-y-3">
              {ESCALATION_TIMELINE.map((e, i) => (
                <li key={e.event} className="flex gap-3">
                  <span className="num mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{e.event}</p>
                    <p className="text-xs text-muted-foreground">{e.time} · {e.recipient}</p>
                    <p className="mt-0.5"><StatusPill value={e.status} /></p>
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
