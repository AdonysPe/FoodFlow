import { Suspense } from "react";
import AuthPageShell from "@/components/auth/AuthPageShell";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata = {
  title: "Restablecer contraseña",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return <AuthPageShell><Suspense fallback={null}><ResetPasswordForm /></Suspense></AuthPageShell>;
}
