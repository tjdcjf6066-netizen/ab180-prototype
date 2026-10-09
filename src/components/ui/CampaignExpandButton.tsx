import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// spec_screens.md 3-5 캠페인 펼치기 버튼 — 두 탭 · 조회 · 수정 모드 공통. 행 선택과 분리.
// 테두리는 눈에 띄도록 text-primary(진한 검정).
// suffix: 수정 모드의 " 보기 · 추가" / " 접기"
export function CampaignExpandButton({
  count,
  open,
  onClick,
  suffix = "",
}: {
  count: number;
  open: boolean;
  onClick: () => void;
  suffix?: string;
}) {
  const Icon = open ? ExpandLessIcon : ExpandMoreIcon;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex h-22 items-center gap-4 rounded-6 border border-text-primary bg-white px-8 text-caption font-medium text-text-primary"
    >
      캠페인 한정 설정 <span className="text-primary">{count}개</span>
      {suffix}
      <Icon className="text-icon-strong" style={{ fontSize: 14 }} />
    </button>
  );
}
