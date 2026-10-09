// spec_screens.md 3-4. 이번 범위에서는 꺼짐 상태만 보여준다.
export function Toggle({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={false}
      onClick={onClick}
      className="relative h-22 w-40 rounded-full bg-divider"
    >
      <span className="absolute top-3 left-3 size-16 rounded-full bg-white shadow-dropdown" />
    </button>
  );
}
