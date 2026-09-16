"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Interest and utilities views are still to come — they'll slot in here.
const TABS = [{ href: "/relationship/location", label: "location" }] as const;

export default function SubTabNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 mb-8">
      {TABS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
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
