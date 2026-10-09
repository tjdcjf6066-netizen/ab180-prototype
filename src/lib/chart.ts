// 기간 차트 계산 — docs/spec_screens.md 4-2 · 5-3
import { toMinutes, UNIT_LABEL } from "./duration";
import type { Duration } from "./types";

// 설치 탭(룩백) 차트 — 운영 중인 대시보드와 같은 방식.
// 화면에 그리는 값(클릭 · 조회 · 비교 점선) 중 가장 긴 값이 전체 길이, 나머지는 선형 비율.
// 짧은 값과 0도 보이도록 최소 길이 13%를 깔고 그 위에 비율만큼 더한다.
export const LOOKBACK_MIN_RATIO = 0.13;

export function lookbackRatio(d: Duration, max: number): number {
  const r = max > 0 ? Math.min(toMinutes(d) / max, 1) : 0;
  return LOOKBACK_MIN_RATIO + (1 - LOOKBACK_MIN_RATIO) * r;
}

// lookbackRatio의 역: 축 위 비율 위치 → 설치 전 기간(분). 최소 길이 구간은 0분.
export function lookbackMinutesAt(ratio: number, max: number): number {
  return (Math.max(ratio - LOOKBACK_MIN_RATIO, 0) / (1 - LOOKBACK_MIN_RATIO)) * max;
}

// 축 기준: 화면에 그리는 값 중 가장 긴 값(분)
export const lookbackAxisMax = (values: Duration[]) => Math.max(0, ...values.map(toMinutes));

// 차트 라벨용 기간. 표 · 툴팁과 달리 0도 숫자로 쓴다("0일").
export const chartDuration = (d: Duration) => `${d.value}${UNIT_LABEL[d.unit]}`;

const sameLength = (a: Duration, b: Duration) => toMinutes(a) === toMinutes(b);

// 클릭 · 조회 라벨. 값이 같으면 하나로 합친다: "클릭, 조회(30일)"
export type LookbackLabel = { key: "click" | "view" | "both"; text: string; duration: Duration };

export function lookbackLabels(click: Duration, view: Duration, prefix = ""): LookbackLabel[] {
  if (sameLength(click, view)) return [{ key: "both", text: `${prefix}클릭, 조회(${chartDuration(click)})`, duration: click }];
  return [
    { key: "click", text: `${prefix}클릭(${chartDuration(click)})`, duration: click },
    { key: "view", text: `${prefix}조회(${chartDuration(view)})`, duration: view },
  ];
}

// 조사 "과/와" — 끝 글자 받침 기준. 조사만 돌려준다(따옴표 바깥에 붙이도록).
const DIGIT_HAS_FINAL = "0136789".split("").map(Number);
export function gwaWa(word: string): "과" | "와" {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  let hasFinal: boolean;
  if (code >= 0xac00 && code <= 0xd7a3) hasFinal = (code - 0xac00) % 28 !== 0;
  else if (/[0-9]/.test(last)) hasFinal = DIGIT_HAS_FINAL.includes(Number(last));
  else hasFinal = /[lmn]/i.test(last);
  return hasFinal ? "과" : "와";
}
