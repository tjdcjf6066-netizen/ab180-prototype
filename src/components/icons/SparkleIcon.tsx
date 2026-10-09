// 4각 별 (AI 메뉴) — MUI 기본 세트에 없어 직접 그림. 선 굵기 2, 24 viewBox.
export function SparkleIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3C12.6 8.4 15.6 11.4 21 12C15.6 12.6 12.6 15.6 12 21C11.4 15.6 8.4 12.6 3 12C8.4 11.4 11.4 8.4 12 3Z"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  );
}
