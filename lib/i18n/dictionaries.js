/**
 * All page copy, in Spanish and English, mirrored key-for-key so components
 * can destructure the same shape regardless of language. Non-text data
 * (icons, tones, numeric values, hrefs) stays in the component files and is
 * paired with these by array index.
 *
 * The pitch is the Lima pilot: we set the restaurant up in 48 hours and the
 * first month is free. There are no customer counts, logos or testimonials
 * here on purpose — there are no customers yet, and inventing them is the
 * fastest way to lose a restaurant owner's trust. Numbers that appear in the
 * product mockups are labelled as demo data.
 */

export const dictionaries = {
  es: {
    nav: {
      links: ["Qué incluye", "El panel", "Calculadora", "Precios", "Preguntas", "Nosotros"],
      signIn: "Entrar",
      startFree: "Reservar mi plaza",
      openMenu: "Abrir menú",
      closeMenu: "Cerrar menú",
      langToggle: "EN",
      langName: "English",
      theme: {
        toLight: "Cambiar a modo claro",
        toDark: "Cambiar a modo oscuro",
      },
    },
    hero: {
      badge: "Lima · 5 plazas de fundador este mes",
      headlineWords: ["Tu", "restaurante", "funcionando", "en"],
      headlineAccent: "48 horas",
      headlineTail: "Sin que muevas un dedo.",
      subheadline:
        "Nosotros cargamos tu carta, conectamos tus canales de pedido y dejamos la cocina y los números en un solo panel. Tú solo abres el turno y miras cómo entra todo ordenado.",
      ctaPrimary: "Reservar mi plaza",
      ctaSecondary: "Ver el panel en vivo",
      ctaNote: "Sin compromiso: 20 min por WhatsApp y tú decides.",
      proof: [
        "20 min por WhatsApp, sin compromiso",
        "Migramos tu carta por ti",
        "Sin instalar nada",
        "Sin contratos ni permanencia: lo dejas cuando quieras.",
      ],
      offer: {
        eyebrow: "Así son las 48 horas",
        steps: [
          { time: "0h", title: "20 minutos por WhatsApp" },
          { time: "24h", title: "Cargamos tu carta y montamos todo" },
          { time: "48h", title: "Abres tu turno, con nosotros en vivo" },
        ],
        includedLabel: "Lo que incluye tu plaza",
        included: [
          "Migración de carta por nuestro equipo: S/0 incluida gratis en tu plaza.",
          "Acompañamiento en vivo tu primer viernes por la noche",
          "Auditoría de comisiones: cuánto se llevan hoy las apps de delivery",
          "Ingeniería de menú: qué platos te dejan dinero y cuáles no",
        ],
        priceTitle: "Primer mes gratis",
        priceCopy:
          "Después, una cuota sin comisión por pedido. Si tu cocina no respira mejor, te vas sin pagar y con tu carta lista.",
        dataNote:
          "Sin permanencia. Si te vas, te exportamos todo: tus datos siempre son tuyos.",
      },
    },
    marquee: [
      "Sin comisión por pedido",
      "Carta QR incluida",
      "Pantalla de cocina",
      "Soporte en español e inglés",
      "Tu web de pedidos",
    ],
    features: {
      eyebrow: "Qué incluye",
      title: "Lo que te dejamos montado",
      description:
        "Cuatro cosas que hoy viven en cuadernos, en WhatsApp y en tres apps distintas. En FoodFlow viven en un solo sitio.",
      items: [
        {
          title: "Pedidos en una cola",
          copy: "Se acabó perder pedidos entre chats de WhatsApp, llamadas y el cuaderno. Salón, para llevar y delivery entran a cocina con su prioridad ya puesta.",
        },
        {
          title: "Pantalla de cocina",
          copy: "Comandas en orden y con cronómetro. Se acabó el grito y el papel perdido.",
        },
        {
          title: "Carta digital y QR",
          copy: "Cambias un precio y está cambiado en todas las mesas al instante.",
        },
        {
          title: "Los números del día",
          copy: "Cuánto vendiste, qué plato deja margen y a qué hora se te llena el local.",
        },
      ],
      footnote: "Y si tienes más de un local, todo se suma en un mismo panel.",
    },
    showcase: {
      eyebrow: "El panel",
      title: "El servicio entero, en una sola pantalla",
      description:
        "Ventas, comandas abiertas, carga de cocina y tiempos de preparación mientras el turno sigue en marcha.",
      demoNote: "Panel de demostración. Las cifras son de ejemplo.",
      chips: [
        { label: "Pedidos / hora · demo", value: "48" },
        { label: "Tiempo de cocina · demo", value: "11:20" },
      ],
    },
    customSite: {
      productName: "FoodFlow Sites",
      eyebrow: "Incluido",
      title: "Tu propia web de pedidos, con tu nombre",
      commission: "Cada pedido por app de delivery te cuesta hasta 30%. En tu web FoodFlow: 0%.",
      description:
        "Tus clientes piden directo a ti desde el celular, sin descargar nada y sin que un intermediario se lleve una comisión de cada pedido.",
      items: [
        {
          title: "Carta siempre al día",
          copy: "La misma carta del panel, sin volver a subir un PDF cada vez que cambia un precio.",
        },
        {
          title: "Pedidos que entran a tu cocina",
          copy: "Lo que pide el cliente aparece en la pantalla de cocina, no en otra tablet más.",
        },
        {
          title: "Reservas y WhatsApp",
          copy: "Reserva de mesa y contacto directo por WhatsApp, que es como te escriben tus clientes.",
        },
      ],
      footnote: "Con tu dominio propio o con una dirección foodflow.site gratuita.",
      demo: {
        browserUrl: "tuburger.foodflow.site",
        brand: "Burger House",
        rating: "Abierto hasta las 23:30",
        tagline: "Hamburguesas artesanales, hechas al momento",
        ctaMenu: "Ver carta",
        ctaReserve: "Reservar mesa",
        menuLabel: "Carta",
        items: [
          { name: "Cheeseburger clásica", price: "S/ 24.90" },
          { name: "Bacon BBQ Burger", price: "S/ 31.90" },
          { name: "Burger vegetariana", price: "S/ 26.50" },
        ],
        reserveLabel: "Reservar una mesa",
        reserveFields: { date: "Fecha", time: "Hora", guests: "Personas" },
        reserveButton: "Confirmar reserva",
        orderBar: "3 productos · S/ 83.30",
        orderButton: "Pedir ahora",
        whatsappCta: "Pedir por WhatsApp",
      },
    },
    cta: {
      badge: "Piloto en Lima · plazas limitadas",
      titleLead: "Este mes acompañamos solo a 5 restaurantes:",
      titleAccent: "montamos y supervisamos cada apertura en vivo.",
      paragraph:
        "Pregunta lo que quieras en el chat: planes, precios, qué incluye o cuánto tarda el montaje. Responde al instante, sin registrarte y sin dejar tu correo.",
      askPlans: "Ver los planes",
      askAnything: "Escríbenos por WhatsApp",
      plansLabel: "Empieza simple. Crece cuando tu local lo pida.",
      bullets: ["Montaje en 48 horas", "30 días sin costo", "Sin contratos ni permanencia: lo dejas cuando quieras."],
      founder:
        "Los 5 restaurantes de este mes reciben: precio de fundador congelado de por vida (–10%), acompañamiento en vivo durante su primer viernes de servicio y migración completa de carta gratis.",
      loginPrompt: "¿Ya tienes cuenta?",
      loginCta: "Entrar",
    },
    leadForm: {
      eyebrow: "Sin llamadas",
      title: "Te escribimos en menos de 24 horas.",
      subtitle: "Cero llamadas de spam: te contactamos solo por mensaje.",
      exitTitle: "¿Te vas? Déjanos tu WhatsApp y te escribimos. Cero llamadas.",
      exitSubtitle: "Un minuto ahora y te llega todo por mensaje, cuando puedas leerlo.",
      fields: {
        nombre: { label: "Tu nombre", placeholder: "Ana Quispe" },
        restaurante: { label: "Tu restaurante", placeholder: "Cevichería El Muelle" },
        whatsapp: {
          label: "Tu WhatsApp",
          placeholder: "987 654 321",
          hint: "9 dígitos, empieza en 9.",
        },
        email: {
          label: "Tu correo",
          placeholder: "ana@turestaurante.pe",
          optional: "opcional",
        },
      },
      consent: {
        before: "He leído y acepto la ",
        link: "Política de Privacidad",
        after:
          " y autorizo el tratamiento de mis datos personales para recibir información sobre FoodFlow.",
        error: "Necesitamos tu autorización para poder escribirte.",
      },
      submit: "Quiero que me escriban",
      sending: "Guardando…",
      privacy: "Tus datos son para escribirte sobre FoodFlow. Nada más.",
      fieldErrors: {
        nombre: { required: "Escribe tu nombre." },
        restaurante: { required: "Escribe el nombre de tu restaurante." },
        whatsapp: {
          required: "Necesitamos tu WhatsApp para escribirte.",
          format: "Un número peruano de 9 dígitos que empieza en 9.",
        },
        email: { format: "Revisa el correo: le falta algo." },
      },
      formErrors: {
        invalid: "Revisa los campos marcados y vuelve a intentar.",
        rate_limited:
          "Ya tenemos tus datos de hace un momento. Si es urgente, escríbenos tú por WhatsApp.",
        server:
          "No pudimos guardar tus datos. Escríbenos por WhatsApp y lo vemos ahora mismo.",
      },
      success: {
        title: "Listo, {nombre}. Te escribimos hoy mismo por WhatsApp.",
        copy: "Guardamos tu restaurante y tu número. Te llega un mensaje, nada más.",
        whatsapp: "O escríbenos tú ahora por WhatsApp",
      },
      whatsappMessage:
        "Hola FoodFlow, soy {nombre} de {restaurante}. Quiero info de las plazas de fundador.",
      whatsappMessageLoss:
        "Hola, soy {nombre} de {restaurante}. Según su calculadora pierdo {perdida}/mes en comisiones. Quiero recuperarlo.",
      close: "Cerrar",
    },
    whatsapp: {
      label: "Escríbenos por WhatsApp",
      tooltip: "Te respondemos por WhatsApp",
      message: "Hola FoodFlow, vi su página y quiero info de las plazas de fundador.",
    },
    calculator: {
      eyebrow: "Calculadora",
      title: "¿Cuánto te cuestan las apps de delivery?",
      description:
        "Pon los números de tu local y mira lo que se va en comisiones. No hay que registrarse: el resultado aparece mientras escribes.",
      salesLabel: "Ventas al mes por apps de delivery",
      salesHint: "Solo lo que vendes por Rappi, PedidosYa y similares.",
      commissionLabel: "Comisión que te cobran",
      commissionHint: "Normalmente entre 20% y 35% de cada pedido.",
      ordersLabel: "Pedidos al mes",
      ordersOptional: "opcional",
      ordersHint: "Si lo tienes a mano, te decimos cuánto se lleva cada pedido.",
      resultLabel: "Lo que dejas en comisiones",
      perMonth: "al mes",
      perYear: "al año",
      perOrder: "Son {amount} de comisión en cada pedido.",
      foodflow: "Con tu web FoodFlow: S/ 0 por pedido.",
      cta: "Quiero recuperarlo",
      ctaNote: "Te escribimos por WhatsApp al número que dejes. Sin llamadas.",
      empty: "Escribe cuánto vendes al mes y verás el número.",
      disclaimer:
        "Es una estimación con tus propios números: multiplicamos tus ventas por la comisión que indicas. La cifra exacta está en la liquidación que te manda la app.",
    },
    footer: {
      description:
        "Pedidos, cocina, carta y números en un solo panel. Hecho en Lima para restaurantes de Lima.",
      emailCta: "Escríbenos",
      copyrightSuffix: "FoodFlow. Todos los derechos reservados.",
      signaturePrefix: "Hecho por",
    },
    pricing: {
      eyebrow: "Precios",
      title: "Precios claros, sin comisión por pedido",
      description:
        "Los tres incluyen carta digital, soporte en español e inglés y actualizaciones. Sin permanencia: cambias o cancelas de un mes a otro.",
      popular: "Más elegido",
      cta: "Reservar mi plaza",
      founder: {
        label: "Oferta Fundador",
        headline: "Solo 5 plazas este mes.",
        perks: [
          "Precio congelado de por vida (–10%)",
          "Acompañamiento en vivo en tu primer viernes",
          "Migración de carta gratis",
        ],
      },
      keyNotes: [
        "Funciona en cualquier celular, tablet o computadora que ya tengas. No vendemos hardware.",
        "Optimizado para que tus clientes paguen con Yape, Plin o efectivo.",
      ],
      taxNote:
        "* Precios en soles y sin IGV (18%). Emitimos boleta o factura a tu RUC.",
      savingsNote: "Menos de lo que pagas en comisiones un solo viernes.",
      addonsLabel: "Si necesitas más",
      addons: [
        {
          name: "Usuario adicional",
          price: "S/ 15",
          unit: "/mes",
          copy: "Suma un mozo, un cajero o un puesto de cocina sin cambiar de plan.",
        },
        {
          name: "Local adicional",
          price: "S/ 99",
          unit: "/mes",
          copy: "Cada sucursal con su carta y su cocina, y todo sumado en un mismo panel.",
        },
        {
          name: "Migración de tu carta",
          price: "Incluida",
          unit: " en el piloto",
          copy: "Fuera del programa piloto es un servicio de S/ 500, por única vez.",
        },
      ],
      note: "Precios del programa piloto en Lima. Si tu local necesita algo distinto, lo conversamos por WhatsApp.",
    },
    faq: {
      eyebrow: "Preguntas frecuentes",
      title: "Lo que todo dueño pregunta antes de decir que sí",
      items: [
        {
          q: "¿Qué pasa si se cae el internet en pleno servicio?",
          a: "El panel funciona en el navegador, así que necesita conexión para recibir pedidos nuevos y sincronizar. Si tu internet se corta, lo que ya está en pantalla sigue a la vista y puedes terminar el turno con eso; cuando vuelve la conexión, todo se pone al día. Si en tu zona el internet es inestable, por WhatsApp te ayudamos a dejar el plan de datos del celular como respaldo.",
        },
        {
          q: "¿Tengo que comprar tablets o impresoras especiales?",
          a: "No. Funciona en la computadora, la tablet o el celular que ya tienes, desde el navegador y sin instalar nada. Si ya usas una impresora de comandas, cuéntanos el modelo por WhatsApp: conectamos las que imprimen por red o desde el navegador.",
        },
        {
          q: "Ya uso otro sistema (Domicilius, Sigo, un POS local). ¿Cómo migro?",
          a: "Nos pasas la exportación de tu sistema actual, el PDF de la carta o incluso una foto, y la cargamos nosotros durante las 48 horas del piloto. No hay una conexión automática con esos sistemas: la migración la hacemos a mano, revisando precios y categorías contigo antes de abrir tu primer turno.",
        },
        {
          q: "¿Los precios incluyen IGV?",
          a: "No. Los precios que ves están en soles y sin IGV (18%). Emitimos boleta o factura a tu RUC, y la factura te sirve como gasto deducible.",
        },
        {
          q: "¿Hay permanencia o penalidad si me quiero ir?",
          a: "Ninguna. Cambias de plan o cancelas de un mes a otro desde el mismo panel, y si te vas te exportamos la carta, los pedidos y los clientes en un archivo listo para usar donde quieras.",
        },
        {
          q: "¿Quién carga mi carta y cuánto demora?",
          a: "La cargamos nosotros dentro de las 48 horas del piloto: carta completa con precios, categorías y fotos. Después la editas tú en dos clics y el cambio se ve al instante en todas las mesas.",
        },
      ],
      more: "¿Te falta alguna? Pregúntanos en el chat y te respondemos al instante.",
    },
    about: {
      eyebrow: "Quiénes somos",
      title: "Detrás de FoodFlow hay una persona, no un call center",
      body: [
        "Soy Adonys. Un viernes por la noche me encontré con un local lleno, la comida increíble y un ambiente buenísimo… pero aun así, dos pedidos se perdieron entre un cuaderno, varios chats de WhatsApp y una tablet con 3% de batería. Nadie estaba haciendo algo mal. Simplemente faltaba un poco de orden.",
        "Yo escribo software. Ese problema ya estaba resuelto… para cadenas con área de sistemas y presupuesto de seis cifras. Para la cevichería de la esquina, la opción era el cuaderno o regalarle un pedazo de cada plato a una app.",
        "Así que armé FoodFlow: los pedidos en una sola cola, la cocina con cronómetro y los números del día sin abrir un Excel. En 48 horas, porque tu cocina no puede parar tres meses para estrenar programa.",
      ],
      quote: "Ningún plato debería perderse entre un cuaderno y un chat.",
      commitmentLabel: "Nuestro compromiso",
      commitment: [
        "Te contestamos en español o inglés, en horario de servicio. Nada de tickets.",
        "Cero comisión por pedido: lo que vendes es tuyo.",
        "Tus datos son tuyos y te los exportamos el día que los pidas.",
        "Estamos en Lima. Si hace falta, caemos a tu local.",
      ],
      signature: "Adonys Pereda · Fundador · Lima",
      photoNote: "Sí, ese soy yo cargando la A. Pesa menos que un viernes con la cocina llena.",
      photoAlt:
        "Marca personal de Adonys Pereda: una figura arrodillada que sostiene sobre la espalda una letra A rodeada de rayos.",
    },
    cookies: {
      banner: {
        text: "Usamos cookies propias para mantener tu sesión iniciada y recordar tu idioma. Las cookies de medición solo se activan si las aceptas.",
        accept: "Aceptar todo",
        reject: "Solo las necesarias",
        more: "Ver política",
        close: "Cerrar el aviso",
      },
      page: {
        title: "Política de cookies",
        updatedLabel: "Última actualización",
        intro:
          "Esta política explica qué guardamos en tu navegador cuando visitas foodflow y para qué. Es corta a propósito: usamos lo mínimo para que la web funcione.",
        sections: [
          {
            title: "Cookies necesarias",
            body: "Guardan tu sesión cuando inicias sesión en el panel y recuerdan si aceptaste este aviso. Sin ellas no podrías entrar a tu cuenta. No se pueden desactivar porque el servicio no funcionaría.",
          },
          {
            title: "Preferencias",
            body: "En el almacenamiento local de tu navegador recordamos tres cosas: el idioma que elegiste (español o inglés), si ya nos dejaste tus datos y si ya te mostramos el aviso al salir. Así no te repetimos lo mismo en cada visita. Nada de esto sale de tu equipo.",
          },
          {
            title: "Medición y publicidad",
            body: "No usamos cookies de publicidad. Si aceptas este aviso, activamos Google Analytics para entender qué páginas se visitan y mejorar el sitio; usamos la IP anonimizada y nunca cruzamos esos datos con tu cuenta. Si eliges 'Solo las necesarias', esa medición se queda apagada. Puedes cambiar de opinión cuando quieras borrando la elección guardada o desde la configuración de tu navegador.",
          },
          {
            title: "Cómo cambiar tu elección",
            body: "Puedes borrar las cookies desde la configuración de tu navegador en cualquier momento. Si borras el almacenamiento del sitio, el aviso volverá a aparecer y podrás elegir de nuevo.",
          },
          {
            title: "Contacto",
            body: "¿Dudas sobre esto o sobre tus datos? Escríbenos y te respondemos: la persona que lee ese correo es la misma que te atiende por WhatsApp.",
          },
        ],
        back: "Volver al inicio",
      },
    },
    chat: {
      launcher: "¿Dudas? Pregúntanos",
      title: "Asistente de FoodFlow",
      subtitle: "Respuestas al instante, sin registrarte",
      close: "Cerrar el chat",
      greeting: [
        "Hola. Te cuento en un minuto cómo funciona FoodFlow y cuánto cuesta.",
        "Elige una pregunta o escríbeme la tuya.",
      ],
      suggestionsLabel: "Preguntas frecuentes",
      inputLabel: "Escribe tu pregunta",
      inputPlaceholder: "Escribe tu pregunta…",
      send: "Enviar",
      typing: "escribiendo…",
      topics: [
        {
          id: "planes",
          question: "¿Qué planes hay y cuánto cuestan?",
          keywords: ["plan", "planes", "precio", "precios", "cuesta", "cuánto", "tarifa", "mensualidad", "pagar"],
          answer: [
            "Tenemos tres planes, del más simple al más completo. Todos incluyen soporte en español e inglés y ninguno cobra comisión por pedido.",
          ],
          showPlans: true,
          followUps: ["piloto", "comision", "cambiar"],
        },
        {
          id: "piloto",
          question: "¿Cómo es el piloto de 48 horas?",
          keywords: ["piloto", "48", "horas", "prueba", "gratis", "empezar", "empiezo"],
          answer: [
            "Es así: 20 minutos por WhatsApp para que nos pases tu carta, 24 horas para que lo dejemos todo montado (carta, QR de mesas, cocina y usuarios de tu equipo) y al segundo día abres tu primer turno con nosotros conectados en vivo.",
            "Tu plaza incluye la migración completa de la carta (un servicio de S/ 500), acompañamiento en tu primer viernes por la noche, una auditoría de lo que se llevan hoy las apps de delivery y el análisis de qué platos te dejan margen. El panel no se cobra los primeros 30 días.",
            "No hay permanencia, y si te vas te exportamos toda tu base de datos lista para usar donde quieras.",
          ],
          followUps: ["carta", "equipos", "planes"],
        },
        {
          id: "incluye",
          question: "¿Qué incluye exactamente?",
          keywords: ["incluye", "funciona", "hace", "sirve", "características", "funciones"],
          answer: [
            "Cuatro cosas en un solo panel: los pedidos de salón, para llevar y delivery en una sola cola; la pantalla de cocina con cronómetro por comanda; tu carta digital con QR de mesas; y los números del día (cuánto vendiste, qué plato deja margen y a qué hora se te llena).",
            "En el plan Negocio se suma tu propia web de pedidos con tu nombre.",
          ],
          followUps: ["planes", "equipos", "comision"],
        },
        {
          id: "comision",
          question: "¿Cobran comisión por pedido?",
          keywords: ["comisión", "comision", "porcentaje", "cobran", "delivery", "apps"],
          answer: [
            "No. Pagas una cuota fija al mes y nada por pedido, vendas 50 o 500. Si hoy vendes por apps de reparto, ahí sí se llevan un porcentaje de cada venta; con tu propia web de pedidos ese dinero se queda contigo.",
          ],
          followUps: ["planes", "web", "piloto"],
        },
        {
          id: "equipos",
          question: "¿Tengo que comprar equipos?",
          keywords: ["equipo", "equipos", "hardware", "tablet", "computadora", "instalar", "impresora"],
          answer: [
            "No hace falta comprar nada. Funciona en la computadora, la tablet o el celular que ya tienes, desde el navegador y sin instalar programas. Si ya usas una impresora de comandas, la conectamos.",
          ],
          followUps: ["piloto", "incluye", "soporte"],
        },
        {
          id: "carta",
          question: "¿Quién carga mi carta?",
          keywords: ["carta", "menú", "menu", "cargar", "subir", "platos", "fotos"],
          answer: [
            "La cargamos nosotros durante el piloto. Nos mandas el PDF, la foto de la carta o el enlace que uses hoy y la dejamos lista con precios, categorías y fotos. Después la editas tú en dos clics y el cambio se ve al instante en todas las mesas.",
          ],
          followUps: ["piloto", "planes", "incluye"],
        },
        {
          id: "web",
          question: "¿Cómo es la web de pedidos propia?",
          keywords: ["web", "página", "pagina", "sitio", "dominio", "online", "pedidos"],
          answer: [
            "Es tu página, con tu nombre y tu carta, donde el cliente pide desde el celular sin descargar nada. El pedido entra directo a tu pantalla de cocina y el cobro va a tu cuenta.",
            "Va incluida en el plan Negocio, con tu dominio propio o una dirección foodflow.site gratuita.",
          ],
          followUps: ["planes", "comision", "piloto"],
        },
        {
          id: "cambiar",
          question: "¿Puedo cambiar o cancelar el plan?",
          keywords: ["cambiar", "cancelar", "permanencia", "contrato", "subir", "bajar", "dejar"],
          answer: [
            "Cuando quieras y desde el mismo panel. Puedes subir o bajar de plan de un mes a otro, y si decides dejarlo no hay penalidad ni contrato de permanencia: te exportamos la carta, los pedidos y los clientes en un archivo listo para usar donde quieras. Tus datos siempre son tuyos.",
          ],
          followUps: ["planes", "piloto", "soporte"],
        },
        {
          id: "soporte",
          question: "¿Y si algo falla en pleno servicio?",
          keywords: ["soporte", "falla", "problema", "ayuda", "internet", "cae", "urgencia"],
          answer: [
            "Nos escribes por WhatsApp y te respondemos en horario de servicio, en español y sin tickets. Durante tu primer turno estamos pendientes de principio a fin.",
            "Si se cae tu internet, lo que ya está en pantalla sigue a la vista para que termines el turno, y todo se pone al día cuando vuelve la conexión.",
          ],
          followUps: ["piloto", "equipos", "planes"],
        },
      ],
      plans: {
        label: "Planes",
        items: [
          {
            name: "Carta",
            price: "S/ 79",
            period: "/mes",
            tagline: "Para empezar a ordenar la carta",
            features: [
              "Carta digital y QR de mesas",
              "Cambias precios al instante",
              "1 local · 1 usuario",
            ],
          },
          {
            name: "Servicio",
            price: "S/ 179",
            period: "/mes",
            tagline: "El que usan la mayoría",
            badge: "Más elegido",
            features: [
              "Todo lo de Carta",
              "Salón, llevar y delivery en una cola",
              "Pantalla de cocina con cronómetro",
              "Reportes del día",
              "Hasta 10 usuarios",
            ],
          },
          {
            name: "Negocio",
            price: "S/ 349",
            period: "/mes",
            tagline: "Para crecer o para varios locales",
            features: [
              "Todo lo de Servicio",
              "Tu web de pedidos, 0% de comisión",
              "Margen por plato",
              "Varios locales en un panel",
              "Soporte prioritario",
            ],
          },
        ],
        note: "En el piloto no se cobran los primeros 30 días y la migración de la carta va incluida. Ninguno de los tres cobra comisión por pedido ni exige permanencia.",
      },
      fallback: [
        "Esa no me la sé de memoria, y prefiero no inventarte una respuesta.",
        "Te paso con una persona y te la contesta hoy mismo.",
      ],
      handoff: {
        intro: "¿Seguimos por WhatsApp o prefieres que te escribamos?",
        whatsapp: "Seguir por WhatsApp",
        whatsappMessage: "Hola, vi la web de FoodFlow y quiero preguntar por el piloto en Lima.",
        email: "Prefiero que me escriban",
        emailPrompt: "Déjame tu correo y te escribimos hoy mismo.",
        emailPlaceholder: "tu@restaurante.com",
        emailSend: "Enviar",
        success: "Listo, anotado. Te escribimos hoy mismo.",
        error: "No pude guardarlo. ¿Lo intentas otra vez?",
      },
    },
    dashboard: {
      ariaLabel: "Panel de FoodFlow: ventas, pedidos en vivo y rendimiento por canal",
      browserUrl: "app.foodflow.site/resumen",
      live: "EN VIVO",
      nav: ["Resumen", "Pedidos", "Cocina", "Carta", "Clientes", "Análisis"],
      kitchenLoad: "Carga de cocina",
      today: "Hoy · datos de demostración",
      performanceOverview: "Resumen del servicio",
      demoHint: "Haz clic en el menú y recorre el panel",
      views: {
        orders: {
          title: "Pedidos del turno",
          filters: ["Todos", "Salón", "Delivery", "Para llevar"],
          columns: ["Pedido", "Origen", "Detalle", "Total", "Estado"],
          rows: [
            {
              id: "#1042",
              source: "Mesa 12",
              items: "2x Lomo saltado · 1x Chicha morada",
              total: "S/ 96.00",
              state: "En cocina",
            },
            {
              id: "#1041",
              source: "Delivery",
              items: "1x Pollo a la brasa · papas",
              total: "S/ 68.00",
              state: "En camino",
            },
            {
              id: "#1040",
              source: "Mesa 04",
              items: "2x Ceviche mixto · 1x Inca Kola",
              total: "S/ 84.50",
              state: "Servido",
            },
            {
              id: "#1039",
              source: "Para llevar",
              items: "3x Menú del día",
              total: "S/ 45.00",
              state: "Listo",
            },
            {
              id: "#1038",
              source: "Mesa 09",
              items: "1x Ají de gallina · 2x Limonada",
              total: "S/ 52.00",
              state: "Servido",
            },
          ],
          note: "Filtra por canal. En el producto, cada fila abre el detalle del pedido.",
        },
        kitchen: {
          title: "Pantalla de cocina",
          columns: ["Entran", "En cocina", "Listos"],
          tickets: [
            [
              { id: "#1043", items: "1x Tallarín saltado", time: "00:24" },
              { id: "#1044", items: "2x Anticuchos", time: "00:08" },
            ],
            [
              { id: "#1042", items: "2x Lomo saltado", time: "06:12" },
              { id: "#1040", items: "1x Arroz con mariscos", time: "13:48" },
            ],
            [{ id: "#1039", items: "3x Menú del día", time: "listo" }],
          ],
          lateLabel: "Se pasa de tiempo",
          note: "El cronómetro corre solo y el ticket avisa cuando se pasa.",
        },
        menu: {
          title: "Tu carta",
          columns: ["Plato", "Categoría", "Precio", "Margen", "Estado"],
          rows: [
            { name: "Lomo saltado", category: "Fondos", price: "S/ 38.00", margin: "62%" },
            { name: "Ceviche mixto", category: "Entradas", price: "S/ 42.00", margin: "58%" },
            { name: "Ají de gallina", category: "Fondos", price: "S/ 32.00", margin: "66%" },
            { name: "Anticuchos", category: "Para picar", price: "S/ 26.00", margin: "54%" },
            { name: "Suspiro limeño", category: "Postres", price: "S/ 18.00", margin: "71%" },
          ],
          availableLabel: "A la venta",
          soldOutLabel: "Agotado",
          note: "Toca el estado de un plato para agotarlo: en el local se ve al instante.",
        },
        customers: {
          title: "Tus clientes",
          columns: ["Cliente", "Visitas", "Última", "Gasto", "Etiqueta"],
          rows: [
            { name: "Rosa Q.", visits: "14", last: "Hace 3 días", spend: "S/ 1,240", tag: "Frecuente" },
            { name: "Diego M.", visits: "9", last: "Hace 1 semana", spend: "S/ 860", tag: "Frecuente" },
            { name: "Familia Ríos", visits: "6", last: "Ayer", spend: "S/ 1,510", tag: "Ticket alto" },
            { name: "Karina S.", visits: "3", last: "Hace 2 semanas", spend: "S/ 290", tag: "Nuevo" },
            { name: "Oficina Miraflores", visits: "22", last: "Hoy", spend: "S/ 3,180", tag: "Corporativo" },
          ],
          note: "Se llena solo con los pedidos: tu equipo no registra nada a mano.",
        },
        analytics: {
          title: "Análisis del mes",
          marginLabel: "Margen por plato",
          margins: [
            { name: "Ají de gallina", value: 66 },
            { name: "Lomo saltado", value: 62 },
            { name: "Ceviche mixto", value: 58 },
            { name: "Anticuchos", value: 54 },
            { name: "Chicharrón", value: 41 },
          ],
          hoursLabel: "A qué hora se te llena",
          hours: [
            { label: "12h", value: 46 },
            { label: "13h", value: 88 },
            { label: "14h", value: 72 },
            { label: "19h", value: 54 },
            { label: "20h", value: 92 },
            { label: "21h", value: 78 },
            { label: "22h", value: 40 },
          ],
          insight: "Con estos datos de ejemplo, la hora de 20h mueve el doble que la de 19h.",
        },
      },
      ranges: ["1D", "7D", "30D"],
      kpis: [
        { label: "Ventas de hoy", value: "S/ 8,940", delta: "+18.2%" },
        { label: "Pedidos", value: "96", delta: "+12.4%" },
        { label: "Ticket promedio", value: "S/ 93.10", delta: "+4.1%" },
        { label: "Tiempo de cocina", value: "11m 20s", delta: "-9.3%" },
      ],
      revenue: "Ventas",
      vsLastWeek: "vs. semana anterior",
      timeLabels: ["9am", "12pm", "3pm", "6pm", "9pm"],
      ordersByChannel: "Pedidos por canal",
      channels: [
        { label: "Salón", value: 78 },
        { label: "Delivery", value: 62 },
        { label: "Para llevar", value: 44 },
        { label: "Mesa QR", value: 31 },
      ],
      liveOrders: "Pedidos en vivo",
      updatedJustNow: "Actualizado hace un momento",
      orders: [
        { table: "Mesa 12", items: "Lomo saltado x2", state: "Preparando" },
        { table: "Delivery", items: "Hamburguesa, papas", state: "En camino" },
        { table: "Mesa 04", items: "Ceviche, causa", state: "Servido" },
        { table: "Para llevar", items: "Pollo a la brasa x1", state: "Listo" },
      ],
    },
  },

  en: {
    nav: {
      links: ["What is included", "The dashboard", "Calculator", "Pricing", "Questions", "About us"],
      signIn: "Sign in",
      startFree: "Book my spot",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      langToggle: "ES",
      langName: "Español",
      theme: {
        toLight: "Switch to light mode",
        toDark: "Switch to dark mode",
      },
    },
    hero: {
      badge: "Lima · 5 founder spots this month",
      headlineWords: ["Your", "restaurant", "up", "and", "running", "in"],
      headlineAccent: "48 hours",
      headlineTail: "Without lifting a finger.",
      subheadline:
        "We load your menu, connect your order channels and put your kitchen and your numbers on one dashboard. You just open service and watch everything arrive in order.",
      ctaPrimary: "Book my spot",
      ctaSecondary: "See the live dashboard",
      ctaNote: "No commitment: 20 minutes on WhatsApp and you decide.",
      proof: [
        "20 minutes on WhatsApp, no commitment",
        "We migrate your menu for you",
        "Nothing to install",
        "No contracts, no lock-in: leave whenever you want.",
      ],
      offer: {
        eyebrow: "What the 48 hours look like",
        steps: [
          { time: "0h", title: "20 minutes on WhatsApp" },
          { time: "24h", title: "We load your menu and set it all up" },
          { time: "48h", title: "You open service, with us live" },
        ],
        includedLabel: "What your spot includes",
        included: [
          "Full menu migration, done by us (an S/ 500 service)",
          "Live support through your first Friday night",
          "Commission audit: what the delivery apps take from you today",
          "Menu engineering: which dishes make you money and which do not",
        ],
        priceTitle: "First month free",
        priceCopy:
          "After that, a flat fee with no commission per order. If your kitchen does not breathe easier, you leave without paying and with your menu ready.",
        dataNote:
          "No lock-in. If you leave, we export everything: your data is always yours.",
      },
    },
    marquee: [
      "No commission per order",
      "QR menu included",
      "Kitchen display",
      "Support in Spanish and English",
      "Your own ordering site",
    ],
    features: {
      eyebrow: "What's included",
      title: "What we leave set up for you",
      description:
        "Four things that today live in notebooks, WhatsApp and three different apps. In FoodFlow they live in one place.",
      items: [
        {
          title: "One order queue",
          copy: "No more orders lost between WhatsApp chats, phone calls and a notebook. Dine-in, pickup and delivery reach the kitchen with their priority already set.",
        },
        {
          title: "Kitchen display",
          copy: "Tickets in order and on a timer. No more shouting, no more lost paper.",
        },
        {
          title: "Digital menu and QR",
          copy: "Change a price once and it is changed on every table instantly.",
        },
        {
          title: "Today's numbers",
          copy: "What you sold, which dish carries a margin and when the place fills up.",
        },
      ],
      footnote: "And if you run more than one venue, it all adds up on the same dashboard.",
    },
    showcase: {
      eyebrow: "The dashboard",
      title: "The whole service on one screen",
      description:
        "Sales, open tickets, kitchen load and prep times while the shift is still running.",
      demoNote: "Demo dashboard. The figures are sample data.",
      chips: [
        { label: "Orders / hour · demo", value: "48" },
        { label: "Kitchen time · demo", value: "11:20" },
      ],
    },
    customSite: {
      productName: "FoodFlow Sites",
      eyebrow: "Included",
      title: "Your own ordering site, under your name",
      commission: "Every order through a delivery app costs you up to 30%. On your FoodFlow site: 0%.",
      description:
        "Your customers order straight from you on their phone, with nothing to download and no middleman taking a cut of every order.",
      items: [
        {
          title: "A menu that is always current",
          copy: "The same menu as the dashboard — no re-uploading a PDF every time a price changes.",
        },
        {
          title: "Orders that reach your kitchen",
          copy: "What the customer orders shows up on the kitchen display, not on yet another tablet.",
        },
        {
          title: "Bookings and WhatsApp",
          copy: "Table bookings and direct WhatsApp contact, which is how your customers actually write to you.",
        },
      ],
      footnote: "With your own domain, or a free foodflow.site address.",
      demo: {
        browserUrl: "tuburger.foodflow.site",
        brand: "Burger House",
        rating: "Open until 11:30 pm",
        tagline: "Handcrafted burgers, made to order",
        ctaMenu: "View menu",
        ctaReserve: "Book a table",
        menuLabel: "Menu",
        items: [
          { name: "Classic cheeseburger", price: "S/ 24.90" },
          { name: "Bacon BBQ burger", price: "S/ 31.90" },
          { name: "Veggie burger", price: "S/ 26.50" },
        ],
        reserveLabel: "Book a table",
        reserveFields: { date: "Date", time: "Time", guests: "Guests" },
        reserveButton: "Confirm booking",
        orderBar: "3 items · S/ 83.30",
        orderButton: "Order now",
        whatsappCta: "Order via WhatsApp",
      },
    },
    cta: {
      badge: "Lima pilot · limited spots",
      titleLead: "This month we take on only 5 restaurants:",
      titleAccent: "we set up and supervise every opening live.",
      paragraph:
        "Ask anything in the chat: plans, prices, what is included or how long setup takes. It answers instantly, with no sign-up and without leaving your email.",
      askPlans: "See the plans",
      askAnything: "Write to us on WhatsApp",
      plansLabel: "Start simple. Grow when your venue asks for it.",
      bullets: ["Set up in 48 hours", "30 days at no cost", "No contracts, no lock-in: leave whenever you want."],
      founder:
        "This month's 5 restaurants get: a founder price frozen for life (-10%), live support through their first Friday of service, and full menu migration free.",
      loginPrompt: "Already have an account?",
      loginCta: "Sign in",
    },
    leadForm: {
      eyebrow: "No phone calls",
      title: "We write to you in under 24 hours.",
      subtitle: "Zero spam calls: we only ever reach you by message.",
      exitTitle: "Leaving? Drop your WhatsApp and we write to you. No calls.",
      exitSubtitle: "One minute now and it all arrives by message, whenever you can read it.",
      fields: {
        nombre: { label: "Your name", placeholder: "Ana Quispe" },
        restaurante: { label: "Your restaurant", placeholder: "Cevichería El Muelle" },
        whatsapp: {
          label: "Your WhatsApp",
          placeholder: "987 654 321",
          hint: "9 digits, starting with 9.",
        },
        email: {
          label: "Your email",
          placeholder: "ana@yourrestaurant.pe",
          optional: "optional",
        },
      },
      consent: {
        before: "I have read and accept the ",
        link: "Privacy Policy",
        after:
          " and I authorise the processing of my personal data to receive information about FoodFlow.",
        error: "We need your authorisation before we can write to you.",
      },
      submit: "Write to me instead",
      sending: "Saving…",
      privacy: "Your details are only used to write to you about FoodFlow. Nothing else.",
      fieldErrors: {
        nombre: { required: "Write your name." },
        restaurante: { required: "Write your restaurant's name." },
        whatsapp: {
          required: "We need your WhatsApp to write to you.",
          format: "A Peruvian mobile: 9 digits starting with 9.",
        },
        email: { format: "Check the email, something is missing." },
      },
      formErrors: {
        invalid: "Check the marked fields and try again.",
        rate_limited:
          "We already have your details from a moment ago. If it is urgent, write to us on WhatsApp.",
        server:
          "We could not save your details. Write to us on WhatsApp and we sort it right now.",
      },
      success: {
        title: "Done, {nombre}. We write to you today on WhatsApp.",
        copy: "We saved your restaurant and your number. A message arrives, nothing else.",
        whatsapp: "Or write to us now on WhatsApp",
      },
      whatsappMessage:
        "Hi FoodFlow, I am {nombre} from {restaurante}. I want info on the founder spots.",
      whatsappMessageLoss:
        "Hi, I am {nombre} from {restaurante}. According to your calculator I lose {perdida}/month in commissions. I want it back.",
      close: "Close",
    },
    whatsapp: {
      label: "Write to us on WhatsApp",
      tooltip: "We answer on WhatsApp",
      message: "Hi FoodFlow, I saw your page and I want info on the founder spots.",
    },
    calculator: {
      eyebrow: "Calculator",
      title: "What do delivery apps actually cost you?",
      description:
        "Put in your own numbers and watch what commissions take. No sign-up: the result appears as you type.",
      salesLabel: "Monthly sales through delivery apps",
      salesHint: "Only what you sell through Rappi, PedidosYa and the like.",
      commissionLabel: "The commission they charge you",
      commissionHint: "Usually between 20% and 35% of every order.",
      ordersLabel: "Orders per month",
      ordersOptional: "optional",
      ordersHint: "If you have it handy, we work out what each order gives away.",
      resultLabel: "What commissions take",
      perMonth: "a month",
      perYear: "a year",
      perOrder: "That is {amount} of commission on every order.",
      foodflow: "On your FoodFlow site: S/ 0 per order.",
      cta: "I want that back",
      ctaNote: "We write to the number you leave, on WhatsApp. No calls.",
      empty: "Type how much you sell a month and the number appears.",
      disclaimer:
        "An estimate from your own numbers: we multiply your sales by the commission you enter. The exact figure is on the statement the app sends you.",
    },
    footer: {
      description:
        "Orders, kitchen, menu and numbers on one dashboard. Built in Lima for Lima restaurants.",
      emailCta: "Write to us",
      copyrightSuffix: "FoodFlow. All rights reserved.",
      signaturePrefix: "Built by",
    },
    pricing: {
      eyebrow: "Pricing",
      title: "Clear pricing, no commission per order",
      description:
        "All three include the digital menu, support in Spanish and English, and every update. No lock-in: change or cancel from one month to the next.",
      popular: "Most chosen",
      cta: "Book my spot",
      founder: {
        label: "Founder offer",
        headline: "Only 5 spots this month.",
        perks: [
          "Founder price frozen for life (–10%)",
          "Live support through your first Friday",
          "Menu migration free",
        ],
      },
      keyNotes: [
        "It runs on any phone, tablet or computer you already have. We do not sell hardware.",
        "Set up so your customers can pay with Yape, Plin or cash.",
      ],
      taxNote:
        "* Prices in Peruvian soles, before IGV (18% VAT). We issue a boleta or a factura against your RUC.",
      savingsNote: "Less than what you pay in commissions on a single Friday.",
      addonsLabel: "If you need more",
      addons: [
        {
          name: "Extra user",
          price: "S/ 15",
          unit: "/month",
          copy: "Add a waiter, a cashier or a kitchen station without changing plan.",
        },
        {
          name: "Extra venue",
          price: "S/ 99",
          unit: "/month",
          copy: "Each venue with its own menu and kitchen, all adding up on one dashboard.",
        },
        {
          name: "Menu migration",
          price: "Included",
          unit: " on the pilot",
          copy: "Outside the pilot programme it is a one-off S/ 500 service.",
        },
      ],
      note: "Pricing for the Lima pilot programme. If your venue needs something different, we work it out on WhatsApp.",
    },
    faq: {
      eyebrow: "Common questions",
      title: "What every owner asks before saying yes",
      items: [
        {
          q: "What happens if the internet drops mid-service?",
          a: "The dashboard runs in the browser, so it needs a connection to receive new orders and sync. If your internet cuts out, whatever is already on screen stays visible and you can finish the shift with it; when the connection is back, everything catches up. If your area has shaky internet, on WhatsApp we help you set up your phone data plan as a fallback.",
        },
        {
          q: "Do I have to buy tablets or special printers?",
          a: "No. It runs on the computer, tablet or phone you already have, in the browser, with nothing to install. If you already use a ticket printer, tell us the model on WhatsApp: we connect the ones that print over the network or from the browser.",
        },
        {
          q: "I already use another system (Domicilius, Sigo, a local POS). How do I move?",
          a: "You send us the export from your current system, the PDF of your menu or even a photo, and we load it during the 48 hours of the pilot. There is no automatic connector to those systems: we do the migration by hand, checking prices and categories with you before your first shift.",
        },
        {
          q: "Do the prices include IGV?",
          a: "No. The prices you see are in soles and before IGV (18% VAT). We issue a boleta or a factura against your RUC, and the factura counts as a deductible expense.",
        },
        {
          q: "Is there a lock-in or a penalty if I leave?",
          a: "None. You change plan or cancel from one month to the next in the dashboard itself, and if you leave we export your menu, orders and customers in a file ready to use anywhere.",
        },
        {
          q: "Who loads my menu, and how long does it take?",
          a: "We load it within the 48 hours of the pilot: the full menu with prices, categories and photos. After that you edit it yourself in two clicks and the change shows on every table instantly.",
        },
      ],
      more: "Missing one? Ask in the chat and you get an answer straight away.",
    },
    about: {
      eyebrow: "Who we are",
      title: "There is a person behind FoodFlow, not a call centre",
      body: [
        "I am Adonys. One Friday night I watched a venue with great food and full tables lose two orders between a notebook, three WhatsApp threads and a tablet on 3% battery. Nobody did anything wrong. Order was the only thing missing.",
        "I write software. That problem was already solved… for chains with an IT department and a six-figure budget. For the place on the corner, the choice was the notebook or handing an app a slice of every dish.",
        "So I built FoodFlow: orders in a single queue, the kitchen on a timer, and the day's numbers without opening a spreadsheet. In 48 hours, because your kitchen cannot stop for three months to try out software.",
      ],
      quote: "No dish should get lost between a notebook and a chat thread.",
      commitmentLabel: "What we commit to",
      commitment: [
        "We answer in Spanish or English, during service hours. No ticket system.",
        "Zero commission per order: what you sell is yours.",
        "Your data is yours and we export it the day you ask.",
        "We are in Lima. If it helps, we come round to your venue.",
      ],
      signature: "Adonys Pereda · Founder · Lima",
      photoNote: "Yes, that is me carrying the A. Lighter than a Friday with a full kitchen.",
      photoAlt:
        "Adonys Pereda's personal mark: a kneeling figure holding a letter A, ringed with rays, across their back.",
    },
    cookies: {
      banner: {
        text: "We use our own cookies to keep you signed in and to remember your language. Measurement cookies only run if you accept them.",
        accept: "Accept all",
        reject: "Only the necessary ones",
        more: "Read the policy",
        close: "Close this notice",
      },
      page: {
        title: "Cookie policy",
        updatedLabel: "Last updated",
        intro:
          "This policy explains what we store in your browser when you visit foodflow, and what for. It is short on purpose: we use the minimum needed for the site to work.",
        sections: [
          {
            title: "Necessary cookies",
            body: "They hold your session when you sign in to the dashboard and remember whether you accepted this notice. Without them you could not reach your account. They cannot be switched off, because the service would not work.",
          },
          {
            title: "Preferences",
            body: "Your browser local storage keeps three things: the language you chose (Spanish or English), whether you already left us your details, and whether we already showed you the leaving notice. That way we do not repeat ourselves on every visit. None of it leaves your device.",
          },
          {
            title: "Measurement and advertising",
            body: "We use no advertising cookies. If you accept this notice, we turn on Google Analytics to understand which pages get visited and improve the site; we use the anonymised IP and never cross that data with your account. If you choose 'Only the necessary ones', that measurement stays off. You can change your mind whenever you want by clearing the saved choice or from your browser settings.",
          },
          {
            title: "How to change your choice",
            body: "You can clear cookies from your browser settings at any time. If you clear this site data, the notice appears again and you can choose afresh.",
          },
          {
            title: "Contact",
            body: "Questions about this, or about your data? Write to us: the person who reads that inbox is the same one who answers on WhatsApp.",
          },
        ],
        back: "Back to the home page",
      },
    },
    chat: {
      launcher: "Questions? Ask us",
      title: "FoodFlow assistant",
      subtitle: "Instant answers, no sign-up",
      close: "Close the chat",
      greeting: [
        "Hi. Let me walk you through how FoodFlow works and what it costs.",
        "Pick a question or type your own.",
      ],
      suggestionsLabel: "Common questions",
      inputLabel: "Type your question",
      inputPlaceholder: "Type your question…",
      send: "Send",
      typing: "typing…",
      topics: [
        {
          id: "planes",
          question: "What plans are there and what do they cost?",
          keywords: ["plan", "plans", "price", "pricing", "cost", "how much", "fee", "monthly", "pay"],
          answer: [
            "There are three plans, from the simplest to the most complete. All of them include support in Spanish and English, and none of them charges a commission per order.",
          ],
          showPlans: true,
          followUps: ["piloto", "comision", "cambiar"],
        },
        {
          id: "piloto",
          question: "How does the 48-hour pilot work?",
          keywords: ["pilot", "48", "hours", "trial", "free", "start", "begin"],
          answer: [
            "Like this: 20 minutes on WhatsApp so you can send us your menu, 24 hours for us to set everything up (menu, table QRs, kitchen display and accounts for your team), and on the second day you open your first service with us live alongside you.",
            "Your spot includes the full menu migration (an S/ 500 service), live support through your first Friday night, an audit of what the delivery apps take from you today, and the analysis of which dishes carry a margin. The dashboard is not charged for the first 30 days.",
            "There is no lock-in, and if you leave we export your whole database ready to use anywhere.",
          ],
          followUps: ["carta", "equipos", "planes"],
        },
        {
          id: "incluye",
          question: "What exactly is included?",
          keywords: ["included", "include", "features", "what does it do", "functions"],
          answer: [
            "Four things on one dashboard: dine-in, pickup and delivery orders in a single queue; the kitchen display with a timer per ticket; your digital menu with table QRs; and the numbers of the day (what you sold, which dish carries a margin and when the place fills up).",
            "The Negocio plan adds your own ordering site under your name.",
          ],
          followUps: ["planes", "equipos", "comision"],
        },
        {
          id: "comision",
          question: "Do you charge a commission per order?",
          keywords: ["commission", "percentage", "cut", "delivery", "apps", "charge"],
          answer: [
            "No. You pay a flat monthly fee and nothing per order, whether you sell 50 or 500. Delivery apps do take a percentage of every sale; with your own ordering site that money stays with you.",
          ],
          followUps: ["planes", "web", "piloto"],
        },
        {
          id: "equipos",
          question: "Do I have to buy any equipment?",
          keywords: ["equipment", "hardware", "tablet", "computer", "install", "printer"],
          answer: [
            "You do not need to buy anything. It runs on the computer, tablet or phone you already have, in the browser, with nothing to install. If you already use a ticket printer, we connect it.",
          ],
          followUps: ["piloto", "incluye", "soporte"],
        },
        {
          id: "carta",
          question: "Who loads my menu?",
          keywords: ["menu", "load", "upload", "dishes", "photos"],
          answer: [
            "We do, during the pilot. Send us the PDF, a photo of your menu or the link you use today and we hand it back ready, with prices, categories and photos. After that you edit it yourself in two clicks and the change shows on every table instantly.",
          ],
          followUps: ["piloto", "planes", "incluye"],
        },
        {
          id: "web",
          question: "What is the ordering site like?",
          keywords: ["site", "website", "page", "domain", "online", "orders"],
          answer: [
            "It is your page, with your name and your menu, where customers order from their phone with nothing to download. The order lands straight on your kitchen display and the payment goes to your account.",
            "It comes with the Negocio plan, with your own domain or a free foodflow.site address.",
          ],
          followUps: ["planes", "comision", "piloto"],
        },
        {
          id: "cambiar",
          question: "Can I change or cancel my plan?",
          keywords: ["change", "cancel", "lock-in", "contract", "upgrade", "downgrade", "leave"],
          answer: [
            "Whenever you want, from the dashboard itself. You can move up or down a plan from one month to the next, and if you decide to leave there is no penalty and no lock-in contract: we export your menu, orders and customers in a file ready to use anywhere. Your data is always yours.",
          ],
          followUps: ["planes", "piloto", "soporte"],
        },
        {
          id: "soporte",
          question: "What if something breaks mid-service?",
          keywords: ["support", "break", "problem", "help", "internet", "down", "urgent"],
          answer: [
            "You write to us on WhatsApp and we answer during service hours, in Spanish, with no ticket system. During your first shift we are watching from start to finish.",
            "If your internet drops, what is already on screen stays visible so you can finish the shift, and everything catches up when the connection is back.",
          ],
          followUps: ["piloto", "equipos", "planes"],
        },
      ],
      plans: {
        label: "Plans",
        // REFERENCE PRICES — confirm the figures before publishing.
        items: [
          {
            name: "Carta",
            price: "S/ 79",
            period: "/month",
            tagline: "To get the menu in order",
            features: ["Digital menu and table QRs", "Change prices instantly", "1 venue · 1 user"],
          },
          {
            name: "Servicio",
            price: "S/ 179",
            period: "/month",
            tagline: "What most venues use",
            badge: "Most chosen",
            features: [
              "Everything in Carta",
              "Dine-in, pickup and delivery in one queue",
              "Kitchen display with timers",
              "Daily reports",
              "Up to 10 users",
            ],
          },
          {
            name: "Negocio",
            price: "S/ 349",
            period: "/month",
            tagline: "To grow, or for several venues",
            features: [
              "Everything in Servicio",
              "Your ordering site, 0% commission",
              "Margin per dish",
              "Several venues on one dashboard",
              "Priority support",
            ],
          },
        ],
        note: "On the pilot the first 30 days are not charged and the menu migration is included. None of the three charges a commission per order or asks for a lock-in.",
      },
      fallback: [
        "I do not know that one by heart, and I would rather not make up an answer.",
        "Let me hand you to a person who can answer it today.",
      ],
      handoff: {
        intro: "Shall we carry on over WhatsApp, or would you rather we wrote to you?",
        whatsapp: "Continue on WhatsApp",
        whatsappMessage: "Hi, I saw the FoodFlow site and I have a question about the Lima pilot.",
        email: "I would rather you wrote to me",
        emailPrompt: "Leave me your email and we will write to you today.",
        emailPlaceholder: "you@restaurant.com",
        emailSend: "Send",
        success: "Got it, noted. We will write to you today.",
        error: "I could not save that. Try again?",
      },
    },
    dashboard: {
      ariaLabel: "FoodFlow dashboard: sales, live orders and channel performance",
      browserUrl: "app.foodflow.site/overview",
      live: "LIVE",
      nav: ["Overview", "Orders", "Kitchen", "Menu", "Customers", "Analytics"],
      kitchenLoad: "Kitchen load",
      today: "Today · demo data",
      performanceOverview: "Service overview",
      demoHint: "Click through the menu and try the dashboard",
      views: {
        orders: {
          title: "Orders this shift",
          filters: ["All", "Dine-in", "Delivery", "Pickup"],
          columns: ["Order", "Source", "Detail", "Total", "Status"],
          rows: [
            {
              id: "#1042",
              source: "Table 12",
              items: "2x Lomo saltado · 1x Chicha morada",
              total: "S/ 96.00",
              state: "In kitchen",
            },
            {
              id: "#1041",
              source: "Delivery",
              items: "1x Rotisserie chicken · fries",
              total: "S/ 68.00",
              state: "On the way",
            },
            {
              id: "#1040",
              source: "Table 04",
              items: "2x Ceviche mixto · 1x Inca Kola",
              total: "S/ 84.50",
              state: "Served",
            },
            {
              id: "#1039",
              source: "Pickup",
              items: "3x Set lunch",
              total: "S/ 45.00",
              state: "Ready",
            },
            {
              id: "#1038",
              source: "Table 09",
              items: "1x Ají de gallina · 2x Lemonade",
              total: "S/ 52.00",
              state: "Served",
            },
          ],
          note: "Filter by channel. In the product, each row opens the full order.",
        },
        kitchen: {
          title: "Kitchen display",
          columns: ["Incoming", "In kitchen", "Ready"],
          tickets: [
            [
              { id: "#1043", items: "1x Tallarín saltado", time: "00:24" },
              { id: "#1044", items: "2x Anticuchos", time: "00:08" },
            ],
            [
              { id: "#1042", items: "2x Lomo saltado", time: "06:12" },
              { id: "#1040", items: "1x Arroz con mariscos", time: "13:48" },
            ],
            [{ id: "#1039", items: "3x Set lunch", time: "ready" }],
          ],
          lateLabel: "Running late",
          note: "The timer runs on its own and the ticket flags itself when it is late.",
        },
        menu: {
          title: "Your menu",
          columns: ["Dish", "Category", "Price", "Margin", "Status"],
          rows: [
            { name: "Lomo saltado", category: "Mains", price: "S/ 38.00", margin: "62%" },
            { name: "Ceviche mixto", category: "Starters", price: "S/ 42.00", margin: "58%" },
            { name: "Ají de gallina", category: "Mains", price: "S/ 32.00", margin: "66%" },
            { name: "Anticuchos", category: "Small plates", price: "S/ 26.00", margin: "54%" },
            { name: "Suspiro limeño", category: "Desserts", price: "S/ 18.00", margin: "71%" },
          ],
          availableLabel: "On sale",
          soldOutLabel: "Sold out",
          note: "Tap a dish status to mark it sold out: every table sees it instantly.",
        },
        customers: {
          title: "Your customers",
          columns: ["Customer", "Visits", "Last", "Spend", "Tag"],
          rows: [
            { name: "Rosa Q.", visits: "14", last: "3 days ago", spend: "S/ 1,240", tag: "Regular" },
            { name: "Diego M.", visits: "9", last: "A week ago", spend: "S/ 860", tag: "Regular" },
            { name: "Familia Ríos", visits: "6", last: "Yesterday", spend: "S/ 1,510", tag: "High ticket" },
            { name: "Karina S.", visits: "3", last: "Two weeks ago", spend: "S/ 290", tag: "New" },
            { name: "Oficina Miraflores", visits: "22", last: "Today", spend: "S/ 3,180", tag: "Corporate" },
          ],
          note: "It fills itself from the orders: nobody types anything by hand.",
        },
        analytics: {
          title: "This month",
          marginLabel: "Margin per dish",
          margins: [
            { name: "Ají de gallina", value: 66 },
            { name: "Lomo saltado", value: 62 },
            { name: "Ceviche mixto", value: 58 },
            { name: "Anticuchos", value: 54 },
            { name: "Chicharrón", value: 41 },
          ],
          hoursLabel: "When the place fills up",
          hours: [
            { label: "12h", value: 46 },
            { label: "13h", value: 88 },
            { label: "14h", value: 72 },
            { label: "19h", value: 54 },
            { label: "20h", value: 92 },
            { label: "21h", value: 78 },
            { label: "22h", value: 40 },
          ],
          insight: "On this sample data, the 20h hour moves twice what the 19h one does.",
        },
      },
      ranges: ["1D", "7D", "30D"],
      kpis: [
        { label: "Sales today", value: "S/ 8,940", delta: "+18.2%" },
        { label: "Orders", value: "96", delta: "+12.4%" },
        { label: "Avg ticket", value: "S/ 93.10", delta: "+4.1%" },
        { label: "Kitchen time", value: "11m 20s", delta: "-9.3%" },
      ],
      revenue: "Sales",
      vsLastWeek: "vs. last week",
      timeLabels: ["9am", "12pm", "3pm", "6pm", "9pm"],
      ordersByChannel: "Orders by channel",
      channels: [
        { label: "Dine-in", value: 78 },
        { label: "Delivery", value: 62 },
        { label: "Pickup", value: 44 },
        { label: "QR table", value: 31 },
      ],
      liveOrders: "Live orders",
      updatedJustNow: "Updated a moment ago",
      orders: [
        { table: "Table 12", items: "Lomo saltado x2", state: "Preparing" },
        { table: "Delivery", items: "Burger, fries", state: "On the way" },
        { table: "Table 04", items: "Ceviche, causa", state: "Served" },
        { table: "Pickup", items: "Rotisserie chicken x1", state: "Ready" },
      ],
    },
  },
};

export const LOCALE_STORAGE_KEY = "foodflow-lang";
export const DEFAULT_LOCALE = "es";
