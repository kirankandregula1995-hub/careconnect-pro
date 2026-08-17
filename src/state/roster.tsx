import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ROSTER, ROSTER_WEEK, type RosterEntry, type RosterStatus } from "@/data/config";
import { SHIFTS, type Shift } from "@/data/mock";

export type CellValue = Shift | "Off" | "Leave";

export const CELL_VALUES: CellValue[] = [...SHIFTS, "Off", "Leave"];

export const isShiftValue = (v: CellValue): v is Shift => (SHIFTS as readonly string[]).includes(v);

type RosterValue = {
  entries: RosterEntry[];
  week: string[];
  /** Change a single roster cell. Returns an error message when the change conflicts. */
  updateEntry: (id: string, value: CellValue) => string | null;
  /** Entries that clash: same worker, same date, same shift, scheduled twice. */
  conflictIds: Set<string>;
  conflictMessage: (entry: RosterEntry) => string | null;
  importEntries: (rows: RosterEntry[]) => void;
  /** Roster gate for assignment eligibility. */
  hasActiveRoster: (careGiverId: string, date: string, stationId?: string, shift?: Shift) => boolean;
  rosterFor: (careGiverId: string, date: string) => RosterEntry[];
};

const RosterContext = createContext<RosterValue | null>(null);

export function RosterProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<RosterEntry[]>(ROSTER);

  const conflictIds = useMemo(() => {
    const seen = new Map<string, RosterEntry[]>();
    entries
      .filter((e) => e.status === "Scheduled")
      .forEach((e) => {
        const key = `${e.careGiverId}|${e.date}|${e.shift}`;
        seen.set(key, [...(seen.get(key) ?? []), e]);
      });
    const ids = new Set<string>();
    seen.forEach((group) => {
      if (group.length > 1) group.forEach((g) => ids.add(g.id));
    });
    return ids;
  }, [entries]);

  const updateEntry = useCallback<RosterValue["updateEntry"]>(
    (id, value) => {
      let error: string | null = null;
      setEntries((prev) => {
        const target = prev.find((e) => e.id === id);
        if (!target) return prev;
        if (isShiftValue(value)) {
          const clash = prev.find(
            (e) =>
              e.id !== id &&
              e.careGiverId === target.careGiverId &&
              e.date === target.date &&
              e.status === "Scheduled" &&
              e.shift === value,
          );
          if (clash) {
            error = `Already has the ${value} shift on this date — overlapping shifts are not allowed.`;
            return prev;
          }
          return prev.map((e) => (e.id === id ? { ...e, shift: value, status: "Scheduled" as RosterStatus } : e));
        }
        return prev.map((e) => (e.id === id ? { ...e, status: value as RosterStatus } : e));
      });
      return error;
    },
    [],
  );

  const value = useMemo<RosterValue>(
    () => ({
      entries,
      week: ROSTER_WEEK,
      updateEntry,
      conflictIds,
      conflictMessage: (entry) =>
        conflictIds.has(entry.id)
          ? `Overlapping ${entry.shift} shift on ${entry.date} — this worker is scheduled in more than one station.`
          : null,
      importEntries: (rows) =>
        setEntries((prev) => {
          const next = [...prev];
          rows.forEach((row) => {
            const idx = next.findIndex((e) => e.id === row.id);
            if (idx >= 0) next[idx] = row;
            else next.push(row);
          });
          return next;
        }),
      hasActiveRoster: (careGiverId, date, stationId, shift) =>
        entries.some(
          (e) =>
            e.careGiverId === careGiverId &&
            e.date === date &&
            e.status === "Scheduled" &&
            (!stationId || e.stationId === stationId) &&
            (!shift || e.shift === shift),
        ),
      rosterFor: (careGiverId, date) => entries.filter((e) => e.careGiverId === careGiverId && e.date === date),
    }),
    [entries, conflictIds, updateEntry],
  );

  return <RosterContext.Provider value={value}>{children}</RosterContext.Provider>;
}

export function useRoster() {
  const ctx = useContext(RosterContext);
  if (!ctx) throw new Error("useRoster must be used inside RosterProvider");
  return ctx;
}
