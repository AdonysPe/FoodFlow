import { redirect } from "next/navigation";

export default function ClientAppIndexPage() {
  redirect("/dashboard/app/overview");
}
