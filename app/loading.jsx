import LoadingSplash from "@/components/LoadingSplash";

// Every route that waits on the server before it can draw shows the splash
// until the page is ready; the panel's own boundaries keep the sidebar.
export default function Loading() {
  return <LoadingSplash />;
}
