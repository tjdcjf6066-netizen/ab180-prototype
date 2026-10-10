"use client";

import type { MutableRefObject } from "react";
import { EditMode, type EditConfig, type LeaveGuard } from "@/components/common/EditMode";
import { installEditor } from "@/lib/edit";
import { installSaveNotice } from "@/lib/notice";
import { INSTALL_CELL_KEYS, type Duration, type InstallCellKey, type InstallCells, type InstallSettings } from "@/lib/types";
import { PolicyTooltip } from "./InstallTable";

// 설치 탭 수정 모드 — spec_screens.md 4-7 · 4-8 · 와이어프레임 W2. 열: 이름(남는 너비, 최소 222: 보기 · 추가 버튼이 들어가는 폭) · 값 200~230 × 4 · 아이콘 64
type G = Record<InstallCellKey, Duration>;

const HEADERS: [string, string][] = [
  ["클릭", "디바이스 ID 매칭"],
  ["클릭", "확률적 모델링"],
  ["조회", "디바이스 ID 매칭"],
  ["조회", "확률적 모델링"],
];

const installEditConfig: EditConfig<InstallSettings, G, InstallCells> = {
  tab: "install",
  editor: installEditor,
  grid: "grid grid-cols-[minmax(222px,1fr)_repeat(4,minmax(200px,230px))_64px]",
  keys: INSTALL_CELL_KEYS,
  headers: HEADERS.map(([a, b]) => (
    <>
      <span>{a}</span>
      <span>{b}</span>
    </>
  )),
  defaults: (s) => s.defaults,
  globalOf: (g, k) => g[k as InstallCellKey],
  withGlobal: (g, k, d) => ({ ...g, [k]: d }),
  cellOf: (c, k) => c[k as InstallCellKey],
  withCell: (c, k, cell) => ({ ...c, [k]: cell }),
  policy: (s, campaignId, k) => s.policies.find((p) => p.campaignId === campaignId && p.cellKey === k)?.duration,
  channelInfo: (channel) => channel.hasPolicyInfo && <PolicyTooltip />,
  // 글로벌을 바꿨을 때만 안내 박스(4-8)
  notice: (before, after) => {
    const counts = installSaveNotice(before, after);
    return (
      counts && {
        title: `기여 기간을 별도로 설정한 채널 ${counts.channels}개(그 안의 캠페인 포함) · 캠페인 ${counts.campaigns}개에는 반영되지 않습니다.`,
        body: "기여 기간을 별도로 설정한 채널 · 캠페인을 제외한 모든 채널 · 캠페인에 적용됩니다.",
      }
    );
  },
};

export function InstallEditMode(props: {
  settings: InstallSettings;
  onExit: (saved: InstallSettings | null) => void;
  guardRef: MutableRefObject<LeaveGuard | null>;
}) {
  return <EditMode config={installEditConfig} {...props} />;
}
