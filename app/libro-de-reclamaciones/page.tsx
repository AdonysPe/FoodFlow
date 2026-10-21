import SiteShell from "@/components/SiteShell";
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
      <div className="lb-legal lb-cl">
        <div aria-hidden className="lb-legal-glow lb-cl-glow" />

        <section className="lb-legal-hero">
          <div className="lb-wrap">
            <p className="lb-eyebrow-accent lb-rise">Libro de Reclamaciones Virtual</p>
            <h1 className="lb-pr-h1">
              <span className="lb-word" style={{ animationDelay: ".05s" }}>¿Algo</span>{" "}
              <span className="lb-word" style={{ animationDelay: ".14s" }}>salió</span>{" "}
              <span className="lb-word" style={{ animationDelay: ".23s", color: "var(--lb-mute)" }}>mal?</span>
            </h1>
            <p className="lb-cl-lead lb-rise" style={{ animationDelay: ".3s" }}>
              Conforme al Código de Protección y Defensa del Consumidor (Ley 29571), ponemos a tu
              disposición este Libro de Reclamaciones. Registra aquí tu reclamo o queja y recibirás un
              número de constancia al instante.
            </p>
          </div>
        </section>

        <section className="lb-cl-body">
          <div className="lb-wrap lb-cl-cols">
            {/* The identification of the supplier is part of the record, not a
                footnote: a complaint has to say who it is against. */}
            <aside className="lb-cl-aside lb-rise" style={{ animationDelay: ".4s" }} aria-label="Datos del proveedor">
              <div className="lb-cl-card">
                <span className="lb-cl-kicker">El reclamo va dirigido a</span>
                <dl className="lb-cl-dl">
                  <div>
                    <dt>Proveedor</dt>
                    <dd>
                      {LEGAL_HOLDER.legalName}
                      {LEGAL_HOLDER.taxId ? ` — RUC ${LEGAL_HOLDER.taxId}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Dirección fiscal</dt>
                    <dd>{LEGAL_HOLDER.taxAddress}</dd>
                  </div>
                  <div>
                    <dt>Servicio</dt>
                    <dd>
                      {LEGAL_HOLDER.brand} — software para restaurantes ({LEGAL_HOLDER.domain})
                    </dd>
                  </div>
                  <div>
                    <dt>Correo de contacto</dt>
                    <dd>
                      <a href={`mailto:${LEGAL_HOLDER.legalEmail}`}>{LEGAL_HOLDER.legalEmail}</a>
                    </dd>
                  </div>
                  <div>
                    <dt>Teléfono</dt>
                    <dd>
                      <a href={`tel:${LEGAL_HOLDER.phone.replace(/\s/g, "")}`}>{LEGAL_HOLDER.phone}</a>
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="lb-cl-days">
                <strong className="lb-display">{CLAIM_RESPONSE_DAYS}</strong>
                <span>
                  días hábiles como máximo para responderte, desde el registro. La respuesta llega al
                  correo que indiques.
                </span>
              </div>

              <p className="lb-cl-fine">
                El registro de tu reclamo no impide que acudas a otras vías de solución de
                controversias ni constituye requisito previo para denunciar ante INDECOPI.
              </p>
            </aside>

            <div className="lb-cl-main lb-rise" style={{ animationDelay: ".5s" }}>
              <ClaimsBookForm />
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
