"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Tone = "header" | "footer" | "leave";

const toneClasses: Record<Tone, string> = {
  header:
    "text-xl font-extrabold uppercase tracking-wide text-on-surface-variant transition-colors hover:text-primary sm:text-2xl",
  footer:
    "w-full text-xs font-label font-semibold uppercase tracking-wider text-outline transition-colors hover:text-on-surface-variant",
  leave:
    "w-full text-sm font-headline font-bold uppercase tracking-wider text-on-surface-variant/50 transition-colors hover:text-error"
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: Tone;
};

/** Shared look for ← Home / ← Back in headers; footer = outline back links; leave = leave lobby. */
export function NavLinkButton({ children, tone = "header", className = "", type = "button", ...rest }: Props) {
  const fontClass = tone === "header" ? "font-headline" : "";
  return (
    <button type={type} className={`${fontClass} ${toneClasses[tone]} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
