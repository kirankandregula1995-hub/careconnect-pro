import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CountBadge, EmptyState, NoPermission, PageHeader, StatusPill } from "@/components/workforce/primitives";
import { APPROVALS, stationName, type Approval } from "@/data/mock";
import { useSession } from "@/state/session";

export const Route = createFileRoute("/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals — Assignment Change Requests" },
      { name: "description", content: "Review, approve or reject care giver assignment change requests raised by station in-charges." },
      { property: "og:title", content: "Approvals — Assignment Change Requests" },
      { property: "og:description", content: "Approve or reject assignment change requests." },
    ],
  }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const { can, scopeStationIds } = useSession();
  const [items, setItems] = useState<Approval[]>(APPROVALS);

  if (!can("approvals")) return <NoPermission area="approvals" />;

  const scoped = items.filter((a) => scopeStationIds.includes(a.stationId));
  const by = (s: Approval["status"]) => scoped.filter((a) => a.status === s);

  const decide = (id: string, status: Approval["status"], msg: string) => {
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    toast.success(msg);
  };

  const List = ({ list }: { list: Approval[] }) =>
    list.length === 0 ? (
      <EmptyState title="Nothing here" description="No approval requests in this state within your scope." />
    ) : (
      <div className="space-y-3">
        {list.map((a) => (
          <Card key={a.id}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-sm">{a.change}</CardTitle>
                <div className="flex items-center gap-2">
                  <StatusPill value={a.priority} />
                  <StatusPill value={a.status} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 text-sm sm:grid-cols-4">
                <Field k="Requested By" v={a.requestedBy} />
                <Field k="Role" v={a.role} />
                <Field k="Station" v={stationName(a.stationId)} />
                <Field k="Date" v={a.date} />
              </div>
              <p className="rounded-md bg-muted px-3 py-2 text-sm">
                <span className="font-medium">Reason: </span>{a.reason}
              </p>
              {a.status === "Pending" ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => decide(a.id, "Approved", `${a.id} approved`)}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => decide(a.id, "Rejected", `${a.id} rejected`)}>Reject</Button>
                  <Button size="sm" variant="ghost" onClick={() => toast.info("Change request sent back to requester")}>Request Changes</Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    );

  return (
    <div className="space-y-5">
      <PageHeader title="Approvals" description="Major assignment changes require Nurse Manager approval as per policy POL-01." />
      <Tabs defaultValue="Pending">
        <TabsList>
          <TabsTrigger value="Pending" className="gap-1.5">Pending <CountBadge n={by("Pending").length} /></TabsTrigger>
          <TabsTrigger value="Approved" className="gap-1.5">Approved <CountBadge n={by("Approved").length} /></TabsTrigger>
          <TabsTrigger value="Rejected" className="gap-1.5">Rejected <CountBadge n={by("Rejected").length} /></TabsTrigger>
        </TabsList>
        {(["Pending", "Approved", "Rejected"] as const).map((s) => (
          <TabsContent key={s} value={s} className="mt-4"><List list={by(s)} /></TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p>
      <p className="font-medium">{v}</p>
    </div>
  );
}
