import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  EmptyState,
  FilterBar,
  MultiSelect,
  PageHeader,
  PriorityPill,
  SectionCard,
  Segmented,
  StatCard,
} from "@/components/workforce/primitives";
import { stationName } from "@/data/mock";
import { EVENTS, type EventCategory } from "@/data/config";
import { useSession } from "@/state/session";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Event-Driven Alerts and Catalog" },
      {
        name: "description",
        content: "Notification feed generated from a defined events catalog with trigger, recipient rule, channels, priority and escalation.",
      },
      { property: "og:title", content: "Notifications — Event-Driven Alerts" },
      { property: "og:description", content: "Alerts generated from a defined events catalog." },
    ],
  }),
  component: NotificationsPage,
});

const VIEWS = [
  { value: "feed", label: "Feed" },
  { value: "events", label: "Events Catalog" },
] as const;
type View = (typeof VIEWS)[number]["value"];

const CATEGORIES: EventCategory[] = ["Workforce", "Station", "Roster", "Patient", "Task", "Approval"];

function NotificationsPage() {
  const { notifications, markRead, markAllRead, unreadCount } = useSession();
  const [view, setView] = useState<View>("feed");
  const [cats, setCats] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [eventCats, setEventCats] = useState<string[]>([]);

  const feed = notifications.filter(
    (n) => (cats.length === 0 || cats.includes(n.category)) && (priorities.length === 0 || priorities.includes(n.priority)),
  );
  const events = EVENTS.filter((e) => eventCats.length === 0 || eventCats.includes(e.category));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        description="Every alert originates from a defined event — the catalog documents its trigger, recipients, channels and escalation."
        actions={<Button size="sm" variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>Mark all read</Button>}
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="Notifications" value={notifications.length} />
        <StatCard label="Unread" value={unreadCount} tone={unreadCount ? "warning" : "success"} />
        <StatCard label="Critical" value={notifications.filter((n) => n.priority === "Critical").length} tone="danger" />
        <StatCard label="Defined Events" value={EVENTS.length} />
      </div>

      <Segmented options={VIEWS.map((v) => ({ ...v }))} value={view} onChange={setView} />

      {view === "feed" ? (
        <>
          <FilterBar>
            <MultiSelect
              label="Category"
              options={["Assignment", "Approval", "Task", "Escalation", "Station Coverage", "Roster", "System"].map((c) => ({ value: c, label: c }))}
              selected={cats}
              onChange={setCats}
            />
            <MultiSelect
              label="Priority"
              options={["Low", "Medium", "High", "Critical"].map((p) => ({ value: p, label: p }))}
              selected={priorities}
              onChange={setPriorities}
            />
          </FilterBar>

          {feed.length === 0 ? (
            <EmptyState title="No notifications" description="Nothing matches the selected filters." />
          ) : (
            <ul className="space-y-2">
              {feed.map((n) => (
                <li
                  key={n.id}
                  className={`rounded-lg border p-3 ${n.read ? "border-border bg-card" : "border-primary/30 bg-primary/5"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {n.category} · {n.at}{n.stationId ? ` · ${stationName(n.stationId)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <PriorityPill value={n.priority} />
                      {!n.read ? (
                        <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Mark read</Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <FilterBar>
            <MultiSelect
              label="Event category"
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              selected={eventCats}
              onChange={setEventCats}
            />
          </FilterBar>
          <SectionCard title="Events catalog" description="Trigger, recipient rule, channels, priority, timing and escalation">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Recipient rule</TableHead>
                    <TableHead>Channels</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Timing</TableHead>
                    <TableHead>Escalation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {e.name}
                        <span className="num block text-xs text-muted-foreground">{e.id}</span>
                      </TableCell>
                      <TableCell>{e.category}</TableCell>
                      <TableCell className="text-sm">{e.trigger}</TableCell>
                      <TableCell className="text-sm">{e.recipientRule}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{e.channels.join(", ")}</TableCell>
                      <TableCell><PriorityPill value={e.priority} /></TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{e.timing}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.escalation ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
