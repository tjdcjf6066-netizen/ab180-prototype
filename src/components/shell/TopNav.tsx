"use client";

import type { ReactNode } from "react";
import GroupsIcon from "@mui/icons-material/Groups";
import SpaceDashboardIcon from "@mui/icons-material/SpaceDashboard";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import UpdateIcon from "@mui/icons-material/Update";
import LanguageIcon from "@mui/icons-material/Language";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import { useNotReady } from "./NotReadyProvider";

const ICON = { fontSize: 20 };

function NavItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  const notReady = useNotReady();
  return (
    <button type="button" onClick={notReady} className="flex items-center gap-8 text-section font-medium">
      {icon}
      {children}
    </button>
  );
}

function Key({ children }: { children: ReactNode }) {
  return <kbd className="rounded-4 bg-bg-muted px-6 font-sans text-caption text-text-secondary">{children}</kbd>;
}

export function TopNav() {
  return (
    <header className="flex h-70 shrink-0 items-center justify-between border-b border-divider px-32">
      <div className="flex items-center gap-32">
        <NavItem icon={<GroupsIcon style={ICON} />}>테스트</NavItem>
        <NavItem icon={<SpaceDashboardIcon style={ICON} />}>
          오버뷰
          <ExpandMoreIcon style={ICON} />
        </NavItem>
      </div>
      <div className="flex items-center gap-32">
        <NavItem icon={<HelpOutlineIcon style={ICON} />}>지원</NavItem>
        <NavItem icon={<UpdateIcon style={ICON} />}>업데이트</NavItem>
        <NavItem icon={<LanguageIcon style={ICON} />}>한국어</NavItem>
        <NavItem icon={<SearchIcon style={ICON} />}>
          빠른 검색
          <span className="flex gap-4">
            <Key>⌘</Key>
            <Key>K</Key>
          </span>
        </NavItem>
        <div className="h-20 w-1 bg-divider" />
        <NavItem icon={<PersonIcon style={ICON} />}>seong.cheol</NavItem>
      </div>
    </header>
  );
}
