export type MovieCandidate = {
  id: string;
  name: string;
  date: string | null;
  notes: string;
  link: string;
};

// Source not chosen yet (was Notion, now removed). Swap this body for a real
// fetch once there's somewhere to pull untriaged movies from — the rest of
// the app only depends on the MovieCandidate shape above.
export async function getMovieBacklog(): Promise<MovieCandidate[]> {
  return [];
}
