import type { Cell, Duration, Unit } from "./types";

export const minutes = (value: number): Duration => ({ value, unit: "minute" });
export const hours = (value: number): Duration => ({ value, unit: "hour" });
export const days = (value: number): Duration => ({ value, unit: "day" });
export const years = (value: number): Duration => ({ value, unit: "year" });

export const own = (duration: Duration): Cell => ({ mode: "own", duration });
export const inherit = (): Cell => ({ mode: "inherit" });

// 비교 · 차트용 환산 (분 단위)
export const UNIT_MINUTES: Record<Unit, number> = { minute: 1, hour: 60, day: 1440, year: 525600 };
export const UNIT_LABEL: Record<Unit, string> = { minute: "분", hour: "시간", day: "일", year: "년" };

export const toMinutes = (d: Duration) => d.value * UNIT_MINUTES[d.unit];

export const formatDuration = (d: Duration) => (d.value === 0 ? "기여하지 않음" : `${d.value}${UNIT_LABEL[d.unit]}`);

export const durationEquals = (a: Duration, b: Duration) => a.value === b.value && a.unit === b.unit;

export const cellEquals = (a: Cell, b: Cell) =>
  a.mode === b.mode && (a.mode === "inherit" || durationEquals(a.duration, (b as typeof a).duration));

// 단위별 범위 · 프리셋 — docs/spec_screens.md 3-2
export type Tab = "install" | "inApp";
export type UnitOption = { unit: Unit; max: number; presets: number[] };

export const UNIT_OPTIONS: Record<Tab, UnitOption[]> = {
  install: [
    { unit: "day", max: 30, presets: [1, 7, 14, 30, 0] },
    { unit: "hour", max: 24, presets: [1, 6, 12, 24, 0] },
    { unit: "minute", max: 60, presets: [1, 5, 15, 30, 60, 0] },
  ],
  inApp: [
    { unit: "year", max: 2, presets: [1, 2, 0] },
    { unit: "day", max: 730, presets: [1, 7, 14, 30, 60, 90, 180, 365, 730, 0] },
    { unit: "hour", max: 24, presets: [1, 6, 12, 24, 0] },
    { unit: "minute", max: 60, presets: [1, 5, 15, 30, 60, 0] },
  ],
};

export const unitOption = (tab: Tab, unit: Unit) => UNIT_OPTIONS[tab].find((o) => o.unit === unit);

export const isInRange = (tab: Tab, d: Duration) => {
  const option = unitOption(tab, d.unit);
  return !!option && Number.isInteger(d.value) && d.value >= 0 && d.value <= option.max;
};

// 저장 시 최근 수정일
export const todayString = (now = new Date()) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};
