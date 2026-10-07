// Snapshots hold personal data and must never be committed. This stops a
// run before it writes into any folder git would track.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

/** Throws if `dir` is inside a git repo and git wouldn't ignore it. */
export function assertNotTrackedByGit(dir) {
  const repo = repoContaining(dir);
  if (!repo) return;
  if (!isIgnored(repo, dir)) {
    throw new Error(`${dir} is inside the git repo at ${repo} and isn't ignored — snapshots must never be committed. Pick another --out.`);
  }
}

// The top of the repo `dir` is in, or null. `dir` may not exist yet, so ask
// from its nearest folder that does.
function repoContaining(dir) {
  let existing = dir;
  while (!existsSync(existing)) existing = path.dirname(existing);
  try {
    return git(existing, "rev-parse", "--show-toplevel");
  } catch {
    return null; // Not in a repo, or git isn't installed: nothing could commit it.
  }
}

function isIgnored(repo, dir) {
  try {
    git(repo, "check-ignore", "-q", path.relative(repo, dir) || ".");
    return true;
  } catch {
    return false;
  }
}

const git = (cwd, ...args) =>
  execFileSync("git", ["-C", cwd, ...args], { stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .trim();
