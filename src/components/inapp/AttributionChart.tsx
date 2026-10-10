"use client";

import { useRef, useState, type MouseEvent } from "react";
import { useElementWidth } from "@/components/chart/useElementWidth";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { usePixelSnap } from "@/components/chart/usePixelSnap";
import { attributionChart, lookbackMinutesAt } from "@/lib/chart";
import { formatDuration, toMinutes } from "@/lib/duration";
import type { Duration } from "@/lib/types";

// spec_screens.md 5-3 · 와이어프레임 W3 · W3-B · W3-M · W3-N. 좌표는 차트 프레임(1300 × 190) 기준.
// 막대는 설치 지점에서 오른쪽으로 뻗는다. 비율은 설치 탭과 같다(lib/chart.ts).
const AXIS_LEFT = 16;
const INSTALL_X = 130;
const END_GAP = 200; // 가장 긴 막대 끝 오른쪽 "측정 대상 제외" 라벨 자리. 막대 끝 = 차트 너비 - 200
const BASE_Y = 150;
const TALL_H = 62;
const LOW_H = 34;
const TOOLTIP_W = 340;
const LINE_W = 1.5;

export type AttrRow = {
  name: string;
  /** 캠페인을 선택했을 때 툴팁 제목 위 채널명 캡션 */
  channelName?: string;
  isGlobal?: boolean;
  value: Duration;
};

type Props = {
  row: AttrRow;
  /** 필터 "선택하지 않음"일 때 위 단계 값(채널: 글로벌, 캠페인: 채널) */
  compare?: { name: string; duration: Duration };
  /** 필터로 고른 인앱 이벤트 */
  event?: { name: string; duration: Duration };
};

export function AttributionChart({ row, compare, event }: Props) {
  // 콘텐츠 너비에 맞춰 좌표 계산: 양 끝 라벨 자리는 고정, 막대 구간만 늘고 줄어든다
  const boxRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(boxRef);
  const AXIS_RIGHT = width - 16;
  const FULL = width - END_GAP - INSTALL_X;
  const [hoverX, setHoverX] = useState<number | null>(null);
  const { snap, lineW } = usePixelSnap(LINE_W);
  const chart = attributionChart(row.value, { compare: event ? undefined : compare, event });
  const xOf = (ratio: number) => snap(INSTALL_X + FULL * ratio);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    setHoverX(x > INSTALL_X && x <= AXIS_RIGHT ? x : null);
  };

  // 마우스 지점의 설치 후 기간(분)
  const hoverMinutes = hoverX === null ? 0 : lookbackMinutesAt((hoverX - INSTALL_X) / FULL, chart.max);
  const covers = (d: Duration) => d.value > 0 && hoverMinutes <= toMinutes(d);
  const durationOf = (key: "other" | "event") => (key === "event" && event ? event.duration : row.value);
  const coveringBar = hoverX === null ? undefined : chart.bars.filter((b) => covers(durationOf(b.key))).sort((a, b) => Number(b.tall) - Number(a.tall))[0];
  const dotY = coveringBar ? BASE_Y - (coveringBar.tall ? TALL_H : LOW_H) : null;

  const lines = event
    ? [
        { title: `그 외 인앱 이벤트 (${formatDuration(row.value)})`, inside: covers(row.value) },
        { title: `${event.name} (${formatDuration(event.duration)})`, inside: covers(event.duration) },
      ]
    : [{ title: null, inside: covers(row.value) }];

  return (
    <div ref={boxRef} className="relative h-190 rounded-8 border border-border bg-white" onMouseMove={onMove} onMouseLeave={() => setHoverX(null)}>
      {/* 축 */}
      <div className="absolute h-1 bg-divider" style={{ left: AXIS_LEFT, width: AXIS_RIGHT - AXIS_LEFT, top: BASE_Y }} />
      <div className="absolute w-1 bg-divider" style={{ left: INSTALL_X, top: 0, height: BASE_Y }} />

      {/* 막대 */}
      {chart.bars.map((b) => {
        const right = xOf(b.ratio);
        const h = b.tall ? TALL_H : LOW_H;
        return (
          <div key={b.key}>
            <div
              className={`absolute border-solid border-chart-attr-line ${b.strong ? "bg-chart-attr-strong" : "bg-chart-attr-light"}`}
              style={{ left: INSTALL_X, width: right - INSTALL_X, top: BASE_Y - h, height: h, borderWidth: lineW }}
            />
            {/* 막대 끝 아래 ▼ */}
            <div
              className="absolute size-0 -translate-x-1/2 border-x-4 border-t-6 border-x-transparent border-t-chart-attr-line"
              style={{ left: right - lineW / 2, top: BASE_Y - 6 }}
            />
          </div>
        );
      })}

      {/* 기준선: 위 단계 값 */}
      {chart.baseline && (
        <div className="absolute top-0" style={{ left: xOf(chart.baseline.ratio), height: BASE_Y }}>
          <div
            className="h-full"
            style={{
              width: lineW,
              backgroundImage: "linear-gradient(to bottom, var(--color-text-secondary) 6px, transparent 6px)",
              backgroundSize: `${lineW}px 9px`,
            }}
          />
          <span className="absolute top-8 right-6 text-caption whitespace-nowrap text-text-secondary">{chart.baseline.text}</span>
        </div>
      )}

      {/* 가로축 라벨 */}
      <span className="absolute -translate-x-full text-caption whitespace-nowrap text-text-secondary" style={{ left: INSTALL_X - 8, top: 162 }}>
        설치 ⤓
      </span>
      {chart.labels.map((l) => (
        <span
          key={l.key}
          className="absolute -translate-x-1/2 text-caption whitespace-nowrap text-text-primary"
          style={{ left: xOf(l.ratio), top: 162 }}
        >
          {l.text}
        </span>
      ))}
      <span className="absolute -translate-x-full text-caption whitespace-nowrap text-text-secondary" style={{ left: AXIS_RIGHT - 8, top: 162 }}>
        측정 대상 제외
      </span>

      {/* 호버: 세로선 + 점 + 툴팁 */}
      {hoverX !== null && (
        <>
          <div className="pointer-events-none absolute top-0 w-1 bg-chart-attr-line" style={{ left: hoverX, height: BASE_Y }} />
          {dotY !== null && (
            <div
              className="pointer-events-none absolute size-9 -translate-1/2 rounded-full bg-chart-attr-line"
              style={{ left: hoverX + 0.5, top: dotY }}
            />
          )}
          <div
            className="pointer-events-none absolute top-4 z-20 rounded-6 border border-border bg-white shadow-dropdown"
            style={{ width: TOOLTIP_W, left: hoverX + 16 + TOOLTIP_W > AXIS_RIGHT ? hoverX - 16 - TOOLTIP_W : hoverX + 16 }}
          >
            <div className="px-16 py-10">
              {row.channelName && <div className="text-tag text-text-placeholder">{row.channelName}</div>}
              <div className="flex items-center gap-8 text-body font-medium">
                {row.name}
                {row.isGlobal && <InfoOutlinedIcon className="text-icon" style={{ fontSize: 15 }} />}
              </div>
            </div>
            <div className="h-1 bg-divider" />
            <div className="flex flex-col gap-8 px-16 py-10 text-body-sm">
              <span className="text-text-secondary">예상되는 어트리뷰션 결과</span>
              {lines.map((l, i) => (
                <div key={i}>
                  {l.title && <div className="font-medium">{l.title}</div>}
                  {l.inside ? (
                    <div className="text-primary">인앱이벤트는 설치 이벤트에 기여한 채널의 성과가 됩니다.</div>
                  ) : (
                    <div className="text-text-placeholder">인앱이벤트는 채널의 성과가 되지 않습니다.</div>
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
