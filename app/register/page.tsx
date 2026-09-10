import AuthPageShell from "@/components/auth/AuthPageShell";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Crear cuenta",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return <AuthPageShell><RegisterForm /></AuthPageShell>;
}
