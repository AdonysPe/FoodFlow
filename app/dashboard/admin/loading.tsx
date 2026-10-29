import LoadingSplash from "@/components/LoadingSplash";

// Inside the panel the splash takes the content area only: the sidebar and the
// strip above stay where they are while the next screen loads.
export default function Loading() {
  return <LoadingSplash contained />;
}
