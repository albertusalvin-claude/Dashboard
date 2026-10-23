"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/actionables", label: "actionables" },
  { href: "/money", label: "money" },
  { href: "/health", label: "health" },
  { href: "/relationship", label: "relationship" },
  { href: "/experience", label: "experience" },
] as const;

export default function TopTabNav() {
  const pathname = usePathname();
  // Under /dummy the same tabs navigate the stand-in copy of the dashboard.
  const base = pathname.startsWith("/dummy") ? "/dummy" : "";

  return (
    // If the tabs ever outgrow a narrow phone, the bar scrolls sideways
    // rather than widening the page.
    <div className="flex sm:gap-1 border-b border-line mb-8 overflow-x-auto [scrollbar-width:none]">
      {TABS.map(({ href, label }) => {
        const active = pathname.startsWith(`${base}${href}`);
        return (
          <Link
            key={href}
            href={`${base}${href}`}
            // On a phone the tabs share the width evenly at a smaller size, so
            // the bar never runs wider than the screen.
            className={`flex-1 sm:flex-none text-center whitespace-nowrap font-display font-bold text-[12px] min-[400px]:text-[13px] sm:text-lg px-0.5 sm:px-5 py-2.5 border-b-[3px] mb-[-1px] capitalize transition-colors
              ${active ? "text-ink border-chili" : "text-ink-soft border-transparent hover:text-ink"}`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
