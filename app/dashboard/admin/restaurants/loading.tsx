import LoadingSplash from "@/components/LoadingSplash";

/**
 * Shown while the restaurant list is being fetched on the server — including
 * every filter change, because the filters navigate rather than fetch.
 */
export default function Loading() {
  return <LoadingSplash contained />;
}
