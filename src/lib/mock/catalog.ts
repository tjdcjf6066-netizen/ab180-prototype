// 연동 채널 · 캠페인 · 인앱 이벤트 목록 — docs/spec_data.md 5-1 · 5-2 · 5-5
// 두 탭이 함께 쓰는 고정 목록. 탭별 설정은 installInitial.ts · inAppInitial.ts에 따로 둔다.
import type { Campaign, Channel, InAppEvent } from "../types";

const CHANNEL_NAMES = [
  "Google Ads", "Meta Ads", "Apple Search Ads", "TikTok for Business", "(주)데코",
  "Unity Ads", "AppLovin", "ironSource", "카카오모먼트", "네이버 GFA",
  "Moloco", "APPA월드와이드", "Mintegral", "A8app", "AIV디지털",
  "AVOW", "BA베이스", "ChatGPT 광고", "CPI드로이드", "EDN플러스",
  "Snapchat Ads", "X Ads", "Pinterest Ads", "LinkedIn Ads", "Vungle",
  "Chartboost", "AdColony", "Liftoff", "Tapjoy", "Fyber",
  "InMobi", "Kayzen", "Remerge", "Adjoe", "토스 애즈",
  "당근 비즈니스", "쿠팡 애즈", "네이버 검색광고", "카카오 비즈보드", "모비온",
];

const pad = (n: number, width: number) => String(n).padStart(width, "0");

export const CHANNELS: Channel[] = CHANNEL_NAMES.map((name, i) => ({
  id: `ch${pad(i + 1, 2)}`,
  name,
  ...(name === "Google Ads" ? { hasPolicyInfo: true } : {}),
}));

// 꼭 들어가야 하는 캠페인 이름 (앞 번호부터 차지)
const NAMED_CAMPAIGNS: Record<string, { name: string; status: Campaign["status"] }[]> = {
  "Google Ads": [
    { name: "iOS 신규 유저 모집", status: "active" },
    { name: "안드로이드 신규 유저 모집", status: "active" },
    { name: "iOS 리텐션", status: "active" },
    { name: "브랜드 키워드 검색", status: "active" },
    { name: "사전 등록 유도 앱 캠페인", status: "active" },
    { name: "2026 여름 시즌 프로모션", status: "ended" },
  ],
  "Apple Search Ads": [{ name: "브랜드 검색", status: "active" }],
  A8app: [{ name: "가을 신규 프로모션", status: "active" }],
};

// 채널별 캠페인 수 [전체, 진행 중]. 큰 채널 4개는 수백 개, 나머지는 수십 개. 합계 약 1,500 · 진행 중 약 200.
const BIG_CHANNELS: Record<string, [number, number]> = {
  "Google Ads": [200, 20],
  "Meta Ads": [180, 18],
  "Apple Search Ads": [120, 12],
  "TikTok for Business": [150, 15],
};
const campaignCounts = (name: string, i: number): [number, number] =>
  BIG_CHANNELS[name] ?? [12 + ((i * 7) % 25), 2 + (i % 5)];

export const CAMPAIGNS: Campaign[] = CHANNELS.flatMap((channel, i) => {
  const [total, activeCount] = campaignCounts(channel.name, i);
  const named = NAMED_CAMPAIGNS[channel.name] ?? [];
  const namedActive = named.filter((c) => c.status === "active").length;
  const generated = total - named.length;
  const generatedActive = activeCount - namedActive;
  return [
    ...named,
    // 생성 캠페인: 번호가 큰(최근) 것부터 진행 중
    ...Array.from({ length: generated }, (_, n) => ({
      name: `${channel.name} 캠페인 ${pad(n + 1, 3)}`,
      status: (n >= generated - generatedActive ? "active" : "ended") as Campaign["status"],
    })),
  ].map((c, n) => ({ id: `${channel.id}-c${pad(n + 1, 3)}`, channelId: channel.id, ...c }));
});

const STANDARD_EVENTS = [
  "회원가입", "로그인", "구매 완료", "장바구니 담기", "구독 시작",
  "튜토리얼 완료", "상품 조회", "검색", "결제 정보 입력", "레벨 달성",
  "업적 달성", "광고 시청", "공유", "위시리스트 추가", "평가",
  "예약", "앱 설치 후 첫 실행", "체험 시작", "환불", "홈 화면 조회",
];
const CUSTOM_EVENTS = [
  "알람 편집 화면 진입", "알람 생성", "구독 해지", "리뷰 작성", "친구 초대", "앱 실행",
  ...Array.from({ length: 34 }, (_, n) => `custom_event_${pad(n + 1, 2)}`),
];

export const IN_APP_EVENTS: InAppEvent[] = [
  ...STANDARD_EVENTS.map((name, n) => ({ id: `ev-std-${pad(n + 1, 2)}`, name, kind: "standard" as const })),
  ...CUSTOM_EVENTS.map((name, n) => ({ id: `ev-cus-${pad(n + 1, 2)}`, name, kind: "custom" as const })),
];

export const CHANNEL_BY_ID = new Map(CHANNELS.map((c) => [c.id, c]));
export const CAMPAIGN_BY_ID = new Map(CAMPAIGNS.map((c) => [c.id, c]));
export const EVENT_BY_ID = new Map(IN_APP_EVENTS.map((e) => [e.id, e]));

// 이름으로 id 찾기 (목업 초기 설정 · 테스트용)
const mustFind = <T>(item: T | undefined, label: string): T => {
  if (!item) throw new Error(`목업에 없음: ${label}`);
  return item;
};
export const channelId = (name: string) => mustFind(CHANNELS.find((c) => c.name === name), name).id;
export const campaignId = (channelName: string, name: string) => {
  const chId = channelId(channelName);
  return mustFind(CAMPAIGNS.find((c) => c.channelId === chId && c.name === name), `${channelName} · ${name}`).id;
};
export const eventId = (name: string) => mustFind(IN_APP_EVENTS.find((e) => e.name === name), name).id;
