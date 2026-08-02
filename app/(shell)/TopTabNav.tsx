"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/money", label: "money" },
  { href: "/health", label: "health" },
  { href: "/movies", label: "movies" },
] as const;

export default function TopTabNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-line mb-8">
      {TABS.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`font-display font-bold text-lg px-5 py-2.5 border-b-[3px] mb-[-1px] capitalize transition-colors
              ${active ? "text-ink border-chili" : "text-ink-soft border-transparent hover:text-ink"}`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
