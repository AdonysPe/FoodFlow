import { redirect } from "next/navigation";

/**
 * The URL the brief names. The real screen lives under /dashboard/app so it
 * gets the client dashboard shell (sidebar, topbar, toasts); this keeps the
 * shorter address working for anyone who typed it or bookmarked it.
 */
export default function ConfiguracionFacturacionRedirect() {
  redirect("/dashboard/app/configuracion/facturacion");
}
