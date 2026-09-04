import { redirect } from "next/navigation";

/**
 * The ticket settings used to live here, next to Pedidos. They are now one
 * section of Configuración › Facturación, so the venue configures what it
 * prints and what it sends to SUNAT in the same place instead of two screens
 * both asking for its RUC.
 */
export default function ReceiptSettingsRedirect() {
  redirect("/dashboard/app/configuracion/facturacion");
}
