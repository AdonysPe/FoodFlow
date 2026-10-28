// Google Places API (New) — Text Search, server side only.
//
// The key is `GOOGLE_PLACES_API_KEY`, a server-only key distinct from
// `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (that one ships to the browser). Restrict
// it to "Places API (New)" alone and set a daily quota cap in the console;
// Vercel has no fixed outbound IPs, so the API restriction and the cap are
// what protect it.
//
// Cost is per request (up to 20 places each), billed by the richest field in
// the mask. Phone, website, rating and review count are "Enterprise" fields
// and delivery/dine-in are "Atmosphere", so every call here is billed at that
// tier. Ask for nothing more than the mask below.
//
// Server only.

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.rating",
  "places.userRatingCount",
  "places.primaryTypeDisplayName",
  "places.businessStatus",
  "places.delivery",
  "places.dineIn",
  "nextPageToken",
].join(",");

export type Place = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  mapsUrl: string | null;
  category: string | null;
  rating: number | null;
  reviewCount: number | null;
  open: boolean;
  delivery: boolean | null;
  dineIn: boolean | null;
  // Set when the source itself says the venue belongs to a brand (OSM's
  // `brand` tag). Otherwise the name list in score.ts decides.
  chain?: boolean;
};

type RawPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  primaryTypeDisplayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  delivery?: boolean;
  dineIn?: boolean;
};

export class PlacesError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export function placesKey(): string | null {
  return process.env.GOOGLE_PLACES_API_KEY?.trim() || null;
}

function toPlace(raw: RawPlace): Place | null {
  const name = raw.displayName?.text?.trim();
  if (!raw.id || !name) return null;
  return {
    id: raw.id,
    name,
    address: raw.formattedAddress ?? null,
    phone: raw.nationalPhoneNumber ?? null,
    website: raw.websiteUri ?? null,
    mapsUrl: raw.googleMapsUri ?? null,
    category: raw.primaryTypeDisplayName?.text ?? null,
    rating: typeof raw.rating === "number" ? raw.rating : null,
    reviewCount: typeof raw.userRatingCount === "number" ? raw.userRatingCount : null,
    // Missing means Google did not say; only an explicit closure drops it.
    open: !raw.businessStatus || raw.businessStatus === "OPERATIONAL",
    delivery: typeof raw.delivery === "boolean" ? raw.delivery : null,
    dineIn: typeof raw.dineIn === "boolean" ? raw.dineIn : null,
  };
}

/**
 * One Text Search, following `nextPageToken` up to `maxPages` (Google stops
 * at 3 pages, 60 places). Each page is one billed request, so `requests` is
 * what this call cost.
 */
export async function searchPlaces(textQuery: string, maxPages: number): Promise<{ places: Place[]; requests: number }> {
  const key = placesKey();
  if (!key) throw new PlacesError("Falta GOOGLE_PLACES_API_KEY.", 0);

  const places: Place[] = [];
  let pageToken: string | undefined;
  let requests = 0;

  do {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": key,
        "x-goog-fieldmask": FIELD_MASK,
      },
      body: JSON.stringify({ textQuery, languageCode: "es", regionCode: "PE", pageSize: 20, ...(pageToken ? { pageToken } : {}) }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    requests += 1;

    if (!response.ok) {
      // Google's error body names the cause ("API key not valid", "Places API
      // (New) has not been used in project…"); it never echoes the key.
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new PlacesError(body?.error?.message ?? `Google respondió ${response.status}.`, response.status);
    }

    const data = (await response.json()) as { places?: RawPlace[]; nextPageToken?: string };
    for (const raw of data.places ?? []) {
      const place = toPlace(raw);
      if (place) places.push(place);
    }
    pageToken = data.nextPageToken;
  } while (pageToken && requests < maxPages);

  return { places, requests };
}
