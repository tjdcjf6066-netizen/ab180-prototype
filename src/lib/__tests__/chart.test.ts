import { describe, expect, it } from "vitest";
import { days, hours } from "../duration";
import { gwaWa, lookbackAxisMax, lookbackLabels, lookbackMinutesAt, lookbackRatio } from "../chart";

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
