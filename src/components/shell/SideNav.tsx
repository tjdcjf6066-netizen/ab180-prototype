"use client";

import type { ReactNode } from "react";
import LinkIcon from "@mui/icons-material/Link";
import BarChartIcon from "@mui/icons-material/BarChart";
import ManageHistoryIcon from "@mui/icons-material/ManageHistory";
import TuneIcon from "@mui/icons-material/Tune";
import SettingsIcon from "@mui/icons-material/Settings";
import { SparkleIcon } from "@/components/icons/SparkleIcon";
import { DatabaseIcon } from "@/components/icons/DatabaseIcon";
import { useNotReady } from "./NotReadyProvider";

type Menu = { label: string; icon: ReactNode; current?: boolean };

const MENUS: Menu[] = [
  { label: "AI", icon: <SparkleIcon /> },
  { label: "링크", icon: <LinkIcon /> },
  { label: "리포트", icon: <BarChartIcon /> },
  { label: "로그", icon: <ManageHistoryIcon /> },
  { label: "데이터", icon: <DatabaseIcon /> },
  { label: "기여 규칙", icon: <TuneIcon />, current: true },
  { label: "설정", icon: <SettingsIcon /> },
];

export function SideNav() {
  const notReady = useNotReady();
  return (
    <nav className="flex w-118 shrink-0 flex-col items-center gap-24 border-r border-divider pt-16">
      <div className="flex size-48 items-center justify-center rounded-8 bg-text-primary text-section font-bold text-white">
        A
      </div>
      <ul className="flex flex-col gap-9">
        {MENUS.map((m) => (
          <li key={m.label}>
            <button
              type="button"
              aria-label={m.label}
              aria-current={m.current ? "page" : undefined}
              onClick={m.current ? undefined : notReady}
              className={`flex size-48 items-center justify-center rounded-8 ${
                m.current ? "bg-primary-weak text-primary" : "text-icon"
              }`}
            >
              {m.icon}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
