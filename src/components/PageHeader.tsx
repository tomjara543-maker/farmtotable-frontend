import { ReactNode } from "react";

export default function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-3 text-lg text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
