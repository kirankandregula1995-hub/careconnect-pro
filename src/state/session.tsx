import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  CARE_GIVERS,
  NOTIFICATIONS,
  STATIONS,
  type CareGiver,
  type Notification,
  type RoleName,
} from "@/data/mock";
import {
  BUILDINGS,
  ROLE_CAPABILITIES,
  ROLE_SCOPE,
  type Capability,
  type LocalityScope,
} from "@/data/config";

export type NavKey =
  | "workforce-dashboard"
  | "patient-dashboard"
  | "care-workforce"
  | "stations"
  | "roster"
  | "workforce-assignment"
  | "patient-assignment"
  | "policies"
  | "tasks"
  | "approvals"
  | "notifications"
  | "reports"
  | "audit";

/** Navigation is derived from role capabilities — never hardcoded per screen. */
const NAV_REQUIREMENT: Record<NavKey, Capability[] | "always"> = {
  "workforce-dashboard": "always",
  "patient-dashboard": ["Patient View"],
  "care-workforce": ["Care Workforce Management"],
  stations: "always",
  roster: ["Roster View"],
  "workforce-assignment": ["Station Assignment"],
  "patient-assignment": ["Patient Assignment"],
  policies: ["Approval", "Audit"],
  tasks: ["Task Execution", "Task Assignment"],
  approvals: ["Approval"],
  notifications: "always",
  reports: ["Reports"],
  audit: ["Audit"],
};

export const PERSONAS: { id: string; label: string }[] = [
  { id: "CG01", label: "Meera Raghavan — Nurse Manager" },
  { id: "CG11", label: "Lakshmi Venkatesh — Station In-Charge" },
  { id: "CG15", label: "Sarita Joshi — Floor Manager" },
  { id: "CG14", label: "Ramesh Gupta — IP Manager" },
  { id: "CG02", label: "Anitha Kumar — Clinical Admin" },
  { id: "CG03", label: "Ravi Kumar — Coordinator" },
  { id: "CG08", label: "Priya Deshmukh — Clinical Pharmacist" },
  { id: "CG16", label: "Deepa Krishnan — Nurse" },
];

type SessionValue = {
  user: CareGiver;
  setUserId: (id: string) => void;
  role: RoleName;
  capabilities: Capability[];
  hasCap: (cap: Capability) => boolean;
  scopeLevel: LocalityScope;
  scopeLabel: string;
  can: (key: NavKey) => boolean;
  scopeStationIds: string[];
  scopeFloorIds: string[];
  scopeBuildingIds: string[];
  inScope: (stationId: string) => boolean;
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
    const user = (CARE_GIVERS.find((c) => c.id === userId) ?? CARE_GIVERS[0]) as CareGiver;
    const role = user.role;
    const scopeLevel = ROLE_SCOPE[role];
    const capabilities = ROLE_CAPABILITIES[role];

    let scopeStationIds: string[];
    if (scopeLevel === "Hospital") {
      scopeStationIds = STATIONS.map((s) => s.id);
    } else if (scopeLevel === "Building") {
      const buildingIds = BUILDINGS.filter((b) => user.floorIds.some((f) => b.floorIds.includes(f))).map((b) => b.id);
      scopeStationIds = STATIONS.filter((s) =>
        BUILDINGS.some((b) => buildingIds.includes(b.id) && b.floorIds.includes(s.floorId)),
      ).map((s) => s.id);
    } else if (scopeLevel === "Floor") {
      scopeStationIds = STATIONS.filter((s) => user.floorIds.includes(s.floorId)).map((s) => s.id);
    } else {
      scopeStationIds = user.stationIds;
    }

    const scopeFloorIds = Array.from(
      new Set(scopeStationIds.map((id) => STATIONS.find((s) => s.id === id)?.floorId ?? "")),
    ).filter(Boolean);
    const scopeBuildingIds = BUILDINGS.filter((b) => b.floorIds.some((f) => scopeFloorIds.includes(f))).map((b) => b.id);

    const hasCap = (cap: Capability) => capabilities.includes(cap);

    return {
      user,
      setUserId,
      role,
      capabilities,
      hasCap,
      scopeLevel,
      scopeLabel:
        scopeLevel === "Hospital"
          ? "All hospital locations"
          : scopeLevel === "Building"
            ? `${scopeBuildingIds.length} building(s)`
            : scopeLevel === "Floor"
              ? `${scopeFloorIds.length} floor(s)`
              : `${scopeStationIds.length} nursing station(s)`,
      can: (key) => {
        const req = NAV_REQUIREMENT[key];
        return req === "always" ? true : req.some((c) => capabilities.includes(c));
      },
      scopeStationIds,
      scopeFloorIds,
      scopeBuildingIds,
      inScope: (stationId) => scopeStationIds.includes(stationId),
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
