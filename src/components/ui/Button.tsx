import type { ButtonHTMLAttributes } from "react";

// spec_screens.md 3-3. 크기는 쓰는 곳에서 className으로 정한다.
export type ButtonVariant = "primary" | "outline" | "secondary" | "danger" | "text-link";

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white rounded-8",
  outline: "bg-white text-primary border border-primary rounded-8",
  secondary: "bg-bg-subtle text-text-primary rounded-8",
  danger: "bg-danger text-white rounded-8",
  "text-link": "text-primary font-medium",
};

const disabledClass = "bg-divider text-text-placeholder rounded-8 cursor-not-allowed";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant };

export function Button({ variant = "primary", disabled, className = "", type = "button", ...rest }: Props) {
  const look = disabled && variant !== "text-link" ? disabledClass : variantClass[variant];
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-4 text-body font-medium ${look} ${className}`}
      {...rest}
    />
  );
}
