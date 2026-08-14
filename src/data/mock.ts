export type RoleName =
  | "Nurse"
  | "Nurse Manager"
  | "Station In-Charge"
  | "Clinical Admin"
  | "Coordinator"
  | "Clinical Pharmacist"
  | "IP Manager"
  | "Floor Manager";

export const ROLES: RoleName[] = [
  "Nurse",
  "Nurse Manager",
  "Station In-Charge",
  "Clinical Admin",
  "Coordinator",
  "Clinical Pharmacist",
  "IP Manager",
  "Floor Manager",
];

export const RESPONSIBILITIES = [
  "Bedside Nursing",
  "Station In-Charge",
  "Clinical Administration",
  "Coordinator",
  "Clinical Pharmacy",
  "Workforce Oversight",
  "Floor Operations",
  "Inpatient Operations",
] as const;
export type Responsibility = (typeof RESPONSIBILITIES)[number];

export const SHIFTS = ["Morning", "Evening", "Night"] as const;
export type Shift = (typeof SHIFTS)[number];
export const SHIFT_TIME: Record<Shift, string> = {
  Morning: "07:00 – 15:00",
  Evening: "15:00 – 23:00",
  Night: "23:00 – 07:00",
};

export type Floor = { id: string; name: string; hospital: string; location: string };

export const FLOORS: Floor[] = [
  { id: "F1", name: "Floor 1", hospital: "Sunrise General Hospital", location: "Main Block" },
  { id: "F2", name: "Floor 2", hospital: "Sunrise General Hospital", location: "Main Block" },
  { id: "F3", name: "Floor 3", hospital: "Sunrise General Hospital", location: "East Wing" },
  { id: "F4", name: "Floor 4", hospital: "Sunrise General Hospital", location: "East Wing" },
  { id: "F5", name: "Floor 5", hospital: "Sunrise General Hospital", location: "Tower Block" },
];

export type Station = {
  id: string;
  name: string;
  code: string;
  floorId: string;
  department: string;
  beds: number;
  status: "Active" | "Inactive";
};

export const STATIONS: Station[] = [
  { id: "S101", name: "Ward 101", code: "NS-101", floorId: "F1", department: "Emergency & Triage", beds: 18, status: "Active" },
  { id: "S102", name: "Ward 102", code: "NS-102", floorId: "F1", department: "Emergency & Triage", beds: 14, status: "Active" },
  { id: "S103", name: "Ward 103", code: "NS-103", floorId: "F1", department: "Day Care", beds: 10, status: "Inactive" },
  { id: "S201", name: "Ward 201", code: "NS-201", floorId: "F2", department: "General Medicine", beds: 24, status: "Active" },
  { id: "S202", name: "Ward 202", code: "NS-202", floorId: "F2", department: "General Medicine", beds: 22, status: "Active" },
  { id: "S203", name: "Ward 203", code: "NS-203", floorId: "F2", department: "Gastroenterology", beds: 16, status: "Active" },
  { id: "S301", name: "Ward 301", code: "NS-301", floorId: "F3", department: "Cardiology", beds: 20, status: "Active" },
  { id: "S302", name: "Ward 302", code: "NS-302", floorId: "F3", department: "Cardiology ICU", beds: 12, status: "Active" },
  { id: "S303", name: "Ward 303", code: "NS-303", floorId: "F3", department: "Cardiothoracic Surgery", beds: 15, status: "Active" },
  { id: "S304", name: "Ward 304", code: "NS-304", floorId: "F3", department: "Step-Down Unit", beds: 18, status: "Active" },
  { id: "S401", name: "Ward 401", code: "NS-401", floorId: "F4", department: "Orthopaedics", beds: 20, status: "Active" },
  { id: "S402", name: "Ward 402", code: "NS-402", floorId: "F4", department: "Neurology", beds: 16, status: "Active" },
  { id: "S403", name: "Ward 403", code: "NS-403", floorId: "F4", department: "Neuro ICU", beds: 10, status: "Active" },
  { id: "S501", name: "Ward 501", code: "NS-501", floorId: "F5", department: "Oncology", beds: 22, status: "Active" },
  { id: "S502", name: "Ward 502", code: "NS-502", floorId: "F5", department: "Palliative Care", beds: 12, status: "Active" },
];

export const floorById = (id: string) => FLOORS.find((f) => f.id === id);
export const stationById = (id: string) => STATIONS.find((s) => s.id === id);
export const floorName = (id: string) => floorById(id)?.name ?? "—";
export const stationName = (id: string) => stationById(id)?.name ?? "—";
export const stationsOfFloor = (floorId: string) => STATIONS.filter((s) => s.floorId === floorId);

/** Roles capable of bedside/patient care. Every other role (Coordinator, Clinical
 *  Admin, Clinical Pharmacist, IP Manager, Floor Manager, Nurse Manager) is
 *  never eligible for Patient Assignment, regardless of mapping/roster status. */
export const NURSE_CAPABLE_ROLES: RoleName[] = ["Nurse", "Station In-Charge"];

export type CareGiver = {
  id: string;
  empId: string;
  name: string;
  role: RoleName;
  responsibility: Responsibility;
  shift: Shift;
  stationIds: string[];
  floorIds: string[];
  status: "Active" | "On Leave" | "Inactive";
  phone: string;
  email: string;
  /** Nurse-patient mapping configuration (prism_nurse_station_mapping equivalent).
   *  Only meaningful for NURSE_CAPABLE_ROLES - a Nurse/Station In-Charge without
   *  this flag has a station and shift but has never been configured for patient
   *  assignment, so they still don't appear as a Patient Assignment candidate. */
  nursePatientMappingConfigured: boolean;
};

const cg = (
  id: string,
  empId: string,
  name: string,
  role: RoleName,
  responsibility: Responsibility,
  shift: Shift,
  stationIds: string[],
  status: CareGiver["status"] = "Active",
  nursePatientMappingConfigured: boolean = NURSE_CAPABLE_ROLES.includes(role),
): CareGiver => ({
  id,
  empId,
  name,
  role,
  responsibility,
  shift,
  stationIds,
  floorIds: Array.from(new Set(stationIds.map((s) => stationById(s)?.floorId ?? ""))).filter(Boolean),
  status,
  phone: "+91 98" + (40000000 + Number(id.replace(/\D/g, "")) * 137).toString().slice(0, 8),
  email: name.toLowerCase().replace(/[^a-z]+/g, ".") + "@sunrisehospital.org",
  nursePatientMappingConfigured,
});

export const CARE_GIVERS: CareGiver[] = [
  cg("CG01", "EMP-1001", "Meera Raghavan", "Nurse Manager", "Workforce Oversight", "Morning", ["S201", "S301", "S302", "S401", "S501"]),
  cg("CG02", "EMP-1002", "Anitha Kumar", "Clinical Admin", "Clinical Administration", "Morning", ["S301", "S302", "S303", "S304"]),
  cg("CG03", "EMP-1003", "Ravi Kumar", "Coordinator", "Coordinator", "Morning", ["S301", "S302", "S304"]),
  cg("CG04", "EMP-1004", "Suresh Iyer", "Coordinator", "Coordinator", "Evening", ["S301", "S303"]),
  cg("CG05", "EMP-1005", "Divya Nair", "Coordinator", "Coordinator", "Night", ["S401", "S402"]),
  cg("CG06", "EMP-1006", "Fatima Sheikh", "Coordinator", "Coordinator", "Morning", []),
  cg("CG07", "EMP-1007", "Joseph Mathew", "Coordinator", "Coordinator", "Evening", []),
  cg("CG08", "EMP-1008", "Priya Deshmukh", "Clinical Pharmacist", "Clinical Pharmacy", "Morning", ["S301", "S302"]),
  cg("CG09", "EMP-1009", "Karthik Menon", "Clinical Pharmacist", "Clinical Pharmacy", "Evening", ["S401", "S403"]),
  cg("CG10", "EMP-1010", "Sneha Pillai", "Clinical Pharmacist", "Clinical Pharmacy", "Morning", ["S501", "S502"]),
  cg("CG11", "EMP-1011", "Lakshmi Venkatesh", "Station In-Charge", "Station In-Charge", "Morning", ["S301", "S302"]),
  cg("CG12", "EMP-1012", "Arjun Reddy", "Station In-Charge", "Station In-Charge", "Evening", ["S401", "S402"]),
  cg("CG13", "EMP-1013", "Nisha Verma", "Station In-Charge", "Station In-Charge", "Night", ["S201", "S202"]),
  cg("CG14", "EMP-1014", "Ramesh Gupta", "IP Manager", "Inpatient Operations", "Morning", ["S201", "S301", "S401"]),
  cg("CG15", "EMP-1015", "Sarita Joshi", "Floor Manager", "Floor Operations", "Morning", ["S301", "S302", "S303", "S304"]),
  cg("CG16", "EMP-1016", "Deepa Krishnan", "Nurse", "Bedside Nursing", "Morning", ["S301"]),
  cg("CG17", "EMP-1017", "Vishal Rao", "Nurse", "Bedside Nursing", "Morning", ["S301"]),
  cg("CG18", "EMP-1018", "Kavya Suresh", "Nurse", "Bedside Nursing", "Evening", ["S301"]),
  cg("CG19", "EMP-1019", "Manoj Tiwari", "Nurse", "Bedside Nursing", "Night", ["S301"]),
  cg("CG20", "EMP-1020", "Rekha Bhatt", "Nurse", "Bedside Nursing", "Morning", ["S302"]),
  cg("CG21", "EMP-1021", "Imran Qureshi", "Nurse", "Bedside Nursing", "Evening", ["S302"]),
  cg("CG22", "EMP-1022", "Shalini Prasad", "Nurse", "Bedside Nursing", "Night", ["S302"], "On Leave"),
  cg("CG23", "EMP-1023", "Ajay Bhatia", "Nurse", "Bedside Nursing", "Morning", ["S303"]),
  cg("CG24", "EMP-1024", "Neha Sinha", "Nurse", "Bedside Nursing", "Evening", ["S303"]),
  cg("CG25", "EMP-1025", "Gopal Shetty", "Nurse", "Bedside Nursing", "Morning", ["S304"]),
  cg("CG26", "EMP-1026", "Aarti Malhotra", "Nurse", "Bedside Nursing", "Evening", ["S304"]),
  cg("CG27", "EMP-1027", "Rahul Kulkarni", "Nurse", "Bedside Nursing", "Morning", ["S401"]),
  cg("CG28", "EMP-1028", "Swati Chauhan", "Nurse", "Bedside Nursing", "Evening", ["S401"]),
  cg("CG29", "EMP-1029", "Nandini Rao", "Nurse", "Bedside Nursing", "Morning", ["S402"]),
  cg("CG30", "EMP-1030", "Pooja Agarwal", "Nurse", "Bedside Nursing", "Night", ["S403"]),
  cg("CG31", "EMP-1031", "Sanjay Patel", "Nurse", "Bedside Nursing", "Morning", ["S201"]),
  cg("CG32", "EMP-1032", "Bhavna Desai", "Nurse", "Bedside Nursing", "Evening", ["S202"]),
  cg("CG33", "EMP-1033", "Harish Chandra", "Nurse", "Bedside Nursing", "Morning", ["S203"]),
  cg("CG34", "EMP-1034", "Leela Thomas", "Nurse", "Bedside Nursing", "Morning", ["S501"]),
  cg("CG35", "EMP-1035", "Farhan Ali", "Nurse", "Bedside Nursing", "Evening", ["S502"]),
  cg("CG36", "EMP-1036", "Anjali Bose", "Nurse", "Bedside Nursing", "Morning", ["S101"]),
  // Vikram Singh: has a station and shift, but nurse-patient mapping was never configured -
  // demonstrates the eligibility rule rejecting someone otherwise workforce-active.
  cg("CG37", "EMP-1037", "Vikram Singh", "Nurse", "Bedside Nursing", "Night", ["S102"], "Active", false),
  cg("CG38", "EMP-1038", "Tara Menon", "Clinical Admin", "Clinical Administration", "Evening", ["S401", "S402", "S403"]),
  cg("CG39", "EMP-1039", "Mohan Das", "Clinical Admin", "Clinical Administration", "Morning", []),
  cg("CG40", "EMP-1040", "Rithika Shah", "Nurse", "Bedside Nursing", "Morning", [], "Active"),
];

export const EMERGENCY_CODES = [
  { value: "code_blue", label: "Code Blue" },
  { value: "code_orange", label: "Code Orange" },
] as const;

export const INVENTORY_ITEMS = [
  "Code blue Kit",
  "Disaster kit",
  "Central line Trolley",
  "Glucostrip and Quality Control",
  "SUD",
  "Portable suction",
  "External Crash cart checklist",
  "Central line checklist",
  "ABG Analysis",
];

export type Patient = {
  id: string;
  name: string;
  mrn: string;
  bed: string;
  stationId: string;
  careGiverId: string | null;
  shift: Shift;
  status: "Admitted" | "Under Observation" | "Discharge Planned";
  /** Emergency response codes and crash-cart/checklist inventory tagged onto the
   *  current patient assignment (old nurse-mapper AssignmentsTab.jsx concept). */
  emergencyRoles?: string[];
  inventoryItems?: string[];
};

export const PATIENTS: Patient[] = [
  { id: "P1", name: "Ganesh Iyer", mrn: "MRN-448201", bed: "301-A1", stationId: "S301", careGiverId: "CG16", shift: "Morning", status: "Admitted" },
  { id: "P2", name: "Radha Menon", mrn: "MRN-448215", bed: "301-A2", stationId: "S301", careGiverId: "CG16", shift: "Morning", status: "Under Observation" },
  { id: "P3", name: "Salim Khan", mrn: "MRN-448233", bed: "301-B1", stationId: "S301", careGiverId: "CG17", shift: "Morning", status: "Admitted" },
  { id: "P4", name: "Kiran Bedi", mrn: "MRN-448250", bed: "301-B4", stationId: "S301", careGiverId: null, shift: "Evening", status: "Admitted" },
  { id: "P5", name: "Sunita Roy", mrn: "MRN-448266", bed: "302-A1", stationId: "S302", careGiverId: "CG20", shift: "Morning", status: "Under Observation" },
  { id: "P6", name: "Ashok Naidu", mrn: "MRN-448278", bed: "302-A3", stationId: "S302", careGiverId: "CG21", shift: "Evening", status: "Discharge Planned" },
  { id: "P7", name: "Mary Fernandes", mrn: "MRN-448290", bed: "303-C2", stationId: "S303", careGiverId: "CG23", shift: "Morning", status: "Admitted" },
  { id: "P8", name: "Devendra Yadav", mrn: "MRN-448311", bed: "304-A2", stationId: "S304", careGiverId: "CG25", shift: "Morning", status: "Admitted" },
  { id: "P9", name: "Ruchi Sharma", mrn: "MRN-448322", bed: "401-B1", stationId: "S401", careGiverId: "CG27", shift: "Morning", status: "Admitted" },
  { id: "P10", name: "Prakash Jain", mrn: "MRN-448340", bed: "402-A1", stationId: "S402", careGiverId: "CG29", shift: "Morning", status: "Under Observation" },
  { id: "P11", name: "Zoya Ahmed", mrn: "MRN-448356", bed: "501-A4", stationId: "S501", careGiverId: "CG34", shift: "Morning", status: "Admitted" },
  { id: "P12", name: "Balan Nair", mrn: "MRN-448372", bed: "502-B2", stationId: "S502", careGiverId: null, shift: "Evening", status: "Discharge Planned" },
];

export type TaskStatus = "Open" | "In Progress" | "Completed" | "Overdue" | "Escalated";
export type Priority = "Low" | "Medium" | "High" | "Critical";

export type Task = {
  id: string;
  title: string;
  type: string;
  careGiverId: string;
  stationId: string;
  patientId?: string;
  priority: Priority;
  due: string;
  status: TaskStatus;
  description: string;
  comments: { author: string; at: string; text: string }[];
};

export const TASKS: Task[] = [
  {
    id: "TSK-4101",
    title: "Verify medication reconciliation for Ward 301 admissions",
    type: "Pharmacy Review",
    careGiverId: "CG08",
    stationId: "S301",
    patientId: "P1",
    priority: "High",
    due: "14 Aug 2026, 11:00",
    status: "In Progress",
    description:
      "Reconcile home medication list against active inpatient orders for all overnight admissions in Ward 301. Flag duplicate therapy and dose discrepancies to the treating consultant.",
    comments: [
      { author: "Priya Deshmukh", at: "14 Aug, 08:12", text: "Started review — 4 of 7 charts reconciled." },
      { author: "Lakshmi Venkatesh", at: "14 Aug, 08:40", text: "Bed 301-B1 has a pending anticoagulant clarification." },
    ],
  },
  {
    id: "TSK-4102",
    title: "Complete shift handover checklist — Ward 302",
    type: "Handover",
    careGiverId: "CG11",
    stationId: "S302",
    priority: "Medium",
    due: "14 Aug 2026, 15:00",
    status: "Open",
    description: "Confirm bedside handover for all 12 beds, verify infusion pumps and controlled drug count.",
    comments: [],
  },
  {
    id: "TSK-4103",
    title: "Coordinate patient transfer to Cardiothoracic Surgery",
    type: "Coordination",
    careGiverId: "CG03",
    stationId: "S301",
    patientId: "P3",
    priority: "Critical",
    due: "14 Aug 2026, 09:30",
    status: "Overdue",
    description: "Arrange porter, confirm bed availability in Ward 303 and update the transfer note.",
    comments: [{ author: "Ravi Kumar", at: "14 Aug, 09:45", text: "Awaiting bed release confirmation from Ward 303." }],
  },
  {
    id: "TSK-4104",
    title: "Update station coverage sheet for evening shift",
    type: "Roster",
    careGiverId: "CG04",
    stationId: "S303",
    priority: "Low",
    due: "14 Aug 2026, 14:00",
    status: "Open",
    description: "Record confirmed evening shift attendance and mark shortfalls for Ward 303.",
    comments: [],
  },
  {
    id: "TSK-4105",
    title: "Escalated: insufficient night coverage in Ward 403",
    type: "Coverage",
    careGiverId: "CG12",
    stationId: "S403",
    priority: "Critical",
    due: "13 Aug 2026, 22:00",
    status: "Escalated",
    description: "Neuro ICU has 1 nurse against a required minimum of 3 for the night shift.",
    comments: [
      { author: "Arjun Reddy", at: "13 Aug, 22:10", text: "Requested float pool support." },
      { author: "Meera Raghavan", at: "13 Aug, 22:35", text: "Escalated to Inpatient Operations." },
    ],
  },
  {
    id: "TSK-4106",
    title: "Antibiotic stewardship round — Ward 501",
    type: "Pharmacy Review",
    careGiverId: "CG10",
    stationId: "S501",
    priority: "Medium",
    due: "14 Aug 2026, 12:00",
    status: "Open",
    description: "Review day-3 antibiotic continuation for oncology inpatients.",
    comments: [],
  },
  {
    id: "TSK-4107",
    title: "Discharge documentation pack — bed 302-A3",
    type: "Clinical Admin",
    careGiverId: "CG02",
    stationId: "S302",
    patientId: "P6",
    priority: "Medium",
    due: "14 Aug 2026, 16:00",
    status: "Completed",
    description: "Assemble discharge summary, prescriptions and follow-up appointment slip.",
    comments: [{ author: "Anitha Kumar", at: "14 Aug, 10:20", text: "Pack completed and handed to nursing station." }],
  },
  {
    id: "TSK-4108",
    title: "Bedside vitals audit — Ward 304",
    type: "Quality",
    careGiverId: "CG25",
    stationId: "S304",
    priority: "Low",
    due: "14 Aug 2026, 13:00",
    status: "In Progress",
    description: "Spot-check 6 charts for 4-hourly vitals compliance.",
    comments: [],
  },
];

export type Approval = {
  id: string;
  requestedBy: string;
  role: RoleName;
  stationId: string;
  change: string;
  reason: string;
  date: string;
  priority: Priority;
  status: "Pending" | "Approved" | "Rejected";
};

export const APPROVALS: Approval[] = [
  {
    id: "APR-2201",
    requestedBy: "Lakshmi Venkatesh",
    role: "Station In-Charge",
    stationId: "S301",
    change: "Move Coordinator Ravi Kumar from Ward 301 (Morning) to Ward 303 (Morning)",
    reason: "Ward 303 has no coordinator cover after Suresh Iyer moved to evening shift.",
    date: "14 Aug 2026, 07:40",
    priority: "High",
    status: "Pending",
  },
  {
    id: "APR-2202",
    requestedBy: "Arjun Reddy",
    role: "Station In-Charge",
    stationId: "S403",
    change: "Add 2 additional nurses to Ward 403 night shift",
    reason: "Neuro ICU acuity increased with 3 ventilated patients.",
    date: "13 Aug 2026, 21:55",
    priority: "Critical",
    status: "Pending",
  },
  {
    id: "APR-2203",
    requestedBy: "Nisha Verma",
    role: "Station In-Charge",
    stationId: "S201",
    change: "Assign Clinical Pharmacist cover for Ward 201 evening shift",
    reason: "Increased polypharmacy caseload in General Medicine.",
    date: "12 Aug 2026, 16:20",
    priority: "Medium",
    status: "Approved",
  },
  {
    id: "APR-2204",
    requestedBy: "Sarita Joshi",
    role: "Floor Manager",
    stationId: "S304",
    change: "Remove Clinical Admin cover from Ward 304",
    reason: "Requested consolidation of admin cover to Ward 301.",
    date: "11 Aug 2026, 10:05",
    priority: "Low",
    status: "Rejected",
  },
];

export type Notification = {
  id: string;
  category: "Assignment" | "Approval" | "Task" | "Escalation" | "Station Coverage" | "Roster" | "System";
  title: string;
  body: string;
  stationId?: string;
  priority: Priority;
  at: string;
  read: boolean;
};

export const NOTIFICATIONS: Notification[] = [
  { id: "N1", category: "Assignment", title: "New Coordinator assigned to Ward 301", body: "Ravi Kumar was assigned to Ward 301 for the Morning shift by Meera Raghavan.", stationId: "S301", priority: "Medium", at: "14 Aug, 08:05", read: false },
  { id: "N2", category: "Approval", title: "Approval required for assignment change", body: "Lakshmi Venkatesh requested a major assignment change for Ward 301.", stationId: "S301", priority: "High", at: "14 Aug, 07:41", read: false },
  { id: "N3", category: "Task", title: "Task overdue for Clinical Pharmacist", body: "TSK-4103 coordination task passed its due time of 09:30.", stationId: "S301", priority: "Critical", at: "14 Aug, 09:35", read: false },
  { id: "N4", category: "Station Coverage", title: "Station Ward 403 has insufficient coverage", body: "Night shift coverage is at 33% against the minimum staffing rule.", stationId: "S403", priority: "Critical", at: "13 Aug, 22:02", read: false },
  { id: "N5", category: "Roster", title: "Roster published for week of 17 Aug", body: "Floor 3 roster has been published and is open for review.", stationId: "S301", priority: "Low", at: "13 Aug, 18:30", read: true },
  { id: "N6", category: "Escalation", title: "Escalation raised to Nurse Manager", body: "Coverage escalation for Ward 403 reached level 3 after SLA breach.", stationId: "S403", priority: "High", at: "13 Aug, 22:35", read: true },
  { id: "N7", category: "System", title: "Scheduled maintenance window", body: "Care Workforce platform will be read-only on 16 Aug, 01:00–02:00.", priority: "Low", at: "12 Aug, 09:00", read: true },
  { id: "N8", category: "Assignment", title: "Clinical Admin mapping updated", body: "Tara Menon now covers Ward 401, 402 and 403 for the Evening shift.", stationId: "S401", priority: "Medium", at: "12 Aug, 15:12", read: true },
];

export type AuditEntry = {
  id: string;
  date: string;
  user: string;
  action: "CREATE" | "UPDATE" | "REMOVE" | "APPROVE" | "REJECT";
  role: RoleName;
  responsibility: Responsibility;
  floorId: string;
  stationId: string;
  shift: Shift;
  oldValue: string;
  newValue: string;
};

export const AUDIT: AuditEntry[] = [
  { id: "A1", date: "14 Aug 2026, 08:05", user: "Meera Raghavan", action: "CREATE", role: "Nurse Manager", responsibility: "Workforce Oversight", floorId: "F3", stationId: "S301", shift: "Morning", oldValue: "—", newValue: "Coordinator: Ravi Kumar" },
  { id: "A2", date: "14 Aug 2026, 07:41", user: "Lakshmi Venkatesh", action: "UPDATE", role: "Station In-Charge", responsibility: "Station In-Charge", floorId: "F3", stationId: "S303", shift: "Morning", oldValue: "Coordinator: Suresh Iyer", newValue: "Pending approval: Ravi Kumar" },
  { id: "A3", date: "13 Aug 2026, 22:35", user: "System", action: "UPDATE", role: "Nurse Manager", responsibility: "Workforce Oversight", floorId: "F4", stationId: "S403", shift: "Night", oldValue: "Escalation L2", newValue: "Escalation L3" },
  { id: "A4", date: "12 Aug 2026, 16:40", user: "Meera Raghavan", action: "APPROVE", role: "Nurse Manager", responsibility: "Workforce Oversight", floorId: "F2", stationId: "S201", shift: "Evening", oldValue: "Pending", newValue: "Approved" },
  { id: "A5", date: "12 Aug 2026, 15:12", user: "Ramesh Gupta", action: "UPDATE", role: "IP Manager", responsibility: "Inpatient Operations", floorId: "F4", stationId: "S401", shift: "Evening", oldValue: "Clinical Admin: —", newValue: "Clinical Admin: Tara Menon" },
  { id: "A6", date: "11 Aug 2026, 10:05", user: "Meera Raghavan", action: "REJECT", role: "Nurse Manager", responsibility: "Workforce Oversight", floorId: "F3", stationId: "S304", shift: "Morning", oldValue: "Pending", newValue: "Rejected" },
  { id: "A7", date: "10 Aug 2026, 09:15", user: "Sarita Joshi", action: "REMOVE", role: "Floor Manager", responsibility: "Floor Operations", floorId: "F3", stationId: "S304", shift: "Night", oldValue: "Nurse: Rithika Shah", newValue: "—" },
];

export type Policy = {
  id: string;
  name: string;
  scope: string;
  status: "Active" | "Draft";
  conditions: string[];
  action: string;
  approval: string;
  notification: string;
  escalation: string;
};

export const POLICIES: Policy[] = [
  {
    id: "POL-01",
    name: "Major assignment change requires Nurse Manager approval",
    scope: "All floors",
    status: "Active",
    conditions: ["Role = Station In-Charge", "Action = Major Assignment Change"],
    action: "Hold change in pending state",
    approval: "Nurse Manager",
    notification: "Nurse Manager, requesting Station In-Charge",
    escalation: "After SLA of 4 hours → Inpatient Operations",
  },
  {
    id: "POL-02",
    name: "Minimum station coverage rule",
    scope: "ICU stations",
    status: "Active",
    conditions: ["Station type = ICU", "Coverage < 80%"],
    action: "Raise coverage alert",
    approval: "Not required",
    notification: "Station In-Charge, Floor Manager",
    escalation: "After SLA of 30 minutes → Nurse Manager",
  },
  {
    id: "POL-03",
    name: "Overdue critical task escalation",
    scope: "All care givers",
    status: "Draft",
    conditions: ["Task priority = Critical", "Status = Overdue"],
    action: "Flag task as escalated",
    approval: "Not required",
    notification: "Assigned Care Giver, Station In-Charge",
    escalation: "After SLA of 60 minutes → Nurse Manager",
  },
];

export const ESCALATION_TIMELINE = [
  { event: "Task TSK-4105 marked overdue", time: "13 Aug, 22:00", recipient: "System", status: "Triggered" },
  { event: "Notify Care Giver", time: "13 Aug, 22:05", recipient: "Arjun Reddy (Station In-Charge)", status: "Delivered" },
  { event: "Notify Station In-Charge", time: "13 Aug, 22:20", recipient: "Arjun Reddy", status: "Acknowledged" },
  { event: "Notify Floor Manager", time: "13 Aug, 22:30", recipient: "Sarita Joshi", status: "Delivered" },
  { event: "Notify Nurse Manager", time: "13 Aug, 22:35", recipient: "Meera Raghavan", status: "Pending action" },
];

export const REPORTS = [
  { id: "R1", name: "Care Workforce Coverage", description: "Coverage percentage by floor, station and shift.", updated: "14 Aug 2026, 06:00", rows: 152 },
  { id: "R2", name: "Coordinator Mapping", description: "Active coordinator to nursing station mapping.", updated: "14 Aug 2026, 06:00", rows: 48 },
  { id: "R3", name: "Clinical Admin Mapping", description: "Clinical administration cover by floor and station.", updated: "14 Aug 2026, 06:00", rows: 26 },
  { id: "R4", name: "CP Mapping", description: "Clinical pharmacist cover and review workload.", updated: "14 Aug 2026, 06:00", rows: 31 },
  { id: "R5", name: "Unassigned Care Givers", description: "Care givers without an active station assignment.", updated: "14 Aug 2026, 06:00", rows: 4 },
  { id: "R6", name: "Task Performance", description: "Completion, overdue and escalation rates by role.", updated: "14 Aug 2026, 06:00", rows: 88 },
  { id: "R7", name: "Assignment Changes", description: "All assignment changes with requester and approver.", updated: "14 Aug 2026, 06:00", rows: 64 },
  { id: "R8", name: "Approval Summary", description: "Pending, approved and rejected approval requests.", updated: "14 Aug 2026, 06:00", rows: 22 },
];

/** Deterministic mock coverage percentage per station + shift. */
export function coverageFor(stationId: string, shift?: Shift) {
  const seed = stationId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + (shift ? shift.length * 7 : 0);
  const base = 62 + (seed % 39);
  return Math.min(100, base);
}

/**
 * Patient Assignment eligibility rule. A Care Giver may be assigned a patient
 * only if ALL of the following hold - Coordinator/Clinical Admin/Clinical
 * Pharmacist/IP Manager/Floor Manager/Nurse Manager fail on rule 1 and are
 * never eligible, matching the business rule that patient assignment is
 * nurse-specific:
 *   1. nurse-capable role (NURSE_CAPABLE_ROLES)
 *   2. has nurse-patient mapping configured
 *   3. active status
 *   4. rostered for a shift
 *   5. mapped to the station in question, and that station is in the current scope
 */
export function isPatientAssignmentEligible(
  careGiver: CareGiver,
  scopeStationIds: string[],
  stationId?: string,
): boolean {
  if (!NURSE_CAPABLE_ROLES.includes(careGiver.role)) return false;
  if (!careGiver.nursePatientMappingConfigured) return false;
  if (careGiver.status !== "Active") return false;
  if (!careGiver.shift) return false;
  if (careGiver.stationIds.length === 0) return false;
  if (!careGiver.stationIds.some((id) => scopeStationIds.includes(id))) return false;
  if (stationId) return careGiver.stationIds.includes(stationId);
  return true;
}
