import CheckIcon from "@mui/icons-material/Check";
import type { ReactNode } from "react";

export function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-6 text-body-sm text-text-secondary">
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        className={`flex size-16 items-center justify-center rounded-4 border ${
          checked ? "border-primary bg-primary text-white" : "border-border bg-white"
        }`}
      >
        {checked && <CheckIcon style={{ fontSize: 14 }} />}
      </span>
      {children}
    </label>
  );
}
