"use client";

import Link from "next/link";

type PremiumUpsellLinkProps = {
  className?: string;
  label?: string;
};

export function PremiumUpsellLink({
  className = "mt-2 inline-block text-sm font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-400",
  label = "Veure Premium i opcions",
}: PremiumUpsellLinkProps): React.ReactElement {
  return (
    <Link href="/premium" className={className}>
      {label}
    </Link>
  );
}
