import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  NoPermission,
  PageHeader,
  PriorityPill,
  SectionCard,
  Segmented,
  StatCard,
  StatusPill,
} from "@/components/workforce/primitives";
import { POLICIES, ROLES } from "@/data/mock";
import {
  ACCESS_AREAS,
  APPROVAL_RULES,
  CAPABILITIES,
  ESCALATION_RULES,
  FEATURES,
  FEATURE_MATRIX,
  NOTIFICATION_RULES,
  ROLE_ACCESS,
  ROLE_CAPABILITIES,
  ROLE_CONFIGURERS,
  ROLE_SCOPE,
} from "@/data/config";
import { useSession } from "@/state/session";

export const Route = createFileRoute("/policies")({
  head: () => ({
    meta: [
      { title: "Policies & Access — Roles, Capabilities and Rules" },
      {
        name: "description",
        content: "Role capability matrix, role access, locality scope, feature permissions, approval, notification and escalation rules.",
      },
      { property: "og:title", content: "Policies & Access — Roles, Capabilities and Rules" },
      { property: "og:description", content: "Capability matrix, access scope and governance rules." },
    ],
  }),
  component: PoliciesPage,
});

const VIEWS = [
  { value: "capabilities", label: "Role Capabilities" },
  { value: "access", label: "Role Access" },
  { value: "configurers", label: "Role Configurers" },
  { value: "features", label: "Feature Permissions" },
  { value: "rules", label: "Policy Rules" },
  { value: "escalation", label: "Escalation" },
] as const;
type View = (typeof VIEWS)[number]["value"];

function PoliciesPage() {
  const { can } = useSession();
  const [view, setView] = useState<View>("capabilities");
  const [policyState, setPolicyState] = useState<Record<string, boolean>>(
    Object.fromEntries(POLICIES.map((p) => [p.id, p.status === "Active"])),
  );

  if (!can("policies")) return <NoPermission area="policies and access configuration" />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Policies & Access"
        description="Single source of truth for what each role can do, where it applies, and which rules trigger approvals, notifications and escalation."
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="Roles" value={ROLES.length} />
        <StatCard label="Capabilities" value={CAPABILITIES.length} />
        <StatCard label="Active Policies" value={Object.values(policyState).filter(Boolean).length} tone="success" />
        <StatCard label="Escalation Chains" value={ESCALATION_RULES.length} />
      </div>

      <Segmented options={VIEWS.map((v) => ({ ...v }))} value={view} onChange={setView} />

      {view === "capabilities" ? (
        <SectionCard title="Role capability matrix" description="Capabilities decide navigation, eligibility and available actions">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card">Role</TableHead>
                  <TableHead>Locality scope</TableHead>
                  {CAPABILITIES.map((c) => <TableHead key={c} className="whitespace-nowrap text-xs">{c}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROLES.map((r) => (
                  <TableRow key={r}>
                    <TableCell className="sticky left-0 bg-card whitespace-nowrap font-medium">{r}</TableCell>
                    <TableCell><StatusPill value={ROLE_SCOPE[r]} /></TableCell>
                    {CAPABILITIES.map((c) => (
                      <TableCell key={c} className="text-center">
                        {ROLE_CAPABILITIES[r].includes(c) ? (
                          <span className="text-success">●</span>
                        ) : (
                          <span className="text-muted-foreground/40">○</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      ) : null}

      {view === "access" ? (
        <SectionCard title="Role access" description="Which modules each role can open">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  {ACCESS_AREAS.map((a) => <TableHead key={a} className="text-xs">{a}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROLE_ACCESS.map((r) => (
                  <TableRow key={r.role}>
                    <TableCell className="whitespace-nowrap font-medium">{r.role}</TableCell>
                    {ACCESS_AREAS.map((a) => (
                      <TableCell key={a} className="text-center">
                        {r.areas.includes(a) ? <span className="text-success">●</span> : <span className="text-muted-foreground/40">○</span>}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      ) : null}

      {view === "configurers" ? (
        <SectionCard title="Role configurers" description="Who is allowed to assign/remove workforce holding each role — separate from who can access the Workforce Assignment / Station Master screens">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Configurable by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROLE_CONFIGURERS.map((r) => (
                  <TableRow key={r.role}>
                    <TableCell className="whitespace-nowrap font-medium">{r.role}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {r.configurableBy.length ? r.configurableBy.join(", ") : "— (not configurable via this workflow)"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      ) : null}

      {view === "features" ? (
        <SectionCard title="Feature permissions" description="Fine-grained actions available to each role">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card">Role</TableHead>
                  {FEATURES.map((f) => <TableHead key={f} className="whitespace-nowrap text-xs">{f}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROLES.map((r) => (
                  <TableRow key={r}>
                    <TableCell className="sticky left-0 bg-card whitespace-nowrap font-medium">{r}</TableCell>
                    {FEATURES.map((f) => (
                      <TableCell key={f} className="text-center">
                        {FEATURE_MATRIX[r].includes(f) ? <span className="text-success">●</span> : <span className="text-muted-foreground/40">○</span>}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      ) : null}

      {view === "rules" ? (
        <div className="space-y-4">
          <SectionCard title="Operational policies" description="Condition → action → approval → notification → escalation">
            <div className="space-y-3">
              {POLICIES.map((p) => (
                <div key={p.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.id} · {p.scope}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill value={policyState[p.id] ? "Active" : "Draft"} />
                      <Switch
                        checked={Boolean(policyState[p.id])}
                        onCheckedChange={(v) => {
                          setPolicyState((s) => ({ ...s, [p.id]: v }));
                          toast.success(`${p.id} ${v ? "activated" : "moved to draft"}`);
                        }}
                        aria-label={`Toggle ${p.id}`}
                      />
                    </div>
                  </div>
                  <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-5">
                    <div><span className="block text-muted-foreground">Conditions</span>{p.conditions.join(" · ")}</div>
                    <div><span className="block text-muted-foreground">Action</span>{p.action}</div>
                    <div><span className="block text-muted-foreground">Approval</span>{p.approval}</div>
                    <div><span className="block text-muted-foreground">Notification</span>{p.notification}</div>
                    <div><span className="block text-muted-foreground">Escalation</span>{p.escalation}</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard title="Approval rules" description="Who approves what, and within which SLA">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>When</TableHead><TableHead>Approver</TableHead><TableHead>SLA</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {APPROVAL_RULES.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{r.when}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.approver}</TableCell>
                      <TableCell className="num whitespace-nowrap">{r.sla}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SectionCard>

            <SectionCard title="Notification rules" description="Event → recipients → channels">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Event</TableHead><TableHead>Recipients</TableHead><TableHead>Channels</TableHead><TableHead>Priority</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {NOTIFICATION_RULES.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap font-medium">{r.event}</TableCell>
                      <TableCell className="text-sm">{r.recipients}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{r.channels}</TableCell>
                      <TableCell><PriorityPill value={r.priority} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SectionCard>
          </div>
        </div>
      ) : null}

      {view === "escalation" ? (
        <SectionCard title="Escalation chains" description="Level-by-level routing when an SLA is breached">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Level 1</TableHead>
                  <TableHead>Level 2</TableHead>
                  <TableHead>Level 3</TableHead>
                  <TableHead>Level 4</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ESCALATION_RULES.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap font-medium">{r.trigger}</TableCell>
                    <TableCell>{r.level1}</TableCell>
                    <TableCell>{r.level2}</TableCell>
                    <TableCell>{r.level3}</TableCell>
                    <TableCell>{r.level4}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      ) : null}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => toast.success("Policy configuration exported")}>Export configuration</Button>
      </div>
    </div>
  );
}
