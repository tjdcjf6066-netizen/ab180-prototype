"use client";

import { useState } from "react";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
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
              onClick={() => setTab(t.key)}
              className={`-mb-1 border-b-3 px-12 pt-8 pb-12 text-tab ${
                tab === t.key ? "border-text-primary font-medium text-text-primary" : "border-transparent font-regular text-text-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-32">{tab === "install" ? <InstallTab /> : null /* 인앱이벤트 탭은 6단계 */}</div>
      </div>
    </SettingsProvider>
  );
}
