import SiteShell from "@/components/SiteShell";
import Container from "@/components/ui/Container";
import ClaimsBookForm from "@/components/legal/ClaimsBookForm";
import { CLAIM_RESPONSE_DAYS, LEGAL_HOLDER } from "@/lib/legal/holder";

export const metadata = {
  title: "Libro de Reclamaciones",
  description:
    "Libro de Reclamaciones Virtual de FoodFlow. Registra tu reclamo o queja y recibe un número de constancia; respondemos en un máximo de 30 días hábiles.",
  alternates: { canonical: "/libro-de-reclamaciones" },
};

export default function ClaimsBookPage() {
  return (
    <SiteShell>
      <section className="relative overflow-x-clip pt-32 pb-24 sm:pt-40 sm:pb-28">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[24rem] w-[44rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,90,51,0.09),transparent_65%)] blur-3xl"
        />

        <Container className="max-w-3xl">
          <span className="inline-flex items-center rounded-full border border-cream/10 bg-cream/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-ink">
            Libro de Reclamaciones Virtual
          </span>

          <h1 className="mt-5 font-display text-4xl font-extrabold tracking-[-0.035em] text-gradient sm:text-5xl">
            ¿Algo salió mal?
          </h1>

          <p className="mt-5 text-[16px] leading-relaxed text-cream/70">
            Conforme al Código de Protección y Defensa del Consumidor (Ley 29571), ponemos a tu
            disposición este Libro de Reclamaciones. Registra aquí tu reclamo o queja y recibirás
            un número de constancia al instante.
          </p>

          {/* The identification of the supplier is part of the record, not a
              footnote: a complaint has to say who it is against. */}
          <dl className="mt-8 grid gap-4 rounded-2xl border border-cream/10 bg-cream/[0.03] p-5 text-[13.5px] sm:grid-cols-2 sm:p-6">
            <div>
              <dt className="text-cream/40">Proveedor</dt>
              <dd className="mt-0.5 font-medium text-cream/85">
                {LEGAL_HOLDER.name} — {LEGAL_HOLDER.role}
              </dd>
            </div>
            <div>
              <dt className="text-cream/40">Domicilio</dt>
              <dd className="mt-0.5 font-medium text-cream/85">{LEGAL_HOLDER.location}</dd>
            </div>
            <div>
              <dt className="text-cream/40">Servicio</dt>
              <dd className="mt-0.5 font-medium text-cream/85">
                {LEGAL_HOLDER.brand} — software para restaurantes ({LEGAL_HOLDER.domain})
              </dd>
            </div>
            <div>
              <dt className="text-cream/40">Correo de contacto</dt>
              <dd className="mt-0.5 font-medium text-cream/85">
                <a
                  href={`mailto:${LEGAL_HOLDER.email}`}
                  className="text-accent-ink underline-offset-4 hover:underline"
                >
                  {LEGAL_HOLDER.email}
                </a>
              </dd>
            </div>
          </dl>

          <p className="mt-6 rounded-xl border border-accent-400/25 bg-accent-400/[0.06] px-4 py-3.5 text-[13.5px] leading-relaxed text-cream/75">
            Nos comprometemos a responder tu reclamo o queja en un plazo máximo de{" "}
            <span className="font-semibold text-fg">
              {CLAIM_RESPONSE_DAYS} días hábiles
            </span>{" "}
            desde su registro. La respuesta llegará al correo que indiques.
          </p>

          <div className="mt-10 rounded-3xl border border-cream/10 bg-ink-800/50 p-5 shadow-card sm:p-7">
            <ClaimsBookForm />
          </div>

          <p className="mt-6 text-[12.5px] leading-relaxed text-cream/45">
            El registro de tu reclamo no impide que acudas a otras vías de solución de
            controversias ni constituye requisito previo para denunciar ante INDECOPI.
          </p>
        </Container>
      </section>
    </SiteShell>
  );
}
