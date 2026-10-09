# spec_data.md — 데이터 · 계산 · 테스트 명세

> 데이터나 계산 로직을 만들기 전에 이 문서를 읽는다. 서버 · DB 없이 **메모리 상태 + 목업 데이터**로 동작한다(새로고침하면 초기 목업으로 돌아가도 됨).

---

## 1. 기본 개념

- **설치 탭 = 룩백 윈도우**(설치 전 기간), 값 4칸: `clickDevice` 클릭 · 디바이스 ID 매칭 / `clickProb` 클릭 · 확률적 모델링 / `viewDevice` 조회 · 디바이스 ID 매칭 / `viewProb` 조회 · 확률적 모델링
- **인앱이벤트 탭(설치) = 어트리뷰션 윈도우**(설치 후 기간), 값 1칸: `install`
- **두 탭은 완전히 독립**: 채널 · 캠페인 목록과 값을 따로 가진다. 한 탭을 바꿔도 다른 탭에 영향이 없다.
- 계층: 글로벌 → 채널 → 캠페인(+ 인앱이벤트 탭만 인앱 이벤트가 맨 위 우선).
- 원칙: **사용자가 직접 바꾼 칸만 자기 값(own)을 갖고, 나머지 칸은 한 단계 위를 따른다(inherit).** 시스템이 값을 몰래 바꾸지 않는다.

---

## 2. 타입

```ts
type Unit = 'minute' | 'hour' | 'day' | 'year';           // 설치 탭은 minute · hour · day만
type Duration = { value: number; unit: Unit };            // value 0 = 기여하지 않음
type Cell = { mode: 'own'; duration: Duration } | { mode: 'inherit' };

type InstallCellKey = 'clickDevice' | 'clickProb' | 'viewDevice' | 'viewProb';
type InstallCells = Record<InstallCellKey, Cell>;

type Channel = { id: string; name: string; hasPolicyInfo?: boolean };      // 연동 채널 40개
type Campaign = { id: string; channelId: string; name: string; status: 'active' | 'ended' };
type InAppEvent = { id: string; name: string; kind: 'standard' | 'custom' }; // 약 60개

// 설치 탭 설정
type InstallSettings = {
  defaults: Record<InstallCellKey, Duration>;              // 에어브릿지 기본 설정(참고값)
  global: Record<InstallCellKey, Duration>;                // 글로벌은 항상 own
  channels: { channelId: string; cells: InstallCells; updatedAt: string }[];   // 추가한 채널만
  campaigns: { campaignId: string; cells: InstallCells; updatedAt: string }[]; // 캠페인 한정 설정만
};

// 인앱이벤트 탭(설치) 설정
type InAppSettings = {
  defaults: Duration;                                      // 30일
  global: Duration;
  channels: { channelId: string; cell: Cell; updatedAt: string }[];
  campaigns: { campaignId: string; cell: Cell; updatedAt: string }[];
  events: { eventId: string; duration: Duration; createdAt: string; updatedAt: string }[]; // 최근 등록순 정렬
};
```

- 광고 채널 정책: `policies = [{ campaignId, cellKey: 'clickDevice', duration: { value: 90, unit: 'day' } }]` — 설치 탭에만. 목록 행이 아니며 수정 불가.

---

## 3. 적용값 계산

### 3-1. 설치 탭

```ts
function resolveInstall(s: InstallSettings, cell: InstallCellKey, channelId?: string, campaignId?: string): Duration {
  // 1) 광고 채널 정책이 있는 캠페인의 정책 칸은 정책 값
  // 2) 캠페인 설정의 그 칸이 own이면 그 값
  // 3) 채널 설정의 그 칸이 own이면 그 값 (목록에 없는 채널은 4로)
  // 4) 글로벌 값
}
```

### 3-2. 인앱이벤트 탭(설치)

```ts
function resolveInApp(s: InAppSettings, eventId?: string, channelId?: string, campaignId?: string): Duration {
  // 1) 인앱 이벤트에 기간이 설정돼 있으면 그 값 (캠페인 · 채널보다 우선, 0도 그대로)
  // 2) 캠페인 설정이 own이면 그 값
  // 3) 채널 설정이 own이면 그 값
  // 4) 글로벌 값
}
```

- 비교 · 차트용 환산: 분 1, 시간 60, 일 1,440, 년 525,600(365일).
- 화면 표시: value 0 → "기여하지 않음", 그 외 "N일 / N시간 / N분 / N년".

---

## 4. 저장 규칙

- **바뀐 내용 없음 → 저장 비활성.**
- **빈 행**(채널 · 캠페인 · 인앱 이벤트를 고르지 않은 행) 하나라도 있음 → 저장 비활성.
- **추가한 캠페인 행이 모든 칸 inherit** → 저장 비활성(바꾼 칸이 있어야 함).
- 채널 행은 0이 설정값이므로 고르기만 하면 저장 가능.
- 채널 삭제 = 그 채널 설정 + 그 채널의 캠페인 설정 전부(종료된 캠페인 포함) 삭제.
- 캠페인 삭제 = 그 캠페인 설정 삭제 → 채널 값을 따름.
- 저장하면 바뀐 행의 `updatedAt`을 오늘로.

### 4-1. 적용 확인 팝업 개수 계산 (글로벌을 바꿨을 때)
바꾼 글로벌 칸(설치 탭은 칸별, 바뀐 칸이 여러 개면 합집합)에 대해, **저장한 뒤의 상태** 기준으로
- **채널 N** = 그 칸이 own인 채널 수
- **캠페인 N** = **진행 중** 캠페인 한정 설정 전체(속한 채널 · 바꾼 칸과 관계없이 셈, 종료된 캠페인 제외). 두 탭 공통.
- **인앱 이벤트 N** (인앱이벤트 탭만) = 기간을 설정한 인앱 이벤트 수
- 인앱이벤트 탭에서 채널 · 캠페인만 바꿨을 때: **인앱 이벤트 N** = 기간을 설정한 인앱 이벤트 수(1 이상일 때만 안내)
- 채널 삭제 팝업의 캠페인 N = 그 채널의 캠페인 설정 수(종료 포함)

---

## 5. 목업 데이터

### 5-1. 연동 채널 40개
Google Ads(ⓘ 정책) · Meta Ads · Apple Search Ads · TikTok for Business · (주)데코 · Unity Ads · AppLovin · ironSource · 카카오모먼트 · 네이버 GFA · Moloco · APPA월드와이드 · Mintegral · A8app · AIV디지털 · AVOW · BA베이스 · ChatGPT 광고 · CPI드로이드 · EDN플러스 · Snapchat Ads · X Ads · Pinterest Ads · LinkedIn Ads · Vungle · Chartboost · AdColony · Liftoff · Tapjoy · Fyber · InMobi · Kayzen · Remerge · Adjoe · 토스 애즈 · 당근 비즈니스 · 쿠팡 애즈 · 네이버 검색광고 · 카카오 비즈보드 · 모비온

> 채널 표시 이름은 두 탭 모두 위 이름 하나로 쓴다.

### 5-2. 캠페인 약 1,500개 (진행 중 약 200개)
- 채널마다 수십 ~ 수백 개를 생성(`{채널명} 캠페인 001` 형식). 진행 중 합계 약 200개.
- Google Ads에는 아래 이름을 반드시 포함:
  - 진행 중: iOS 신규 유저 모집 · 안드로이드 신규 유저 모집 · iOS 리텐션 · 브랜드 키워드 검색 · 사전 등록 유도 앱 캠페인(정책)
  - 종료: 2026 여름 시즌 프로모션
- Apple Search Ads: 진행 중 "브랜드 검색"
- A8app: 진행 중 "가을 신규 프로모션"

### 5-3. 설치 탭 초기 설정 (W1과 동일)
- 기본 설정(참고): 7일 · 1일 · 1일 · 6시간
- 글로벌: 7일 · 1일 · 1일 · 6시간 (2026-10-06)
- 채널 12개(4칸 모두 own, 순서대로 / 최근 수정일)

| 채널 | 클릭 · 디바이스 | 클릭 · 확률 | 조회 · 디바이스 | 조회 · 확률 | 수정일 |
| --- | --- | --- | --- | --- | --- |
| Google Ads | 30일 | 0 | 0 | 6시간 | 2026-09-12 |
| (주)데코 | 30일 | 0 | 0 | 6시간 | 2026-10-06 |
| TikTok for Business | 30일 | 14일 | 30일 | 12시간 | 2026-10-06 |
| Apple Search Ads | 14일 | 1일 | 1일 | 6시간 | 2026-09-30 |
| Unity Ads | 7일 | 0 | 1일 | 6시간 | 2026-08-21 |
| AppLovin | 7일 | 1일 | 0 | 0 | 2026-08-21 |
| ironSource | 14일 | 1일 | 1일 | 6시간 | 2026-07-02 |
| 카카오모먼트 | 7일 | 0 | 0 | 0 | 2026-06-15 |
| 네이버 GFA | 14일 | 1일 | 1일 | 6시간 | 2026-06-15 |
| Moloco | 7일 | 1일 | 1일 | 12시간 | 2026-05-30 |
| APPA월드와이드 | 3일 | 1일 | 1일 | 6시간 | 2026-10-06 |
| Mintegral | 30일 | 1일 | 1일 | 6시간 | 2026-04-11 |

- 캠페인 설정:
  - Google Ads · iOS 신규 유저 모집(진행 중): clickProb **own 1일**, 나머지 inherit (2026-10-08)
  - Google Ads · 2026 여름 시즌 프로모션(종료): clickDevice own 14일, 나머지 inherit (2026-08-31)
  - Apple Search Ads · 브랜드 검색(진행 중): clickDevice own 7일, 나머지 inherit (2026-09-30)
- 정책: Google Ads · 사전 등록 유도 앱 캠페인 clickDevice 90일(목록에 없음, Google Ads ⓘ 툴팁)

### 5-4. 인앱이벤트 탭(설치) 초기 설정 (W3와 동일)
- 기본 설정(참고): 30일 / 글로벌: 30일 (2026-10-06)
- 채널(모두 own): Google Ads 60일(2026-10-08) · A8app 14일 · AVOW 7일 · ChatGPT 광고 1년 · Unity Ads 14일 · Moloco 60일 · 카카오모먼트 7일 (2026-10-08)
- 캠페인: Google Ads · iOS 신규 유저 모집(진행 중) 7일(2026-10-09) / Google Ads · 2026 여름 시즌 프로모션(종료) 14일(2026-08-31)
- 인앱 이벤트: 알람 편집 화면 진입(커스텀) 1일 · 구독 시작(스탠다드) 60일 (2026-10-09)

### 5-5. 인앱 이벤트 목록 약 60개
- 스탠다드(약 20): 회원가입 · 로그인 · 구매 완료 · 장바구니 담기 · 구독 시작 · 튜토리얼 완료 · 상품 조회 · 검색 · 결제 정보 입력 · 레벨 달성 · 업적 달성 · 광고 시청 · 공유 · 위시리스트 추가 · 평가 · 예약 · 앱 설치 후 첫 실행 · 체험 시작 · 환불 · 홈 화면 조회
- 커스텀(약 40): 알람 편집 화면 진입 · 알람 생성 · 구독 해지 · 리뷰 작성 · 친구 초대 · 앱 실행 · 그 외 `custom_event_01`~ 형식

---

## 6. 시나리오 테스트 (계산 함수 단위 테스트로 먼저 작성)

### 6-1. 게임사 (설치 탭)
초기 상태 기준
- `resolveInstall(clickProb, Google Ads, iOS 신규 유저 모집)` = **1일**
- `resolveInstall(clickDevice, Google Ads, iOS 신규 유저 모집)` = 30일 (Google Ads 따름)
- `resolveInstall(viewDevice, Google Ads, iOS 신규 유저 모집)` = 0 (기여하지 않음)
- `resolveInstall(clickProb, Google Ads, 안드로이드 신규 유저 모집)` = 0 (설정 없음 → Google Ads)
- `resolveInstall(clickDevice, Google Ads, 사전 등록 유도 앱 캠페인)` = 90일 (정책)
- 캠페인이 종료되어도 Google Ads 채널 값은 그대로(자동 복귀 없음)

### 6-2. 알람 앱 (인앱이벤트 탭)
- `resolveInApp(구독 시작, Google Ads, iOS 신규 유저 모집)` = **60일** (이벤트 우선)
- `resolveInApp(구매 완료, Google Ads, iOS 신규 유저 모집)` = 7일 (캠페인)
- `resolveInApp(구매 완료, Google Ads, 안드로이드 신규 유저 모집)` = 60일 (채널)
- `resolveInApp(알람 편집 화면 진입, A8app)` = 1일
- `resolveInApp(구매 완료, A8app)` = 14일
- `resolveInApp(구매 완료, Meta Ads)` = 30일 (목록에 없는 채널 → 글로벌)

### 6-3. 설정 담당자 (설치 탭 글로벌 클릭 · 디바이스 7일 → 14일)
- 목록에 없는 채널(예: Meta Ads)의 clickDevice = **14일**
- 목록의 12개 채널 clickDevice = 그대로(own)
- Google Ads · iOS 신규 유저 모집 clickDevice = 30일 그대로(Google Ads 따름)
- 적용 확인 팝업: "채널 **12개**(그 안의 캠페인 포함) · 캠페인 **2개**에는 반영되지 않습니다." (진행 중 iOS 신규 유저 모집 · 브랜드 검색)
- 담당자가 Google Ads clickDevice를 "글로벌 값 따르기"로 바꾸고 저장하면 Google Ads clickDevice = 14일, 팝업 숫자는 채널 11개 · 캠페인 2개

### 6-4. 신규 마케터
- 설치 탭 진입: 글로벌 선택, 차트 클릭 7일 · 조회 1일, 목록 13행(글로벌 + 12채널), Google Ads · Apple Search Ads에 [캠페인 한정 설정 1개]
- 인앱이벤트 탭: 레이어 "인앱 이벤트별 기간 설정 2개", 필터 목록에 구독 시작 60일 · 알람 편집 화면 진입 1일(최근 등록순)

### 6-5. 저장 규칙
- 수정 모드 진입 직후 저장 비활성
- [+ 추가]만 누르고 채널을 안 고르면 다른 칸을 바꿔도 저장 비활성
- 캠페인을 추가하고 고르기만 하면 저장 비활성, 한 칸을 바꾸면 활성
- 채널을 추가하고 고르면(값 0) 저장 활성

---

## 7. 저장 위치
- 화면 상태는 React 상태(또는 간단한 전역 스토어)에 둔다. 서버 · localStorage 저장은 필요 없다.
