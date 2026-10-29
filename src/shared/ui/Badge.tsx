import type { PropsWithChildren } from "react";

export type TonoBadge = "ok" | "riesgo" | "critico" | "neutro";

interface BadgeProps extends PropsWithChildren {
  tono?: TonoBadge;
}

export function Badge({ tono = "neutro", children }: BadgeProps) {
  return <span className={`badge badge-${tono}`}>{children}</span>;
}
