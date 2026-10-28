import { notFound } from "next/navigation";
import { readOrderingWebsite } from "@/lib/db/orderingWebsite";
import OnlineOrderExperience from "@/components/public/OnlineOrderExperience";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const state = await readOrderingWebsite(slug);
  return { title: state ? `Pide en ${state.restaurantName}` : "Web de pedidos", description: state?.venue.tagline ?? "Delivery y recojo en local", robots: { index: false, follow: false } };
}
export default async function OrderingPage({ params }) {
  const { slug } = await params;
  const state = await readOrderingWebsite(slug);
  if (!state) notFound();
  return <main id="main"><OnlineOrderExperience key={slug} slug={slug} initial={state} /></main>;
}
