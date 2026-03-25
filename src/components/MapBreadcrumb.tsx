import Link from "next/link";
import type { ReactElement } from "react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type MapBreadcrumbProps = {
  items: BreadcrumbItem[];
};

export function MapBreadcrumb({ items }: MapBreadcrumbProps): ReactElement {
  return (
    <nav
      aria-label="Camí de navegació"
      className="mb-6 flex flex-wrap items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${String(index)}-${item.label}`} className="flex items-center gap-1">
            {index > 0 ? (
              <span className="text-zinc-400 dark:text-zinc-600" aria-hidden>
                /
              </span>
            ) : null}
            {item.href !== undefined && !isLast ? (
              <Link
                href={item.href}
                className="font-medium text-sky-700 underline decoration-sky-700/40 underline-offset-2 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={
                  isLast
                    ? "font-medium text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500"
                }
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
