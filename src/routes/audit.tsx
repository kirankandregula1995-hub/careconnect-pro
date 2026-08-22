import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  EmptyState,
  FilterBar,
  MultiSelect,
  NoPermission,
  PageHeader,
  SearchBox,
  SectionCard,
  StatCard,
  StatusPill,
} from "@/components/workforce/primitives";
import { AUDIT, FLOORS, ROLES, SHIFTS, STATIONS, floorName, stationName } from "@/data/mock";
import { useSession } from "@/state/session";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit — Change History with Old and New Values" },
      {
        name: "description",
        content: "Immutable audit trail of workforce, roster and assignment changes with user, role, location, shift and old versus new values.",
      },
      { property: "og:title", content: "Audit — Change History" },
      { property: "og:description", content: "Immutable audit trail of workforce and assignment changes." },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const { can, scopeStationIds } = useSession();
  const [q, setQ] = useState("");
  const [actions, setActions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [floors, setFloors] = useState<string[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);

  if (!can("audit")) return <NoPermission area="the audit trail" />;

  const scoped = AUDIT.filter((a) => scopeStationIds.includes(a.stationId));
  const rows = scoped.filter(
    (a) =>
      `${a.user} ${a.oldValue} ${a.newValue}`.toLowerCase().includes(q.toLowerCase()) &&
      (actions.length === 0 || actions.includes(a.action)) &&
      (roles.length === 0 || roles.includes(a.role)) &&
      (floors.length === 0 || floors.includes(a.floorId)) &&
      (shifts.length === 0 || shifts.includes(a.shift)),
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit"
        description="Every configuration, assignment and approval action is recorded with its old and new value."
        actions={
          <Button size="sm" variant="outline" onClick={() => toast.success("Audit export queued — Audit-Trail.csv")}>
            <Download className="size-4" /> Export
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="Entries in Scope" value={scoped.length} />
        <StatCard label="Updates" value={scoped.filter((a) => a.action === "UPDATE").length} />
        <StatCard label="Approvals" value={scoped.filter((a) => a.action === "APPROVE").length} tone="success" />
        <StatCard label="Rejections" value={scoped.filter((a) => a.action === "REJECT").length} tone="danger" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterBar>
          <MultiSelect
            label="Action"
            options={["CREATE", "UPDATE", "REMOVE", "APPROVE", "REJECT"].map((a) => ({ value: a, label: a }))}
            selected={actions}
            onChange={setActions}
          />
          <MultiSelect label="Role" options={ROLES.map((r) => ({ value: r, label: r }))} selected={roles} onChange={setRoles} />
          <MultiSelect
            label="Floor"
            options={FLOORS.filter((f) => STATIONS.some((s) => s.floorId === f.id && scopeStationIds.includes(s.id))).map((f) => ({ value: f.id, label: f.name }))}
            selected={floors}
            onChange={setFloors}
          />
          <MultiSelect label="Shift" options={SHIFTS.map((s) => ({ value: s, label: s }))} selected={shifts} onChange={setShifts} />
        </FilterBar>
        <SearchBox value={q} onChange={setQ} placeholder="Search user or value…" />
      </div>

      <SectionCard title="Change history" description="Newest first">
        {rows.length === 0 ? (
          <EmptyState title="No audit entries" description="No changes match the current filters within your scope." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Old value</TableHead>
                  <TableHead>New value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="num whitespace-nowrap">{a.date}</TableCell>
                    <TableCell className="whitespace-nowrap font-medium">{a.user}</TableCell>
                    <TableCell><StatusPill value={a.action} /></TableCell>
                    <TableCell className="whitespace-nowrap">{a.role}</TableCell>
                    <TableCell className="whitespace-nowrap">{floorName(a.floorId)}</TableCell>
                    <TableCell className="whitespace-nowrap">{stationName(a.stationId)}</TableCell>
                    <TableCell>{a.shift}</TableCell>
                    <TableCell className="text-muted-foreground">{a.oldValue}</TableCell>
                    <TableCell>{a.newValue}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
