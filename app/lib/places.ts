import { MAP_COUNTRIES, type MapCountry } from "./worldMap";

// Turning "Melbourne", "Jakarta, Indonesia" or "UK" into a point on the map.
//
// Locations in Notion are free text (a Select, so at least consistent once
// typed), and geocoding them over the network would mean an API key, a cache
// and a new failure mode for a tab that should just render. Instead: country
// centres come from the map data itself, and cities come from the table below.
// Anything unrecognised is reported back to the UI rather than silently
// dropped, so it's obvious when a name needs adding here.

export type ResolvedPlace = {
  /** Canonical display name — "melbourne" and "Melbourne, AU" both land on "Melbourne". */
  label: string;
  /** Identity for grouping; two people share a pin iff they share a key. */
  key: string;
  lon: number;
  lat: number;
  /** Set when the place sits inside a country the basemap can draw. */
  countryId: string | null;
  /** What kind of place matched — a state pin is much coarser than a city one. */
  kind: "city" | "state" | "country";
};

export type CityRecord = {
  name: string;
  state: string;
  country: string;
};

// [city, lon, lat, country, state]. The country tints the surrounding map
// region and doesn't have to exist in the basemap — Singapore and Hong Kong
// don't. The state is what the form auto-fills once a city is picked; city
// states leave it empty.
const CITIES: [string, number, number, string, string][] = [
  // Australia & New Zealand
  ["Melbourne", 144.96, -37.81, "Australia", "Victoria"],
  ["Sydney", 151.21, -33.87, "Australia", "New South Wales"],
  ["Brisbane", 153.03, -27.47, "Australia", "Queensland"],
  ["Perth", 115.86, -31.95, "Australia", "Western Australia"],
  ["Adelaide", 138.6, -34.93, "Australia", "South Australia"],
  ["Canberra", 149.13, -35.28, "Australia", "Australian Capital Territory"],
  ["Hobart", 147.33, -42.88, "Australia", "Tasmania"],
  ["Darwin", 130.84, -12.46, "Australia", "Northern Territory"],
  ["Gold Coast", 153.43, -28.0, "Australia", "Queensland"],
  ["Newcastle", 151.78, -32.93, "Australia", "New South Wales"],
  ["Wollongong", 150.89, -34.42, "Australia", "New South Wales"],
  ["Cairns", 145.77, -16.92, "Australia", "Queensland"],
  ["Auckland", 174.76, -36.85, "New Zealand", "Auckland"],
  ["Wellington", 174.78, -41.29, "New Zealand", "Wellington"],
  ["Christchurch", 172.64, -43.53, "New Zealand", "Canterbury"],

  // Indonesia
  ["Jakarta", 106.85, -6.21, "Indonesia", "Jakarta"],
  ["Surabaya", 112.75, -7.26, "Indonesia", "East Java"],
  ["Bandung", 107.62, -6.92, "Indonesia", "West Java"],
  ["Medan", 98.67, 3.59, "Indonesia", "North Sumatra"],
  ["Semarang", 110.42, -6.97, "Indonesia", "Central Java"],
  ["Makassar", 119.43, -5.15, "Indonesia", "South Sulawesi"],
  ["Yogyakarta", 110.37, -7.8, "Indonesia", "Yogyakarta"],
  ["Denpasar", 115.22, -8.65, "Indonesia", "Bali"],
  ["Palembang", 104.76, -2.98, "Indonesia", "South Sumatra"],
  ["Malang", 112.63, -7.98, "Indonesia", "East Java"],
  ["Surakarta", 110.83, -7.57, "Indonesia", "Central Java"],
  ["Batam", 104.03, 1.08, "Indonesia", "Riau Islands"],
  ["Balikpapan", 116.83, -1.27, "Indonesia", "East Kalimantan"],
  ["Manado", 124.85, 1.47, "Indonesia", "North Sulawesi"],
  ["Pontianak", 109.33, -0.03, "Indonesia", "West Kalimantan"],
  ["Tangerang", 106.63, -6.18, "Indonesia", "Banten"],
  ["Bekasi", 106.99, -6.24, "Indonesia", "West Java"],
  ["Depok", 106.82, -6.4, "Indonesia", "West Java"],
  ["Bogor", 106.8, -6.6, "Indonesia", "West Java"],

  // Rest of Asia
  ["Singapore", 103.82, 1.35, "Singapore", ""],
  ["Kuala Lumpur", 101.69, 3.14, "Malaysia", "Kuala Lumpur"],
  ["Penang", 100.33, 5.41, "Malaysia", "Penang"],
  ["Johor Bahru", 103.76, 1.49, "Malaysia", "Johor"],
  ["Bangkok", 100.5, 13.76, "Thailand", "Bangkok"],
  ["Chiang Mai", 98.98, 18.79, "Thailand", "Chiang Mai"],
  ["Ho Chi Minh City", 106.66, 10.82, "Vietnam", "Ho Chi Minh City"],
  ["Hanoi", 105.83, 21.03, "Vietnam", "Hanoi"],
  ["Phnom Penh", 104.92, 11.56, "Cambodia", "Phnom Penh"],
  ["Vientiane", 102.63, 17.97, "Laos", "Vientiane"],
  ["Yangon", 96.2, 16.87, "Myanmar", "Yangon"],
  ["Manila", 120.98, 14.6, "Philippines", "Metro Manila"],
  ["Cebu", 123.89, 10.32, "Philippines", "Cebu"],
  ["Hong Kong", 114.17, 22.32, "Hong Kong", ""],
  ["Macau", 113.54, 22.2, "Macau", ""],
  ["Taipei", 121.56, 25.03, "Taiwan", "Taipei"],
  ["Tokyo", 139.69, 35.69, "Japan", "Tokyo"],
  ["Osaka", 135.5, 34.69, "Japan", "Osaka"],
  ["Kyoto", 135.77, 35.01, "Japan", "Kyoto"],
  ["Nagoya", 136.91, 35.18, "Japan", "Aichi"],
  ["Fukuoka", 130.4, 33.59, "Japan", "Fukuoka"],
  ["Sapporo", 141.35, 43.06, "Japan", "Hokkaido"],
  ["Seoul", 126.98, 37.57, "South Korea", "Seoul"],
  ["Busan", 129.08, 35.18, "South Korea", "Busan"],
  ["Beijing", 116.41, 39.9, "China", "Beijing"],
  ["Shanghai", 121.47, 31.23, "China", "Shanghai"],
  ["Shenzhen", 114.06, 22.54, "China", "Guangdong"],
  ["Guangzhou", 113.26, 23.13, "China", "Guangdong"],
  ["Hangzhou", 120.16, 30.27, "China", "Zhejiang"],
  ["Chengdu", 104.07, 30.57, "China", "Sichuan"],
  ["Mumbai", 72.88, 19.08, "India", "Maharashtra"],
  ["Delhi", 77.21, 28.61, "India", "Delhi"],
  ["Bengaluru", 77.59, 12.97, "India", "Karnataka"],
  ["Hyderabad", 78.49, 17.39, "India", "Telangana"],
  ["Chennai", 80.27, 13.08, "India", "Tamil Nadu"],
  ["Kolkata", 88.36, 22.57, "India", "West Bengal"],
  ["Pune", 73.86, 18.52, "India", "Maharashtra"],
  ["Colombo", 79.86, 6.93, "Sri Lanka", "Western Province"],
  ["Dhaka", 90.41, 23.81, "Bangladesh", "Dhaka"],
  ["Karachi", 67.0, 24.86, "Pakistan", "Sindh"],
  ["Lahore", 74.36, 31.55, "Pakistan", "Punjab"],
  ["Kathmandu", 85.32, 27.72, "Nepal", "Bagmati"],
  ["Dubai", 55.27, 25.2, "United Arab Emirates", "Dubai"],
  ["Abu Dhabi", 54.37, 24.45, "United Arab Emirates", "Abu Dhabi"],
  ["Doha", 51.53, 25.29, "Qatar", "Doha"],
  ["Riyadh", 46.72, 24.71, "Saudi Arabia", "Riyadh"],
  ["Tel Aviv", 34.78, 32.08, "Israel", "Tel Aviv"],
  ["Istanbul", 28.98, 41.01, "Turkey", "Istanbul"],
  ["Almaty", 76.89, 43.24, "Kazakhstan", "Almaty"],

  // Europe
  ["London", -0.13, 51.51, "United Kingdom", "England"],
  ["Manchester", -2.24, 53.48, "United Kingdom", "England"],
  ["Birmingham", -1.9, 52.48, "United Kingdom", "England"],
  ["Edinburgh", -3.19, 55.95, "United Kingdom", "Scotland"],
  ["Glasgow", -4.25, 55.86, "United Kingdom", "Scotland"],
  ["Cambridge", 0.12, 52.21, "United Kingdom", "England"],
  ["Oxford", -1.26, 51.75, "United Kingdom", "England"],
  ["Dublin", -6.26, 53.35, "Ireland", "Leinster"],
  ["Paris", 2.35, 48.86, "France", "Ile-de-France"],
  ["Lyon", 4.84, 45.76, "France", "Auvergne-Rhone-Alpes"],
  ["Amsterdam", 4.9, 52.37, "Netherlands", "North Holland"],
  ["Rotterdam", 4.48, 51.92, "Netherlands", "South Holland"],
  ["Eindhoven", 5.48, 51.44, "Netherlands", "North Brabant"],
  ["Brussels", 4.35, 50.85, "Belgium", "Brussels"],
  ["Berlin", 13.4, 52.52, "Germany", "Berlin"],
  ["Munich", 11.58, 48.14, "Germany", "Bavaria"],
  ["Hamburg", 9.99, 53.55, "Germany", "Hamburg"],
  ["Frankfurt", 8.68, 50.11, "Germany", "Hesse"],
  ["Cologne", 6.96, 50.94, "Germany", "North Rhine-Westphalia"],
  ["Zurich", 8.54, 47.38, "Switzerland", "Zurich"],
  ["Geneva", 6.14, 46.2, "Switzerland", "Geneva"],
  ["Vienna", 16.37, 48.21, "Austria", "Vienna"],
  ["Prague", 14.42, 50.09, "Czechia", "Prague"],
  ["Warsaw", 21.01, 52.23, "Poland", "Masovia"],
  ["Budapest", 19.04, 47.5, "Hungary", "Budapest"],
  ["Stockholm", 18.07, 59.33, "Sweden", "Stockholm"],
  ["Copenhagen", 12.57, 55.68, "Denmark", "Capital Region"],
  ["Oslo", 10.75, 59.91, "Norway", "Oslo"],
  ["Helsinki", 24.94, 60.17, "Finland", "Uusimaa"],
  ["Madrid", -3.7, 40.42, "Spain", "Madrid"],
  ["Barcelona", 2.17, 41.39, "Spain", "Catalonia"],
  ["Lisbon", -9.14, 38.72, "Portugal", "Lisbon"],
  ["Porto", -8.61, 41.15, "Portugal", "Porto"],
  ["Rome", 12.5, 41.9, "Italy", "Lazio"],
  ["Milan", 9.19, 45.46, "Italy", "Lombardy"],
  ["Florence", 11.26, 43.77, "Italy", "Tuscany"],
  ["Athens", 23.73, 37.98, "Greece", "Attica"],
  ["Moscow", 37.62, 55.76, "Russia", "Moscow"],
  ["Saint Petersburg", 30.34, 59.93, "Russia", "Saint Petersburg"],
  ["Kyiv", 30.52, 50.45, "Ukraine", "Kyiv"],

  // Americas
  ["New York", -74.01, 40.71, "United States of America", "New York"],
  ["San Francisco", -122.42, 37.77, "United States of America", "California"],
  ["San Jose", -121.89, 37.34, "United States of America", "California"],
  ["Los Angeles", -118.24, 34.05, "United States of America", "California"],
  ["San Diego", -117.16, 32.72, "United States of America", "California"],
  ["Seattle", -122.33, 47.61, "United States of America", "Washington"],
  ["Portland", -122.68, 45.52, "United States of America", "Oregon"],
  ["Boston", -71.06, 42.36, "United States of America", "Massachusetts"],
  ["Chicago", -87.63, 41.88, "United States of America", "Illinois"],
  ["Austin", -97.74, 30.27, "United States of America", "Texas"],
  ["Houston", -95.37, 29.76, "United States of America", "Texas"],
  ["Dallas", -96.8, 32.78, "United States of America", "Texas"],
  ["Denver", -104.99, 39.74, "United States of America", "Colorado"],
  ["Atlanta", -84.39, 33.75, "United States of America", "Georgia"],
  ["Miami", -80.19, 25.76, "United States of America", "Florida"],
  ["Washington", -77.04, 38.91, "United States of America", "District of Columbia"],
  ["Philadelphia", -75.17, 39.95, "United States of America", "Pennsylvania"],
  ["Phoenix", -112.07, 33.45, "United States of America", "Arizona"],
  ["Las Vegas", -115.14, 36.17, "United States of America", "Nevada"],
  ["Minneapolis", -93.27, 44.98, "United States of America", "Minnesota"],
  ["Detroit", -83.05, 42.33, "United States of America", "Michigan"],
  ["Pittsburgh", -80.0, 40.44, "United States of America", "Pennsylvania"],
  ["Nashville", -86.78, 36.16, "United States of America", "Tennessee"],
  ["Honolulu", -157.86, 21.31, "United States of America", "Hawaii"],
  ["Toronto", -79.38, 43.65, "Canada", "Ontario"],
  ["Vancouver", -123.12, 49.28, "Canada", "British Columbia"],
  ["Montreal", -73.57, 45.5, "Canada", "Quebec"],
  ["Ottawa", -75.7, 45.42, "Canada", "Ontario"],
  ["Calgary", -114.07, 51.05, "Canada", "Alberta"],
  ["Edmonton", -113.49, 53.55, "Canada", "Alberta"],
  ["Mexico City", -99.13, 19.43, "Mexico", "Mexico City"],
  ["Sao Paulo", -46.63, -23.55, "Brazil", "Sao Paulo"],
  ["Rio de Janeiro", -43.17, -22.91, "Brazil", "Rio de Janeiro"],
  ["Buenos Aires", -58.38, -34.6, "Argentina", "Buenos Aires"],
  ["Santiago", -70.65, -33.45, "Chile", "Santiago Metropolitan"],
  ["Lima", -77.04, -12.05, "Peru", "Lima"],
  ["Bogota", -74.07, 4.71, "Colombia", "Bogota"],

  // Africa & Middle East
  ["Cairo", 31.24, 30.04, "Egypt", "Cairo"],
  ["Nairobi", 36.82, -1.29, "Kenya", "Nairobi"],
  ["Lagos", 3.38, 6.52, "Nigeria", "Lagos"],
  ["Accra", -0.19, 5.6, "Ghana", "Greater Accra"],
  ["Johannesburg", 28.05, -26.2, "South Africa", "Gauteng"],
  ["Cape Town", 18.42, -33.92, "South Africa", "Western Cape"],
  ["Casablanca", -7.59, 33.57, "Morocco", "Casablanca-Settat"],
  ["Addis Ababa", 38.76, 9.03, "Ethiopia", "Addis Ababa"],
];

// Nicknames, neighbouring suburbs and older names that won't match directly.
const CITY_ALIASES: Record<string, string> = {
  nyc: "New York",
  "new york city": "New York",
  manhattan: "New York",
  brooklyn: "New York",
  sf: "San Francisco",
  "bay area": "San Francisco",
  "san francisco bay area": "San Francisco",
  "silicon valley": "San Jose",
  "palo alto": "San Jose",
  "mountain view": "San Jose",
  sunnyvale: "San Jose",
  la: "Los Angeles",
  dc: "Washington",
  "washington dc": "Washington",
  kl: "Kuala Lumpur",
  hcmc: "Ho Chi Minh City",
  saigon: "Ho Chi Minh City",
  bali: "Denpasar",
  jogja: "Yogyakarta",
  yogya: "Yogyakarta",
  jogjakarta: "Yogyakarta",
  solo: "Surakarta",
  bombay: "Mumbai",
  "new delhi": "Delhi",
  bangalore: "Bengaluru",
  calcutta: "Kolkata",
  madras: "Chennai",
  peking: "Beijing",
  canton: "Guangzhou",
  munchen: "Munich",
  koln: "Cologne",
  wien: "Vienna",
  praha: "Prague",
  lisboa: "Lisbon",
  roma: "Rome",
  milano: "Milan",
  firenze: "Florence",
  kiev: "Kyiv",
  "st petersburg": "Saint Petersburg",
  melbs: "Melbourne",
};

// Names people actually type that aren't the basemap's own spelling.
const COUNTRY_ALIASES: Record<string, string> = {
  usa: "United States of America",
  us: "United States of America",
  // "U.S.A." loses its dots to normalize() and arrives as three words.
  "u s a": "United States of America",
  america: "United States of America",
  "united states": "United States of America",
  uk: "United Kingdom",
  "u k": "United Kingdom",
  britain: "United Kingdom",
  "great britain": "United Kingdom",
  england: "United Kingdom",
  scotland: "United Kingdom",
  wales: "United Kingdom",
  "northern ireland": "United Kingdom",
  korea: "South Korea",
  "republic of korea": "South Korea",
  uae: "United Arab Emirates",
  emirates: "United Arab Emirates",
  holland: "Netherlands",
  nederland: "Netherlands",
  deutschland: "Germany",
  "czech republic": "Czechia",
  aotearoa: "New Zealand",
  "hong kong sar": "Hong Kong",
  "ivory coast": "Cote d Ivoire",
  burma: "Myanmar",
  "east timor": "Timor-Leste",
  swaziland: "eSwatini",
  bosnia: "Bosnia and Herz.",
  "bosnia and herzegovina": "Bosnia and Herz.",
  "democratic republic of the congo": "Dem. Rep. Congo",
  drc: "Dem. Rep. Congo",
  "south sudan": "S. Sudan",
  "dominican republic": "Dominican Rep.",
  "central african republic": "Central African Rep.",
  "equatorial guinea": "Eq. Guinea",
  "north macedonia": "Macedonia",
  turkiye: "Turkey",
  ksa: "Saudi Arabia",
  aussie: "Australia",
  oz: "Australia",
};

// The basemap uses Natural Earth's country names, which are terse by design.
const COUNTRY_DISPLAY: Record<string, string> = {
  "United States of America": "United States",
  "Bosnia and Herz.": "Bosnia & Herzegovina",
  "Dem. Rep. Congo": "DR Congo",
  "Central African Rep.": "Central African Republic",
  "Dominican Rep.": "Dominican Republic",
  "Eq. Guinea": "Equatorial Guinea",
  "S. Sudan": "South Sudan",
  "Solomon Is.": "Solomon Islands",
  "Falkland Is.": "Falkland Islands",
  "N. Cyprus": "Northern Cyprus",
  "W. Sahara": "Western Sahara",
};

// Countries too small to be drawn at this resolution, but that people live in
// and so still need a pin.
const EXTRA_COUNTRIES: [string, number, number][] = [
  ["Singapore", 103.82, 1.35],
  ["Hong Kong", 114.17, 22.32],
  ["Macau", 113.54, 22.2],
  ["Bahrain", 50.55, 26.07],
  ["Malta", 14.42, 35.9],
  ["Mauritius", 57.55, -20.35],
  ["Monaco", 7.42, 43.74],
  ["Maldives", 73.51, 4.18],
];

/**
 * The basemap stores Natural Earth's terse names; this is what a person should
 * see. Shared with the map so its country labels read the same as its pins.
 */
export function countryDisplayName(basemapName: string): string {
  return COUNTRY_DISPLAY[basemapName] ?? basemapName;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    // "the US", "the Netherlands", "The Gambia" — the article is never part of
    // the name being matched against.
    .replace(/^the /, "");
}

type CountryPoint = { name: string; id: string | null; lon: number; lat: number };
type CityPoint = { name: string; lon: number; lat: number; countryId: string | null; state: string; country: string };
type StatePoint = { name: string; lon: number; lat: number; countryId: string | null; cities: string[] };

// Every name is also indexed with its spaces removed, so "Hongkong", "NewYork"
// and "SaoPaulo" find their entries without needing an alias each.
function index<T>(map: Map<string, T>, key: string, value: T) {
  map.set(key, value);
  const squashed = key.replace(/ /g, "");
  if (!map.has(squashed)) map.set(squashed, value);
}

const basemapByName = new Map<string, MapCountry>();
for (const country of MAP_COUNTRIES) {
  basemapByName.set(normalize(country.name), country);
}

const countryIndex = new Map<string, CountryPoint>();
for (const country of MAP_COUNTRIES) {
  index(countryIndex, normalize(country.name), {
    name: COUNTRY_DISPLAY[country.name] ?? country.name,
    id: country.id,
    lon: country.lon,
    lat: country.lat,
  });
}
for (const [name, lon, lat] of EXTRA_COUNTRIES) {
  if (!countryIndex.has(normalize(name))) {
    index(countryIndex, normalize(name), { name, id: null, lon, lat });
  }
}
for (const [alias, target] of Object.entries(COUNTRY_ALIASES)) {
  const resolved = countryIndex.get(normalize(target));
  if (resolved) index(countryIndex, normalize(alias), resolved);
}

const cityIndex = new Map<string, CityPoint>();
for (const [name, lon, lat, country, state] of CITIES) {
  index(cityIndex, normalize(name), {
    name,
    lon,
    lat,
    countryId: basemapByName.get(normalize(country))?.id ?? null,
    state,
    country,
  });
}

// States are derived from the cities rather than typed out again: a state's pin
// is the middle of the cities known to be in it, which is as precise as this
// data can honestly be.
const stateIndex = new Map<string, StatePoint>();
for (const [name, lon, lat, country, state] of CITIES) {
  if (!state) continue;
  const key = normalize(state);
  const existing = stateIndex.get(key);
  if (existing) {
    // Running mean, so the anchor sits among the state's cities.
    const n = existing.cities.length;
    existing.lon = (existing.lon * n + lon) / (n + 1);
    existing.lat = (existing.lat * n + lat) / (n + 1);
    existing.cities.push(name);
  } else {
    stateIndex.set(key, {
      name: state,
      lon,
      lat,
      countryId: basemapByName.get(normalize(country))?.id ?? null,
      cities: [name],
    });
  }
}
for (const [alias, target] of Object.entries(CITY_ALIASES)) {
  const resolved = cityIndex.get(normalize(target));
  if (resolved) index(cityIndex, normalize(alias), resolved);
}

/**
 * Resolves a free-text location — "Melbourne", "Jakarta, Indonesia", "UK" — to
 * a point on the map, or null if the name isn't known here yet.
 */
export function resolvePlace(input: string): ResolvedPlace | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // "Melbourne, Australia" should pin Melbourne rather than the middle of the
  // country, so every candidate is tried against cities before countries.
  const candidates = [trimmed, ...trimmed.split(/[,/|]/)].map(normalize).filter(Boolean);

  for (const candidate of candidates) {
    const city = cityIndex.get(candidate);
    if (city) {
      return {
        label: city.name,
        key: `city:${normalize(city.name)}`,
        lon: city.lon,
        lat: city.lat,
        countryId: city.countryId,
        kind: "city",
      };
    }
  }

  // Countries outrank states so that "Georgia" means the country, which is far
  // likelier to be where someone lives than the US state of the same name.
  for (const candidate of candidates) {
    const country = countryIndex.get(candidate);
    if (country) {
      return {
        label: country.name,
        key: `country:${normalize(country.name)}`,
        lon: country.lon,
        lat: country.lat,
        countryId: country.id,
        kind: "country",
      };
    }
  }

  for (const candidate of candidates) {
    const state = stateIndex.get(candidate);
    if (state) {
      return {
        label: state.name,
        key: `state:${normalize(state.name)}`,
        lon: state.lon,
        lat: state.lat,
        countryId: state.countryId,
        kind: "state",
      };
    }
  }

  return null;
}

/** The city record behind a typed location, for filling in its state. */
export function lookupCity(input: string): CityRecord | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  for (const candidate of [trimmed, ...trimmed.split(/[,/|]/)].map(normalize).filter(Boolean)) {
    const city = cityIndex.get(candidate);
    if (city) return { name: city.name, state: city.state, country: city.country };
  }
  return null;
}

/** Cities known to be in a state, for narrowing the location suggestions. */
export function citiesInState(state: string): string[] {
  return stateIndex.get(normalize(state))?.cities.slice().sort((a, b) => a.localeCompare(b)) ?? [];
}

/** True when a state name is one this app can place on the map. */
export function isKnownState(state: string): boolean {
  return stateIndex.has(normalize(state));
}

/**
 * Every place name the map knows how to pin, for the location dropdowns.
 * Picking from this list guarantees the person shows up on the map; typing
 * something else still saves fine, it just lands in "Not on the map" until the
 * spelling is added above.
 */
export const PLACE_SUGGESTIONS: string[] = [
  ...new Set([
    ...CITIES.map(([name]) => name),
    ...MAP_COUNTRIES.map((country) => COUNTRY_DISPLAY[country.name] ?? country.name),
    ...EXTRA_COUNTRIES.map(([name]) => name),
  ]),
].sort((a, b) => a.localeCompare(b));

/** Every state/province the city table knows about. */
export const STATE_SUGGESTIONS: string[] = [...new Set(CITIES.map(([, , , , state]) => state).filter(Boolean))].sort(
  (a, b) => a.localeCompare(b)
);
