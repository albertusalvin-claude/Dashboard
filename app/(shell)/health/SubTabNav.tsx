"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/health/diet", label: "diet" },
  { href: "/health/fitness", label: "fitness" },
] as const;

export default function SubTabNav() {
  const pathname = usePathname();
  // Under /dummy these point at the stand-in pages instead.
  const base = pathname.startsWith("/dummy") ? "/dummy" : "";

  return (
    <div className="flex gap-2 mb-8">
      {TABS.map(({ href, label }) => {
        const active = pathname === `${base}${href}`;
        return (
          <Link
            key={href}
            href={`${base}${href}`}
            className={`font-mono text-sm px-4 py-2 rounded-full border capitalize transition-colors
              ${active ? "bg-ink text-paper border-ink" : "text-ink-soft border-line hover:border-ink-soft hover:text-ink"}`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
