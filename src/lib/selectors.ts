// 조회 화면용 계산
import { CAMPAIGN_BY_ID } from "./mock/catalog";
import type { Campaign } from "./types";

type HasCampaignId = { campaignId: string };

const isVisible = (campaign: Campaign | undefined, includeEnded: boolean): campaign is Campaign =>
  !!campaign && (includeEnded || campaign.status === "active");

// 채널 아래 캠페인 한정 설정 (N개 표시 · 펼치기). 정책 캠페인은 설정 목록에 없으므로 자연히 제외.
export function campaignSettingsOf<T extends HasCampaignId>(settings: T[], channelId: string, includeEnded: boolean): T[] {
  return settings.filter((s) => {
    const campaign = CAMPAIGN_BY_ID.get(s.campaignId);
    return isVisible(campaign, includeEnded) && campaign.channelId === channelId;
  });
}

// 캠페인 검색 — 캠페인 한정 설정이 있는 캠페인만. 진행 중 위, 종료됨 아래.
export function searchCampaignSettings(settings: HasCampaignId[], query: string, includeEnded: boolean): Campaign[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const found = settings
    .map((s) => CAMPAIGN_BY_ID.get(s.campaignId))
    .filter((c): c is Campaign => isVisible(c, includeEnded) && c.name.toLowerCase().includes(q));
  return [...found.filter((c) => c.status === "active"), ...found.filter((c) => c.status === "ended")];
}
