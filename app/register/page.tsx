import { Suspense } from "react";
import AuthPageShell from "@/components/auth/AuthPageShell";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Crear cuenta",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  // RegisterForm reads ?plan= with useSearchParams, which needs a Suspense
  // boundary or the static prerender of this page fails the build.
  return <AuthPageShell><Suspense fallback={null}><RegisterForm /></Suspense></AuthPageShell>;
}
