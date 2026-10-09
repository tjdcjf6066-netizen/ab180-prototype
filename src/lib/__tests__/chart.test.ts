import { describe, expect, it } from "vitest";
import { days, hours } from "../duration";
import { attributionChart, gwaWa, lookbackAxisMax, lookbackLabels, lookbackMinutesAt, lookbackRatio } from "../chart";

describe("기간 차트", () => {
  it("가장 긴 값 = 전체, 최소 13% + 선형 — 운영 대시보드 캡처와 같은 위치", () => {
    const max = lookbackAxisMax([days(30), days(0), days(7), days(1)]); // 구글 애즈 선택 + 글로벌 점선
    expect(lookbackRatio(days(30), max)).toBe(1);
    expect(lookbackRatio(days(7), max)).toBeCloseTo(0.333, 3); // 글로벌: 클릭(7일) 점선
    expect(lookbackRatio(days(1), max)).toBeCloseTo(0.159, 3); // 글로벌: 조회(1일) 점선
    expect(lookbackRatio(days(0), max)).toBe(0.13); // 조회(0일)도 최소 길이로 보임
    expect(lookbackRatio(hours(6), lookbackAxisMax([days(7), hours(6)]))).toBeGreaterThan(0.13);
  });

  it("모두 0이면 최소 길이", () => {
    expect(lookbackRatio(days(0), lookbackAxisMax([days(0), days(0)]))).toBe(0.13);
  });

  it("비율 → 기간 역변환", () => {
    const max = lookbackAxisMax([days(7)]);
    expect(lookbackMinutesAt(lookbackRatio(days(3), max), max)).toBeCloseTo(3 * 1440, 6);
    expect(lookbackMinutesAt(0.05, max)).toBe(0);
  });

  it("라벨: 0은 숫자로, 같은 값은 하나로", () => {
    expect(lookbackLabels(days(30), days(0)).map((l) => l.text)).toEqual(["클릭(30일)", "조회(0일)"]);
    expect(lookbackLabels(days(30), days(30)).map((l) => l.text)).toEqual(["클릭, 조회(30일)"]);
    expect(lookbackLabels(days(0), days(0)).map((l) => l.text)).toEqual(["클릭, 조회(0일)"]);
    expect(lookbackLabels(days(1), hours(24), "글로벌: ").map((l) => l.text)).toEqual(["글로벌: 클릭, 조회(1일)"]);
  });

  it("조사 과/와", () => {
    expect(gwaWa("2026")).toBe("과");
    expect(gwaWa("2025")).toBe("와");
    expect(gwaWa("리타겟팅")).toBe("과");
    expect(gwaWa("구매")).toBe("와");
    expect(gwaWa("iOS")).toBe("와");
    expect(gwaWa("ironSource 캠페인")).toBe("과");
  });
});

describe("인앱이벤트 차트", () => {
  it("필터 없음: 막대 하나 + 기준선, 가장 긴 값 = 전체", () => {
    const c = attributionChart(days(7), { compare: { name: "Google Ads", duration: days(60) } });
    expect(c.bars).toHaveLength(1);
    expect(c.baseline).toMatchObject({ text: "Google Ads(60일)", ratio: 1 });
    expect(c.labels[0]).toMatchObject({ text: "인앱이벤트(7일)" });
    expect(c.labels[0].ratio).toBeCloseTo(0.13 + 0.87 * (7 / 60), 6);
  });
  it("글로벌: 기준선 없이 꽉 참", () => {
    const c = attributionChart(days(30), {});
    expect(c.baseline).toBeUndefined();
    expect(c.bars[0].ratio).toBe(1);
  });
  it("이벤트를 고르면 막대 두 개, 긴 쪽이 높은 막대 · 고른 이벤트는 진하게", () => {
    const c = attributionChart(days(7), { event: { name: "구독 시작", duration: days(60) } });
    expect(c.bars.map((b) => [b.key, b.tall, b.strong])).toEqual([
      ["event", true, true],
      ["other", false, false],
    ]);
    expect(c.labels.map((l) => l.text)).toEqual(["그 외 인앱 이벤트(7일)", "구독 시작(60일)"]);
  });
  it("값이 같으면 라벨 하나, 0은 최소 길이 막대 + (0일)", () => {
    expect(attributionChart(days(60), { event: { name: "구독 시작", duration: days(60) } }).labels.map((l) => l.text)).toEqual([
      "그 외 인앱 이벤트 · 구독 시작(60일)",
    ]);
    const zero = attributionChart(days(7), { event: { name: "앱 실행", duration: days(0) } });
    expect(zero.labels[1]).toMatchObject({ text: "앱 실행(0일)", ratio: 0.13 });
  });
});
