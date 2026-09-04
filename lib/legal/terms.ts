import { LEGAL_HOLDER, LEGAL_UPDATED } from "@/lib/legal/holder";

/**
 * Terms of service, written for a natural person operating from Lima under
 * the Código de Protección y Defensa del Consumidor (Ley 29571).
 *
 * Spanish only, and deliberately so: these terms govern a contract executed in
 * Peru, and a translated copy would create two texts that could be read
 * against each other. The rest of the site is bilingual; this is not.
 */
export type LegalSection = { title: string; body: string[] };

export type LegalDocument = {
  title: string;
  updated: string;
  intro: string[];
  sections: LegalSection[];
};

export const TERMS_DOC: LegalDocument = {
  title: "Términos y Condiciones",
  updated: `Última actualización: ${LEGAL_UPDATED}`,
  intro: [
    `Estos términos rigen el uso de ${LEGAL_HOLDER.brand}, un servicio de software para restaurantes ofrecido por ${LEGAL_HOLDER.name}, persona natural con domicilio en ${LEGAL_HOLDER.location}, a través del sitio ${LEGAL_HOLDER.domain}.`,
    "Al contratar el servicio o crear una cuenta aceptas lo que sigue. Está escrito para que se entienda en una lectura: si algo no te queda claro, escríbenos antes de aceptar y lo conversamos.",
  ],
  sections: [
    {
      title: "1. Quién presta el servicio",
      body: [
        `${LEGAL_HOLDER.brand} es operado por ${LEGAL_HOLDER.name}, ${LEGAL_HOLDER.role}, desde ${LEGAL_HOLDER.location}. No contamos con local abierto al público: la atención, la implementación y el soporte son íntegramente remotos.`,
        `Cualquier comunicación formal relacionada con estos términos debe dirigirse a ${LEGAL_HOLDER.email}.`,
      ],
    },
    {
      title: "2. Qué incluye el servicio",
      body: [
        "FoodFlow es un software como servicio (SaaS) al que accedes desde un navegador. Según el plan contratado incluye carta digital y códigos QR, gestión de pedidos, pantalla de cocina, reportes de venta, gestión de mesas y tu propia web de pedidos.",
        "El detalle de lo que trae cada plan es el publicado en la página de Precios al momento de tu contratación. Podemos mejorar, corregir o ampliar funciones en cualquier momento; si alguna vez tuviéramos que retirar una función incluida en tu plan, te avisaremos con al menos 30 días de anticipación.",
      ],
    },
    {
      title: "3. Contratación, precios y facturación",
      body: [
        "Los precios publicados están expresados en soles (S/) y no incluyen IGV, salvo que se indique lo contrario en la misma página. El impuesto se agrega al momento de emitir el comprobante.",
        "El servicio se cobra por mes adelantado. No exigimos permanencia mínima: puedes dar de baja tu cuenta cuando quieras y el servicio seguirá activo hasta el final del periodo ya pagado.",
        "Si modificamos el precio de tu plan te lo comunicaremos con al menos 30 días de anticipación y podrás dar de baja el servicio antes de que el nuevo precio te aplique.",
      ],
    },
    {
      title: "4. Garantía de prueba sin riesgo (primeros 30 días)",
      body: [
        "Ofrecemos una garantía de prueba sin riesgo durante los primeros 30 días calendario contados desde la activación de tu cuenta. Si dentro de ese plazo decides que el servicio no te sirve, no pagas: te devolvemos íntegramente lo abonado por ese primer periodo.",
        "La garantía aplica únicamente si hubo uso activo del servicio durante esos 30 días. Entendemos por uso activo que tu carta haya sido cargada y que se hayan registrado pedidos, comandas o reportes en el panel. Es una condición razonable y con una sola finalidad: la garantía existe para que pruebes el producto de verdad, no para cubrir una cuenta que nunca llegó a usarse.",
        "La garantía cubre el primer periodo contratado y se ejerce una sola vez por cliente. Para solicitarla basta con escribirnos a " +
          LEGAL_HOLDER.email +
          " dentro del plazo; procesamos la devolución por el mismo medio de pago en un máximo de 15 días hábiles.",
        "Pasados los 30 días, la baja del servicio sigue siendo libre y sin penalidad, pero ya no genera devolución del periodo en curso.",
      ],
    },
    {
      title: "5. Tus obligaciones como cliente",
      body: [
        "Eres responsable de la veracidad de la información que cargas (precios, cartas, datos de tu negocio) y del uso que tu equipo haga de las cuentas que crees. Las credenciales son personales: cada mozo, cajero o cocinero debe tener la suya.",
        "Te comprometes a no usar el servicio para fines ilícitos, a no intentar vulnerar su seguridad y a no revender ni ceder el acceso a terceros ajenos a tu negocio sin nuestro consentimiento por escrito.",
        "Si detectamos un uso que ponga en riesgo la seguridad o la disponibilidad del servicio para otros clientes, podemos suspender la cuenta de forma preventiva, informándote el motivo y dándote la oportunidad de corregirlo.",
      ],
    },
    {
      title: "6. Disponibilidad y límite de responsabilidad",
      body: [
        "Trabajamos para que el servicio esté disponible de forma continua, pero no podemos garantizar un funcionamiento ininterrumpido ni libre de errores. FoodFlow se presta bajo una obligación de medios, no de resultado.",
        "En particular, no somos responsables por interrupciones o fallas causadas por: la caída, el bloqueo o el cambio de políticas de servicios de terceros como WhatsApp, pasarelas de pago o aplicaciones de delivery; la conexión a internet de tu local, tu proveedor de internet o tu red interna; el mal uso, la avería o la incompatibilidad del hardware que utilices (celulares, tablets, computadoras, impresoras de comandas o lectores); cortes de energía; ni por casos fortuitos o de fuerza mayor.",
        "Tampoco respondemos por decisiones comerciales que tomes a partir de los reportes del panel, ni por el lucro cesante, la pérdida de clientela o los daños indirectos que puedan derivarse de una interrupción del servicio.",
        "En cualquier caso, y salvo dolo o culpa inexcusable de nuestra parte, nuestra responsabilidad total frente a ti queda limitada al monto que hayas pagado por el servicio durante los tres (3) meses anteriores al hecho que originó el reclamo.",
        "Nada de lo anterior limita los derechos que te reconoce el Código de Protección y Defensa del Consumidor (Ley 29571) ni excluye nuestra responsabilidad en los casos en que la ley no permite limitarla.",
      ],
    },
    {
      title: "7. Tus datos te pertenecen",
      body: [
        "La información que cargas y generas en FoodFlow —tu carta, tus pedidos, tus clientes, tus reportes— es tuya. Nosotros solo la alojamos y la procesamos para prestarte el servicio.",
        "Si das de baja tu cuenta, te entregamos una exportación completa de tus datos en un formato estándar y legible (CSV) dentro de las 48 horas siguientes a tu solicitud, sin costo adicional. Basta con pedirla a " +
          LEGAL_HOLDER.email +
          ".",
        "Conservamos tus datos hasta 30 días calendario después de la baja para darte margen de recuperarlos, y luego los eliminamos de forma definitiva de nuestros sistemas activos. Si prefieres que los eliminemos antes, dilo en tu solicitud y lo hacemos.",
        "El tratamiento de datos personales se rige además por nuestra Política de Privacidad y por la Ley 29733, Ley de Protección de Datos Personales.",
      ],
    },
    {
      title: "8. Propiedad intelectual",
      body: [
        `El software, la marca ${LEGAL_HOLDER.brand}, el diseño de la plataforma y su documentación son de titularidad de ${LEGAL_HOLDER.name}. La contratación te otorga una licencia de uso no exclusiva, intransferible y limitada a la vigencia del servicio.`,
        "Tu marca, tus fotos, tus textos y tu carta siguen siendo tuyos. Solo los usamos para prestarte el servicio, y no los publicamos como caso de éxito ni con fines comerciales sin tu autorización previa y por escrito.",
      ],
    },
    {
      title: "9. Terminación",
      body: [
        "Puedes dar de baja tu cuenta en cualquier momento escribiéndonos a " +
          LEGAL_HOLDER.email +
          ". La baja se hace efectiva al final del periodo pagado.",
        "Podemos suspender o terminar el servicio si incumples estos términos de forma grave o reiterada, o si hay falta de pago, siempre previo aviso y con un plazo razonable para que subsanes. En caso de terminación por nuestra parte, mantienes intacto tu derecho a la exportación de datos del punto 7.",
      ],
    },
    {
      title: "10. Cambios en estos términos",
      body: [
        "Podemos actualizar estos términos para reflejar cambios en el servicio o en la normativa. Publicaremos la nueva versión en esta misma página con su fecha de actualización y, cuando el cambio sea sustancial, te avisaremos por correo o desde el panel con al menos 15 días de anticipación.",
        "Si no estás de acuerdo con un cambio, puedes dar de baja el servicio antes de que entre en vigencia.",
      ],
    },
    {
      title: "11. Ley aplicable y reclamos",
      body: [
        "Estos términos se rigen por las leyes de la República del Perú. Cualquier controversia se someterá a los jueces y tribunales del Cercado de Lima.",
        "Antes de eso, preferimos resolverlo hablando: escríbenos a " +
          LEGAL_HOLDER.email +
          ". También tienes a tu disposición nuestro Libro de Reclamaciones Virtual, y puedes acudir a INDECOPI si consideras que tus derechos como consumidor han sido afectados.",
      ],
    },
  ],
};
