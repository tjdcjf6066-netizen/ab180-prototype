// 수정 모드 초안 · 저장 규칙 — docs/spec_data.md 4장, docs/spec_screens.md 4-7 · 5-4 · 5-5
// 설치 탭과 인앱이벤트 탭은 같은 규칙을 쓰고, 칸 모양(4칸 / 1칸)만 다르다.
import { cellEquals, days, durationEquals, inherit, own, years } from "./duration";
import { CAMPAIGN_BY_ID } from "./mock/catalog";
import {
  INSTALL_CELL_KEYS,
  type Cell,
  type Duration,
  type InAppSettings,
  type InstallCellKey,
  type InstallCells,
  type InstallSettings,
} from "./types";

// 기존 행의 key는 채널 · 캠페인 id, 새로 추가한 행은 "new-N"
export type ChannelRow<C> = { key: string; channelId: string | null; cells: C };
export type CampaignRow<C> = { key: string; channelId: string; campaignId: string | null; cells: C };
export type Draft<G, C> = { global: G; channels: ChannelRow<C>[]; campaigns: CampaignRow<C>[]; seq: number };

export type InstallDraft = Draft<Record<InstallCellKey, Duration>, InstallCells>;
export type InAppDraft = Draft<Duration, Cell>;

type Parts<G, C> = {
  global: G;
  globalUpdatedAt: string;
  channels: { channelId: string; cells: C; updatedAt: string }[];
  campaigns: { campaignId: string; cells: C; updatedAt: string }[];
};

type Adapter<S, G, C> = {
  newChannelCells: () => C; // [+ 추가] 직후 · 채널을 고른 뒤
  blankCampaignCells: () => C; // 캠페인을 고르기 전
  followChannelCells: () => C; // 캠페인을 고른 순간 "{채널명} 값 따르기"
  hasOwn: (cells: C) => boolean;
  cellsEqual: (a: C, b: C) => boolean;
  globalEqual: (a: G, b: G) => boolean;
  read: (s: S) => Parts<G, C>;
  write: (s: S, parts: Parts<G, C>) => S;
};

const isNewKey = (key: string) => key.startsWith("new-");

function sameRows<C>(
  a: { id: string | null; cells: C }[],
  b: { id: string; cells: C }[],
  equal: (x: C, y: C) => boolean,
) {
  if (a.length !== b.length) return false;
  const byId = new Map(b.map((r) => [r.id, r.cells]));
  return a.every((r) => {
    const original = r.id === null ? undefined : byId.get(r.id);
    return original !== undefined && equal(original, r.cells);
  });
}

function makeEditor<S, G, C>(a: Adapter<S, G, C>) {
  type D = Draft<G, C>;

  const toDraft = (s: S): D => {
    const p = a.read(s);
    return {
      global: p.global,
      channels: p.channels.map((c) => ({ key: c.channelId, channelId: c.channelId, cells: c.cells })),
      campaigns: p.campaigns.map((c) => ({
        key: c.campaignId,
        channelId: CAMPAIGN_BY_ID.get(c.campaignId)!.channelId,
        campaignId: c.campaignId,
        cells: c.cells,
      })),
      seq: 0,
    };
  };

  const isDirty = (s: S, d: D) => {
    const p = a.read(s);
    return !(
      a.globalEqual(p.global, d.global) &&
      sameRows(
        d.channels.map((r) => ({ id: r.channelId, cells: r.cells })),
        p.channels.map((r) => ({ id: r.channelId, cells: r.cells })),
        a.cellsEqual,
      ) &&
      sameRows(
        d.campaigns.map((r) => ({ id: r.campaignId, cells: r.cells })),
        p.campaigns.map((r) => ({ id: r.campaignId, cells: r.cells })),
        a.cellsEqual,
      )
    );
  };

  return {
    toDraft,
    isDirty,

    setGlobal: (d: D, global: G): D => ({ ...d, global }),

    // 표 맨 아래 새 채널 행
    addChannelRow: (d: D): D => ({
      ...d,
      channels: [...d.channels, { key: `new-${d.seq}`, channelId: null, cells: a.newChannelCells() }],
      seq: d.seq + 1,
    }),

    selectChannel: (d: D, key: string, channelId: string): D => ({
      ...d,
      channels: d.channels.map((r) => (r.key === key ? { ...r, channelId } : r)),
    }),

    setChannelCells: (d: D, key: string, cells: C): D => ({
      ...d,
      channels: d.channels.map((r) => (r.key === key ? { ...r, cells } : r)),
    }),

    // 채널 삭제 = 그 채널 설정 + 그 채널의 캠페인 설정 전부(종료된 캠페인 포함)
    removeChannelRow: (d: D, key: string): D => {
      const row = d.channels.find((r) => r.key === key);
      return {
        ...d,
        channels: d.channels.filter((r) => r.key !== key),
        campaigns: row?.channelId ? d.campaigns.filter((r) => r.channelId !== row.channelId) : d.campaigns,
      };
    },

    // 펼친 목록 맨 위(채널 행 바로 아래)에 새 캠페인 행
    addCampaignRow: (d: D, channelId: string): D => {
      const row: CampaignRow<C> = {
        key: `new-${d.seq}`,
        channelId,
        campaignId: null,
        cells: a.blankCampaignCells(),
      };
      const at = d.campaigns.findIndex((r) => r.channelId === channelId);
      const campaigns = [...d.campaigns];
      campaigns.splice(at === -1 ? campaigns.length : at, 0, row);
      return { ...d, campaigns, seq: d.seq + 1 };
    },

    selectCampaign: (d: D, key: string, campaignId: string): D => ({
      ...d,
      campaigns: d.campaigns.map((r) => (r.key === key ? { ...r, campaignId, cells: a.followChannelCells() } : r)),
    }),

    setCampaignCells: (d: D, key: string, cells: C): D => ({
      ...d,
      campaigns: d.campaigns.map((r) => (r.key === key ? { ...r, cells } : r)),
    }),

    removeCampaignRow: (d: D, key: string): D => ({ ...d, campaigns: d.campaigns.filter((r) => r.key !== key) }),

    // 저장 비활성: 바뀐 내용 없음 / 고르지 않은 빈 행 / 모든 칸이 따르기인 캠페인 행
    canSave: (s: S, d: D) =>
      d.channels.every((r) => r.channelId !== null) &&
      d.campaigns.every((r) => r.campaignId !== null && a.hasOwn(r.cells)) &&
      isDirty(s, d),

    // 저장 — 바뀐 행만 최근 수정일을 오늘로
    apply: (s: S, d: D, today: string): S => {
      const p = a.read(s);
      const stamp = <T extends { cells: C; updatedAt: string }>(original: T | undefined, cells: C) =>
        original && a.cellsEqual(original.cells, cells) ? original.updatedAt : today;
      return a.write(s, {
        global: d.global,
        globalUpdatedAt: a.globalEqual(p.global, d.global) ? p.globalUpdatedAt : today,
        channels: d.channels.flatMap((r) =>
          r.channelId === null
            ? []
            : [
                {
                  channelId: r.channelId,
                  cells: r.cells,
                  updatedAt: stamp(
                    p.channels.find((c) => c.channelId === r.channelId),
                    r.cells,
                  ),
                },
              ],
        ),
        campaigns: d.campaigns.flatMap((r) =>
          r.campaignId === null
            ? []
            : [
                {
                  campaignId: r.campaignId,
                  cells: r.cells,
                  updatedAt: stamp(
                    p.campaigns.find((c) => c.campaignId === r.campaignId),
                    r.cells,
                  ),
                },
              ],
        ),
      });
    },
  };
}

const installCellsWith = (make: () => Cell): InstallCells =>
  Object.fromEntries(INSTALL_CELL_KEYS.map((k) => [k, make()])) as InstallCells;

export const installEditor = makeEditor<InstallSettings, Record<InstallCellKey, Duration>, InstallCells>({
  newChannelCells: () => installCellsWith(() => own(days(0))),
  blankCampaignCells: () => installCellsWith(() => own(days(0))),
  followChannelCells: () => installCellsWith(inherit),
  hasOwn: (cells) => INSTALL_CELL_KEYS.some((k) => cells[k].mode === "own"),
  cellsEqual: (x, y) => INSTALL_CELL_KEYS.every((k) => cellEquals(x[k], y[k])),
  globalEqual: (x, y) => INSTALL_CELL_KEYS.every((k) => durationEquals(x[k], y[k])),
  read: (s) => s,
  write: (s, p) => ({ ...s, ...p }),
});

export const inAppEditor = makeEditor<InAppSettings, Duration, Cell>({
  newChannelCells: () => own(years(0)),
  blankCampaignCells: () => own(years(0)),
  followChannelCells: inherit,
  hasOwn: (cell) => cell.mode === "own",
  cellsEqual: cellEquals,
  globalEqual: durationEquals,
  read: (s) => ({
    global: s.global,
    globalUpdatedAt: s.globalUpdatedAt,
    channels: s.channels.map(({ cell, ...rest }) => ({ ...rest, cells: cell })),
    campaigns: s.campaigns.map(({ cell, ...rest }) => ({ ...rest, cells: cell })),
  }),
  write: (s, p) => ({
    ...s,
    global: p.global,
    globalUpdatedAt: p.globalUpdatedAt,
    channels: p.channels.map(({ cells, ...rest }) => ({ ...rest, cell: cells })),
    campaigns: p.campaigns.map(({ cells, ...rest }) => ({ ...rest, cell: cells })),
  }),
});

// 인앱 이벤트 기간 설정 팝업 — docs/spec_screens.md 5-4
export type EventRow = { key: string; eventId: string | null; duration: Duration };
export type EventsDraft = { rows: EventRow[]; seq: number };

export const eventsEditor = {
  toDraft: (s: InAppSettings): EventsDraft => ({
    rows: s.events.map((e) => ({ key: e.eventId, eventId: e.eventId, duration: e.duration })),
    seq: 0,
  }),

  // 표 맨 아래 새 행, 값은 0 · 일
  addRow: (d: EventsDraft): EventsDraft => ({
    rows: [...d.rows, { key: `new-${d.seq}`, eventId: null, duration: days(0) }],
    seq: d.seq + 1,
  }),

  selectEvent: (d: EventsDraft, key: string, eventId: string): EventsDraft => ({
    ...d,
    rows: d.rows.map((r) => (r.key === key ? { ...r, eventId } : r)),
  }),

  setDuration: (d: EventsDraft, key: string, duration: Duration): EventsDraft => ({
    ...d,
    rows: d.rows.map((r) => (r.key === key ? { ...r, duration } : r)),
  }),

  removeRow: (d: EventsDraft, key: string): EventsDraft => ({ ...d, rows: d.rows.filter((r) => r.key !== key) }),

  // 저장 비활성: 바뀐 내용 없음 / 이벤트를 고르지 않은 빈 행
  canSave: (s: InAppSettings, d: EventsDraft) =>
    d.rows.every((r) => r.eventId !== null) &&
    !sameRows(
      d.rows.map((r) => ({ id: r.eventId, cells: r.duration })),
      s.events.map((e) => ({ id: e.eventId, cells: e.duration })),
      durationEquals,
    ),

  // 새로 등록한 이벤트는 최근 등록순으로 맨 앞(나중에 추가한 행이 더 앞)
  apply: (s: InAppSettings, d: EventsDraft, today: string): InAppSettings => {
    const added = d.rows
      .filter((r) => isNewKey(r.key) && r.eventId !== null)
      .reverse()
      .map((r) => ({ eventId: r.eventId!, duration: r.duration, createdAt: today, updatedAt: today }));
    const kept = d.rows.flatMap((r) => {
      const original = isNewKey(r.key) ? undefined : s.events.find((e) => e.eventId === r.eventId);
      if (!original) return [];
      return [
        durationEquals(original.duration, r.duration)
          ? original
          : { ...original, duration: r.duration, updatedAt: today },
      ];
    });
    return { ...s, events: [...added, ...kept] };
  },
};
