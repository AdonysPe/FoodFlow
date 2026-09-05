import { readCarta, readCartaVersion } from "@/lib/db/carta";
import type { CartaPayload } from "@/lib/carta";

/**
 * One database watcher per venue, shared by every diner streaming that venue.
 *
 * The naive version gives each open connection its own polling loop, so twenty
 * people reading the menu at once means twenty queries every tick. Here the
 * first subscriber starts a single loop and the last one to leave stops it: a
 * full dining room costs the same one query every two seconds as a single
 * diner does.
 *
 * The tick reads only `Restaurant.cartaVersion` — a lookup on a unique index —
 * and pays for the full menu payload solely when that number moved.
 *
 * State lives at module scope, which on serverless means per warm instance.
 * That is correct rather than merely convenient: an instance only ever has to
 * serve the connections it is itself holding open, and an instance with none
 * holds no timer at all.
 */

const TICK_MS = 2000;

type Listener = (event: WatchEvent) => void;

export type WatchEvent =
  | { type: "update"; payload: CartaPayload }
  | { type: "gone" };

type Room = {
  version: number | null;
  listeners: Set<Listener>;
  timer: ReturnType<typeof setInterval> | null;
  /** Guards against a slow query overlapping the next tick. */
  busy: boolean;
};

const rooms = new Map<string, Room>();

async function tick(slug: string) {
  const room = rooms.get(slug);
  if (!room || room.busy) return;
  room.busy = true;

  try {
    const version = await readCartaVersion(slug);

    if (version == null) {
      // Unpublished or deleted while people were reading it.
      for (const listener of room.listeners) listener({ type: "gone" });
      stop(slug);
      return;
    }

    // First tick after the room opened: adopt the version without paying for a
    // payload nobody asked for. Subscribers that arrived with an older version
    // already got a snapshot when they connected.
    if (room.version == null) {
      room.version = version;
      return;
    }

    if (version === room.version) return;

    const payload = await readCarta(slug);
    if (!payload) {
      for (const listener of room.listeners) listener({ type: "gone" });
      stop(slug);
      return;
    }

    room.version = payload.version;
    for (const listener of room.listeners) listener({ type: "update", payload });
  } catch (err) {
    // A dropped connection to Neon must not kill the loop; the next tick
    // retries and the diner sees a stale price for two seconds.
    console.error(`carta watcher (${slug}):`, err);
  } finally {
    room.busy = false;
  }
}

function stop(slug: string) {
  const room = rooms.get(slug);
  if (!room) return;
  if (room.timer) clearInterval(room.timer);
  rooms.delete(slug);
}

/**
 * Starts listening for changes to one venue's carta.
 *
 * `knownVersion` is what the caller already has on screen; the room starts
 * from it so a change that landed between the page render and this call is
 * still delivered rather than silently adopted.
 *
 * Returns the unsubscribe function. Callers must invoke it — the loop stops
 * only when the last listener leaves.
 */
export function watchCarta(
  slug: string,
  knownVersion: number,
  listener: Listener
): () => void {
  let room = rooms.get(slug);

  if (!room) {
    room = { version: knownVersion, listeners: new Set(), timer: null, busy: false };
    rooms.set(slug, room);
    room.timer = setInterval(() => void tick(slug), TICK_MS);
    // Node keeps the process alive for pending timers; this one must never be
    // the reason a serverless instance refuses to wind down.
    room.timer.unref?.();
  } else if (room.version != null && knownVersion < room.version) {
    // This listener is behind what the room already knows. Rewinding makes the
    // next tick notice the gap and send everyone the current menu, which costs
    // one payload and is simpler than a per-listener catch-up path.
    room.version = knownVersion;
  }

  room.listeners.add(listener);

  return () => {
    const current = rooms.get(slug);
    if (!current) return;
    current.listeners.delete(listener);
    if (current.listeners.size === 0) stop(slug);
  };
}

/** Test/diagnostic view of what this instance is currently watching. */
export function watcherStats() {
  return [...rooms.entries()].map(([slug, room]) => ({
    slug,
    version: room.version,
    listeners: room.listeners.size,
  }));
}
