import type { HTMLAttributes, ReactNode } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

/** True if className sets any Tailwind padding utility (avoid duplicate p-* with default). */
function hasPaddingUtility(className: string): boolean {
  return /(^|\s)(sm:|md:|lg:|xl:|2xl:)?(p|px|py|pt|pb|pl|pr)-/.test(className);
}

/** Lobby / browse / results panel shell on dark background. */
export function SurfaceCard({ children, className = "", ...rest }: Props) {
  const padding = hasPaddingUtility(className) ? "" : "p-8";
  return (
    <div
      className={`rounded-2xl border border-outline-variant/10 bg-surface-container-lowest shadow-2xl ${padding} ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
}
