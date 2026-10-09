"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PublicIcon from "@mui/icons-material/Public";
import { CampaignSearch } from "@/components/common/CampaignSearch";
import { useNotReady } from "@/components/shell/NotReadyProvider";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CAMPAIGN_BY_ID, CHANNEL_BY_ID } from "@/lib/mock/catalog";
import { resolveInstall } from "@/lib/resolve";
import { INSTALL_CELL_KEYS, type Campaign, type Duration, type InstallCellKey, type InstallSettings } from "@/lib/types";
import { useSettings } from "@/state/SettingsProvider";
import { BottomCards } from "./BottomCards";
import { InstallTable, rowId, type Selection } from "./InstallTable";
import { LookbackChart, type ChartCompare, type ChartRow } from "./LookbackChart";

const HIGHLIGHT_MS = 2000;

const valuesOf = (s: InstallSettings, channelId?: string, campaignId?: string) =>
  Object.fromEntries(INSTALL_CELL_KEYS.map((k) => [k, resolveInstall(s, k, channelId, campaignId)])) as ChartRow["values"];

// 선택한 행 → 차트 데이터와 비교 점선(채널: 글로벌, 캠페인: 속한 채널)
function chartData(s: InstallSettings, sel: Selection): { row: ChartRow; compare?: ChartCompare } {
  const pick = (v: Record<InstallCellKey, Duration>) => ({ click: v.clickDevice, view: v.viewDevice });
  if (sel.kind === "global") return { row: { name: "글로벌", isGlobal: true, values: s.global } };
  const channelName = CHANNEL_BY_ID.get(sel.channelId)?.name ?? "";
  if (sel.kind === "channel") {
    return {
      row: { name: channelName, values: valuesOf(s, sel.channelId) },
      compare: { name: "글로벌", ...pick(s.global) },
    };
  }
  return {
    row: {
      name: CAMPAIGN_BY_ID.get(sel.campaignId)?.name ?? "",
      channelName,
      values: valuesOf(s, sel.channelId, sel.campaignId),
    },
    compare: { name: channelName, ...pick(valuesOf(s, sel.channelId)) },
  };
}

export function InstallTab() {
  const { install } = useSettings();
  const notReady = useNotReady();
  const [selection, setSelection] = useState<Selection>({ kind: "global" });
  const [includeEnded, setIncludeEnded] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [highlight, setHighlight] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  // 종료된 캠페인을 숨길 때 그 캠페인이 선택돼 있으면 속한 채널을 선택
  const onIncludeEnded = (checked: boolean) => {
    setIncludeEnded(checked);
    if (!checked && selection.kind === "campaign" && CAMPAIGN_BY_ID.get(selection.campaignId)?.status === "ended") {
      setSelection({ kind: "channel", channelId: selection.channelId });
    }
  };

  const toggleExpand = (channelId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) next.delete(channelId);
      else next.add(channelId);
      return next;
    });

  // 검색 결과 선택: 채널 펼침 → 선택 → 자동 스크롤 → 이름 칸 2초 하이라이트
  const onPick = (campaign: Campaign) => {
    const sel: Selection = { kind: "campaign", channelId: campaign.channelId, campaignId: campaign.id };
    setExpanded((prev) => new Set(prev).add(campaign.channelId));
    setSelection(sel);
    const id = rowId(sel);
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    setHighlight(id);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setHighlight(null), HIGHLIGHT_MS);
  };

  const { row, compare } = useMemo(() => chartData(install, selection), [install, selection]);

  return (
    <div className="pb-70">
      <p className="text-body">
        설치 이벤트에 대한 룩백 윈도우를 터치포인트 종류와 유저 식별 방법에 따라 설정할 수 있습니다. 룩백 윈도우는
        채널에서 발생한 클릭, 조회가 설치 이벤트와 관련 있다고 판단되는 기간입니다. 글로벌 외에 채널별로, 채널
        안에서는 캠페인별로 다르게 설정할 수 있으며, 따로 설정하지 않은 값은 캠페인 → 채널 → 글로벌 순으로 위 단계
        값을 따릅니다.
      </p>
      <button type="button" onClick={notReady} className="mt-6 flex items-center gap-4 text-caption text-text-secondary">
        <PublicIcon style={{ fontSize: 14 }} />
        가이드 보러가기
      </button>

      <div className="mt-20 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h2 className="text-section font-medium">룩백 윈도우</h2>
          <InfoOutlinedIcon className="text-icon" style={{ fontSize: 15 }} />
          <span className="text-body-sm text-text-secondary">
            아래 차트는 유저 식별 방법 중에 [디바이스 ID 매칭]을 기준으로 표시됩니다.
          </span>
        </div>
        {/* 수정 모드는 5단계 */}
        <Button variant="outline" className="h-36 px-16">
          <EditIcon style={{ fontSize: 16 }} />
          수정
        </Button>
      </div>

      <div className="mt-20">
        <LookbackChart row={row} compare={compare} />
      </div>

      <div className="mt-20 flex items-center justify-end gap-16">
        <Checkbox checked={includeEnded} onChange={onIncludeEnded}>
          종료된 캠페인 포함
        </Checkbox>
        <CampaignSearch settings={install.campaigns} includeEnded={includeEnded} onPick={onPick} />
      </div>

      <div className="mt-20">
        <InstallTable
          settings={install}
          selection={selection}
          onSelect={setSelection}
          includeEnded={includeEnded}
          expanded={expanded}
          onToggleExpand={toggleExpand}
          highlight={highlight}
        />
      </div>

      <div className="mt-32">
        <BottomCards />
      </div>
    </div>
  );
}
