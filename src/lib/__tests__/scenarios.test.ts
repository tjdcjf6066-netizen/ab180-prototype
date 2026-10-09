// docs/spec_data.md 6장 시나리오
import { describe, expect, it } from "vitest";
import { days, formatDuration, inherit, own } from "../duration";
import { inAppEditor, installEditor, eventsEditor } from "../edit";
import { campaignId, channelId, eventId, CAMPAIGNS, CHANNELS, IN_APP_EVENTS } from "../mock/catalog";
import { createInAppInitial } from "../mock/inAppInitial";
import { createInstallInitial } from "../mock/installInitial";
import { channelDeleteCampaignCount, inAppSaveNotice, installSaveNotice } from "../notice";
import { resolveInApp, resolveInstall } from "../resolve";
import { campaignSettingsOf, searchCampaignSettings } from "../selectors";

const GOOGLE = channelId("Google Ads");
const APPLE = channelId("Apple Search Ads");
const A8 = channelId("A8app");
const META = channelId("Meta Ads");
const IOS_NEW = campaignId("Google Ads", "iOS 신규 유저 모집");
const AOS_NEW = campaignId("Google Ads", "안드로이드 신규 유저 모집");
const PRE_REG = campaignId("Google Ads", "사전 등록 유도 앱 캠페인");
const SUMMER = campaignId("Google Ads", "2026 여름 시즌 프로모션");
const APPLE_BRAND = campaignId("Apple Search Ads", "브랜드 검색");
const SUBSCRIBE = eventId("구독 시작");
const ALARM_EDIT = eventId("알람 편집 화면 진입");
const PURCHASE = eventId("구매 완료");

const TODAY = "2026-10-10";

describe("목업 데이터", () => {
  it("채널 40개, 캠페인 약 1,500개(진행 중 약 200개), 인앱 이벤트 약 60개", () => {
    expect(CHANNELS).toHaveLength(40);
    expect(CAMPAIGNS.length).toBeGreaterThan(1400);
    expect(CAMPAIGNS.length).toBeLessThan(1600);
    const active = CAMPAIGNS.filter((c) => c.status === "active").length;
    expect(active).toBeGreaterThan(180);
    expect(active).toBeLessThan(220);
    expect(IN_APP_EVENTS).toHaveLength(60);
  });

  it("두 탭의 초기 설정은 서로 다른 객체", () => {
    const install = createInstallInitial();
    const inApp = createInAppInitial();
    expect(install.channels.map((c) => c.channelId)).not.toEqual(inApp.channels.map((c) => c.channelId));
  });
});

describe("6-1. 게임사 (설치 탭)", () => {
  const s = createInstallInitial();

  it("캠페인이 직접 설정한 칸은 캠페인 값", () => {
    expect(resolveInstall(s, "clickProb", GOOGLE, IOS_NEW)).toEqual(days(1));
  });
  it("캠페인이 따르는 칸은 채널 값", () => {
    expect(resolveInstall(s, "clickDevice", GOOGLE, IOS_NEW)).toEqual(days(30));
  });
  it("채널 값 0은 기여하지 않음", () => {
    const d = resolveInstall(s, "viewDevice", GOOGLE, IOS_NEW);
    expect(d.value).toBe(0);
    expect(formatDuration(d)).toBe("기여하지 않음");
  });
  it("설정 없는 캠페인은 채널 값", () => {
    expect(resolveInstall(s, "clickProb", GOOGLE, AOS_NEW).value).toBe(0);
  });
  it("광고 채널 정책 캠페인은 정책 값", () => {
    expect(resolveInstall(s, "clickDevice", GOOGLE, PRE_REG)).toEqual(days(90));
  });
  it("캠페인이 종료되어도 채널 값은 그대로 (자동 복귀 없음)", () => {
    expect(resolveInstall(s, "clickDevice", GOOGLE, SUMMER)).toEqual(days(14));
    expect(resolveInstall(s, "clickDevice", GOOGLE)).toEqual(days(30));
    expect(s.channels.find((c) => c.channelId === GOOGLE)?.cells.clickDevice).toEqual(own(days(30)));
  });
});

describe("6-2. 알람 앱 (인앱이벤트 탭)", () => {
  const s = createInAppInitial();

  it("인앱 이벤트 설정이 캠페인보다 우선", () => {
    expect(resolveInApp(s, SUBSCRIBE, GOOGLE, IOS_NEW)).toEqual(days(60));
  });
  it("설정 없는 이벤트는 캠페인 값", () => {
    expect(resolveInApp(s, PURCHASE, GOOGLE, IOS_NEW)).toEqual(days(7));
  });
  it("설정 없는 캠페인은 채널 값", () => {
    expect(resolveInApp(s, PURCHASE, GOOGLE, AOS_NEW)).toEqual(days(60));
  });
  it("인앱 이벤트 설정이 채널보다 우선", () => {
    expect(resolveInApp(s, ALARM_EDIT, A8)).toEqual(days(1));
  });
  it("설정 없는 이벤트는 채널 값", () => {
    expect(resolveInApp(s, PURCHASE, A8)).toEqual(days(14));
  });
  it("목록에 없는 채널은 글로벌", () => {
    expect(resolveInApp(s, PURCHASE, META)).toEqual(days(30));
  });
  it("인앱 이벤트 값 0도 그대로 우선", () => {
    const zero = { ...s, events: [{ ...s.events[0], duration: days(0) }] };
    expect(resolveInApp(zero, SUBSCRIBE, GOOGLE, IOS_NEW).value).toBe(0);
  });
});

describe("6-3. 설정 담당자 (설치 탭 글로벌 클릭 · 디바이스 7일 → 14일)", () => {
  const before = createInstallInitial();
  const d = installEditor.setGlobal(installEditor.toDraft(before), { ...before.global, clickDevice: days(14) });
  const after = installEditor.apply(before, d, TODAY);

  it("목록에 없는 채널은 새 글로벌 값", () => {
    expect(resolveInstall(after, "clickDevice", META)).toEqual(days(14));
  });
  it("목록의 12개 채널은 그대로", () => {
    for (const ch of before.channels) {
      expect(resolveInstall(after, "clickDevice", ch.channelId)).toEqual(
        (ch.cells.clickDevice as { duration: unknown }).duration,
      );
    }
  });
  it("Google Ads · iOS 신규 유저 모집은 Google Ads 값 그대로", () => {
    expect(resolveInstall(after, "clickDevice", GOOGLE, IOS_NEW)).toEqual(days(30));
  });
  it("적용 확인 팝업: 채널 12개 · 캠페인 2개(진행 중 캠페인 한정 설정 전체, 종료 제외)", () => {
    expect(installSaveNotice(before, after)).toEqual({ channels: 12, campaigns: 2 });
  });
  it("Google Ads 클릭 · 디바이스를 글로벌 값 따르기로 바꾸면 14일, 채널 11개 · 캠페인 2개", () => {
    const google = installEditor.toDraft(before).channels.find((r) => r.channelId === GOOGLE)!;
    const d2 = installEditor.setChannelCells(d, google.key, { ...google.cells, clickDevice: inherit() });
    const after2 = installEditor.apply(before, d2, TODAY);
    expect(resolveInstall(after2, "clickDevice", GOOGLE)).toEqual(days(14));
    expect(installSaveNotice(before, after2)).toEqual({ channels: 11, campaigns: 2 });
  });
  it("저장하면 바뀐 행만 최근 수정일이 오늘", () => {
    expect(after.globalUpdatedAt).toBe(TODAY);
    expect(after.channels).toEqual(before.channels);
  });
  it("글로벌을 바꾸지 않으면 안내 박스 없음", () => {
    const google = installEditor.toDraft(before).channels.find((r) => r.channelId === GOOGLE)!;
    const d3 = installEditor.setChannelCells(installEditor.toDraft(before), google.key, {
      ...google.cells,
      clickDevice: own(days(7)),
    });
    expect(installSaveNotice(before, installEditor.apply(before, d3, TODAY))).toBeNull();
  });
});

describe("6-4. 신규 마케터", () => {
  it("설치 탭: 글로벌 클릭 7일 · 조회 1일, 목록 13행, 캠페인 한정 설정 1개", () => {
    const s = createInstallInitial();
    expect(resolveInstall(s, "clickDevice")).toEqual(days(7));
    expect(resolveInstall(s, "viewDevice")).toEqual(days(1));
    expect(1 + s.channels.length).toBe(13);
    expect(campaignSettingsOf(s.campaigns, GOOGLE, false)).toHaveLength(1);
    expect(campaignSettingsOf(s.campaigns, APPLE, false)).toHaveLength(1);
    expect(campaignSettingsOf(s.campaigns, GOOGLE, true)).toHaveLength(2);
  });
  it("인앱이벤트 탭: 인앱 이벤트 2개, 최근 등록순", () => {
    const s = createInAppInitial();
    expect(s.events.map((e) => e.eventId)).toEqual([SUBSCRIBE, ALARM_EDIT]);
  });
});

describe("6-5. 저장 규칙", () => {
  const s = createInstallInitial();
  const base = installEditor.toDraft(s);

  it("수정 모드 진입 직후 저장 비활성", () => {
    expect(installEditor.canSave(s, base)).toBe(false);
  });
  it("[+ 추가]만 누르고 채널을 안 고르면 다른 칸을 바꿔도 저장 비활성", () => {
    let d = installEditor.addChannelRow(base);
    d = installEditor.setGlobal(d, { ...s.global, clickDevice: days(14) });
    expect(installEditor.canSave(s, d)).toBe(false);
  });
  it("캠페인을 추가하고 고르기만 하면 비활성, 한 칸을 바꾸면 활성", () => {
    let d = installEditor.addCampaignRow(base, GOOGLE);
    const row = d.campaigns.find((r) => r.campaignId === null)!;
    d = installEditor.selectCampaign(d, row.key, AOS_NEW);
    expect(installEditor.canSave(s, d)).toBe(false);
    const picked = d.campaigns.find((r) => r.key === row.key)!;
    expect(Object.values(picked.cells).every((c) => c.mode === "inherit")).toBe(true);
    d = installEditor.setCampaignCells(d, row.key, { ...picked.cells, clickDevice: own(days(1)) });
    expect(installEditor.canSave(s, d)).toBe(true);
  });
  it("채널을 추가하고 고르면(값 0) 저장 활성", () => {
    let d = installEditor.addChannelRow(base);
    const row = d.channels[d.channels.length - 1];
    expect(Object.values(row.cells).every((c) => c.mode === "own" && c.duration.value === 0)).toBe(true);
    d = installEditor.selectChannel(d, row.key, META);
    expect(installEditor.canSave(s, d)).toBe(true);
  });
  it("값을 바꿨다가 원래대로 돌리면 바뀐 내용 없음", () => {
    const d1 = installEditor.setGlobal(base, { ...s.global, clickDevice: days(14) });
    const d2 = installEditor.setGlobal(d1, s.global);
    expect(installEditor.canSave(s, d2)).toBe(false);
  });
  it("이미 있던 캠페인 행의 모든 칸을 따르기로 바꾸면 저장 비활성", () => {
    const row = base.campaigns.find((r) => r.campaignId === IOS_NEW)!;
    const d = installEditor.setCampaignCells(base, row.key, { ...row.cells, clickProb: inherit() });
    expect(installEditor.canSave(s, d)).toBe(false);
  });
  it("새 캠페인 행은 그 채널 캠페인 목록 맨 위", () => {
    const d = installEditor.addCampaignRow(base, GOOGLE);
    const google = d.campaigns.filter((r) => r.channelId === GOOGLE);
    expect(google[0].campaignId).toBeNull();
  });
});

describe("삭제", () => {
  const s = createInstallInitial();
  const base = installEditor.toDraft(s);

  it("채널 삭제 팝업 N = 그 채널의 캠페인 설정 수(종료 포함)", () => {
    expect(channelDeleteCampaignCount(base, GOOGLE)).toBe(2);
    expect(channelDeleteCampaignCount(base, APPLE)).toBe(1);
  });
  it("채널 삭제 = 채널 설정 + 그 채널 캠페인 설정 전부 삭제 → 글로벌 적용", () => {
    const google = base.channels.find((r) => r.channelId === GOOGLE)!;
    const after = installEditor.apply(s, installEditor.removeChannelRow(base, google.key), TODAY);
    expect(after.channels.some((c) => c.channelId === GOOGLE)).toBe(false);
    expect(after.campaigns.some((c) => c.campaignId === IOS_NEW || c.campaignId === SUMMER)).toBe(false);
    expect(resolveInstall(after, "clickProb", GOOGLE, IOS_NEW)).toEqual(s.global.clickProb);
    // 정책은 목록 행이 아니므로 그대로
    expect(resolveInstall(after, "clickDevice", GOOGLE, PRE_REG)).toEqual(days(90));
  });
  it("캠페인 삭제 → 채널 값을 따름", () => {
    const row = base.campaigns.find((r) => r.campaignId === APPLE_BRAND)!;
    const after = installEditor.apply(s, installEditor.removeCampaignRow(base, row.key), TODAY);
    expect(resolveInstall(after, "clickDevice", APPLE, APPLE_BRAND)).toEqual(days(14));
  });
});

describe("인앱이벤트 탭 저장 · 안내 (spec_screens 5-6)", () => {
  const s = createInAppInitial();
  const base = inAppEditor.toDraft(s);

  it("새 채널 행은 0 · 년", () => {
    const d = inAppEditor.addChannelRow(base);
    expect(d.channels[d.channels.length - 1].cells).toEqual(own({ value: 0, unit: "year" }));
  });
  it("글로벌을 바꾸면 인앱 이벤트 · 채널 · 캠페인 개수", () => {
    const after = inAppEditor.apply(s, inAppEditor.setGlobal(base, days(14)), TODAY);
    // 채널 7개, 진행 중 캠페인 한정 설정은 iOS 신규 유저 모집 1개(종료된 여름 시즌 제외)
    expect(inAppSaveNotice(s, after)).toEqual({ kind: "global", events: 2, channels: 7, campaigns: 1 });
  });
  it("새로 추가한 캠페인도 캠페인 개수에 포함, 종료된 캠페인은 제외", () => {
    let d = inAppEditor.setGlobal(base, days(14));
    d = inAppEditor.addCampaignRow(d, APPLE);
    const row = d.campaigns.find((r) => r.campaignId === null)!;
    d = inAppEditor.selectCampaign(d, row.key, APPLE_BRAND);
    d = inAppEditor.setCampaignCells(d, row.key, own(days(3)));
    expect(inAppSaveNotice(s, inAppEditor.apply(s, d, TODAY))).toEqual({
      kind: "global",
      events: 2,
      channels: 7,
      campaigns: 2,
    });
  });
  it("채널 · 캠페인만 바꾸고 인앱 이벤트 설정이 있으면 인앱 이벤트 안내", () => {
    const row = base.channels.find((r) => r.channelId === GOOGLE)!;
    const after = inAppEditor.apply(s, inAppEditor.setChannelCells(base, row.key, own(days(30))), TODAY);
    expect(inAppSaveNotice(s, after)).toEqual({ kind: "events", events: 2 });
  });
  it("인앱 이벤트 설정이 없으면 설치 탭과 같음 (채널만 바꾸면 안내 없음)", () => {
    const noEvents = { ...s, events: [] };
    const d = inAppEditor.toDraft(noEvents);
    const row = d.channels.find((r) => r.channelId === GOOGLE)!;
    const after = inAppEditor.apply(noEvents, inAppEditor.setChannelCells(d, row.key, own(days(30))), TODAY);
    expect(inAppSaveNotice(noEvents, after)).toBeNull();
  });
  it("인앱이벤트 탭을 저장해도 설치 탭은 그대로", () => {
    const install = createInstallInitial();
    inAppEditor.apply(s, inAppEditor.setGlobal(base, days(14)), TODAY);
    expect(install).toEqual(createInstallInitial());
  });
});

describe("인앱 이벤트 기간 설정 팝업", () => {
  const s = createInAppInitial();
  const base = eventsEditor.toDraft(s);

  it("진입 직후 · 빈 행이 있으면 저장 비활성", () => {
    expect(eventsEditor.canSave(s, base)).toBe(false);
    expect(eventsEditor.canSave(s, eventsEditor.addRow(base))).toBe(false);
  });
  it("새 행은 0 · 일, 고르면 저장 활성, 저장하면 맨 앞(최근 등록순)", () => {
    let d = eventsEditor.addRow(base);
    const row = d.rows[d.rows.length - 1];
    expect(row.duration).toEqual(days(0));
    d = eventsEditor.selectEvent(d, row.key, PURCHASE);
    expect(eventsEditor.canSave(s, d)).toBe(true);
    const after = eventsEditor.apply(s, d, TODAY);
    expect(after.events.map((e) => e.eventId)).toEqual([PURCHASE, SUBSCRIBE, ALARM_EDIT]);
    expect(after.events[0]).toMatchObject({ createdAt: TODAY, updatedAt: TODAY });
  });
  it("삭제하면 그 이벤트는 캠페인 · 채널 · 글로벌 순", () => {
    const row = base.rows.find((r) => r.eventId === SUBSCRIBE)!;
    const d = eventsEditor.removeRow(base, row.key);
    expect(eventsEditor.canSave(s, d)).toBe(true);
    const after = eventsEditor.apply(s, d, TODAY);
    expect(resolveInApp(after, SUBSCRIBE, GOOGLE, IOS_NEW)).toEqual(days(7));
  });
});

describe("캠페인 검색", () => {
  const s = createInstallInitial();

  it("기본은 진행 중만, 체크하면 종료 포함(진행 중 위)", () => {
    expect(searchCampaignSettings(s.campaigns, "프로모션", false)).toHaveLength(0);
    expect(searchCampaignSettings(s.campaigns, "", true)).toHaveLength(0);
    const all = searchCampaignSettings(s.campaigns, "i", true).map((c) => c.id);
    expect(all).toEqual([IOS_NEW]);
    expect(searchCampaignSettings(s.campaigns, "모", false).map((c) => c.id)).toEqual([IOS_NEW]);
    expect(searchCampaignSettings(s.campaigns, "모", true).map((c) => c.id)).toEqual([IOS_NEW, SUMMER]);
  });
  it("캠페인 한정 설정이 없는 캠페인은 검색되지 않음", () => {
    expect(searchCampaignSettings(s.campaigns, "안드로이드", true)).toHaveLength(0);
  });
});
