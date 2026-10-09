import { notFound } from "next/navigation";
import { readOnlineOrder } from "@/lib/db/orderingWebsite";
import OrderTracking from "@/components/public/OrderTracking";

export const dynamic = "force-dynamic";
export const metadata = { title: "Estado de tu pedido", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function TrackingPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  const order = await readOnlineOrder(token, slug);
  if (!order) notFound();
  return <OrderTracking slug={slug} order={order} />;
}
