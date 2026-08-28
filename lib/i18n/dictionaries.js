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
      links: ["Qué incluye", "El panel", "Tu web", "El piloto"],
      signIn: "Entrar",
      startFree: "Aplicar al piloto",
      openMenu: "Abrir menú",
      closeMenu: "Cerrar menú",
      langToggle: "EN",
      langName: "English",
    },
    hero: {
      badge: "Programa piloto en Lima · quedan 5 plazas",
      headlineWords: ["Tu", "restaurante", "funcionando", "en"],
      headlineAccent: "48 horas",
      headlineTail: "Sin que muevas un dedo.",
      subheadline:
        "Nosotros cargamos tu carta, conectamos tus canales de pedido y dejamos la cocina y los números en un solo panel. Tú solo abres el turno y miras cómo entra todo ordenado.",
      ctaPrimary: "Aplicar a una de las 5 plazas",
      ctaSecondary: "Ver el panel",
      proof: [
        "Llamada de 20 min, sin compromiso",
        "Migramos tu carta por ti",
        "Sin instalar nada",
        "Lo dejas cuando quieras",
      ],
      offer: {
        eyebrow: "Así son las 48 horas",
        steps: [
          { time: "0h", title: "Una llamada de 20 minutos" },
          { time: "24h", title: "Cargamos tu carta y montamos todo" },
          { time: "48h", title: "Abres tu turno, con nosotros en vivo" },
        ],
        includedLabel: "Lo que incluye tu plaza",
        included: [
          "Migración completa de tu carta, hecha por nosotros (un servicio de S/ 500)",
          "Acompañamiento en vivo tu primer viernes por la noche",
          "Auditoría de comisiones: cuánto se llevan hoy las apps de delivery",
          "Ingeniería de menú: qué platos te dejan dinero y cuáles no",
        ],
        priceTitle: "30 días de panel sin costo",
        priceCopy:
          "Si te quedas, congelas un 10% de descuento de por vida como Miembro Fundador.",
        dataNote:
          "Sin permanencia. Si te vas, te exportamos todo: tus datos siempre son tuyos.",
      },
    },
    marquee: [
      "Sin comisión por pedido",
      "Carta QR incluida",
      "Pantalla de cocina",
      "Soporte en español",
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
      footnote: "Con tu dominio propio o con una dirección foodflow.com gratuita.",
      demo: {
        browserUrl: "tuburger.foodflow.com",
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
      titleLead: "Quedan 5 plazas",
      titleAccent: "del piloto",
      paragraph:
        "Pregunta lo que quieras en el chat: planes, precios, qué incluye o cuánto tarda el montaje. Responde al instante, sin registrarte y sin dejar tu correo.",
      askPlans: "Ver los planes",
      askAnything: "Hacer una pregunta",
      plansLabel: "Planes desde lo más simple a lo más completo",
      bullets: ["Montaje en 48 horas", "30 días sin costo", "Lo dejas cuando quieras"],
      loginPrompt: "¿Ya tienes cuenta?",
      loginCta: "Entrar",
    },
    footer: {
      description:
        "Pedidos, cocina, carta y números en un solo panel. Hecho en Lima para restaurantes de Lima.",
      emailCta: "Escríbenos",
      copyrightSuffix: "FoodFlow. Todos los derechos reservados.",
      signaturePrefix: "Hecho por",
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
            "Tenemos tres planes, del más simple al más completo. Todos incluyen soporte en español y ninguno cobra comisión por pedido.",
          ],
          showPlans: true,
          followUps: ["piloto", "comision", "cambiar"],
        },
        {
          id: "piloto",
          question: "¿Cómo es el piloto de 48 horas?",
          keywords: ["piloto", "48", "horas", "prueba", "gratis", "empezar", "empiezo"],
          answer: [
            "Es así: una llamada de 20 minutos para que nos pases tu carta, 24 horas para que lo dejemos todo montado (carta, QR de mesas, cocina y usuarios de tu equipo) y al segundo día abres tu primer turno con nosotros conectados en vivo.",
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
            "Va incluida en el plan Negocio, con tu dominio propio o una dirección foodflow.com gratuita.",
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
            "Si se cae tu internet, los pedidos que ya están en cocina siguen visibles y se sincronizan en cuanto vuelve la conexión.",
          ],
          followUps: ["piloto", "equipos", "planes"],
        },
      ],
      plans: {
        label: "Planes",
        // PRECIOS DE REFERENCIA — confirma las cifras antes de publicar.
        items: [
          {
            name: "Carta",
            price: "S/ 79",
            period: "/mes",
            tagline: "Para empezar a ordenar la carta",
            features: [
              "Carta digital y QR de mesas",
              "Cambios de precio al instante",
              "Un local, un usuario",
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
              "Pedidos de salón, llevar y delivery en una cola",
              "Pantalla de cocina con cronómetro",
              "Reportes del día y del mes",
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
              "Tu web de pedidos con tu dominio",
              "Margen por plato y clientes recurrentes",
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
      browserUrl: "app.foodflow.com/resumen",
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
      links: ["What's included", "The dashboard", "Your site", "The pilot"],
      signIn: "Sign in",
      startFree: "Apply to the pilot",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      langToggle: "ES",
      langName: "Español",
    },
    hero: {
      badge: "Pilot programme in Lima · 5 spots left",
      headlineWords: ["Your", "restaurant", "up", "and", "running", "in"],
      headlineAccent: "48 hours",
      headlineTail: "Without lifting a finger.",
      subheadline:
        "We load your menu, connect your order channels and put your kitchen and your numbers on one dashboard. You just open service and watch everything arrive in order.",
      ctaPrimary: "Apply for one of the 5 spots",
      ctaSecondary: "See the dashboard",
      proof: [
        "A 20-minute call, no commitment",
        "We migrate your menu for you",
        "Nothing to install",
        "Leave whenever you want",
      ],
      offer: {
        eyebrow: "What the 48 hours look like",
        steps: [
          { time: "0h", title: "A 20-minute call" },
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
        priceTitle: "30 days of the dashboard at no cost",
        priceCopy:
          "Stay on and you lock a 10% lifetime discount as a Founding Member.",
        dataNote:
          "No lock-in. If you leave, we export everything: your data is always yours.",
      },
    },
    marquee: [
      "No commission per order",
      "QR menu included",
      "Kitchen display",
      "Support in Spanish",
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
      footnote: "With your own domain, or a free foodflow.com address.",
      demo: {
        browserUrl: "tuburger.foodflow.com",
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
      titleLead: "5 pilot spots",
      titleAccent: "are left",
      paragraph:
        "Ask anything in the chat: plans, prices, what is included or how long setup takes. It answers instantly, with no sign-up and without leaving your email.",
      askPlans: "See the plans",
      askAnything: "Ask a question",
      plansLabel: "Plans from the simplest to the most complete",
      bullets: ["Set up in 48 hours", "30 days at no cost", "Leave whenever you want"],
      loginPrompt: "Already have an account?",
      loginCta: "Sign in",
    },
    footer: {
      description:
        "Orders, kitchen, menu and numbers on one dashboard. Built in Lima for Lima restaurants.",
      emailCta: "Write to us",
      copyrightSuffix: "FoodFlow. All rights reserved.",
      signaturePrefix: "Built by",
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
            "There are three plans, from the simplest to the most complete. All of them include support in Spanish, and none of them charges a commission per order.",
          ],
          showPlans: true,
          followUps: ["piloto", "comision", "cambiar"],
        },
        {
          id: "piloto",
          question: "How does the 48-hour pilot work?",
          keywords: ["pilot", "48", "hours", "trial", "free", "start", "begin"],
          answer: [
            "Like this: a 20-minute call so you can send us your menu, 24 hours for us to set everything up (menu, table QRs, kitchen display and accounts for your team), and on the second day you open your first service with us live alongside you.",
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
            "It comes with the Negocio plan, with your own domain or a free foodflow.com address.",
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
            "If your internet drops, the orders already in the kitchen stay visible and sync as soon as the connection is back.",
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
            features: ["Digital menu and table QRs", "Instant price changes", "One venue, one user"],
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
              "Daily and monthly reports",
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
              "Your ordering site on your domain",
              "Margin per dish and returning customers",
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
      browserUrl: "app.foodflow.com/overview",
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
