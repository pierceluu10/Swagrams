"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type SlabVariant = "tan" | "lavender" | "muted" | "outline";

type Size = "hero" | "default" | "compact";

const variantClasses: Record<SlabVariant, string> = {
  tan: "bg-[var(--slab-tan-bg)] text-[var(--slab-tan-fg)] shadow-[0_12px_0_var(--slab-tan-shadow)] active:shadow-[0_2px_0_var(--slab-tan-shadow)]",
  lavender:
    "bg-[var(--slab-lavender-bg)] text-[var(--slab-lavender-fg)] shadow-[0_12px_0_var(--slab-lavender-shadow)] active:shadow-[0_2px_0_var(--slab-lavender-shadow)]",
  muted:
    "bg-[var(--slab-muted-bg)] text-[var(--slab-muted-fg)] shadow-[0_12px_0_var(--slab-muted-shadow)] active:shadow-[0_2px_0_var(--slab-muted-shadow)]",
  outline: "border border-outline-variant/20 bg-surface-container text-on-surface-variant shadow-none"
};

const sizeClasses: Record<Size, string> = {
  hero: "gap-4 px-8 py-10 text-xl sm:text-2xl",
  default: "gap-3 px-8 py-8 text-lg",
  compact: "gap-2 px-6 py-4 text-base"
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant: SlabVariant;
  size?: Size;
  grain?: boolean;
  children: ReactNode;
};

/** Chunky 3D primary CTA — tan / lavender / muted share press + shadow; outline = flat tertiary. */
export function SlabButton({
  variant,
  size = "default",
  grain = true,
  children,
  className = "",
  type = "button",
  disabled,
  ...rest
}: Props) {
  const press =
    variant === "outline"
      ? "hover:bg-surface-container-high"
      : "active:translate-y-[10px] disabled:active:translate-y-0";

  const base =
    "group relative flex w-full flex-col items-center justify-center overflow-hidden rounded-xl font-headline font-extrabold uppercase tracking-wide transition-all duration-100 disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${base} ${press} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim()}
      {...rest}
    >
      {grain && variant !== "outline" ? (
        <div className="grain-overlay pointer-events-none absolute inset-0 opacity-5 transition-opacity group-hover:opacity-10" />
      ) : null}
      {children}
    </button>
  );
}
