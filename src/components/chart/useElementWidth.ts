import { useLayoutEffect, useState, type RefObject } from "react";

// 요소의 실제 너비(px). 콘텐츠가 창 너비에 맞춰 줄어들 때 차트 좌표를 다시 계산한다. 처음 그릴 때는 최대 너비(1300).
export function useElementWidth(ref: RefObject<HTMLElement | null>, initial = 1300) {
  const [width, setWidth] = useState(initial);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}
