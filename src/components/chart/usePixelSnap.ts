import { useSyncExternalStore } from "react";

// 화면 픽셀 비율. 선이 소수점 위치에 걸리면 이웃 픽셀로 번져 굵기가 달라 보이므로 위치 · 굵기를 픽셀 격자에 맞춘다.
const subscribeResize = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};

export function usePixelSnap(lineWidth: number) {
  const dpr = useSyncExternalStore(subscribeResize, () => window.devicePixelRatio || 1, () => 1);
  return {
    snap: (v: number) => Math.round(v * dpr) / dpr,
    // 레티나에서는 lineWidth(1.5px), 일반 모니터에서는 1px
    lineW: Math.max(1, Math.floor(lineWidth * dpr)) / dpr,
  };
}
