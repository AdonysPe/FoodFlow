import { readCarta } from "@/lib/db/carta";
import { watchCarta } from "@/lib/carta/watcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel cuts a function off at its limit; EventSource reconnects on its own,
// so a long ceiling just means fewer reconnects rather than a broken stream.
export const maxDuration = 300;

const HEARTBEAT_MS = 20_000;

const encoder = new TextEncoder();
const frame = (event, data) =>
  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

/**
 * Live updates for one venue's carta, over Server-Sent Events.
 *
 * SSE rather than WebSockets on purpose: the traffic here is one-directional
 * (the kitchen tells the room, the room never answers), EventSource reconnects
 * by itself, and it needs no server process of its own — a Socket.io server
 * cannot live on serverless, and a hosted socket service would be a monthly
 * bill for a feature that is one number changing.
 *
 * The client sends the version it already has as `?v=`. If the menu moved
 * between the server render and this connection, the diner gets the current
 * menu immediately instead of waiting for the next edit.
 */
export async function GET(request, { params }) {
  const { slug } = await params;
  const known = Number(new URL(request.url).searchParams.get("v"));
  const knownVersion = Number.isFinite(known) ? known : 0;

  const current = await readCarta(slug);
  if (!current) {
    return new Response("No encontrado", { status: 404 });
  }

  let unsubscribe = () => {};
  let heartbeat = null;

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const send = (event, data) => {
        if (closed) return;
        try {
          controller.enqueue(frame(event, data));
        } catch {
          cleanup();
        }
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        unsubscribe();
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed by the client going away */
        }
      };

      // Tell the browser how long to wait before reconnecting, then hand over
      // the menu it is missing (or just confirm the one it has).
      controller.enqueue(encoder.encode("retry: 3000\n\n"));
      if (current.version !== knownVersion) {
        send("carta", current);
      } else {
        send("ready", { version: current.version });
      }

      unsubscribe = watchCarta(slug, knownVersion, (event) => {
        if (event.type === "gone") {
          send("gone", { slug });
          cleanup();
          return;
        }
        send("carta", event.payload);
      });

      // Proxies drop a connection that says nothing. A comment line is not an
      // event, so the client never sees these.
      heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          cleanup();
        }
      }, HEARTBEAT_MS);
      heartbeat.unref?.();

      request.signal.addEventListener("abort", cleanup);
    },

    cancel() {
      unsubscribe();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Nginx and friends buffer by default, which would hold every event back
      // until the buffer filled.
      "X-Accel-Buffering": "no",
    },
  });
}
