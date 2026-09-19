"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Only these trees have a stand-in copy under /dummy — everything else hides
// the switch rather than offering a link that would 404.
const SWITCHABLE = ["/money", "/health", "/relationship"];

export default function DataModeSwitch() {
  const pathname = usePathname();
  const isDummy = pathname.startsWith("/dummy");

  // The same page in the other mode: /money/logs <-> /dummy/money/logs.
  const realPath = isDummy ? pathname.slice("/dummy".length) || "/" : pathname;
  if (!SWITCHABLE.some((tree) => realPath === tree || realPath.startsWith(`${tree}/`))) return null;

  const modes = [
    { label: "real", href: realPath, active: !isDummy },
    { label: "dummy", href: `/dummy${realPath}`, active: isDummy },
  ];

  return (
    <div className="flex items-center gap-1 rounded-full border border-line p-0.5 shrink-0">
      {modes.map(({ label, href, active }) => (
        <Link
          key={label}
          href={href}
          aria-current={active ? "page" : undefined}
          className={`font-mono text-xs px-3 py-1 rounded-full transition-colors
            ${active ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
