import { prisma } from "@/lib/db/prisma";
import PageHeader from "@/components/dashboard/PageHeader";
import AuditLogView, { type AuditEvent, type AuditKind } from "@/components/dashboard/admin/AuditLogView";

export const metadata = {
  title: "Auditoría",
};

// Read-only. Gated by AdminLayout (getCurrentUser().role === "platform_admin"); the
// AuditLog rows carry no tenant relation, so no restaurant user can reach them.
const PAGE_SIZE = 200;

// The log keeps English action keys; the operator reads them in Spanish.
const ACTIONS: Record<string, { label: string; kind: AuditKind }> = {
  "auth.login": { label: "Inicio de sesión", kind: "acceso" },
  "auth.logout": { label: "Cierre de sesión", kind: "acceso" },
  "auth.register": { label: "Cuenta creada", kind: "acceso" },
  "auth.password_reset": { label: "Contraseña restablecida", kind: "acceso" },
  "menu.item.price_change": { label: "Precio cambiado", kind: "precio" },
  "menu.item.delete": { label: "Plato eliminado", kind: "riesgo" },
  "staff.add": { label: "Mozo agregado", kind: "equipo" },
  "staff.remove": { label: "Mozo quitado", kind: "equipo" },
  "lead.status_change": { label: "Contacto cambió de estado", kind: "ventas" },
  "restaurant.delete": { label: "Restaurante eliminado", kind: "riesgo" },
  "restaurant.rename": { label: "Local renombrado", kind: "local" },
  "restaurant.category_template.update": { label: "Categoría o plantilla cambiada", kind: "local" },
  "billing.config.save": { label: "Facturación configurada", kind: "factura" },
  "billing.emit": { label: "Comprobante emitido", kind: "factura" },
  "billing.cdr.email": { label: "Constancia enviada por correo", kind: "factura" },
};

function summarize(before: unknown, after: unknown): string {
  const b = (before ?? {}) as Record<string, unknown>;
  const a = (after ?? {}) as Record<string, unknown>;
  if ("price" in b || "price" in a) {
    const name = (a.name ?? b.name ?? "") as string;
    return `${name}: ${b.price ?? "—"} → ${a.price ?? "—"}`;
  }
  if ("status" in b || "status" in a) return `${b.status ?? "—"} → ${a.status ?? "—"}`;
  if ("email" in a) return String(a.email);
  if ("email" in b) return String(b.email);
  if ("name" in b && "name" in a) return `${b.name} → ${a.name}`;
  if ("name" in b) return String(b.name);
  if ("role" in a) return `rol: ${a.role}`;
  return "—";
}

export default async function AuditLogPage() {
  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
  });

  const events: AuditEvent[] = entries.map((e) => {
    const meta = ACTIONS[e.action];
    return {
      id: e.id,
      at: e.createdAt.toISOString(),
      action: meta?.label ?? e.action,
      kind: meta?.kind ?? "acceso",
      actor: e.actorEmail ?? "—",
      detail: summarize(e.before, e.after),
    };
  });

  return (
    <div className="lbd-pg">
      <PageHeader eyebrow="SEGURIDAD · AUDITORÍA" title="Auditoría" description={`Quién hizo qué y cuándo. Solo se agrega, nunca se borra. La IP se guarda cifrada, nunca la dirección. Últimos ${PAGE_SIZE} eventos.`} />
      <AuditLogView events={events} />
    </div>
  );
}
