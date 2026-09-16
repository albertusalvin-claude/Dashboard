// Regenerates app/lib/worldMap.ts from Natural Earth's 110m country outlines.
//
// The map view needs country shapes, but pulling in d3-geo + topojson-client at
// runtime just to draw a static basemap is a lot of weight for one tab. Instead
// this script does the projection once, offline, and emits plain SVG path
// strings that the component can render directly.
//
//   node scripts/build-world-map.mjs [path/to/countries-110m.json]
//
// With no argument it downloads the atlas from jsDelivr.

import fs from "node:fs/promises";
import path from "node:path";

const SOURCE_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const OUT_FILE = path.join(import.meta.dirname, "..", "app", "lib", "worldMap.ts");

// Equirectangular projection. Longitude spans the full globe; latitude is
// cropped to the inhabited band so the map isn't mostly empty ice. The vertical
// scale matches the horizontal one, so shapes keep their true aspect ratio.
const LAT_TOP = 84;
const LAT_BOTTOM = -57;
const WIDTH = 1000;
const SCALE = WIDTH / 360;
const HEIGHT = round((LAT_TOP - LAT_BOTTOM) * SCALE);

// Antarctica is cropped away by the latitude window, and the handful of
// sub-antarctic specks left behind only add noise.
const SKIP_IDS = new Set(["010", "239", "260"]);

// Points closer together than this (in output pixels) are dropped — at a
// 1000px-wide world map the extra precision is invisible but not free.
const MIN_STEP = 0.7;

function round(n) {
  return Math.round(n * 10) / 10;
}

function projectX(lon) {
  return (lon + 180) * SCALE;
}

function projectY(lat) {
  return (LAT_TOP - lat) * SCALE;
}

function decodeArcs(topology) {
  const [scaleX, scaleY] = topology.transform.scale;
  const [translateX, translateY] = topology.transform.translate;

  return topology.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * scaleX + translateX, y * scaleY + translateY];
    });
  });
}

// A ring is a list of arc indices; a negative index means "walk that arc
// backwards". Consecutive arcs share their endpoint, hence the slice(1).
function ringPoints(ring, arcs) {
  const points = [];
  for (const index of ring) {
    const arc = index < 0 ? arcs[~index].slice().reverse() : arcs[index];
    points.push(...(points.length ? arc.slice(1) : arc));
  }
  return points;
}

// Rings that touch the antimeridian (mainland Russia, notably) are stored as a
// single ring that runs east to +180, jumps to -180 and carries on. Drawn
// as-is that jump becomes a band straight across the map, so split the ring at
// every wrap. Each piece already starts and ends on a map edge, so closing it
// with Z traces the edge — exactly the seam we want.
function splitAtAntimeridian(points) {
  // Rings arrive closed; the duplicate end point just complicates rotation.
  const ring = points.slice(0, -1);
  const wraps = [];
  for (let i = 0; i < ring.length; i++) {
    const next = (i + 1) % ring.length;
    if (Math.abs(ring[next][0] - ring[i][0]) > 180) wraps.push(next);
  }
  if (!wraps.length) return [points];

  // Start at the first point after a wrap so no piece straddles the array end.
  const start = wraps[0];
  const rotated = [...ring.slice(start), ...ring.slice(0, start)];
  const cuts = new Set(wraps.slice(1).map((i) => (i - start + ring.length) % ring.length));

  const pieces = [];
  let current = [];
  rotated.forEach((point, i) => {
    if (cuts.has(i) && current.length) {
      pieces.push(current);
      current = [];
    }
    current.push(point);
  });
  if (current.length) pieces.push(current);
  return pieces;
}

function ringToPath(points) {
  const projected = [];
  for (const [lon, lat] of points) {
    const x = projectX(lon);
    const y = projectY(Math.max(LAT_BOTTOM, Math.min(LAT_TOP, lat)));
    const previous = projected[projected.length - 1];
    if (previous && Math.abs(previous[0] - x) < MIN_STEP && Math.abs(previous[1] - y) < MIN_STEP) {
      continue;
    }
    projected.push([round(x), round(y)]);
  }
  // Fewer than 3 distinct points can't enclose an area worth drawing.
  if (projected.length < 3) return null;
  return `M${projected.map(([x, y]) => `${x} ${y}`).join("L")}Z`;
}

// Signed area of a ring in lon/lat, and its centroid. Used to pick the biggest
// landmass of a multi-part country (mainland USA over Alaska, say) so labels
// and fallback pins land somewhere recognisable.
function ringCentroid(points) {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  area /= 2;
  if (area === 0) return { area: 0, lon: points[0][0], lat: points[0][1] };
  return { area: Math.abs(area), lon: cx / (6 * area), lat: cy / (6 * area) };
}

function polygonsOf(geometry) {
  if (geometry.type === "Polygon") return [geometry.arcs];
  if (geometry.type === "MultiPolygon") return geometry.arcs;
  return [];
}

async function loadTopology() {
  const localPath = process.argv[2];
  if (localPath) {
    return JSON.parse(await fs.readFile(localPath, "utf8"));
  }
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Failed to download ${SOURCE_URL}: ${res.status}`);
  return res.json();
}

const topology = await loadTopology();
const arcs = decodeArcs(topology);

const countries = [];

for (const geometry of topology.objects.countries.geometries) {
  if (SKIP_IDS.has(geometry.id)) continue;

  const paths = [];
  let largest = { area: 0, lon: 0, lat: 0 };
  // Width of the country's biggest landmass on screen, so the map can decide
  // whether it's large enough at the current zoom to be worth labelling.
  let widest = 0;

  for (const polygon of polygonsOf(geometry)) {
    polygon.forEach((ring, ringIndex) => {
      for (const piece of splitAtAntimeridian(ringPoints(ring, arcs))) {
        const path = ringToPath(piece);
        if (path) paths.push(path);
        // Only outer rings (the first of each polygon) count towards
        // "biggest landmass" — holes would drag the centroid off.
        if (ringIndex > 0) continue;
        const centroid = ringCentroid(piece);
        if (centroid.area > largest.area) {
          largest = centroid;
          const lons = piece.map(([lon]) => lon);
          widest = round((Math.max(...lons) - Math.min(...lons)) * SCALE);
        }
      }
    });
  }

  if (!paths.length) continue;

  countries.push({
    // A few entries (Kosovo, Northern Cyprus, Somaliland) have no numeric code
    // in the source, and React needs these to be unique keys.
    id: geometry.id ?? geometry.properties.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: geometry.properties.name,
    d: paths.join(""),
    lon: Number(largest.lon.toFixed(2)),
    lat: Number(largest.lat.toFixed(2)),
    width: widest,
  });
}

countries.sort((a, b) => a.name.localeCompare(b.name));

const body = countries
  .map(
    (c) =>
      `  { id: "${c.id}", name: ${JSON.stringify(c.name)}, lon: ${c.lon}, lat: ${c.lat}, width: ${c.width}, d: "${c.d}" },`
  )
  .join("\n");

const output = `// GENERATED FILE — do not edit by hand.
// Run \`node scripts/build-world-map.mjs\` to regenerate from Natural Earth 110m data.
//
// Country outlines pre-projected (equirectangular) into a ${WIDTH}x${HEIGHT} viewBox,
// cropped to latitudes ${LAT_TOP}..${LAT_BOTTOM} — see the script for why this is baked
// rather than computed at runtime.

export type MapCountry = {
  /** Natural Earth numeric country code. */
  id: string;
  name: string;
  /** Centre of the country's largest landmass, in degrees. */
  lon: number;
  lat: number;
  /** Width of that landmass in viewBox units — a proxy for how much room a label has. */
  width: number;
  /** SVG path data, already projected into MAP_VIEWBOX. */
  d: string;
};

export const MAP_WIDTH = ${WIDTH};
export const MAP_HEIGHT = ${HEIGHT};
export const MAP_LAT_TOP = ${LAT_TOP};
export const MAP_LAT_BOTTOM = ${LAT_BOTTOM};

/** Projects degrees to a point in the ${WIDTH}x${HEIGHT} map viewBox. */
export function project(lon: number, lat: number): { x: number; y: number } {
  const clampedLat = Math.max(MAP_LAT_BOTTOM, Math.min(MAP_LAT_TOP, lat));
  return {
    x: (lon + 180) * (MAP_WIDTH / 360),
    y: (MAP_LAT_TOP - clampedLat) * (MAP_WIDTH / 360),
  };
}

export const MAP_COUNTRIES: MapCountry[] = [
${body}
];
`;

await fs.writeFile(OUT_FILE, output);
console.log(`Wrote ${OUT_FILE} — ${countries.length} countries, ${(output.length / 1024).toFixed(1)} KB`);
