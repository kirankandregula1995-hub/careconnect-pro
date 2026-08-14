import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  CARE_GIVERS,
  NOTIFICATIONS,
  STATIONS,
  type CareGiver,
  type Notification,
  type RoleName,
} from "@/data/mock";

export type NavKey =
  | "dashboard"
  | "care-workforce"
  | "assignments"
  | "roster"
  | "stations"
  | "patients"
  | "tasks"
  | "policies"
  | "approvals"
  | "notifications"
  | "reports"
  | "audit";

/** Which personas may open which navigation destinations. */
const ACCESS: Record<RoleName, NavKey[]> = {
  "Nurse Manager": [
    "dashboard", "care-workforce", "assignments", "roster", "stations", "patients",
    "tasks", "policies", "approvals", "notifications", "reports", "audit",
  ],
  "Station In-Charge": [
    "dashboard", "care-workforce", "assignments", "roster", "stations", "patients",
    "tasks", "approvals", "notifications", "reports",
  ],
  "Clinical Admin": ["dashboard", "care-workforce", "assignments", "roster", "stations", "tasks", "notifications", "reports"],
  Coordinator: ["dashboard", "care-workforce", "roster", "stations", "tasks", "notifications"],
  "Clinical Pharmacist": ["dashboard", "roster", "stations", "tasks", "notifications"],
  "IP Manager": ["dashboard", "care-workforce", "assignments", "stations", "roster", "reports", "notifications", "audit"],
  "Floor Manager": ["dashboard", "care-workforce", "assignments", "stations", "roster", "reports", "notifications", "audit"],
  Nurse: ["dashboard", "roster", "patients", "tasks", "notifications"],
};

export const PERSONAS: { id: string; label: string }[] = [
  { id: "CG01", label: "Meera Raghavan — Nurse Manager" },
  { id: "CG11", label: "Lakshmi Venkatesh — Station In-Charge" },
  { id: "CG02", label: "Anitha Kumar — Clinical Admin" },
  { id: "CG03", label: "Ravi Kumar — Coordinator" },
  { id: "CG08", label: "Priya Deshmukh — Clinical Pharmacist" },
  { id: "CG14", label: "Ramesh Gupta — IP Manager" },
  { id: "CG15", label: "Sarita Joshi — Floor Manager" },
  { id: "CG16", label: "Deepa Krishnan — Nurse" },
];

type SessionValue = {
  user: CareGiver;
  setUserId: (id: string) => void;
  role: RoleName;
  can: (key: NavKey) => boolean;
  /** Station ids inside the signed-in user's authorised scope. */
  scopeStationIds: string[];
  inScope: (stationId: string) => boolean;
  scopeFloorIds: string[];
  notifications: Notification[];
  markRead: (id: string) => void;
  markAllRead: () => void;
  unreadCount: number;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState("CG01");
  const [notifications, setNotifications] = useState<Notification[]>(NOTIFICATIONS);

  const value = useMemo<SessionValue>(() => {
    const user = CARE_GIVERS.find((c) => c.id === userId) ?? CARE_GIVERS[0];
    const role = user.role;
    const orgWide = role === "Nurse Manager";
    const scopeStationIds = orgWide ? STATIONS.map((s) => s.id) : user.stationIds;
    const scopeFloorIds = orgWide
      ? Array.from(new Set(STATIONS.map((s) => s.floorId)))
      : Array.from(new Set(scopeStationIds.map((id) => STATIONS.find((s) => s.id === id)?.floorId ?? "")));
    return {
      user,
      setUserId,
      role,
      can: (key) => ACCESS[role].includes(key),
      scopeStationIds,
      inScope: (stationId) => scopeStationIds.includes(stationId),
      scopeFloorIds: scopeFloorIds.filter(Boolean),
      notifications,
      markRead: (id) => setNotifications((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x))),
      markAllRead: () => setNotifications((n) => n.map((x) => ({ ...x, read: true }))),
      unreadCount: notifications.filter((n) => !n.read).length,
    };
  }, [userId, notifications]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
