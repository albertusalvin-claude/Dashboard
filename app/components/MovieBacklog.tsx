"use client";

import { useOptimistic, useTransition } from "react";
import { acceptCandidate } from "../actions/events";
import type { MovieCandidate } from "../lib/getMovieBacklog";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmt(dateStr: string | null) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-");
  return `${+d} ${MONTHS[+m - 1]} ${y}`;
}

function EmptySetup() {
  return (
    <div className="bg-card border border-line rounded-2xl p-8 text-center">
      <p className="text-ink font-semibold mb-1">No movie source wired up yet.</p>
      <p className="text-ink-soft text-sm">
        Untriaged movies will show up here once{" "}
        <code className="font-mono bg-paper px-1.5 py-0.5 rounded text-xs border border-line">getMovieBacklog()</code>{" "}
        has somewhere to fetch them from.
      </p>
    </div>
  );
}

type Props = { movies: MovieCandidate[] };

export default function MovieBacklog({ movies }: Props) {
  const [optimisticMovies, removeOptimistic] = useOptimistic(
    movies,
    (state, id: string) => state.filter((m) => m.id !== id)
  );

  const [, startTransition] = useTransition();

  function handleAccept(movie: MovieCandidate) {
    startTransition(async () => {
      removeOptimistic(movie.id);
      await acceptCandidate({ name: movie.name, date: movie.date, link: movie.link });
    });
  }

  function handleSkip(movie: MovieCandidate) {
    startTransition(() => {
      removeOptimistic(movie.id);
    });
  }

  if (optimisticMovies.length === 0) {
    return <EmptySetup />;
  }

  return (
    <div className="space-y-3">
      {optimisticMovies.map((movie) => (
        <div
          key={movie.id}
          className="bg-card border border-line rounded-2xl p-5 flex items-start justify-between gap-4"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {movie.link ? (
                <a
                  href={movie.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-display font-bold text-lg text-ink hover:underline truncate"
                >
                  {movie.name}
                </a>
              ) : (
                <span className="font-display font-bold text-lg text-ink truncate">{movie.name}</span>
              )}
              {fmt(movie.date) && (
                <span className="text-xs font-mono text-ink-soft">{fmt(movie.date)}</span>
              )}
            </div>
            {movie.notes && <p className="text-sm text-ink-soft mt-1">{movie.notes}</p>}
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => handleAccept(movie)}
              disabled={!movie.date}
              title={movie.date ? undefined : "No date set — can't place this on the calendar"}
              className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "rgba(78,112,67,0.16)", color: "#4E7043" }}
            >
              Accept
            </button>
            <button
              onClick={() => handleSkip(movie)}
              className="text-xs px-3 py-1.5 rounded-full font-medium text-ink-soft border border-line hover:border-ink-soft hover:text-ink transition-colors cursor-pointer"
            >
              Skip
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
