"use client";

import { useState, useSyncExternalStore, type MouseEvent } from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { lookbackAxisMax, lookbackLabels, lookbackMinutesAt, lookbackRatio } from "@/lib/chart";
import { toMinutes } from "@/lib/duration";
import type { Duration, InstallCellKey } from "@/lib/types";

// spec_screens.md 4-2 · 와이어프레임 W1-A · W1-E. 좌표는 와이어프레임 차트 프레임(1300 × 190) 기준.
// 막대 길이는 운영 중인 대시보드와 같게: 가장 긴 값 = 전체, 최소 13% + 선형(lib/chart.ts).
const AXIS_LEFT = 16;
const AXIS_RIGHT = 1284;
const INSTALL_X = 1180; // 설치 지점 세로선. 막대는 여기서 왼쪽으로 뻗는다.
const BAR_START = 220; // 가장 긴 막대의 왼쪽 끝. "터치포인트" 라벨과 겹치지 않도록 축 시작보다 안쪽
const FULL = INSTALL_X - BAR_START;
const BASE_Y = 150;
const CLICK_H = 62;
const VIEW_H = 34;
const TOOLTIP_W = 306;
const LINE_W = 1.5; // 막대 테두리 · 비교 점선 굵기(운영 대시보드와 비슷하게)

// 화면 픽셀 비율. 선이 소수점 위치에 걸리면 이웃 픽셀로 번져 굵기가 달라 보이므로 위치 · 굵기를 픽셀 격자에 맞춘다.
const subscribeResize = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};
const useDevicePixelRatio = () =>
  useSyncExternalStore(subscribeResize, () => window.devicePixelRatio || 1, () => 1);

export type ChartRow = {
  name: string;
  /** 캠페인을 선택했을 때 툴팁 제목 위 채널명 캡션 */
  channelName?: string;
  isGlobal?: boolean;
  values: Record<InstallCellKey, Duration>;
};

export type ChartCompare = { name: string; click: Duration; view: Duration };

const ROWS: { group: string; key: InstallCellKey; label: string }[] = [
  { group: "클릭", key: "clickDevice", label: "디바이스 ID 매칭" },
  { group: "", key: "clickProb", label: "확률적 모델링" },
  { group: "조회", key: "viewDevice", label: "디바이스 ID 매칭" },
  { group: "", key: "viewProb", label: "확률적 모델링" },
];

export function LookbackChart({ row, compare }: { row: ChartRow; compare?: ChartCompare }) {
  const [hoverX, setHoverX] = useState<number | null>(null);
  const { clickDevice: click, viewDevice: view } = row.values;
  // 축 기준: 선택한 행의 클릭 · 조회와 비교 점선 중 가장 긴 값
  const max = lookbackAxisMax(compare ? [click, view, compare.click, compare.view] : [click, view]);
  const dpr = useDevicePixelRatio();
  const snap = (v: number) => Math.round(v * dpr) / dpr;
  const lineW = Math.max(1, Math.floor(LINE_W * dpr)) / dpr; // 레티나 1.5px, 일반 모니터 1px
  const xOf = (d: Duration) => snap(INSTALL_X - FULL * lookbackRatio(d, max));

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    setHoverX(x >= AXIS_LEFT && x < INSTALL_X ? x : null);
  };

  // 마우스 지점의 설치 전 기간(분)
  const hoverMinutes = hoverX === null ? 0 : lookbackMinutesAt((INSTALL_X - hoverX) / FULL, max);
  const covers = (d: Duration) => d.value > 0 && hoverMinutes <= toMinutes(d);
  const dotY = hoverX === null ? null : covers(click) ? BASE_Y - CLICK_H : covers(view) ? BASE_Y - VIEW_H : null;

  return (
    <div
      className="relative h-190 overflow-hidden rounded-8 border border-border bg-white"
      onMouseMove={onMove}
      onMouseLeave={() => setHoverX(null)}
    >
      {/* 축 */}
      <div className="absolute h-1 bg-divider" style={{ left: AXIS_LEFT, width: AXIS_RIGHT - AXIS_LEFT, top: BASE_Y }} />
      <div className="absolute w-1 bg-divider" style={{ left: INSTALL_X, top: 0, height: BASE_Y }} />

      {/* 막대: 클릭(높은 연한 막대, 뒤) · 조회(낮은 진한 막대, 앞). 0도 최소 길이로 그린다. */}
      <Bar left={xOf(click)} lineW={lineW} height={CLICK_H} className="bg-chart-lookback-light" />
      <Bar left={xOf(view)} lineW={lineW} height={VIEW_H} className="bg-chart-lookback-strong" />

      {/* 비교 점선: 위 단계 값. 0도 최소 길이 위치에 점선으로 */}
      {compare &&
        lookbackLabels(compare.click, compare.view, `${compare.name}: `).map((l) => (
            <div key={l.key} className="absolute top-0" style={{ left: xOf(l.duration), height: BASE_Y }}>
              <div
                className="h-full"
                style={{
                  width: lineW,
                  backgroundImage: "linear-gradient(to bottom, var(--color-primary) 6px, transparent 6px)",
                  backgroundSize: `${lineW}px 9px`,
                }}
              />
              <span className="absolute top-8 left-6 text-caption whitespace-nowrap text-text-secondary">{l.text}</span>
            </div>
          ))}

      {/* 가로축 라벨 */}
      <span className="absolute text-caption text-text-secondary" style={{ left: 24, top: 162 }}>
        터치포인트
      </span>
      {lookbackLabels(click, view).map((l) => (
        <span
          key={l.key}
          className="absolute -translate-x-1/2 text-caption whitespace-nowrap text-text-primary"
          style={{ left: xOf(l.duration), top: 162 }}
        >
          {l.text}
        </span>
      ))}
      <span className="absolute text-caption whitespace-nowrap text-text-secondary" style={{ left: INSTALL_X + 14, top: 162 }}>
        ⤓ 설치
      </span>

      {/* 호버: 세로선 + 점 + 툴팁 */}
      {hoverX !== null && (
        <>
          <div className="pointer-events-none absolute top-0 w-1 bg-primary" style={{ left: hoverX, height: BASE_Y }} />
          {dotY !== null && (
            <div
              className="pointer-events-none absolute size-9 -translate-1/2 rounded-full bg-primary"
              style={{ left: hoverX + 0.5, top: dotY }}
            />
          )}
          <div
            className="pointer-events-none absolute top-4 z-10 rounded-6 border border-border bg-white shadow-dropdown"
            style={{
              width: TOOLTIP_W,
              left: hoverX + 16 + TOOLTIP_W > AXIS_RIGHT ? hoverX - 16 - TOOLTIP_W : hoverX + 16,
            }}
          >
            <div className="px-16 py-10">
              {row.channelName && <div className="text-tag text-text-placeholder">{row.channelName}</div>}
              <div className="flex items-center gap-8 text-body font-medium">
                {row.name}
                {row.isGlobal && <InfoOutlinedIcon className="text-icon" style={{ fontSize: 15 }} />}
              </div>
            </div>
            <div className="h-1 bg-divider" />
            <div className="flex flex-col gap-4 px-16 py-10">
              {ROWS.map((r, i) => (
                <div key={r.key} className={`flex items-center text-body-sm ${i === 2 ? "mt-10" : ""}`}>
                  <span className="w-42 font-medium">{r.group}</span>
                  <span className="w-116 text-text-secondary">{r.label}</span>
                  {covers(row.values[r.key]) ? (
                    <span className="text-primary">어트리뷰션 대상</span>
                  ) : (
                    <span className="text-text-danger">어트리뷰션 대상 제외</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// 막대 왼쪽 끝 아래에 ▼ 표시(운영 대시보드와 같음)
function Bar({ left, lineW, height, className }: { left: number; lineW: number; height: number; className: string }) {
  return (
    <>
      <div
        className={`absolute border-solid border-chart-lookback-line ${className}`}
        style={{ left, width: INSTALL_X - left, top: BASE_Y - height, height, borderWidth: lineW }}
      />
      <div
        className="absolute size-0 -translate-x-1/2 border-x-4 border-t-6 border-x-transparent border-t-chart-lookback-line"
        style={{ left: left + lineW / 2, top: BASE_Y - 6 }}
      />
    </>
  );
}
