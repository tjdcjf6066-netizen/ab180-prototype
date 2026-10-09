"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { createInAppInitial } from "@/lib/mock/inAppInitial";
import { createInstallInitial } from "@/lib/mock/installInitial";
import type { InAppSettings, InstallSettings } from "@/lib/types";

// 두 탭의 저장된 설정. 서로 독립이며 메모리에만 둔다(새로고침하면 초기 목업) — spec_data.md 7장
type Settings = {
  install: InstallSettings;
  setInstall: Dispatch<SetStateAction<InstallSettings>>;
  inApp: InAppSettings;
  setInApp: Dispatch<SetStateAction<InAppSettings>>;
};

const SettingsContext = createContext<Settings | null>(null);

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("SettingsProvider 밖에서 useSettings를 썼습니다.");
  return value;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [install, setInstall] = useState(createInstallInitial);
  const [inApp, setInApp] = useState(createInAppInitial);
  return (
    <SettingsContext.Provider value={{ install, setInstall, inApp, setInApp }}>{children}</SettingsContext.Provider>
  );
}
