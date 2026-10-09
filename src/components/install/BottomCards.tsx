"use client";

import type { ReactNode } from "react";
import CallMadeIcon from "@mui/icons-material/CallMade";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { useNotReady } from "@/components/shell/NotReadyProvider";
import { Toggle } from "@/components/ui/Toggle";

// spec_screens.md 4-6 하단 설정 카드 — 범위 밖이라 표시만. 누르면 안내 팝업.
export function BottomCards() {
  const notReady = useNotReady();
  return (
    <div className="flex flex-col gap-16">
      <Card
        title="CTV 조회 우선순위를 클릭과 동일하게 적용"
        action={
          <button
            type="button"
            onClick={notReady}
            className="flex h-32 items-center gap-4 rounded-8 bg-bg-subtle px-12 text-body-sm font-medium"
          >
            <MenuBookIcon style={{ fontSize: 16 }} />
            가이드 보러가기
          </button>
        }
        bullets={[
          "CTV 조회의 기여 우선순위를 모바일 클릭과 동일하게 할지 선택할 수 있습니다. CTV 캠페인 운영 시 성과 측정에서 CTV 조회 우선순위를 높이려면 토글을 활성화하세요.",
          "CTV 캠페인을 지원하는 광고 채널에 일괄 적용됩니다. 전체 채널 목록은 가이드를 참고하세요.",
        ]}
        footer={
          <button type="button" onClick={notReady} className="mt-10 flex items-center gap-4 text-body-sm">
            최근 수정일 2026-10-09 02:20
            <CallMadeIcon style={{ fontSize: 14 }} />
          </button>
        }
      />
      <Card
        title="딥링크 UTM 어트리뷰션"
        bullets={[
          "토글을 활성화하면 딥링크에 포함된 utm_source 파라미터를 기여 채널로 사용할 수 있습니다.",
          "설정을 변경한 이후에 수집된 데이터부터 적용됩니다. 이미 수집된 데이터는 다시 처리되지 않습니다.",
        ]}
      />
    </div>
  );
}

function Card({
  title,
  action,
  bullets,
  footer,
}: {
  title: string;
  action?: ReactNode;
  bullets: string[];
  footer?: ReactNode;
}) {
  const notReady = useNotReady();
  return (
    <section className="rounded-12 border border-border p-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h3 className="text-section font-bold">{title}</h3>
          <button type="button" aria-label="도움말" onClick={notReady} className="flex text-icon">
            <HelpOutlineIcon style={{ fontSize: 18 }} />
          </button>
          <Toggle onClick={notReady} />
        </div>
        {action}
      </div>
      <ul className="mt-10 flex flex-col gap-6 text-body-sm text-text-secondary">
        {bullets.map((b) => (
          <li key={b}>• {b}</li>
        ))}
      </ul>
      {footer}
    </section>
  );
}
