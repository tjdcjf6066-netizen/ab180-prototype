// 설치 탭 초기 설정 — docs/spec_data.md 5-3 (W1과 동일)
import { days, hours, inherit, own } from "../duration";
import type { Duration, InstallCells, InstallSettings } from "../types";
import { campaignId, channelId } from "./catalog";

const allOwn = (clickDevice: Duration, clickProb: Duration, viewDevice: Duration, viewProb: Duration): InstallCells => ({
  clickDevice: own(clickDevice),
  clickProb: own(clickProb),
  viewDevice: own(viewDevice),
  viewProb: own(viewProb),
});

const allInherit = (): InstallCells => ({
  clickDevice: inherit(),
  clickProb: inherit(),
  viewDevice: inherit(),
  viewProb: inherit(),
});

const d0 = days(0);

export const createInstallInitial = (): InstallSettings => ({
  defaults: { clickDevice: days(7), clickProb: days(1), viewDevice: days(1), viewProb: hours(6) },
  global: { clickDevice: days(7), clickProb: days(1), viewDevice: days(1), viewProb: hours(6) },
  globalUpdatedAt: "2026-10-06",
  channels: [
    { channelId: channelId("Google Ads"), cells: allOwn(days(30), d0, d0, hours(6)), updatedAt: "2026-09-12" },
    { channelId: channelId("(주)데코"), cells: allOwn(days(30), d0, d0, hours(6)), updatedAt: "2026-10-06" },
    { channelId: channelId("TikTok for Business"), cells: allOwn(days(30), days(14), days(30), hours(12)), updatedAt: "2026-10-06" },
    { channelId: channelId("Apple Search Ads"), cells: allOwn(days(14), days(1), days(1), hours(6)), updatedAt: "2026-09-30" },
    { channelId: channelId("Unity Ads"), cells: allOwn(days(7), d0, days(1), hours(6)), updatedAt: "2026-08-21" },
    { channelId: channelId("AppLovin"), cells: allOwn(days(7), days(1), d0, d0), updatedAt: "2026-08-21" },
    { channelId: channelId("ironSource"), cells: allOwn(days(14), days(1), days(1), hours(6)), updatedAt: "2026-07-02" },
    { channelId: channelId("카카오모먼트"), cells: allOwn(days(7), d0, d0, d0), updatedAt: "2026-06-15" },
    { channelId: channelId("네이버 GFA"), cells: allOwn(days(14), days(1), days(1), hours(6)), updatedAt: "2026-06-15" },
    { channelId: channelId("Moloco"), cells: allOwn(days(7), days(1), days(1), hours(12)), updatedAt: "2026-05-30" },
    { channelId: channelId("APPA월드와이드"), cells: allOwn(days(3), days(1), days(1), hours(6)), updatedAt: "2026-10-06" },
    { channelId: channelId("Mintegral"), cells: allOwn(days(30), days(1), days(1), hours(6)), updatedAt: "2026-04-11" },
  ],
  campaigns: [
    {
      campaignId: campaignId("Google Ads", "iOS 신규 유저 모집"),
      cells: { ...allInherit(), clickProb: own(days(1)) },
      updatedAt: "2026-10-08",
    },
    {
      campaignId: campaignId("Google Ads", "2026 여름 시즌 프로모션"),
      cells: { ...allInherit(), clickDevice: own(days(14)) },
      updatedAt: "2026-08-31",
    },
    {
      campaignId: campaignId("Apple Search Ads", "브랜드 검색"),
      cells: { ...allInherit(), clickDevice: own(days(7)) },
      updatedAt: "2026-09-30",
    },
  ],
  policies: [
    { campaignId: campaignId("Google Ads", "사전 등록 유도 앱 캠페인"), cellKey: "clickDevice", duration: days(90) },
  ],
});
