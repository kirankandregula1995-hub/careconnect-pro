import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CountBadge, EmptyState, MultiSelect, PageHeader, StatusPill } from "@/components/workforce/primitives";
import { STATIONS, stationName } from "@/data/mock";
import { useSession } from "@/state/session";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notification Center — Assignments, Approvals & Coverage" },
      { name: "description", content: "Care workforce notification center for assignment, approval, task, escalation, coverage and roster alerts." },
      { property: "og:title", content: "Notification Center — Care Workforce" },
      { property: "og:description", content: "Assignment, approval, task and coverage notifications with preferences." },
    ],
  }),
  component: NotificationsPage,
});

const CATEGORIES = ["Assignment", "Approval", "Task", "Escalation", "Station Coverage", "Roster", "System"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

function NotificationsPage() {
  const { notifications, markRead, markAllRead, scopeStationIds } = useSession();
  const [cats, setCats] = useState<string[]>([]);
  const [prios, setPrios] = useState<string[]>([]);
  const [stations, setStations] = useState<string[]>([]);

  const scoped = notifications.filter(
    (n) =>
      (!n.stationId || scopeStationIds.includes(n.stationId)) &&
      (cats.length === 0 || cats.includes(n.category)) &&
      (prios.length === 0 || prios.includes(n.priority)) &&
      (stations.length === 0 || (n.stationId ? stations.includes(n.stationId) : false)),
  );

  const list = (filter: "all" | "unread" | "read") =>
    scoped.filter((n) => (filter === "all" ? true : filter === "unread" ? !n.read : n.read));

  const Items = ({ filter }: { filter: "all" | "unread" | "read" }) => {
    const items = list(filter);
    if (items.length === 0)
      return <EmptyState icon={<Bell className="size-5" />} title="No notifications" description="You're all caught up." />;
    return (
      <div className="space-y-2">
        {items.map((n) => (
          <div
            key={n.id}
            className={`flex flex-wrap items-start gap-3 rounded-md border p-3 ${n.read ? "border-border bg-card" : "border-primary/30 bg-primary/5"}`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{n.title}</p>
                <StatusPill value={n.category} />
                <StatusPill value={n.priority} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
              <p className="num mt-1 text-xs text-muted-foreground">
                {n.at}{n.stationId ? ` · ${stationName(n.stationId)}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              {!n.read ? (
                <Button size="sm" variant="outline" onClick={() => markRead(n.id)}>Mark Read</Button>
              ) : null}
              <Button size="sm" variant="ghost" onClick={() => toast.info("Opening related record (prototype)")}>Open</Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notification Center"
        description="Assignment, approval, task, escalation, coverage, roster and system alerts."
        actions={
          <Button size="sm" variant="outline" onClick={() => { markAllRead(); toast.success("All notifications marked as read"); }}>
            <CheckCheck className="size-4" /> Mark All Read
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <MultiSelect label="Type" options={CATEGORIES.map((c) => ({ value: c, label: c }))} selected={cats} onChange={setCats} />
        <MultiSelect label="Priority" options={PRIORITIES.map((p) => ({ value: p, label: p }))} selected={prios} onChange={setPrios} />
        <MultiSelect label="Station" options={STATIONS.filter((s) => scopeStationIds.includes(s.id)).map((s) => ({ value: s.id, label: s.name }))} selected={stations} onChange={setStations} />
      </div>

      <Tabs defaultValue="unread">
        <TabsList>
          <TabsTrigger value="unread" className="gap-1.5">Unread <CountBadge n={list("unread").length} /></TabsTrigger>
          <TabsTrigger value="read">Read</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="prefs">Preferences</TabsTrigger>
        </TabsList>
        <TabsContent value="unread" className="mt-4"><Items filter="unread" /></TabsContent>
        <TabsContent value="read" className="mt-4"><Items filter="read" /></TabsContent>
        <TabsContent value="all" className="mt-4"><Items filter="all" /></TabsContent>
        <TabsContent value="prefs" className="mt-4"><Preferences /></TabsContent>
      </Tabs>
    </div>
  );
}

function Preferences() {
  const [channels, setChannels] = useState({ inApp: true, email: true, push: false });
  const [frequency, setFrequency] = useState("immediate");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-sm">Channels</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {([
            ["inApp", "In-App", "Show alerts inside the Care Workforce platform"],
            ["email", "Email", "Send to your hospital email address"],
            ["push", "Push", "Mobile push on the hospital app"],
          ] as const).map(([key, label, hint]) => (
            <div key={key} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </div>
              <Switch
                checked={channels[key]}
                onCheckedChange={(v) => { setChannels((c) => ({ ...c, [key]: v })); toast.success(`${label} notifications ${v ? "enabled" : "disabled"}`); }}
              />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Delivery Preference</CardTitle></CardHeader>
        <CardContent>
          <RadioGroup value={frequency} onValueChange={setFrequency} className="space-y-2">
            {[
              ["immediate", "Immediate", "Send each notification as it happens"],
              ["digest", "Digest", "One consolidated summary per shift"],
              ["critical", "Critical Only", "Only critical coverage and escalation alerts"],
            ].map(([v, t, d]) => (
              <label key={v} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${frequency === v ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem value={v as string} className="mt-0.5" />
                <span>
                  <Label className="text-sm font-medium">{t}</Label>
                  <span className="block text-xs text-muted-foreground">{d}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
}
