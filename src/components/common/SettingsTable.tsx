"use client";

import type { ReactNode } from "react";
import CallMadeIcon from "@mui/icons-material/CallMade";
import { useNotReady } from "@/components/shell/NotReadyProvider";
import { CampaignExpandButton } from "@/components/ui/CampaignExpandButton";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { Tag } from "@/components/ui/Tag";
import { CAMPAIGN_BY_ID, CHANNEL_BY_ID } from "@/lib/mock/catalog";
import { campaignSettingsOf } from "@/lib/selectors";
import type { Channel } from "@/lib/types";
import { GLOBAL_TOOLTIP } from "./EditMode";

// 조회 모드 목록 표 — 설치 탭(값 4칸) · 인앱이벤트 탭(값 1칸) 공통. spec_screens.md 4-3 · 5-1
export type Selection =
  | { kind: "global" }
  | { kind: "channel"; channelId: string }
  | { kind: "campaign"; channelId: string; campaignId: string };

export const rowId = (s: Selection) =>
  s.kind === "global" ? "row-global" : s.kind === "channel" ? `row-${s.channelId}` : `row-${s.campaignId}`;

/** dim: 채널 값을 따르는 흐린 칸 */
export type CellView = { text: string; dim?: boolean };

type Props = {
  /** grid-template-columns. 이름 · 값 칸들 · 최근 수정일 */
  grid: string;
  headers: ReactNode[];
  global: { cells: CellView[]; updatedAt: string };
  channels: { channelId: string; updatedAt: string }[];
  campaigns: { campaignId: string; updatedAt: string }[];
  channelCells: (channelId: string) => CellView[];
  campaignCells: (channelId: string, campaignId: string) => CellView[];
  channelInfo?: (channel: Channel) => ReactNode;
  selection: Selection;
  onSelect: (s: Selection) => void;
  includeEnded: boolean;
  expanded: Set<string>;
  onToggleExpand: (channelId: string) => void;
  /** 2초 하이라이트 중인 행 id */
  highlight: string | null;
};

export function SettingsTable(p: Props) {
  const selectedId = rowId(p.selection);

  return (
    <div className="overflow-hidden rounded-8 border border-border">
      <div className={`${p.grid} h-64 bg-bg-subtle text-caption text-text-secondary`}>
        <div className="flex items-center px-16">채널 / 캠페인</div>
        {p.headers.map((h, i) => (
          <div key={i} className="flex flex-col justify-center px-12">
            {h}
          </div>
        ))}
        <div className="flex items-center px-12">최근 수정일</div>
      </div>

      <Row
        grid={p.grid}
        id="row-global"
        selected={selectedId === "row-global"}
        highlighted={p.highlight === "row-global"}
        onClick={() => p.onSelect({ kind: "global" })}
        name={
          <span className="flex items-center gap-8">
            글로벌
            <InfoTooltip>{GLOBAL_TOOLTIP}</InfoTooltip>
          </span>
        }
        cells={p.global.cells}
        updatedAt={p.global.updatedAt}
      />

      {p.channels.map((ch) => {
        const channel = CHANNEL_BY_ID.get(ch.channelId);
        const campaigns = campaignSettingsOf(p.campaigns, ch.channelId, p.includeEnded);
        const isOpen = p.expanded.has(ch.channelId) && campaigns.length > 0;
        const id = `row-${ch.channelId}`;
        return (
          <div key={ch.channelId}>
            <Row
              grid={p.grid}
              id={id}
              selected={selectedId === id}
              highlighted={p.highlight === id}
              onClick={() => p.onSelect({ kind: "channel", channelId: ch.channelId })}
              name={
                <span className="flex flex-col items-start gap-6">
                  <span className="flex items-center gap-8">
                    {channel?.name}
                    {channel && p.channelInfo?.(channel)}
                  </span>
                  {campaigns.length > 0 && (
                    <CampaignExpandButton count={campaigns.length} open={isOpen} onClick={() => p.onToggleExpand(ch.channelId)} />
                  )}
                </span>
              }
              cells={p.channelCells(ch.channelId)}
              updatedAt={ch.updatedAt}
            />
            {isOpen &&
              campaigns.map((cp) => {
                const campaign = CAMPAIGN_BY_ID.get(cp.campaignId);
                const cid = `row-${cp.campaignId}`;
                return (
                  <Row
                    key={cp.campaignId}
                    grid={p.grid}
                    id={cid}
                    selected={selectedId === cid}
                    highlighted={p.highlight === cid}
                    onClick={() => p.onSelect({ kind: "campaign", channelId: ch.channelId, campaignId: cp.campaignId })}
                    name={
                      <span className="flex items-center gap-8">
                        <span className="mb-6 h-10 w-8 border-b border-l border-text-placeholder" aria-hidden />
                        {campaign?.name}
                        {campaign?.status === "ended" && <Tag>종료됨</Tag>}
                      </span>
                    }
                    cells={p.campaignCells(ch.channelId, cp.campaignId)}
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
  grid,
  id,
  selected,
  highlighted,
  onClick,
  name,
  cells,
  updatedAt,
}: {
  grid: string;
  id: string;
  selected: boolean;
  highlighted: boolean;
  onClick: () => void;
  name: ReactNode;
  cells: CellView[];
  updatedAt: string;
}) {
  const notReady = useNotReady();
  const tone = selected ? "font-bold text-text-primary" : "text-text-secondary";
  return (
    <div id={id} onClick={onClick} className={`${grid} relative min-h-56 cursor-pointer scroll-mt-16 border-t border-divider text-body ${tone}`}>
      {selected && <span className="absolute top-0 bottom-0 left-0 w-3 bg-primary" />}
      <div className={`flex items-center px-16 py-12 transition-colors duration-300 ${highlighted ? "bg-primary-weak" : ""}`}>
        {name}
      </div>
      {cells.map((c, i) => (
        <div key={i} className={`flex items-center px-12 ${c.dim ? "bg-bg-muted font-regular text-text-placeholder" : ""}`}>
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
