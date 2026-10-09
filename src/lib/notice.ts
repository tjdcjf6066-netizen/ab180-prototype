// 적용 확인 · 삭제 팝업 개수 계산 — docs/spec_data.md 4-1, docs/spec_screens.md 4-8 · 5-6
import { durationEquals } from "./duration";
import { CAMPAIGN_BY_ID } from "./mock/catalog";
import { INSTALL_CELL_KEYS, type InAppSettings, type InstallSettings } from "./types";

type Row = { id: string; owns: boolean };

// 채널 N = 바뀐 칸 중 하나라도 own인 채널
// 캠페인 N = 진행 중 캠페인 한정 설정 전체(속한 채널 · 바꾼 칸과 관계없이). 종료된 캠페인은 제외.
function countExcluded(channels: Row[], campaignIds: string[]) {
  return {
    channels: channels.filter((c) => c.owns).length,
    campaigns: campaignIds.filter((id) => CAMPAIGN_BY_ID.get(id)?.status === "active").length,
  };
}

// 설치 탭: 글로벌을 바꿨을 때만 안내 박스. 저장한 뒤의 상태(after) 기준.
export function installSaveNotice(before: InstallSettings, after: InstallSettings) {
  const changed = INSTALL_CELL_KEYS.filter((k) => !durationEquals(before.global[k], after.global[k]));
  if (changed.length === 0) return null;
  const owns = (cells: InstallSettings["channels"][number]["cells"]) => changed.some((k) => cells[k].mode === "own");
  return countExcluded(
    after.channels.map((c) => ({ id: c.channelId, owns: owns(c.cells) })),
    after.campaigns.map((c) => c.campaignId),
  );
}

export type InAppNotice =
  | { kind: "global"; events: number; channels: number; campaigns: number } // events 0이면 설치 탭과 같은 문구
  | { kind: "events"; events: number };

// 인앱이벤트 탭: 글로벌을 바꿨으면 글로벌 안내, 채널 · 캠페인만 바꿨으면 인앱 이벤트 설정이 있을 때만 안내
export function inAppSaveNotice(before: InAppSettings, after: InAppSettings): InAppNotice | null {
  const events = after.events.length;
  if (!durationEquals(before.global, after.global)) {
    return {
      kind: "global",
      events,
      ...countExcluded(
        after.channels.map((c) => ({ id: c.channelId, owns: c.cell.mode === "own" })),
        after.campaigns.map((c) => c.campaignId),
      ),
    };
  }
  return events > 0 ? { kind: "events", events } : null;
}

// 채널 삭제 팝업: 그 채널의 캠페인 설정 수(종료 포함)
export function channelDeleteCampaignCount(
  draft: { campaigns: { channelId: string; campaignId: string | null }[] },
  channelId: string,
) {
  return draft.campaigns.filter((r) => r.channelId === channelId && r.campaignId !== null).length;
}
