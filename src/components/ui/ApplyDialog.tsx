"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import CloseIcon from "@mui/icons-material/Close";
import InfoIcon from "@mui/icons-material/Info";

// spec_screens.md 3-7 적용 확인 팝업 (너비 760, 모서리 20) · 와이어프레임 W2-H · W2-I
export type ApplyNotice = { title: string; body: string };

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export function ApplyDialog({
  open,
  title,
  notice,
  onCancel,
  onApply,
}: {
  open: boolean;
  title: string;
  notice: ApplyNotice | null;
  onCancel: () => void;
  onApply: () => void;
}) {
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  const ready = isEmail(email);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay">
      <div role="dialog" aria-modal="true" className="flex w-760 flex-col gap-20 rounded-20 bg-white px-40 pt-36 pb-32">
        <div className="flex items-center justify-between">
          <h2 className="text-modal-title font-bold">{title}</h2>
          <button type="button" aria-label="닫기" onClick={onCancel} className="flex text-icon-strong">
            <CloseIcon style={{ fontSize: 24 }} />
          </button>
        </div>

        {notice && (
          <div className="flex gap-8 rounded-8 bg-primary-weak px-20 py-16 text-body">
            <InfoIcon className="mt-2 text-primary" style={{ fontSize: 18 }} />
            <div className="flex flex-col gap-4">
              <p className="font-bold">{notice.title}</p>
              <p>{notice.body}</p>
            </div>
          </div>
        )}

        <p className="text-body">
          기여 기간은 광고 성과에 영향을 주기 때문에 적용하기 전에 충분한 검토를 진행해 주세요. &apos;적용&apos;을
          클릭하면 에어브릿지 어트리뷰션에 실제 반영되기까지 최대 15분 소요될 수 있으며 이후에 수집되는 이벤트부터
          수정한 기여 기간이 적용됩니다.
        </p>

        <div className="flex flex-col gap-10">
          <label htmlFor="apply-email" className="text-body font-medium">
            계속하려면 현재 로그인된 계정의 이메일 주소를 입력해 주세요.
          </label>
          <input
            id="apply-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ready && onApply()}
            placeholder="이메일을 입력하세요"
            className="h-46 rounded-6 border border-border px-16 text-body outline-none placeholder:text-text-placeholder focus:border-2 focus:border-primary focus:px-15"
          />
        </div>

        <div className="flex justify-end gap-12">
          <button
            type="button"
            onClick={onCancel}
            className="h-48 w-200 rounded-8 border border-border bg-white text-body font-medium"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={onApply}
            className={`h-48 w-200 rounded-8 text-body font-medium ${
              ready ? "bg-primary text-white" : "cursor-not-allowed bg-divider text-text-placeholder"
            }`}
          >
            적용
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
