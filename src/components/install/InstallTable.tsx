"use client";

import { SettingsTable, type Selection } from "@/components/common/SettingsTable";
import { useNotReady } from "@/components/shell/NotReadyProvider";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { formatDuration } from "@/lib/duration";
import { resolveInstall } from "@/lib/resolve";
import { INSTALL_CELL_KEYS, type InstallSettings } from "@/lib/types";

// 설치 탭 목록 — spec_screens.md 4-3 · 와이어프레임 W1. 열 비율 380 : 200 × 4 : 120 (콘텐츠 1300일 때 그 px)
const HEADERS: [string, string][] = [
  ["클릭", "디바이스 ID 매칭"],
  ["클릭", "확률적 모델링"],
  ["조회", "디바이스 ID 매칭"],
  ["조회", "확률적 모델링"],
];

type Props = {
  settings: InstallSettings;
  selection: Selection;
  onSelect: (s: Selection) => void;
  includeEnded: boolean;
  expanded: Set<string>;
  onToggleExpand: (channelId: string) => void;
  highlight: string | null;
};

export function InstallTable({ settings, ...rest }: Props) {
  return (
    <SettingsTable
      grid="grid grid-cols-[minmax(0,380fr)_repeat(4,minmax(0,200fr))_minmax(120px,120fr)]"
      headers={HEADERS.map(([a, b]) => (
        <>
          <span>{a}</span>
          <span>{b}</span>
        </>
      ))}
      global={{ cells: INSTALL_CELL_KEYS.map((k) => ({ text: formatDuration(settings.global[k]) })), updatedAt: settings.globalUpdatedAt }}
      channels={settings.channels}
      campaigns={settings.campaigns}
      channelCells={(channelId) => INSTALL_CELL_KEYS.map((k) => ({ text: formatDuration(resolveInstall(settings, k, channelId)) }))}
      campaignCells={(channelId, campaignId) => {
        const cells = settings.campaigns.find((c) => c.campaignId === campaignId)?.cells;
        return INSTALL_CELL_KEYS.map((k) => ({
          text: formatDuration(resolveInstall(settings, k, channelId, campaignId)),
          // 채널 값을 따르는 칸은 흐린 칸
          dim: cells?.[k].mode === "inherit",
        }));
      }}
      channelInfo={(channel) => channel.hasPolicyInfo && <PolicyTooltip />}
      {...rest}
    />
  );
}

// 4-4 광고 채널 정책 ⓘ — 조회 · 수정 모드 공통
export function PolicyTooltip() {
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
