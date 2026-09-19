"use client";

import { usePathname } from "next/navigation";

/**
 * True on the /dummy demo routes, which render the real tabs against made-up
 * fixtures. Those tabs share their components — and their server actions —
 * with the live dashboard, so every write is gated on this: a demo that can
 * scribble into the real database would be worse than no demo.
 *
 * Read from the path rather than passed down, so a component can guard itself
 * without every page in between having to know about it.
 */
export function useIsDummyRoute(): boolean {
  return usePathname().startsWith("/dummy");
}

export const DUMMY_WRITE_MESSAGE = "Dummy data — changes aren't saved.";
