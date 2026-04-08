import type { HTMLAttributes, ReactNode } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

/** Lobby / browse / results panel shell on dark background. */
export function SurfaceCard({ children, className = "", ...rest }: Props) {
  return (
    <div
      className={`rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-2xl ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
}
