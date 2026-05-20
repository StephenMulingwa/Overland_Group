/** Client-safe labels / ids for driver monitoring filters */

export type DriverCardId =
  | "overspeeding"
  | "harsh_braking"
  | "harsh_cornering"
  | "harsh_acceleration"
  | "overrevving"
  | "eco_roll"
  | "idling"
  | "offline";

export const CARD_LABELS: Record<DriverCardId, string> = {
  overspeeding: "Overspeeding",
  harsh_braking: "Harsh Braking",
  harsh_cornering: "Harsh Cornering",
  harsh_acceleration: "Harsh Acceleration",
  overrevving: "Overrevving",
  eco_roll: "Eco-Roll",
  idling: "Idling",
  offline: "Offline",
};

/** Display order for driver-incident filter cards (matches Driver Monitoring UI). */
export const DRIVER_CARD_DISPLAY_ORDER: DriverCardId[] = [
  "overspeeding",
  "harsh_braking",
  "harsh_cornering",
  "harsh_acceleration",
  "overrevving",
  "eco_roll",
  "idling",
  "offline",
];

function durationSortKey(sec: number | null | undefined): number {
  if (sec != null && Number.isFinite(sec) && sec >= 0) return sec;
  return -1;
}

/** Longest duration first; ties broken by newest violation time. */
export function compareIncidentsByDurationDesc(
  a: { durationSec: number | null; violationTimeIso: string | null },
  b: { durationSec: number | null; violationTimeIso: string | null },
): number {
  const dur = durationSortKey(b.durationSec) - durationSortKey(a.durationSec);
  if (dur !== 0) return dur;
  const at = a.violationTimeIso ? new Date(a.violationTimeIso).getTime() : 0;
  const bt = b.violationTimeIso ? new Date(b.violationTimeIso).getTime() : 0;
  return bt - at;
}
