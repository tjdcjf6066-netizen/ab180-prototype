// docs/spec_data.md 2장

export type Unit = "minute" | "hour" | "day" | "year"; // 설치 탭은 minute · hour · day만
export type Duration = { value: number; unit: Unit }; // value 0 = 기여하지 않음
export type Cell = { mode: "own"; duration: Duration } | { mode: "inherit" };

export type InstallCellKey = "clickDevice" | "clickProb" | "viewDevice" | "viewProb";
export type InstallCells = Record<InstallCellKey, Cell>;

export const INSTALL_CELL_KEYS: InstallCellKey[] = ["clickDevice", "clickProb", "viewDevice", "viewProb"];

export type Channel = { id: string; name: string; hasPolicyInfo?: boolean };
export type Campaign = { id: string; channelId: string; name: string; status: "active" | "ended" };
export type InAppEvent = { id: string; name: string; kind: "standard" | "custom" };

// 광고 채널 정책 — 설치 탭에만. 목록 행이 아니며 수정 불가.
export type Policy = { campaignId: string; cellKey: InstallCellKey; duration: Duration };

export type InstallChannelSetting = { channelId: string; cells: InstallCells; updatedAt: string };
export type InstallCampaignSetting = { campaignId: string; cells: InstallCells; updatedAt: string };

// 설치 탭 설정
export type InstallSettings = {
  defaults: Record<InstallCellKey, Duration>; // 에어브릿지 기본 설정(참고값)
  global: Record<InstallCellKey, Duration>; // 글로벌은 항상 own
  globalUpdatedAt: string; // 목록 글로벌 행의 최근 수정일
  channels: InstallChannelSetting[]; // 추가한 채널만
  campaigns: InstallCampaignSetting[]; // 캠페인 한정 설정만
  policies: Policy[];
};

export type InAppChannelSetting = { channelId: string; cell: Cell; updatedAt: string };
export type InAppCampaignSetting = { campaignId: string; cell: Cell; updatedAt: string };
export type InAppEventSetting = { eventId: string; duration: Duration; createdAt: string; updatedAt: string };

// 인앱이벤트 탭(설치) 설정
export type InAppSettings = {
  defaults: Duration; // 30일
  global: Duration;
  globalUpdatedAt: string;
  channels: InAppChannelSetting[];
  campaigns: InAppCampaignSetting[];
  events: InAppEventSetting[]; // 최근 등록순 정렬(배열 순서 = 표시 순서)
};
