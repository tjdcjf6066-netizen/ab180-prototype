"use client";

import { useRef, useState } from "react";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import type { LeaveGuard } from "@/components/common/EditMode";
import { InAppTab } from "@/components/inapp/InAppTab";
import { InstallTab } from "@/components/install/InstallTab";
import { useNotReady } from "@/components/shell/NotReadyProvider";
import { SettingsProvider } from "@/state/SettingsProvider";

type TopTab = "install" | "inApp";

const TABS: { key: TopTab; label: string }[] = [
  { key: "install", label: "설치" },
  { key: "inApp", label: "인앱이벤트" },
];

export default function AttributionRulesPage() {
  const notReady = useNotReady();
  const [tab, setTab] = useState<TopTab>("install");
  // 수정 중인 탭이 등록한다. 바꾼 내용이 있으면 나가기 팝업 뒤에 이동.
  const guardRef = useRef<LeaveGuard | null>(null);
  const changeTab = (next: TopTab) => {
    if (next === tab) return;
    if (guardRef.current) guardRef.current(() => setTab(next));
    else setTab(next);
  };

  return (
    <SettingsProvider>
      <div className="pt-28">
        <div className="flex items-center gap-8">
          <h1 className="text-page-title font-bold">기여 규칙</h1>
          <button type="button" aria-label="도움말" onClick={notReady} className="flex text-icon">
            <HelpOutlineIcon style={{ fontSize: 20 }} />
          </button>
        </div>

        {/* spec_screens.md 4-1 상위 탭: 선택 탭 밑줄 3px, 좌우 여백 12, 아래 1px 디바이더 */}
        <div className="mt-20 flex gap-8 border-b border-divider">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => changeTab(t.key)}
              className={`-mb-1 border-b-3 px-12 pt-8 pb-12 text-tab ${
                tab === t.key ? "border-text-primary font-medium text-text-primary" : "border-transparent font-regular text-text-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-32">{tab === "install" ? <InstallTab guardRef={guardRef} /> : <InAppTab guardRef={guardRef} />}</div>
      </div>
    </SettingsProvider>
  );
}
