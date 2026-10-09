// 인앱이벤트 탭(설치) 초기 설정 — docs/spec_data.md 5-4 (W3와 동일)
import { days, own, years } from "../duration";
import type { InAppSettings } from "../types";
import { campaignId, channelId, eventId } from "./catalog";

export const createInAppInitial = (): InAppSettings => ({
  defaults: days(30),
  global: days(30),
  globalUpdatedAt: "2026-10-06",
  channels: [
    { channelId: channelId("Google Ads"), cell: own(days(60)), updatedAt: "2026-10-08" },
    { channelId: channelId("A8app"), cell: own(days(14)), updatedAt: "2026-10-08" },
    { channelId: channelId("AVOW"), cell: own(days(7)), updatedAt: "2026-10-08" },
    { channelId: channelId("ChatGPT 광고"), cell: own(years(1)), updatedAt: "2026-10-08" },
    { channelId: channelId("Unity Ads"), cell: own(days(14)), updatedAt: "2026-10-08" },
    { channelId: channelId("Moloco"), cell: own(days(60)), updatedAt: "2026-10-08" },
    { channelId: channelId("카카오모먼트"), cell: own(days(7)), updatedAt: "2026-10-08" },
  ],
  campaigns: [
    { campaignId: campaignId("Google Ads", "iOS 신규 유저 모집"), cell: own(days(7)), updatedAt: "2026-10-09" },
    { campaignId: campaignId("Google Ads", "2026 여름 시즌 프로모션"), cell: own(days(14)), updatedAt: "2026-08-31" },
  ],
  // 최근 등록순
  events: [
    { eventId: eventId("구독 시작"), duration: days(60), createdAt: "2026-10-09", updatedAt: "2026-10-09" },
    { eventId: eventId("알람 편집 화면 진입"), duration: days(1), createdAt: "2026-10-09", updatedAt: "2026-10-09" },
  ],
});
