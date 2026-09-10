import { Suspense } from "react";
import AuthPageShell from "@/components/auth/AuthPageShell";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "Recuperar contraseña",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <AuthPageShell><Suspense fallback={null}><ForgotPasswordForm /></Suspense></AuthPageShell>;
}
