import {
  CARE_GIVERS,
  FLOORS,
  PATIENTS,
  SHIFTS,
  STATIONS,
  type Priority,
  type RoleName,
  type Shift,
} from "./mock";

/* ---------------------------------- Locations ---------------------------------- */

export type Building = { id: string; name: string; hospital: string; floorIds: string[] };

export const HOSPITALS = [{ id: "H1", name: "Sunrise General Hospital" }];

export const BUILDINGS: Building[] = [
  { id: "B1", name: "Main Block", hospital: "H1", floorIds: ["F1", "F2"] },
  { id: "B2", name: "East Wing", hospital: "H1", floorIds: ["F3", "F4"] },
  { id: "B3", name: "Tower Block", hospital: "H1", floorIds: ["F5"] },
];

export const buildingOfFloor = (floorId: string) => BUILDINGS.find((b) => b.floorIds.includes(floorId));

/* --------------------------------- Capabilities -------------------------------- */

export const CAPABILITIES = [
  "Station Assignment",
  "Patient Assignment",
  "Task Assignment",
  "Task Execution",
  "Patient View",
  "Roster View",
  "Roster Management",
  "Care Workforce Management",
  "Approval",
  "Reports",
  "Audit",
  "Coordinator Mapping",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

export const ROLE_CAPABILITIES: Record<RoleName, Capability[]> = {
  "Nurse Manager": [...CAPABILITIES],
  "Station In-Charge": [
    "Station Assignment", "Patient Assignment", "Task Assignment", "Task Execution",
    "Patient View", "Roster View", "Roster Management", "Care Workforce Management", "Approval", "Reports",
  ],
  "Floor Manager": [
    "Station Assignment", "Task Assignment", "Patient View", "Roster View",
    "Care Workforce Management", "Reports", "Audit", "Coordinator Mapping",
  ],
  "IP Manager": [
    "Station Assignment", "Task Assignment", "Patient View", "Roster View",
    "Care Workforce Management", "Reports", "Audit", "Coordinator Mapping",
  ],
  "Clinical Admin": ["Station Assignment", "Task Execution", "Patient View", "Roster View", "Care Workforce Management", "Reports"],
  Coordinator: ["Task Execution", "Patient View", "Roster View", "Coordinator Mapping"],
  "Clinical Pharmacist": ["Task Execution", "Patient View", "Roster View"],
  Nurse: ["Patient Assignment", "Task Execution", "Patient View", "Roster View"],
};

export type LocalityScope = "Hospital" | "Building" | "Floor" | "Station";

export const ROLE_SCOPE: Record<RoleName, LocalityScope> = {
  "Nurse Manager": "Hospital",
  "IP Manager": "Building",
  "Floor Manager": "Floor",
  "Station In-Charge": "Station",
  "Clinical Admin": "Floor",
  Coordinator: "Station",
  "Clinical Pharmacist": "Station",
  Nurse: "Station",
};

export const hasCapability = (role: RoleName, cap: Capability) => ROLE_CAPABILITIES[role].includes(cap);

/* ------------------------------- Feature matrix -------------------------------- */

export const FEATURES = [
  "View Workforce",
  "Create Workforce",
  "Configure Roster",
  "Assign Station",
  "Assign Patient",
  "Create Task",
  "Complete Task",
  "Approve",
  "View Reports",
  "Export Reports",
  "View Audit",
] as const;
export type Feature = (typeof FEATURES)[number];

export const FEATURE_MATRIX: Record<RoleName, Feature[]> = {
  "Nurse Manager": [...FEATURES],
  "Station In-Charge": ["View Workforce", "Configure Roster", "Assign Station", "Assign Patient", "Create Task", "Complete Task", "Approve", "View Reports", "Export Reports"],
  "Floor Manager": ["View Workforce", "Assign Station", "Create Task", "View Reports", "Export Reports", "View Audit"],
  "IP Manager": ["View Workforce", "Assign Station", "Create Task", "View Reports", "Export Reports", "View Audit"],
  "Clinical Admin": ["View Workforce", "Assign Station", "Complete Task", "View Reports"],
  Coordinator: ["View Workforce", "Complete Task"],
  "Clinical Pharmacist": ["Complete Task"],
  Nurse: ["Assign Patient", "Complete Task"],
};

export const ACCESS_AREAS = [
  "Dashboard",
  "Workforce",
  "Roster",
  "Station",
  "Patient",
  "Task",
  "Approval",
  "Reports",
  "Audit",
] as const;
export type AccessArea = (typeof ACCESS_AREAS)[number];

export const ROLE_ACCESS: { role: RoleName; areas: AccessArea[] }[] = [
  { role: "Nurse Manager", areas: [...ACCESS_AREAS] },
  { role: "Station In-Charge", areas: ["Dashboard", "Workforce", "Roster", "Station", "Patient", "Task", "Approval", "Reports"] },
  { role: "Floor Manager", areas: ["Dashboard", "Workforce", "Roster", "Station", "Task", "Reports", "Audit"] },
  { role: "IP Manager", areas: ["Dashboard", "Workforce", "Roster", "Station", "Task", "Reports", "Audit"] },
  { role: "Clinical Admin", areas: ["Dashboard", "Workforce", "Roster", "Station", "Task", "Reports"] },
  { role: "Coordinator", areas: ["Dashboard", "Roster", "Station", "Task"] },
  { role: "Clinical Pharmacist", areas: ["Dashboard", "Roster", "Station", "Task"] },
  { role: "Nurse", areas: ["Dashboard", "Roster", "Patient", "Task"] },
];

/* ----------------------------------- Roster ------------------------------------ */

export type RosterStatus = "Scheduled" | "Off" | "Leave";

export type RosterEntry = {
  id: string;
  careGiverId: string;
  stationId: string;
  date: string; // ISO yyyy-mm-dd
  shift: Shift;
  status: RosterStatus;
};

const WEEK = ["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21", "2026-08-22", "2026-08-23"];
export const ROSTER_WEEK = WEEK;

function buildRoster(): RosterEntry[] {
  const out: RosterEntry[] = [];
  CARE_GIVERS.forEach((c, ci) => {
    if (c.stationIds.length === 0) return;
    WEEK.forEach((date, di) => {
      const station = c.stationIds[(ci + di) % c.stationIds.length]!;
      const off = (ci + di) % 7 === 3;
      const leave = c.status === "On Leave" && di < 3;
      out.push({
        id: `R-${c.id}-${date}`,
        careGiverId: c.id,
        stationId: station,
        date,
        shift: c.shift,
        status: leave ? "Leave" : off ? "Off" : "Scheduled",
      });
    });
  });
  // Deliberate double-booking conflict for the prototype's conflict state.
  out.push({ id: "R-CG03-conflict", careGiverId: "CG03", stationId: "S304", date: "2026-08-18", shift: "Morning", status: "Scheduled" });
  out.push({ id: "R-CG16-conflict", careGiverId: "CG16", stationId: "S302", date: "2026-08-19", shift: "Morning", status: "Scheduled" });
  return out;
}

export const ROSTER: RosterEntry[] = buildRoster();

export function rosterConflicts(entries: RosterEntry[]) {
  const seen = new Map<string, RosterEntry[]>();
  entries
    .filter((e) => e.status === "Scheduled")
    .forEach((e) => {
      const key = `${e.careGiverId}|${e.date}|${e.shift}`;
      seen.set(key, [...(seen.get(key) ?? []), e]);
    });
  return Array.from(seen.values()).filter((g) => g.length > 1);
}

export const isRosteredToday = (careGiverId: string) =>
  ROSTER.some((r) => r.careGiverId === careGiverId && r.status === "Scheduled");

/* --------------------------------- Eligibility --------------------------------- */

export type EligibilityCheck = { label: string; ok: boolean; detail: string };

export function evaluateEligibility(opts: {
  careGiverId: string;
  capability: Capability;
  stationId?: string;
  patientId?: string;
}): { eligible: boolean; checks: EligibilityCheck[] } {
  const cg = CARE_GIVERS.find((c) => c.id === opts.careGiverId);
  const checks: EligibilityCheck[] = [];
  if (!cg) return { eligible: false, checks: [{ label: "Workforce record", ok: false, detail: "Record not found" }] };

  checks.push({
    label: "Employment status",
    ok: cg.status === "Active",
    detail: cg.status === "Active" ? "Active employee" : `Status is ${cg.status}`,
  });
  checks.push({ label: "Role", ok: true, detail: cg.role });
  checks.push({
    label: `Capability: ${opts.capability}`,
    ok: hasCapability(cg.role, opts.capability),
    detail: hasCapability(cg.role, opts.capability)
      ? "Enabled for this role"
      : `${opts.capability} is not enabled for the ${cg.role} role`,
  });
  if (opts.stationId) {
    const ok = cg.stationIds.includes(opts.stationId);
    checks.push({
      label: "Location scope",
      ok,
      detail: ok
        ? `${STATIONS.find((s) => s.id === opts.stationId)?.name} is inside the assigned scope`
        : "Station is outside this worker's assigned floor/station scope",
    });
  }
  if (opts.capability !== "Station Assignment") {
    checks.push({
      label: "Roster availability",
      ok: isRosteredToday(cg.id),
      detail: isRosteredToday(cg.id) ? `Rostered for the ${cg.shift} shift` : "No scheduled roster entry",
    });
  }
  if (opts.patientId) {
    const patient = PATIENTS.find((p) => p.id === opts.patientId);
    const ok = Boolean(patient && opts.stationId && patient.stationId === opts.stationId);
    checks.push({
      label: "Patient belongs to station",
      ok,
      detail: ok ? "Patient is admitted in the selected nursing station" : "Patient is not admitted in this station",
    });
  }
  return { eligible: checks.every((c) => c.ok), checks };
}

/* ----------------------------------- Events ------------------------------------ */

export type EventCategory = "Workforce" | "Station" | "Roster" | "Patient" | "Task" | "Approval";

export type EventDef = {
  id: string;
  category: EventCategory;
  name: string;
  trigger: string;
  recipientRule: string;
  channels: ("In-App" | "Push" | "Email")[];
  priority: Priority;
  timing: string;
  escalation?: string;
};

export const EVENTS: EventDef[] = [
  { id: "EV-W1", category: "Workforce", name: "Workforce member created", trigger: "New workforce record saved", recipientRule: "Role = Nurse Manager in same Hospital", channels: ["In-App", "Email"], priority: "Low", timing: "Immediate" },
  { id: "EV-W2", category: "Workforce", name: "Workforce activated", trigger: "Employment status set to Active", recipientRule: "Station In-Charge of mapped stations", channels: ["In-App"], priority: "Low", timing: "Immediate" },
  { id: "EV-W3", category: "Workforce", name: "Workforce deactivated", trigger: "Employment status set to Inactive", recipientRule: "Nurse Manager + Station In-Charge of mapped stations", channels: ["In-App", "Email"], priority: "High", timing: "Immediate", escalation: "Coverage recheck after 30 min" },
  { id: "EV-W4", category: "Workforce", name: "Role or responsibility changed", trigger: "Role/Responsibility updated", recipientRule: "Nurse Manager + affected worker", channels: ["In-App", "Email"], priority: "Medium", timing: "Immediate" },
  { id: "EV-S1", category: "Station", name: "Station assigned", trigger: "Worker mapped to nursing station", recipientRule: "Worker + Station In-Charge (station) + Floor Manager (floor)", channels: ["In-App", "Push"], priority: "Medium", timing: "Immediate" },
  { id: "EV-S2", category: "Station", name: "Station removed", trigger: "Station mapping removed", recipientRule: "Worker + Station In-Charge", channels: ["In-App"], priority: "Medium", timing: "Immediate" },
  { id: "EV-S3", category: "Station", name: "Station moved", trigger: "Worker moved between stations", recipientRule: "Both Station In-Charges + Nurse Manager", channels: ["In-App", "Email"], priority: "High", timing: "Immediate", escalation: "Nurse Manager after 4h SLA" },
  { id: "EV-S4", category: "Station", name: "Assignment conflict", trigger: "Overlapping station assignment detected", recipientRule: "Nurse Manager + Station In-Charge", channels: ["In-App", "Push"], priority: "Critical", timing: "Immediate", escalation: "IP Manager after 1h" },
  { id: "EV-R1", category: "Roster", name: "Roster created", trigger: "Roster published for a period", recipientRule: "All workers in scope + Station In-Charge", channels: ["In-App", "Email"], priority: "Low", timing: "On publish" },
  { id: "EV-R2", category: "Roster", name: "Shift assigned or changed", trigger: "Shift added or modified", recipientRule: "Affected worker + Station In-Charge", channels: ["In-App", "Push"], priority: "Medium", timing: "Immediate" },
  { id: "EV-R3", category: "Roster", name: "Roster removed", trigger: "Roster entry deleted", recipientRule: "Affected worker + Station In-Charge", channels: ["In-App"], priority: "Medium", timing: "Immediate" },
  { id: "EV-R4", category: "Roster", name: "Leave applied", trigger: "Worker marked on leave", recipientRule: "Station In-Charge + Nurse Manager", channels: ["In-App", "Email"], priority: "Medium", timing: "Immediate" },
  { id: "EV-R5", category: "Roster", name: "Roster conflict", trigger: "Same worker double-booked in a shift", recipientRule: "Station In-Charge of both stations", channels: ["In-App", "Push"], priority: "Critical", timing: "Immediate", escalation: "Nurse Manager after 30 min" },
  { id: "EV-R6", category: "Roster", name: "Coverage shortage", trigger: "Station coverage below policy minimum", recipientRule: "Station In-Charge → Floor Manager → Nurse Manager", channels: ["In-App", "Push", "Email"], priority: "Critical", timing: "Immediate", escalation: "Escalate every 30 min until resolved" },
  { id: "EV-P1", category: "Patient", name: "Patient assigned", trigger: "Patient mapped to a care giver", recipientRule: "Assigned nurse + Station In-Charge", channels: ["In-App", "Push"], priority: "Medium", timing: "Immediate" },
  { id: "EV-P2", category: "Patient", name: "Patient unassigned", trigger: "Patient mapping removed", recipientRule: "Previous nurse + Station In-Charge", channels: ["In-App"], priority: "Medium", timing: "Immediate" },
  { id: "EV-P3", category: "Patient", name: "Multi-nurse conflict", trigger: "Second nurse assigned to same patient", recipientRule: "Station In-Charge (approver) + Nurse Manager", channels: ["In-App", "Email"], priority: "High", timing: "Immediate", escalation: "Nurse Manager after 2h" },
  { id: "EV-P4", category: "Patient", name: "Patient approval decided", trigger: "Multi-nurse request approved or rejected", recipientRule: "Requester + affected nurses", channels: ["In-App", "Push"], priority: "Medium", timing: "Immediate" },
  { id: "EV-T1", category: "Task", name: "Task created", trigger: "Task configured and saved", recipientRule: "Matching Role + Responsibility in the station", channels: ["In-App"], priority: "Low", timing: "Immediate" },
  { id: "EV-T2", category: "Task", name: "Task assigned", trigger: "Task routed to a worker", recipientRule: "Assignee", channels: ["In-App", "Push"], priority: "Medium", timing: "Immediate" },
  { id: "EV-T3", category: "Task", name: "Task completed", trigger: "Task marked complete", recipientRule: "Station In-Charge", channels: ["In-App"], priority: "Low", timing: "Immediate" },
  { id: "EV-T4", category: "Task", name: "Task overdue", trigger: "Due time passed", recipientRule: "Assignee", channels: ["In-App", "Push"], priority: "High", timing: "At due time", escalation: "Station In-Charge after SLA, Nurse Manager after 2× SLA" },
  { id: "EV-T5", category: "Task", name: "Task escalated", trigger: "SLA exceeded after overdue", recipientRule: "Station In-Charge → Floor Manager → Nurse Manager", channels: ["In-App", "Push", "Email"], priority: "Critical", timing: "On SLA breach", escalation: "Every 30 min until acknowledged" },
  { id: "EV-T6", category: "Task", name: "Task reassigned", trigger: "Assignee changed", recipientRule: "Old assignee + new assignee + Station In-Charge", channels: ["In-App"], priority: "Medium", timing: "Immediate" },
  { id: "EV-A1", category: "Approval", name: "Approval requested", trigger: "Policy requires approval for a change", recipientRule: "Approver resolved from policy (Role + Station + Floor)", channels: ["In-App", "Email"], priority: "High", timing: "Immediate", escalation: "Reminder after 2h, escalate after 4h" },
  { id: "EV-A2", category: "Approval", name: "Approval approved", trigger: "Approver approves request", recipientRule: "Requester + affected workers", channels: ["In-App", "Push"], priority: "Medium", timing: "Immediate" },
  { id: "EV-A3", category: "Approval", name: "Approval rejected", trigger: "Approver rejects request", recipientRule: "Requester", channels: ["In-App"], priority: "Medium", timing: "Immediate" },
  { id: "EV-A4", category: "Approval", name: "Changes requested", trigger: "Approver requests changes", recipientRule: "Requester", channels: ["In-App"], priority: "Medium", timing: "Immediate" },
  { id: "EV-A5", category: "Approval", name: "Approval overdue", trigger: "Approval SLA breached", recipientRule: "Approver + Nurse Manager", channels: ["In-App", "Email"], priority: "Critical", timing: "On SLA breach", escalation: "Nurse Manager immediately" },
];

/* ------------------------------- Task definitions ------------------------------ */

export type TaskType = {
  id: string;
  name: string;
  description: string;
  role: RoleName;
  patientRequirement: "Required" | "Optional" | "Not applicable";
  priority: Priority;
  sla: string;
  escalationRule: string;
};

export const TASK_TYPES: TaskType[] = [
  { id: "TT-1", name: "Medication reconciliation", description: "Reconcile home and inpatient medication lists on admission.", role: "Clinical Pharmacist", patientRequirement: "Required", priority: "High", sla: "4 hours", escalationRule: "Station In-Charge after SLA, Nurse Manager after 2× SLA" },
  { id: "TT-2", name: "Shift handover checklist", description: "Bedside handover, pump check and controlled drug count.", role: "Station In-Charge", patientRequirement: "Not applicable", priority: "Medium", sla: "1 hour", escalationRule: "Floor Manager after SLA" },
  { id: "TT-3", name: "Patient transfer coordination", description: "Arrange porter, bed and documentation for inter-station transfer.", role: "Coordinator", patientRequirement: "Required", priority: "Critical", sla: "30 minutes", escalationRule: "Station In-Charge → Nurse Manager every 30 min" },
  { id: "TT-4", name: "Discharge documentation pack", description: "Assemble summary, prescriptions and follow-up slip.", role: "Clinical Admin", patientRequirement: "Optional", priority: "Medium", sla: "6 hours", escalationRule: "Station In-Charge after SLA" },
  { id: "TT-5", name: "Coverage shortfall review", description: "Review and resolve station coverage below policy minimum.", role: "Floor Manager", patientRequirement: "Not applicable", priority: "Critical", sla: "30 minutes", escalationRule: "Nurse Manager immediately after SLA" },
];

/* -------------------------------- Policy rules --------------------------------- */

export const APPROVAL_RULES = [
  { id: "AR-1", when: "Station In-Charge performs a major assignment change", approver: "Nurse Manager", sla: "4 hours", onBreach: "Escalate to Inpatient Operations" },
  { id: "AR-2", when: "A second nurse is assigned to the same patient", approver: "Station In-Charge", sla: "2 hours", onBreach: "Escalate to Nurse Manager" },
  { id: "AR-3", when: "Roster shift change inside 12 hours of shift start", approver: "Station In-Charge", sla: "1 hour", onBreach: "Auto-notify Floor Manager" },
  { id: "AR-4", when: "Workforce deactivation with active station mapping", approver: "Nurse Manager", sla: "2 hours", onBreach: "Escalate to Inpatient Operations" },
];

export const NOTIFICATION_RULES = [
  { id: "NR-1", event: "Station assigned", recipients: "Worker, Station In-Charge, Floor Manager", channels: "In-App, Push", priority: "Medium" as Priority },
  { id: "NR-2", event: "Roster conflict", recipients: "Station In-Charge of both stations", channels: "In-App, Push", priority: "Critical" as Priority },
  { id: "NR-3", event: "Coverage shortage", recipients: "Station In-Charge, Floor Manager, Nurse Manager", channels: "In-App, Push, Email", priority: "Critical" as Priority },
  { id: "NR-4", event: "Task overdue", recipients: "Assignee, then Station In-Charge", channels: "In-App, Push", priority: "High" as Priority },
  { id: "NR-5", event: "Approval requested", recipients: "Resolved approver from policy", channels: "In-App, Email", priority: "High" as Priority },
];

export const ESCALATION_RULES = [
  { id: "ER-1", trigger: "Task overdue", level1: "Assignee", level2: "Station In-Charge (+15 min)", level3: "Floor Manager (+30 min)", level4: "Nurse Manager (+60 min)" },
  { id: "ER-2", trigger: "Coverage shortage", level1: "Station In-Charge", level2: "Floor Manager (+15 min)", level3: "IP Manager (+30 min)", level4: "Nurse Manager (+45 min)" },
  { id: "ER-3", trigger: "Approval overdue", level1: "Approver", level2: "Nurse Manager (+2h)", level3: "Inpatient Operations (+4h)", level4: "—" },
];

/* --------------------------------- Derived data -------------------------------- */

export const activeWorkforce = CARE_GIVERS.filter((c) => c.status === "Active");

export function shiftCoverageForStation(stationId: string) {
  return SHIFTS.map((s) => ({
    shift: s,
    staffed: CARE_GIVERS.filter((c) => c.stationIds.includes(stationId) && c.shift === s).length,
  }));
}

export const floorsOfBuilding = (buildingId: string) =>
  FLOORS.filter((f) => BUILDINGS.find((b) => b.id === buildingId)?.floorIds.includes(f.id));
