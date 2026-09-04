import { LEGAL_HOLDER, LEGAL_UPDATED } from "@/lib/legal/holder";
import type { LegalDocument } from "@/lib/legal/terms";

/**
 * Privacy policy under Ley 29733 (Ley de Protección de Datos Personales) and
 * its reglamento, D.S. 003-2013-JUS. Spanish only, same reasoning as the terms.
 *
 * Two things this document promises that the product has to keep on
 * delivering: consent is asked for explicitly before any form is submitted,
 * and no data is ever sold or handed to a third party for their own marketing.
 */
export const PRIVACY_DOC: LegalDocument = {
  title: "Política de Privacidad",
  updated: `Última actualización: ${LEGAL_UPDATED}`,
  intro: [
    `Esta política explica qué datos personales recogemos en ${LEGAL_HOLDER.domain}, para qué los usamos y cómo puedes controlarlos. Es corta a propósito: recogemos lo mínimo para trabajar contigo.`,
    "Está redactada conforme a la Ley 29733, Ley de Protección de Datos Personales, y a su reglamento aprobado por Decreto Supremo 003-2013-JUS.",
  ],
  sections: [
    {
      title: "1. Quién es el titular del banco de datos",
      body: [
        `El responsable del tratamiento es ${LEGAL_HOLDER.name}, ${LEGAL_HOLDER.role}, persona natural con domicilio en ${LEGAL_HOLDER.location}.`,
        `Canal de contacto para todo lo relacionado con tus datos personales: ${LEGAL_HOLDER.email}.`,
        "No hay un departamento detrás de ese correo: lo lee la misma persona que desarrolla y opera el servicio.",
      ],
    },
    {
      title: "2. Qué datos recogemos",
      body: [
        "De quienes nos contactan desde la web: nombre, nombre del restaurante, número de WhatsApp y, si decides dejarlo, correo electrónico. Si usas la calculadora de comisiones, también las cifras que tú mismo ingresas.",
        "De quienes contratan el servicio: los datos anteriores más los necesarios para operar la cuenta (correo de acceso, nombres de los usuarios de tu equipo) y, cuando corresponda, los datos de facturación.",
        "De forma técnica: guardamos un hash irreversible de tu dirección IP para limitar el envío abusivo de formularios. Ese hash no permite reconstruir la IP y no se usa para perfilarte.",
        "No recogemos datos sensibles en el sentido de la Ley 29733 (salud, origen étnico, convicciones, datos biométricos), ni datos de menores de edad.",
      ],
    },
    {
      title: "3. Para qué los usamos",
      body: [
        "Atender tu consulta y contactarte por WhatsApp o correo con información sobre FoodFlow, cuando nos has dado tu consentimiento para ello.",
        "Gestionar tu cuenta: darte acceso, crear los usuarios de tu equipo, prestarte soporte y resolver incidencias.",
        "Emitir los comprobantes de pago y cumplir las obligaciones contables y tributarias que nos correspondan cuando el servicio pase a ser facturado.",
        "Mejorar el producto a partir de información agregada y anónima de uso. Este análisis nunca se hace sobre datos que te identifiquen individualmente.",
      ],
    },
    {
      title: "4. Con qué base legal y por cuánto tiempo",
      body: [
        "Tratamos tus datos con tu consentimiento previo, expreso e informado, que otorgas marcando la casilla correspondiente antes de enviar cualquier formulario. Cuando ya eres cliente, el tratamiento se sustenta además en la ejecución del contrato de servicio.",
        "Conservamos los datos de contacto mientras exista interés comercial o relación contractual, y hasta dos (2) años después del último contacto si no llegamos a trabajar juntos. Los datos de facturación se conservan por el plazo que exige la normativa tributaria.",
        "Puedes revocar tu consentimiento en cualquier momento, sin necesidad de justificarlo y sin que ello afecte la licitud del tratamiento previo.",
      ],
    },
    {
      title: "5. No vendemos tus datos",
      body: [
        "No vendemos, alquilamos ni cedemos tus datos personales a terceros para sus propios fines comerciales. Nunca. No es un modelo de negocio que nos interese.",
        "Sí usamos proveedores de infraestructura que procesan datos por encargo nuestro y bajo nuestras instrucciones: alojamiento de la aplicación y de la base de datos, y envío de correos transaccionales. Estos proveedores pueden almacenar la información en servidores fuera del Perú, lo que constituye un flujo transfronterizo de datos que aceptas al usar el servicio; exigimos de ellos niveles de protección equivalentes a los de la Ley 29733.",
        "Solo entregaríamos datos a una autoridad si media un requerimiento legal válido, y en ese caso te lo comunicaríamos salvo que la ley nos lo impida.",
      ],
    },
    {
      title: "6. Tus derechos ARCO",
      body: [
        "Como titular de tus datos personales puedes ejercer en cualquier momento tus derechos de Acceso, Rectificación, Cancelación y Oposición (ARCO), además de los derechos de información, actualización, inclusión, supresión y de tratamiento objetivo que reconoce la Ley 29733.",
        "Acceso: saber qué datos tuyos tenemos y con qué finalidad. Rectificación: corregir los que estén incompletos o desactualizados. Cancelación: pedir que los eliminemos cuando ya no sean necesarios o cuando revoques tu consentimiento. Oposición: pedir que dejemos de tratarlos por un motivo legítimo.",
        `Para ejercerlos, escríbenos a ${LEGAL_HOLDER.email} desde el correo con el que nos contactaste, indicando qué derecho quieres ejercer. Te responderemos en un plazo máximo de diez (10) días hábiles para los derechos de acceso y de veinte (20) días hábiles para los demás, conforme a la ley. No cobramos por atender estas solicitudes.`,
        "Si no atendemos tu solicitud o no quedas conforme con nuestra respuesta, puedes presentar una reclamación ante la Autoridad Nacional de Protección de Datos Personales del Ministerio de Justicia y Derechos Humanos.",
      ],
    },
    {
      title: "7. Seguridad de la información",
      body: [
        "Aplicamos medidas técnicas y organizativas razonables para proteger tus datos: cifrado del tráfico mediante HTTPS, control de acceso por roles, contraseñas nunca almacenadas en texto plano, registro de auditoría de las acciones sensibles y copias de seguridad de la base de datos.",
        "Ningún sistema es infalible. Si llegara a producirse un incidente de seguridad que afecte tus datos personales, te lo comunicaremos sin demora indebida junto con las medidas que hayamos adoptado.",
      ],
    },
    {
      title: "8. Cookies",
      body: [
        "Usamos únicamente lo necesario para que el sitio funcione: la cookie de sesión cuando inicias sesión y algunas preferencias guardadas en el almacenamiento local de tu navegador. No usamos cookies de publicidad ni de rastreo de terceros.",
        "El detalle está en nuestra Política de Cookies.",
      ],
    },
    {
      title: "9. Cambios en esta política",
      body: [
        "Si cambiamos esta política publicaremos la nueva versión en esta página con su fecha de actualización. Cuando el cambio afecte de forma sustancial el tratamiento de tus datos, te lo comunicaremos y, si la ley lo exige, te pediremos un nuevo consentimiento.",
      ],
    },
  ],
};
