const FALLBACK_NAMES = ["Fatma Abdul", "Bahati Juma"] as const;
const PHONES = [
  "+254792162750",
  "+254111224952",
  "+254107600036",
] as const;

/** Wialon / legacy names shown as Overland driver labels */
const DRIVER_DISPLAY_ALIASES: Record<string, string> = {
  "stephen mulingwa": "Fatma Abdul",
  "simon mutua": "Bahati Juma",
};

/** Deterministic phone + display name when driver info is omitted upstream */
export function resolveDriverDisplay(input: {
  registration: string;
  driverNameRaw: string | null | undefined;
}): { displayName: string; phone: string } {
  const trimmed = (input.driverNameRaw ?? "").trim();
  if (trimmed) {
    const normalized = trimmed.toLowerCase();
    const displayName = DRIVER_DISPLAY_ALIASES[normalized] ?? trimmed;
    const idx =
      simpleHash(input.registration + displayName) % PHONES.length;
    return { displayName, phone: PHONES[idx]! };
  }
  const h = simpleHash(input.registration);
  return {
    displayName: FALLBACK_NAMES[h % FALLBACK_NAMES.length]!,
    phone: PHONES[h % PHONES.length]!,
  };
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
