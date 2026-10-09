"use client";

import type { ReactNode } from "react";
import CallMadeIcon from "@mui/icons-material/CallMade";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useNotReady } from "@/components/shell/NotReadyProvider";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { Tag } from "@/components/ui/Tag";
import { formatDuration } from "@/lib/duration";
import { CAMPAIGN_BY_ID, CHANNEL_BY_ID } from "@/lib/mock/catalog";
import { resolveInstall } from "@/lib/resolve";
import { campaignSettingsOf } from "@/lib/selectors";
import { INSTALL_CELL_KEYS, type InstallCellKey, type InstallSettings } from "@/lib/types";

// spec_screens.md 4-3 · 와이어프레임 W1. 열 너비 380 · 200 × 4 · 120 = 1300
export const GRID = "grid grid-cols-[380px_200px_200px_200px_200px_120px]";

export type Selection =
  | { kind: "global" }
  | { kind: "channel"; channelId: string }
  | { kind: "campaign"; channelId: string; campaignId: string };

export const rowId = (s: Selection) =>
  s.kind === "global" ? "row-global" : s.kind === "channel" ? `row-${s.channelId}` : `row-${s.campaignId}`;

const HEADERS: [string, string][] = [
  ["클릭", "디바이스 ID 매칭"],
  ["클릭", "확률적 모델링"],
  ["조회", "디바이스 ID 매칭"],
  ["조회", "확률적 모델링"],
];

export const GLOBAL_TOOLTIP = "기여 기간을 별도로 설정한 채널 · 캠페인을 제외한 모든 채널 · 캠페인에 적용됩니다.";

type Props = {
  settings: InstallSettings;
  selection: Selection;
  onSelect: (s: Selection) => void;
  includeEnded: boolean;
  expanded: Set<string>;
  onToggleExpand: (channelId: string) => void;
  /** 2초 하이라이트 중인 행 id */
  highlight: string | null;
};

export function InstallTable({ settings, selection, onSelect, includeEnded, expanded, onToggleExpand, highlight }: Props) {
  const selectedId = rowId(selection);

  return (
    <div className="overflow-hidden rounded-8 border border-border">
      <div className={`${GRID} h-64 bg-bg-subtle text-caption text-text-secondary`}>
        <div className="flex items-center px-16">채널 / 캠페인</div>
        {HEADERS.map(([a, b]) => (
          <div key={a + b} className="flex flex-col justify-center px-12">
            <span>{a}</span>
            <span>{b}</span>
          </div>
        ))}
        <div className="flex items-center px-12">최근 수정일</div>
      </div>

      <Row
        id="row-global"
        selected={selectedId === "row-global"}
        highlighted={highlight === "row-global"}
        onClick={() => onSelect({ kind: "global" })}
        name={
          <span className="flex items-center gap-8">
            글로벌
            <InfoTooltip>{GLOBAL_TOOLTIP}</InfoTooltip>
          </span>
        }
        cells={INSTALL_CELL_KEYS.map((k) => ({ key: k, text: formatDuration(settings.global[k]), dim: false }))}
        updatedAt={settings.globalUpdatedAt}
      />

      {settings.channels.map((ch) => {
        const channel = CHANNEL_BY_ID.get(ch.channelId);
        const campaigns = campaignSettingsOf(settings.campaigns, ch.channelId, includeEnded);
        const isOpen = expanded.has(ch.channelId) && campaigns.length > 0;
        const id = `row-${ch.channelId}`;
        return (
          <div key={ch.channelId}>
            <Row
              id={id}
              selected={selectedId === id}
              highlighted={highlight === id}
              onClick={() => onSelect({ kind: "channel", channelId: ch.channelId })}
              name={
                <span className="flex flex-col items-start gap-6">
                  <span className="flex items-center gap-8">
                    {channel?.name}
                    {channel?.hasPolicyInfo && <PolicyTooltip />}
                  </span>
                  {campaigns.length > 0 && (
                    <ExpandButton count={campaigns.length} open={isOpen} onClick={() => onToggleExpand(ch.channelId)} />
                  )}
                </span>
              }
              cells={INSTALL_CELL_KEYS.map((k) => ({
                key: k,
                text: formatDuration(resolveInstall(settings, k, ch.channelId)),
                dim: false,
              }))}
              updatedAt={ch.updatedAt}
            />
            {isOpen &&
              campaigns.map((cp) => {
                const campaign = CAMPAIGN_BY_ID.get(cp.campaignId);
                const cid = `row-${cp.campaignId}`;
                return (
                  <Row
                    key={cp.campaignId}
                    id={cid}
                    selected={selectedId === cid}
                    highlighted={highlight === cid}
                    onClick={() => onSelect({ kind: "campaign", channelId: ch.channelId, campaignId: cp.campaignId })}
                    name={
                      <span className="flex items-center gap-8">
                        <span className="mb-6 h-10 w-8 border-b border-l border-text-placeholder" aria-hidden />
                        {campaign?.name}
                        {campaign?.status === "ended" && <Tag>종료됨</Tag>}
                      </span>
                    }
                    cells={INSTALL_CELL_KEYS.map((k) => ({
                      key: k,
                      text: formatDuration(resolveInstall(settings, k, ch.channelId, cp.campaignId)),
                      // 채널 값을 따르는 칸은 흐린 칸
                      dim: cp.cells[k].mode === "inherit",
                    }))}
                    updatedAt={cp.updatedAt}
                  />
                );
              })}
          </div>
        );
      })}
    </div>
  );
}

function Row({
  id,
  selected,
  highlighted,
  onClick,
  name,
  cells,
  updatedAt,
}: {
  id: string;
  selected: boolean;
  highlighted: boolean;
  onClick: () => void;
  name: ReactNode;
  cells: { key: InstallCellKey; text: string; dim: boolean }[];
  updatedAt: string;
}) {
  const notReady = useNotReady();
  const tone = selected ? "font-bold text-text-primary" : "text-text-secondary";
  return (
    <div
      id={id}
      onClick={onClick}
      className={`${GRID} relative min-h-56 cursor-pointer scroll-mt-16 border-t border-divider text-body ${tone}`}
    >
      {selected && <span className="absolute top-0 bottom-0 left-0 w-3 bg-primary" />}
      <div className={`flex items-center px-16 py-12 transition-colors duration-300 ${highlighted ? "bg-primary-weak" : ""}`}>
        {name}
      </div>
      {cells.map((c) => (
        <div
          key={c.key}
          className={`flex items-center px-12 ${c.dim ? "bg-bg-muted font-regular text-text-placeholder" : ""}`}
        >
          {c.text}
        </div>
      ))}
      <div className="flex items-center px-12">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            notReady();
          }}
          className="flex items-center gap-2 text-caption"
        >
          {updatedAt}
          <CallMadeIcon style={{ fontSize: 12 }} />
        </button>
      </div>
    </div>
  );
}

// 3-5 캠페인 펼치기 버튼 — 행 선택과 분리
function ExpandButton({ count, open, onClick }: { count: number; open: boolean; onClick: () => void }) {
  const Icon = open ? ExpandLessIcon : ExpandMoreIcon;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex h-22 items-center gap-4 rounded-6 border border-border bg-white px-8 text-caption font-medium text-text-primary"
    >
      캠페인 한정 설정 <span className="text-primary">{count}개</span>
      <Icon className="text-icon-strong" style={{ fontSize: 14 }} />
    </button>
  );
}

// 4-4 광고 채널 정책 ⓘ
function PolicyTooltip() {
  const notReady = useNotReady();
  return (
    <InfoTooltip>
      사전 등록 유도 앱 캠페인의 룩백 윈도우는 광고 채널 정책에 따라 90일로 정해져 있어 대시보드에서 수정할 수 없습니다.
      변경이 필요하면 에어브릿지 CSM에 문의해 주세요.{" "}
      <button type="button" onClick={notReady} className="font-medium text-primary underline">
        가이드 보러가기
      </button>
    </InfoTooltip>
  );
}
