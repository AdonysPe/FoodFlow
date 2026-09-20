import { NextResponse } from "next/server";
import { readOrderingWebsite } from "@/lib/db/orderingWebsite";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const state = await readOrderingWebsite(slug);
  return NextResponse.json(state ?? { error: "No disponible" }, { status: state ? 200 : 404, headers: { "Cache-Control": "no-store" } });
}
