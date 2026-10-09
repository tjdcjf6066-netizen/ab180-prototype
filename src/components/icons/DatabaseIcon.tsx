// 데이터베이스 원통 (데이터 메뉴) — MUI 기본 세트에 없어 직접 그림. 선 굵기 2, 24 viewBox.
export function DatabaseIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <g stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
        <path d="M5 5.5V18.5C5 19.9 8.1 21 12 21C15.9 21 19 19.9 19 18.5V5.5" />
        <path d="M5 12C5 13.4 8.1 14.5 12 14.5C15.9 14.5 19 13.4 19 12" />
      </g>
    </svg>
  );
}
