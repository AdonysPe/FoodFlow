import ErrorScreen from "@/components/ErrorScreen";

export const metadata = {
  title: "Página no encontrada",
};

const LINES = [
  { text: "1 × página pedida" },
  { text: "mesa: ¿?", tone: "struck" },
  { text: "no está en la carta", tone: "accent" },
];

export default function NotFound() {
  return (
    <ErrorScreen
      code="404"
      lead="Esta página"
      last="no existe"
      copy="Puede que el enlace esté mal escrito o que la hayamos movido. Volvamos a lo importante: tu restaurante funcionando en 48 horas."
      lines={LINES}
      foot="Sin mesa"
    >
      <a href="/" className="lb-er-btn lb-er-btn--solid">
        Ir al inicio
      </a>
      <a href="/#cta" className="lb-er-btn">
        Ver el piloto
      </a>
    </ErrorScreen>
  );
}
