"use client";

import { Fragment, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addPerson, updatePerson, type PersonDraft } from "../actions/relationships";
import type { FieldOptions, OptionField, Person } from "../lib/getRelationships";
import { PLACE_SUGGESTIONS, STATE_SUGGESTIONS, citiesInState, lookupCity, resolvePlace } from "../lib/places";
import { DUMMY_WRITE_MESSAGE, useIsDummyRoute } from "../lib/useIsDummyRoute";

const inputCls =
  "w-full rounded-lg border border-line bg-paper px-2 py-1 font-mono text-sm text-ink focus:outline-none focus:border-ink-soft";

const emptyDraft = (): PersonDraft => ({
  name: "",
  origin: "",
  originState: "",
  currentLocation: "",
  currentState: "",
  futurePlan: "",
  futureState: "",
  interests: [],
  occupations: [],
  utilities: [],
  notes: "",
});

const draftFrom = (person: Person): PersonDraft => ({
  name: person.name,
  origin: person.origin,
  originState: person.originState,
  currentLocation: person.currentLocation,
  currentState: person.currentState,
  futurePlan: person.futurePlan,
  futureState: person.futureState,
  interests: [...person.interests],
  occupations: [...person.occupations],
  utilities: [...person.utilities],
  notes: person.notes,
});

// Suggestions the map can pin come first, then anything already used in Notion
// — so the obvious choice is also the one that shows up on the map. Naming a
// state narrows this to the cities known to be in it.
function locationSuggestions(existing: string[], state: string) {
  const withinState = state.trim() ? citiesInState(state) : [];
  if (withinState.length) return withinState;
  return [...new Set([...PLACE_SUGGESTIONS, ...existing])];
}

function Field({
  label,
  children,
  hint,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="font-mono text-xs text-ink-soft">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <div className="mt-1 text-[11px]">{hint}</div>}
    </label>
  );
}

function normalizeLoose(value: string) {
  return value.trim().toLowerCase();
}

/** Tells you, as you type, whether this location will actually get a pin. */
function LocationHint({ value, state }: { value: string; state: string }) {
  const trimmed = value.trim();

  // With no location, the state is what the map has to go on.
  if (!trimmed) {
    if (!state.trim()) return null;
    const fallback = resolvePlace(state);
    return fallback ? (
      <span className="text-ink-soft">pins as {fallback.label}</span>
    ) : (
      <span style={{ color: "#CB3A1E" }}>not on the map</span>
    );
  }

  const place = resolvePlace(trimmed);
  if (!place) {
    return <span style={{ color: "#CB3A1E" }}>not on the map — pick a city or country from the list</span>;
  }
  if (normalizeLoose(place.label) !== normalizeLoose(trimmed)) {
    return <span className="text-ink-soft">pins as {place.label}</span>;
  }
  return <span style={{ color: "#4E7043" }}>on the map</span>;
}

// Multi-select fields: type or pick an option, Enter or comma commits it.
function TagInput({
  value,
  options,
  listId,
  onChange,
}: {
  value: string[];
  options: string[];
  listId: string;
  onChange: (next: string[]) => void;
}) {
  const [text, setText] = useState("");

  function commit(raw: string) {
    const entry = raw.trim();
    if (!entry) return;
    if (!value.some((v) => v.toLowerCase() === entry.toLowerCase())) onChange([...value, entry]);
    setText("");
  }

  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {value.map((entry) => (
            <span
              key={entry}
              className="text-[11px] pl-2 pr-1 py-0.5 rounded-full font-medium flex items-center gap-1"
              style={{ background: "rgba(27,51,39,0.08)", color: "#1B3327" }}
            >
              {entry}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== entry))}
                className="cursor-pointer px-1 text-ink-soft hover:text-ink"
                aria-label={`Remove ${entry}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        className={inputCls}
        value={text}
        list={listId}
        placeholder="type and press Enter"
        onChange={(e) => {
          // Picking from the datalist fires a plain change, and a typed comma
          // means the same thing as Enter.
          if (e.target.value.includes(",")) commit(e.target.value.replace(",", ""));
          else setText(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(text);
          } else if (e.key === "Backspace" && !text && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => commit(text)}
      />
      <datalist id={listId}>
        {options
          .filter((option) => !value.some((v) => v.toLowerCase() === option.toLowerCase()))
          .map((option) => (
            <option key={option} value={option} />
          ))}
      </datalist>
    </div>
  );
}

type LocationField = "origin" | "currentLocation" | "futurePlan";
type StateField = "originState" | "currentState" | "futureState";

type Props = {
  options: FieldOptions;
  /** Omitted for a new person; supplied to edit an existing one. */
  person?: Person;
  onClose: () => void;
};

export default function PersonForm({ options, person, onClose }: Props) {
  const router = useRouter();
  const id = useId();
  const [draft, setDraft] = useState<PersonDraft>(person ? draftFrom(person) : emptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isDummy = useIsDummyRoute();

  const set = <K extends keyof PersonDraft>(key: K, value: PersonDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const listId = (field: string) => `${id}-${field}`;

  function save() {
    setError(null);
    if (isDummy) {
      setError(DUMMY_WRITE_MESSAGE);
      return;
    }
    startTransition(async () => {
      const result = person ? await updatePerson(person.id, draft) : await addPerson(draft);
      if (result.ok) {
        onClose();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  // Each location is a place plus the state/province it sits in.
  const locationFields: { field: LocationField; state: StateField; label: string }[] = [
    { field: "currentLocation", state: "currentState", label: "Current Location" },
    { field: "origin", state: "originState", label: "Origin" },
    { field: "futurePlan", state: "futureState", label: "Future Residency Plan" },
  ];

  // Picking a known city fills its state in; clearing the location leaves the
  // state alone, since a state on its own is a perfectly good answer.
  function setLocation(field: LocationField, stateField: StateField, value: string) {
    const city = lookupCity(value);
    setDraft((current) => ({
      ...current,
      [field]: value,
      ...(city && city.state ? { [stateField]: city.state } : {}),
    }));
  }

  // Naming a different state clears a location that isn't in it, rather than
  // leaving behind a city that contradicts the state next to it.
  function setState(field: LocationField, stateField: StateField, value: string) {
    setDraft((current) => {
      const city = lookupCity(current[field]);
      const conflicts = Boolean(value.trim() && city && city.state && normalizeLoose(city.state) !== normalizeLoose(value));
      return { ...current, [stateField]: value, ...(conflicts ? { [field]: "" } : {}) };
    });
  }

  const listFields: [keyof PersonDraft & OptionField, string][] = [
    ["interests", "Interest"],
    ["occupations", "Occupations"],
    ["utilities", "Additional Utilities"],
  ];

  return (
    <div className="bg-card border border-line rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display font-bold text-lg text-ink">{person ? `Edit ${person.name}` : "Add a person"}</h3>
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-xs px-3 py-1.5 rounded-full border border-line text-ink-soft hover:border-ink-soft hover:text-ink transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div
          className="rounded-xl border px-4 py-2.5 text-sm break-words"
          style={{ borderColor: "#CB3A1E", color: "#CB3A1E", background: "rgba(203,58,30,0.08)" }}
        >
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2">
          <input
            className={inputCls}
            value={draft.name}
            autoFocus
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>

        {locationFields.map(({ field, state, label }) => (
          <Fragment key={field}>
            <Field label={label} hint={<LocationHint value={draft[field]} state={draft[state]} />}>
              <input
                className={inputCls}
                value={draft[field]}
                list={listId(field)}
                onChange={(e) => setLocation(field, state, e.target.value)}
              />
              <datalist id={listId(field)}>
                {locationSuggestions(options[field], draft[state]).map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </Field>

            <Field label={`${label} — State/Province`}>
              <input
                className={inputCls}
                value={draft[state]}
                list={listId(state)}
                onChange={(e) => setState(field, state, e.target.value)}
              />
              <datalist id={listId(state)}>
                {[...new Set([...STATE_SUGGESTIONS, ...options[state]])].map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </Field>
          </Fragment>
        ))}

        {listFields.map(([field, label]) => (
          <Field key={field} label={label}>
            <TagInput
              value={draft[field] as string[]}
              options={options[field]}
              listId={listId(field)}
              onChange={(next) => set(field, next)}
            />
          </Field>
        ))}

        <Field label="Notes">
          <textarea
            className={`${inputCls} min-h-[38px]`}
            rows={2}
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isPending || !draft.name.trim()}
          className="font-mono text-sm px-4 py-2 rounded-full bg-ink text-paper border border-ink transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? "Saving…" : person ? "Save changes" : "Add person"}
        </button>
        <span className="font-mono text-xs text-ink-soft">writes straight to Notion</span>
      </div>
    </div>
  );
}
