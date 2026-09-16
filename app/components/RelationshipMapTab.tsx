"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PersonForm from "./PersonForm";
import type { FieldOptions, Person } from "../lib/getRelationships";
import { countryDisplayName, resolvePlace } from "../lib/places";
import { MAP_COUNTRIES, MAP_HEIGHT, MAP_WIDTH, project } from "../lib/worldMap";

const INK = "#1B3327";
const CHILI = "#CB3A1E";
const CARD = "#F6F7F0";

const MODES = [
  { id: "current", label: "currently in", field: "currentLocation", state: "currentState", caption: "where people live now" },
  { id: "origin", label: "originally from", field: "origin", state: "originState", caption: "where people are from" },
  { id: "future", label: "heading to", field: "futurePlan", state: "futureState", caption: "where people are heading" },
] as const;

type Mode = (typeof MODES)[number];
type ModeId = Mode["id"];

type PlaceGroup = {
  key: string;
  label: string;
  x: number;
  y: number;
  countryId: string | null;
  people: Person[];
};

type Label = {
  key: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Pin the label belongs to, for the leader line. */
  pinX: number;
  pinY: number;
};

const LABEL_FONT_SIZE = 11;
const LABEL_HEIGHT = 16;
const LABEL_PADDING = 5;

// SVG has no text metrics before paint, so chip widths are estimated. The
// average glyph in the UI font sits a little over half the font size wide.
function estimateWidth(text: string) {
  return Math.round(text.length * LABEL_FONT_SIZE * 0.55) + LABEL_PADDING * 2;
}

function overlaps(a: Label, b: Label) {
  return (
    a.x < b.x + b.width + 2 &&
    a.x + a.width + 2 > b.x &&
    a.y < b.y + b.height + 2 &&
    a.y + a.height + 2 > b.y
  );
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 16;

// At world scale a name on every country is noise; once you've zoomed in far
// enough to be looking at a region, it's the thing you want most.
const COUNTRY_LABEL_ZOOM = 2;
const COUNTRY_LABEL_SIZE = 9;
// A country only gets its name once it's at least this wide on screen, so
// zooming reveals smaller countries instead of dumping every label at once.
const COUNTRY_LABEL_MIN_PX = 44;

const TABLE_HEADINGS = [
  "Name",
  "Origin",
  "Origin State/Prov.",
  "Current Location",
  "Current State/Prov.",
  "Future Plan",
  "Future State/Prov.",
  "Interest",
  "Occupations",
  "Utilities",
  "",
];

type View = { cx: number; cy: number; zoom: number };

const HOME_VIEW: View = { cx: MAP_WIDTH / 2, cy: MAP_HEIGHT / 2, zoom: 1 };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

// The visible window, kept inside the map so you can never pan off into blank
// space. Panning is disabled entirely at zoom 1, where the whole map fits.
type ViewBox = { x: number; y: number; width: number; height: number };

function viewBoxOf(view: View): ViewBox {
  const width = MAP_WIDTH / view.zoom;
  const height = MAP_HEIGHT / view.zoom;
  return {
    x: clamp(view.cx, width / 2, MAP_WIDTH - width / 2) - width / 2,
    y: clamp(view.cy, height / 2, MAP_HEIGHT - height / 2) - height / 2,
    width,
    height,
  };
}

// Chips are placed one at a time, densest region first: try the right of the
// pin, then the left, nudging further away until the chip clears everything
// already placed. Whatever can't be cleared is drawn anyway — a slightly
// crowded map beats a name silently going missing.
function layoutLabels(groups: PlaceGroup[], zoom: number, box: ViewBox): Label[] {
  const placed: Label[] = [];
  // A pin panned out of view keeps no label — otherwise its chip gets clamped
  // to the edge of the window, trailing a leader line to nothing.
  const ordered = groups
    .filter(
      (group) =>
        group.x >= box.x && group.x <= box.x + box.width && group.y >= box.y && group.y <= box.y + box.height
    )
    .sort((a, b) => b.people.length - a.people.length || a.y - b.y);

  // Zoomed in, a chip covers less of the map, so crowded cities get to spread
  // out instead of stacking — which is most of the point of zooming.
  const height = LABEL_HEIGHT / zoom;
  const gap = 3 / zoom;
  const offset = 9 / zoom;

  for (const group of ordered) {
    const text = group.people.length > 2 ? `${group.label} · ${group.people.length}` : group.people.map((p) => p.name).join(", ");
    const width = estimateWidth(text) / zoom;
    const candidates: { x: number; y: number }[] = [];

    for (const step of [0, -1, 1, -2, 2, -3, 3]) {
      const dy = step * (height + gap);
      // Chips on the right edge of the map would run off it, so those flip first.
      const sides = group.x > box.x + box.width - width - 30 / zoom ? [-1, 1] : [1, -1];
      for (const side of sides) {
        const x = side === 1 ? group.x + offset : group.x - offset - width;
        candidates.push({ x, y: group.y - height / 2 + dy });
      }
    }

    let chosen = candidates[0];
    for (const candidate of candidates) {
      const box: Label = { key: group.key, text, width, height, pinX: group.x, pinY: group.y, ...candidate };
      if (!placed.some((other) => overlaps(box, other))) {
        chosen = candidate;
        break;
      }
    }

    placed.push({
      key: group.key,
      text,
      width,
      height,
      pinX: group.x,
      pinY: group.y,
      x: clamp(chosen.x, box.x + 2, box.x + box.width - width - 2),
      y: clamp(chosen.y, box.y + 2, box.y + box.height - height - 2),
    });
  }

  return placed;
}

type CountryLabel = { id: string; name: string; x: number; y: number };

function countryLabels(zoom: number, box: ViewBox, peopleLabels: Label[]): CountryLabel[] {
  if (zoom < COUNTRY_LABEL_ZOOM) return [];

  const height = COUNTRY_LABEL_SIZE / zoom;
  const placed: Label[] = [...peopleLabels];
  const labels: CountryLabel[] = [];

  // Bigger countries first, so a crowded region labels France before Belgium.
  const candidates = [...MAP_COUNTRIES].sort((a, b) => b.width - a.width);

  for (const country of candidates) {
    if (country.width * zoom < COUNTRY_LABEL_MIN_PX) continue;

    const { x, y } = project(country.lon, country.lat);
    const name = countryDisplayName(country.name);
    const width = (name.length * COUNTRY_LABEL_SIZE * 0.55) / zoom;
    const candidate: Label = {
      key: country.id,
      text: name,
      width,
      height,
      pinX: x,
      pinY: y,
      x: x - width / 2,
      y: y - height / 2,
    };

    // The whole label has to fit in view — a centred name whose country edge is
    // off-screen would otherwise be drawn cut in half.
    if (
      candidate.x < box.x ||
      candidate.x + width > box.x + box.width ||
      candidate.y < box.y ||
      candidate.y + height > box.y + box.height
    ) {
      continue;
    }
    if (placed.some((other) => overlaps(candidate, other))) continue;

    placed.push(candidate);
    labels.push({ id: country.id, name, x, y });
  }

  return labels;
}

function pinRadius(count: number) {
  return 3.5 + Math.min(count, 12) * 0.7;
}

function EmptySetup() {
  return (
    <div className="bg-card border border-line rounded-2xl p-8 text-center">
      <p className="text-ink font-semibold mb-1">Relationships not connected yet.</p>
      <p className="text-ink-soft text-sm mb-3">
        Add{" "}
        <code className="font-mono bg-paper px-1.5 py-0.5 rounded text-xs border border-line">NOTION_RELATIONSHIPS_ID</code>{" "}
        to your{" "}
        <code className="font-mono bg-paper px-1.5 py-0.5 rounded text-xs border border-line">.env.local</code>, or add
        your first person in Notion.
      </p>
      <div className="text-left inline-block bg-paper border border-line rounded-xl p-4 text-xs font-mono text-ink-soft mt-1">
        <p className="font-bold text-ink mb-2">Notion database schema (&quot;Relationships&quot;):</p>
        <p>Name → Title</p>
        <p>Origin → Select (city or country)</p>
        <p>Current Location → Select (city or country)</p>
        <p>Future Residency Plan → Select (optional)</p>
        <p>Interest → Multi-select</p>
        <p>Occupations → Multi-select</p>
        <p>Additional Utilities → Multi-select</p>
        <p>Notes → Text (optional)</p>
      </div>
    </div>
  );
}

function EmptyDatabase() {
  return (
    <div className="bg-card border border-line rounded-2xl p-8 text-center">
      <p className="text-ink font-semibold mb-1">Nobody in the Relationships database yet.</p>
      <p className="text-ink-soft text-sm">
        Add a person in Notion — a name and a Current Location is enough to put them on the map.
      </p>
    </div>
  );
}

function LocationCell({ value }: { value: string }) {
  if (!value.trim()) return <td className="py-2 pr-3 font-mono text-ink-soft">—</td>;

  // A location the map can't resolve is flagged here rather than only in a
  // footnote — it's the cell you'd click "edit" to fix.
  const pinned = Boolean(resolvePlace(value));
  return (
    <td
      className="py-2 pr-3 font-mono"
      style={pinned ? undefined : { color: CHILI }}
      title={pinned ? undefined : "No pin for this spelling"}
    >
      {value}
    </td>
  );
}

function StateCell({ value }: { value: string }) {
  if (!value.trim()) return <td className="py-2 pr-3 font-mono text-ink-soft">—</td>;
  return <td className="py-2 pr-3 font-mono text-ink-soft">{value}</td>;
}

function ListCell({ items }: { items: string[] }) {
  return (
    <td className="py-2 pr-3 text-ink-soft">{items.length ? items.join(", ") : <span className="font-mono">—</span>}</td>
  );
}

type Props = { people: Person[]; configured: boolean; options: FieldOptions };

export default function RelationshipMapTab({ people, configured, options }: Props) {
  const [modeId, setModeId] = useState<ModeId>("current");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<View>(HOME_VIEW);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ pointerX: number; pointerY: number; cx: number; cy: number } | null>(null);

  const mode = MODES.find((m) => m.id === modeId) ?? MODES[0];

  const { groups, groupKeyByPerson, unknownPlaces } = useMemo(() => {
    const byKey = new Map<string, PlaceGroup>();
    const groupKeyByPerson = new Map<string, string>();
    const unknownPlaces = new Map<string, string[]>();

    for (const person of people) {
      const raw = person[mode.field].trim();
      const stateRaw = person[mode.state].trim();
      if (!raw && !stateRaw) continue;

      // Prefer the location; fall back to the state, which pins the middle of
      // the cities known to be in it.
      const place = (raw && resolvePlace(raw)) || (stateRaw ? resolvePlace(stateRaw) : null);
      if (!place) {
        const missing = raw || stateRaw;
        unknownPlaces.set(missing, [...(unknownPlaces.get(missing) ?? []), person.name]);
        continue;
      }

      groupKeyByPerson.set(person.id, place.key);

      const point = project(place.lon, place.lat);
      const group = byKey.get(place.key);
      if (group) {
        group.people.push(person);
      } else {
        byKey.set(place.key, {
          key: place.key,
          label: place.label,
          x: point.x,
          y: point.y,
          countryId: place.countryId,
          people: [person],
        });
      }
    }

    const groups = [...byKey.values()].sort(
      (a, b) => b.people.length - a.people.length || a.label.localeCompare(b.label)
    );
    for (const group of groups) group.people.sort((a, b) => a.name.localeCompare(b.name));

    return { groups, groupKeyByPerson, unknownPlaces };
  }, [people, mode.field, mode.state]);

  const labels = useMemo(() => layoutLabels(groups, view.zoom, viewBoxOf(view)), [groups, view]);
  const countries = useMemo(
    () => countryLabels(view.zoom, viewBoxOf(view), labels),
    [view, labels]
  );
  const populatedCountries = useMemo(
    () => new Set(groups.map((g) => g.countryId).filter(Boolean) as string[]),
    [groups]
  );

  const box = viewBoxOf(view);

  // Zooming keeps whatever is under the cursor under the cursor, which is what
  // makes wheel-zoom feel like a map rather than a slider.
  const zoomTo = useCallback((nextZoom: number, anchor?: { x: number; y: number }) => {
    setView((current) => {
      const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      if (!anchor) return { ...current, zoom };
      const ratio = current.zoom / zoom;
      return {
        zoom,
        cx: anchor.x - (anchor.x - current.cx) * ratio,
        cy: anchor.y - (anchor.y - current.cy) * ratio,
      };
    });
  }, []);

  const toMapPoint = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      const current = viewBoxOf(view);
      return {
        x: current.x + ((clientX - rect.left) / rect.width) * current.width,
        y: current.y + ((clientY - rect.top) / rect.height) * current.height,
      };
    },
    [view]
  );

  // React attaches wheel listeners passively, so preventDefault (stopping the
  // page from scrolling as you zoom) needs a direct non-passive listener.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const point = toMapPoint(event.clientX, event.clientY);
      zoomTo(view.zoom * (event.deltaY < 0 ? 1.2 : 1 / 1.2), point ?? undefined);
    };

    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [toMapPoint, view.zoom, zoomTo]);

  const editing = people.find((person) => person.id === editingId);

  if (!configured) return <EmptySetup />;

  const placedCount = groups.reduce((sum, g) => sum + g.people.length, 0);

  const addButton = (
    <button
      onClick={() => {
        setAdding((open) => !open);
        setEditingId(null);
      }}
      className="font-mono text-sm px-4 py-2 rounded-full border border-line text-ink-soft hover:border-ink-soft hover:text-ink transition-colors cursor-pointer"
    >
      + Add person
    </button>
  );

  if (!people.length) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display font-bold text-lg text-ink">People</h3>
          {addButton}
        </div>
        {adding ? <PersonForm options={options} onClose={() => setAdding(false)} /> : <EmptyDatabase />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 items-center flex-wrap">
          {MODES.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                setModeId(option.id);
                setActiveKey(null);
              }}
              className={`font-mono text-sm px-4 py-2 rounded-full border capitalize transition-colors cursor-pointer
                ${
                  option.id === modeId
                    ? "bg-ink text-paper border-ink"
                    : "text-ink-soft border-line hover:border-ink-soft hover:text-ink"
                }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="font-mono text-xs text-ink-soft">
          {placedCount} of {people.length} on the map · {groups.length} place{groups.length === 1 ? "" : "s"}
        </p>
      </div>

      {adding && <PersonForm options={options} onClose={() => setAdding(false)} />}

      <div className="bg-card border border-line rounded-2xl p-3 overflow-x-auto relative">
        <div className="absolute right-5 top-5 z-10 flex items-center gap-1">
          {view.zoom > MIN_ZOOM && (
            <button
              onClick={() => setView(HOME_VIEW)}
              className="font-mono text-[11px] px-2 py-1 rounded-full border border-line bg-card text-ink-soft hover:border-ink-soft hover:text-ink transition-colors cursor-pointer"
            >
              reset
            </button>
          )}
          <button
            onClick={() => zoomTo(view.zoom / 1.6)}
            disabled={view.zoom <= MIN_ZOOM}
            aria-label="Zoom out"
            className="font-mono text-sm w-7 h-7 rounded-full border border-line bg-card text-ink-soft hover:border-ink-soft hover:text-ink transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            −
          </button>
          <button
            onClick={() => zoomTo(view.zoom * 1.6)}
            disabled={view.zoom >= MAX_ZOOM}
            aria-label="Zoom in"
            className="font-mono text-sm w-7 h-7 rounded-full border border-line bg-card text-ink-soft hover:border-ink-soft hover:text-ink transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>

        {/* Below ~640px the chips become unreadable if the map shrinks with the
            viewport, so it keeps its size and scrolls sideways instead. */}
        <svg
          ref={svgRef}
          viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
          className={`w-full min-w-[640px] h-auto touch-none select-none ${
            view.zoom > MIN_ZOOM ? "cursor-grab active:cursor-grabbing" : ""
          }`}
          role="img"
          aria-label={`World map of ${mode.caption}`}
          onDoubleClick={(event) => {
            const point = toMapPoint(event.clientX, event.clientY);
            zoomTo(view.zoom * 1.8, point ?? undefined);
          }}
          onPointerDown={(event) => {
            if (view.zoom <= MIN_ZOOM) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = { pointerX: event.clientX, pointerY: event.clientY, cx: view.cx, cy: view.cy };
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            const svg = svgRef.current;
            if (!drag || !svg) return;
            const rect = svg.getBoundingClientRect();
            setView((current) => ({
              ...current,
              cx: drag.cx - ((event.clientX - drag.pointerX) / rect.width) * box.width,
              cy: drag.cy - ((event.clientY - drag.pointerY) / rect.height) * box.height,
            }));
          }}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture(event.pointerId);
            dragRef.current = null;
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
        >
          <g>
            {MAP_COUNTRIES.map((country) => {
              const populated = populatedCountries.has(country.id);
              return (
                <path
                  key={country.id}
                  d={country.d}
                  fill={populated ? "rgba(78,112,67,0.42)" : "rgba(27,51,39,0.08)"}
                  stroke="rgba(27,51,39,0.38)"
                  strokeWidth={0.45 / view.zoom}
                />
              );
            })}
          </g>

          <g pointerEvents="none">
            {countries.map((country) => (
              <text
                key={`country-${country.id}`}
                x={country.x}
                y={country.y}
                textAnchor="middle"
                fontSize={COUNTRY_LABEL_SIZE / view.zoom}
                fill={INK}
                fillOpacity={0.55}
                letterSpacing={0.4 / view.zoom}
              >
                {country.name}
              </text>
            ))}
          </g>

          <g>
            {labels.map((label) => {
              const active = label.key === activeKey;
              const anchorX = label.x > label.pinX ? label.x : label.x + label.width;
              return (
                <line
                  key={`leader-${label.key}`}
                  x1={label.pinX}
                  y1={label.pinY}
                  x2={anchorX}
                  y2={label.y + label.height / 2}
                  stroke={active ? CHILI : INK}
                  strokeWidth={0.6 / view.zoom}
                  strokeOpacity={active ? 0.9 : 0.35}
                />
              );
            })}
          </g>

          <g>
            {groups.map((group) => {
              const active = group.key === activeKey;
              return (
                <g
                  key={group.key}
                  onMouseEnter={() => setActiveKey(group.key)}
                  onMouseLeave={() => setActiveKey(null)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={group.x}
                    cy={group.y}
                    r={(pinRadius(group.people.length) + 5) / view.zoom}
                    fill="transparent"
                  />
                  <circle
                    cx={group.x}
                    cy={group.y}
                    r={pinRadius(group.people.length) / view.zoom}
                    fill={CHILI}
                    fillOpacity={active ? 1 : 0.85}
                    stroke={CARD}
                    strokeWidth={1.2 / view.zoom}
                  />
                  {active && (
                    <circle
                      cx={group.x}
                      cy={group.y}
                      r={(pinRadius(group.people.length) + 4) / view.zoom}
                      fill="none"
                      stroke={CHILI}
                      strokeWidth={1 / view.zoom}
                      strokeOpacity={0.5}
                    />
                  )}
                </g>
              );
            })}
          </g>

          <g>
            {labels.map((label) => {
              const active = label.key === activeKey;
              return (
                <g
                  key={`label-${label.key}`}
                  onMouseEnter={() => setActiveKey(label.key)}
                  onMouseLeave={() => setActiveKey(null)}
                  className="cursor-pointer"
                >
                  <rect
                    x={label.x}
                    y={label.y}
                    width={label.width}
                    height={label.height}
                    rx={4 / view.zoom}
                    fill={active ? INK : CARD}
                    stroke={active ? INK : "rgba(27,51,39,0.22)"}
                    strokeWidth={0.7 / view.zoom}
                  />
                  <text
                    x={label.x + LABEL_PADDING / view.zoom}
                    y={label.y + label.height / 2 + 3.6 / view.zoom}
                    fontSize={LABEL_FONT_SIZE / view.zoom}
                    fontWeight={600}
                    fill={active ? CARD : INK}
                  >
                    {label.text}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {editing && (
        <PersonForm options={options} person={editing} onClose={() => setEditingId(null)} />
      )}

      <div className="bg-card border border-line rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display font-bold text-lg text-ink">People</h3>
          {addButton}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[1040px]">
            <thead>
              <tr className="border-b border-line">
                {TABLE_HEADINGS.map((heading, i) => (
                  <th
                    key={heading || i}
                    className={`font-mono font-normal text-ink-soft pb-2 pr-3 whitespace-nowrap ${
                      i === TABLE_HEADINGS.length - 1 ? "text-right" : "text-left"
                    }`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {people.map((person) => {
                const groupKey = groupKeyByPerson.get(person.id);
                const active = Boolean(groupKey) && groupKey === activeKey;
                return (
                  <tr
                    key={person.id}
                    // Hovering a row lights up that person's pin, and vice versa.
                    onMouseEnter={() => setActiveKey(groupKey ?? null)}
                    onMouseLeave={() => setActiveKey(null)}
                    className={`border-b border-line last:border-b-0 transition-colors ${active ? "bg-paper" : ""}`}
                  >
                    <td className="py-2 pr-3 font-semibold text-ink whitespace-nowrap">{person.name}</td>
                    <LocationCell value={person.origin} />
                    <StateCell value={person.originState} />
                    <LocationCell value={person.currentLocation} />
                    <StateCell value={person.currentState} />
                    <LocationCell value={person.futurePlan} />
                    <StateCell value={person.futureState} />
                    <ListCell items={person.interests} />
                    <ListCell items={person.occupations} />
                    <ListCell items={person.utilities} />
                    <td className="py-2 text-right">
                      <button
                        onClick={() => {
                          setEditingId(person.id);
                          setAdding(false);
                        }}
                        className="font-mono text-[11px] px-2 py-0.5 rounded-full border border-line text-ink-soft hover:border-ink-soft hover:text-ink transition-colors cursor-pointer"
                      >
                        edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {unknownPlaces.size > 0 && (
          <p className="font-mono text-[11px] text-ink-soft">
            Locations in red have no pin yet — add the spelling to{" "}
            <code className="bg-paper px-1.5 py-0.5 rounded border border-line">app/lib/places.ts</code>.
          </p>
        )}
      </div>
    </div>
  );
}
