/**
 * All page copy, in English and Spanish, mirrored key-for-key so components
 * can destructure the same shape regardless of language. Non-text data
 * (icons, tones, numeric values, hrefs) stays in the component files and is
 * paired with these by array index.
 */

export const dictionaries = {
  en: {
    nav: {
      links: ["Features", "Product", "How it works", "Results", "Sites"],
      signIn: "Sign in",
      startFree: "Start Free",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      langToggle: "ES",
      langName: "Español",
    },
    hero: {
      badge: "Now with AI demand forecasting",
      headlineWords: ["Turn", "Your", "Restaurant", "Into", "a"],
      headlineAccent: "Smart Business",
      subheadline:
        "FoodFlow brings every order, every ticket and every number into one real-time platform — so your kitchen runs calm, your team stops guessing, and your margins finally show up on a dashboard.",
      ctaPrimary: "Start Free",
      ctaSecondary: "See Demo",
      proof: ["No credit card", "Live in 10 minutes", "Cancel anytime"],
      chipOrders: "Orders / hour",
      chipFoodCost: "Food cost",
    },
    socialProof: {
      trust: "Trusted by fast-moving restaurant groups worldwide",
      stats: [
        { value: "2,400+", label: "restaurants running on FoodFlow" },
        { value: "$1.8B", label: "in orders processed last year" },
        { value: "99.99%", label: "uptime across peak dinner service" },
      ],
    },
    features: {
      eyebrow: "Platform",
      title: "Everything your restaurant runs on, in one place",
      description:
        "Four systems that usually live in four different tabs — rebuilt as one product that actually talks to itself.",
      items: [
        {
          title: "Smart Orders",
          copy: "Dine-in, delivery, pickup and QR tables land in one queue. Routing, modifiers and priority are handled before your staff even looks up.",
          points: ["Unified inbox", "Auto-routing", "Zero double entry"],
        },
        {
          title: "Real-Time Dashboard",
          copy: "Covers, tickets, prep times and revenue update the second they happen. Spot a bottleneck during service, not in next week’s report.",
          points: ["Live tickets", "Kitchen load", "Instant alerts"],
        },
        {
          title: "Customer Insights",
          copy: "Every guest gets a profile: what they order, how often they return, what brings them back. Turn one-time visits into regulars.",
          points: ["Guest profiles", "Repeat rate", "Segments"],
        },
        {
          title: "Sales Analytics",
          copy: "Margin by dish, hour and location. Know which plates carry the business and which ones quietly drain it.",
          points: ["Dish margin", "Peak hours", "Location compare"],
        },
      ],
      channelsDemo: ["Dine-in", "Delivery", "Pickup"],
      cohortSuffix: "+12k",
      footnote:
        "Plus inventory sync, staff scheduling, multi-location rollups and an open API.",
    },
    showcase: {
      eyebrow: "Product",
      title: "The dashboard your service actually revolves around",
      description:
        "Not a weekly PDF. A living view of the floor, the kitchen and the P&L — updating while the tickets are still open.",
      highlights: [
        {
          label: "Average revenue lift",
          copy: "Menu-level margin data plus upsell prompts at the point of order.",
        },
        {
          label: "Saved per week",
          copy: "Reconciliation, prep sheets and end-of-day reports generate themselves.",
        },
        {
          label: "Fewer order errors",
          copy: "One source of truth between front of house, kitchen and delivery apps.",
        },
      ],
    },
    howItWorks: {
      eyebrow: "How it works",
      title: "Three steps from chaos to control",
      description:
        "No migration project, no consultants. Most teams are running their first full service on FoodFlow the same day they sign up.",
      steps: [
        {
          title: "Receive Orders",
          copy: "Connect your channels once. Delivery apps, QR tables, phone and walk-ins all arrive in a single queue with modifiers and priority already sorted.",
          meta: "Setup: ~10 minutes",
        },
        {
          title: "Manage Kitchen",
          copy: "Tickets hit the kitchen display in the right order with live prep timers. Staff see what to fire next; you see the load before it becomes a wait.",
          meta: "Live ticket routing",
        },
        {
          title: "Track Performance",
          copy: "Every service feeds the dashboard: revenue, margins, repeat guests, peak hours. Decisions stop being opinions.",
          meta: "Reports build themselves",
        },
      ],
      stepLabel: "STEP",
    },
    benefits: {
      eyebrow: "Results",
      title: "What changes in the first 30 days",
      description:
        "FoodFlow pays for itself in the boring places first: fewer mistakes, less admin, tighter margins. The growth follows.",
      items: [
        {
          title: "Increase revenue",
          copy: "Upsells fire at the right moment, your best-margin dishes get promoted automatically, and no order is ever lost between channels.",
          points: ["Higher average ticket", "Fewer abandoned orders"],
        },
        {
          title: "Save time",
          copy: "Prep sheets, shift reports and reconciliation stop being manual work. Managers get their evenings back; owners get their weekends.",
          points: ["No manual reconciliation", "Reports on autopilot"],
        },
        {
          title: "Make better decisions",
          copy: "Menu engineering, staffing and purchasing driven by what actually happened last week — not what someone remembers happening.",
          points: ["Dish-level margins", "Demand forecasting"],
        },
      ],
      comparisonTitle: "Before vs. after FoodFlow",
      comparisonSubtitle: "Median across 2,400 venues, first 90 days",
      verified: "Verified",
      comparisonLabels: [
        "Order errors",
        "Time on reports",
        "Repeat guests",
        "Gross margin",
      ],
      joinedPrefix: "Joined by",
      joinedBold: "140+ venues",
      joinedSuffix: "in the last 30 days",
    },
    cta: {
      badge: "14-day free trial · no credit card",
      titleLead: "Start transforming your",
      titleAccent: "restaurant today",
      paragraph:
        "Import your menu, connect your channels, and run tonight’s service on FoodFlow. If it does not pay for itself in the first month, we will refund it.",
      emailLabel: "Work email",
      placeholder: "you@restaurant.com",
      button: "Start Free",
      success: "Check your inbox — your workspace is being prepared.",
      bullets: ["Setup in 10 minutes", "Works with your POS", "Cancel anytime"],
    },
    customSite: {
      eyebrow: "Another product",
      productName: "FoodFlow Sites",
      title: "The public side of your restaurant, built too",
      description:
        "FoodFlow Sites is the customer-facing counterpart to your dashboard — a menu, online ordering and a WhatsApp ordering button, live in days.",
      items: [
        {
          title: "Digital menu",
          copy: "A clean, mobile-first menu your guests can browse and order from directly.",
        },
        {
          title: "Online ordering",
          copy: "Guests order straight from the site — no third-party app fees eating into your margin.",
        },
        {
          title: "WhatsApp ordering",
          copy: "One tap sends the order straight to the WhatsApp number your team already uses.",
        },
      ],
      footnote:
        "Ask us to link it to your FoodFlow dashboard, so every order lands in the same place.",
      demo: {
        browserUrl: "burgerhouse.foodflow.com",
        brand: "Burger House",
        rating: "4.9 · 320+ reviews",
        tagline: "Handcrafted burgers, made to order",
        ctaMenu: "View menu",
        ctaReserve: "Reserve a table",
        menuLabel: "Menu",
        items: [
          { name: "Classic Cheeseburger", price: "$8.50" },
          { name: "Bacon BBQ Burger", price: "$10.90" },
          { name: "Veggie Burger", price: "$9.20" },
        ],
        reserveLabel: "Reserve a table",
        reserveFields: { date: "Date", time: "Time", guests: "Guests" },
        reserveButton: "Confirm reservation",
        orderBar: "3 items · $28.60",
        orderButton: "Order now",
        whatsappCta: "Order via WhatsApp",
      },
    },
    footer: {
      description:
        "The operating system for modern restaurants. Orders, kitchen and analytics in one real-time platform.",
      columns: [
        {
          title: "Product",
          links: ["Smart Orders", "Dashboard", "Analytics", "Integrations", "Pricing"],
        },
        {
          title: "Company",
          links: ["About", "Customers", "Careers", "Blog", "Contact"],
        },
        {
          title: "Resources",
          links: ["Docs", "API reference", "Status", "Changelog", "Support"],
        },
      ],
      copyrightSuffix: "FoodFlow, Inc. All rights reserved.",
      bottomLinks: ["Privacy", "Terms", "Security"],
    },
    dashboard: {
      ariaLabel: "FoodFlow dashboard: revenue, live orders and channel performance",
      browserUrl: "app.foodflow.com/overview",
      live: "LIVE",
      nav: ["Overview", "Orders", "Kitchen", "Menu", "Customers", "Analytics"],
      kitchenLoad: "Kitchen load",
      today: "Today · Downtown location",
      performanceOverview: "Performance overview",
      ranges: ["1D", "7D", "30D"],
      kpis: [
        { label: "Revenue today", value: "$12,480", delta: "+18.2%" },
        { label: "Orders", value: "342", delta: "+12.4%" },
        { label: "Avg ticket", value: "$36.49", delta: "+4.1%" },
        { label: "Avg prep time", value: "11m 20s", delta: "-9.3%" },
      ],
      revenue: "Revenue",
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
      updatedJustNow: "Updated just now",
      orders: [
        { table: "Table 12", items: "Truffle pasta x2", state: "Preparing" },
        { table: "Delivery", items: "Wagyu burger, fries", state: "On the way" },
        { table: "Table 04", items: "Margherita, tiramisu", state: "Served" },
        { table: "Pickup", items: "Poke bowl x3", state: "Ready" },
      ],
    },
  },

  es: {
    nav: {
      links: ["Funciones", "Producto", "Cómo funciona", "Resultados", "Sitios"],
      signIn: "Iniciar sesión",
      startFree: "Empieza gratis",
      openMenu: "Abrir menú",
      closeMenu: "Cerrar menú",
      langToggle: "EN",
      langName: "English",
    },
    hero: {
      badge: "Ahora con pronóstico de demanda con IA",
      headlineWords: ["Convierte", "Tu", "Restaurante", "En", "Un"],
      headlineAccent: "Negocio Inteligente",
      subheadline:
        "FoodFlow reúne cada pedido, cada ticket y cada cifra en una sola plataforma en tiempo real — para que tu cocina funcione con calma, tu equipo deje de adivinar y tus márgenes por fin aparezcan en un panel.",
      ctaPrimary: "Empieza gratis",
      ctaSecondary: "Ver demo",
      proof: ["Sin tarjeta de crédito", "Listo en 10 minutos", "Cancela cuando quieras"],
      chipOrders: "Pedidos / hora",
      chipFoodCost: "Costo de insumos",
    },
    socialProof: {
      trust: "La confianza de grupos gastronómicos que se mueven rápido en todo el mundo",
      stats: [
        { value: "2,400+", label: "restaurantes usando FoodFlow" },
        { value: "$1.8B", label: "en pedidos procesados el último año" },
        { value: "99.99%", label: "de disponibilidad en las horas pico" },
      ],
    },
    features: {
      eyebrow: "Plataforma",
      title: "Todo lo que hace funcionar a tu restaurante, en un solo lugar",
      description:
        "Cuatro sistemas que normalmente viven en cuatro pestañas distintas — reconstruidos como un solo producto que realmente se comunica consigo mismo.",
      items: [
        {
          title: "Pedidos Inteligentes",
          copy: "Salón, delivery, para llevar y mesas con QR llegan a una sola cola. El enrutamiento, los adicionales y la prioridad se resuelven antes de que tu equipo levante la vista.",
          points: ["Bandeja unificada", "Enrutamiento automático", "Cero doble captura"],
        },
        {
          title: "Panel en Tiempo Real",
          copy: "Cubiertos, tickets, tiempos de preparación e ingresos se actualizan al instante. Detecta un cuello de botella durante el servicio, no en el informe de la próxima semana.",
          points: ["Tickets en vivo", "Carga de cocina", "Alertas instantáneas"],
        },
        {
          title: "Información de Clientes",
          copy: "Cada comensal tiene un perfil: qué pide, cada cuánto vuelve, qué lo hace regresar. Convierte visitas únicas en clientes habituales.",
          points: ["Perfiles de clientes", "Tasa de retorno", "Segmentos"],
        },
        {
          title: "Análisis de Ventas",
          copy: "Margen por plato, hora y sucursal. Sabe qué platos sostienen el negocio y cuáles lo drenan en silencio.",
          points: ["Margen por plato", "Horas pico", "Comparar sucursales"],
        },
      ],
      channelsDemo: ["Salón", "Delivery", "Para llevar"],
      cohortSuffix: "+12k",
      footnote:
        "Además de sincronización de inventario, turnos de personal, consolidado multi-sucursal y una API abierta.",
    },
    showcase: {
      eyebrow: "Producto",
      title: "El panel alrededor del cual gira tu servicio",
      description:
        "No es un PDF semanal. Una vista viva del salón, la cocina y el estado de resultados — que se actualiza mientras los tickets siguen abiertos.",
      highlights: [
        {
          label: "Aumento promedio de ingresos",
          copy: "Datos de margen por plato más sugerencias de venta adicional en el momento del pedido.",
        },
        {
          label: "Ahorradas por semana",
          copy: "Conciliación, hojas de preparación e informes de cierre se generan solos.",
        },
        {
          label: "Menos errores en pedidos",
          copy: "Una sola fuente de verdad entre el salón, la cocina y las apps de delivery.",
        },
      ],
    },
    howItWorks: {
      eyebrow: "Cómo funciona",
      title: "Tres pasos del caos al control",
      description:
        "Sin proyecto de migración, sin consultores. La mayoría de los equipos completan su primer servicio con FoodFlow el mismo día que se registran.",
      steps: [
        {
          title: "Recibe Pedidos",
          copy: "Conecta tus canales una sola vez. Apps de delivery, mesas con QR, teléfono y clientes de paso llegan a una sola cola con adicionales y prioridad ya ordenados.",
          meta: "Configuración: ~10 minutos",
        },
        {
          title: "Gestiona la Cocina",
          copy: "Los tickets llegan a la pantalla de cocina en el orden correcto con temporizadores en vivo. El personal ve qué preparar a continuación; tú ves la carga antes de que se convierta en espera.",
          meta: "Enrutamiento de tickets en vivo",
        },
        {
          title: "Mide el Rendimiento",
          copy: "Cada servicio alimenta el panel: ingresos, márgenes, clientes recurrentes, horas pico. Las decisiones dejan de ser opiniones.",
          meta: "Los informes se arman solos",
        },
      ],
      stepLabel: "PASO",
    },
    benefits: {
      eyebrow: "Resultados",
      title: "Lo que cambia en los primeros 30 días",
      description:
        "FoodFlow se paga solo primero en lo aburrido: menos errores, menos administración, márgenes más ajustados. El crecimiento viene después.",
      items: [
        {
          title: "Aumenta los ingresos",
          copy: "Las ventas adicionales aparecen en el momento justo, tus platos de mejor margen se promocionan automáticamente y ningún pedido se pierde entre canales.",
          points: ["Ticket promedio más alto", "Menos pedidos abandonados"],
        },
        {
          title: "Ahorra tiempo",
          copy: "Las hojas de preparación, informes de turno y conciliaciones dejan de ser trabajo manual. Los encargados recuperan sus noches; los dueños, sus fines de semana.",
          points: ["Sin conciliación manual", "Informes en piloto automático"],
        },
        {
          title: "Toma mejores decisiones",
          copy: "Ingeniería de menú, personal y compras basadas en lo que realmente pasó la semana pasada — no en lo que alguien cree recordar.",
          points: ["Márgenes por plato", "Pronóstico de demanda"],
        },
      ],
      comparisonTitle: "Antes vs. después de FoodFlow",
      comparisonSubtitle: "Mediana entre 2,400 locales, primeros 90 días",
      verified: "Verificado",
      comparisonLabels: [
        "Errores en pedidos",
        "Tiempo en informes",
        "Clientes recurrentes",
        "Margen bruto",
      ],
      joinedPrefix: "Se sumaron",
      joinedBold: "más de 140 locales",
      joinedSuffix: "en los últimos 30 días",
    },
    cta: {
      badge: "14 días de prueba gratis · sin tarjeta de crédito",
      titleLead: "Empieza a transformar tu",
      titleAccent: "restaurante hoy",
      paragraph:
        "Importa tu menú, conecta tus canales y opera el servicio de esta noche con FoodFlow. Si no se paga solo en el primer mes, te devolvemos tu dinero.",
      emailLabel: "Correo de trabajo",
      placeholder: "tu@restaurante.com",
      button: "Empieza gratis",
      success: "Revisa tu correo — tu espacio de trabajo se está preparando.",
      bullets: ["Listo en 10 minutos", "Funciona con tu POS", "Cancela cuando quieras"],
    },
    customSite: {
      eyebrow: "Otro producto",
      productName: "FoodFlow Sites",
      title: "La cara pública de tu restaurante, también resuelta",
      description:
        "FoodFlow Sites es el complemento de tu panel de cara al cliente — un menú, pedidos en línea y un botón de pedidos por WhatsApp, listo en días.",
      items: [
        {
          title: "Menú digital",
          copy: "Un menú limpio y pensado para celular donde tus clientes ven y piden directamente.",
        },
        {
          title: "Pedidos en línea",
          copy: "Tus clientes piden directo desde el sitio — sin comisiones de apps de terceros que reduzcan tu margen.",
        },
        {
          title: "Pedidos por WhatsApp",
          copy: "Un toque envía el pedido directo al WhatsApp que tu equipo ya usa.",
        },
      ],
      footnote:
        "Pídenos conectarlo con tu panel de FoodFlow, para que todos los pedidos lleguen al mismo lugar.",
      demo: {
        browserUrl: "burgerhouse.foodflow.com",
        brand: "Burger House",
        rating: "4.9 · Más de 320 reseñas",
        tagline: "Hamburguesas artesanales, hechas al momento",
        ctaMenu: "Ver menú",
        ctaReserve: "Reservar mesa",
        menuLabel: "Menú",
        items: [
          { name: "Cheeseburger Clásica", price: "$8.50" },
          { name: "Bacon BBQ Burger", price: "$10.90" },
          { name: "Burger Vegetariana", price: "$9.20" },
        ],
        reserveLabel: "Reservar una mesa",
        reserveFields: { date: "Fecha", time: "Hora", guests: "Personas" },
        reserveButton: "Confirmar reserva",
        orderBar: "3 productos · $28.60",
        orderButton: "Pedir ahora",
        whatsappCta: "Pedir por WhatsApp",
      },
    },
    footer: {
      description:
        "El sistema operativo para restaurantes modernos. Pedidos, cocina y análisis en una sola plataforma en tiempo real.",
      columns: [
        {
          title: "Producto",
          links: ["Pedidos Inteligentes", "Panel", "Análisis", "Integraciones", "Precios"],
        },
        {
          title: "Empresa",
          links: ["Nosotros", "Clientes", "Empleo", "Blog", "Contacto"],
        },
        {
          title: "Recursos",
          links: ["Documentación", "Referencia de API", "Estado", "Novedades", "Soporte"],
        },
      ],
      copyrightSuffix: "FoodFlow, Inc. Todos los derechos reservados.",
      bottomLinks: ["Privacidad", "Términos", "Seguridad"],
    },
    dashboard: {
      ariaLabel: "Panel de FoodFlow: ingresos, pedidos en vivo y rendimiento por canal",
      browserUrl: "app.foodflow.com/resumen",
      live: "EN VIVO",
      nav: ["Resumen", "Pedidos", "Cocina", "Menú", "Clientes", "Análisis"],
      kitchenLoad: "Carga de cocina",
      today: "Hoy · Sucursal Centro",
      performanceOverview: "Resumen de rendimiento",
      ranges: ["1D", "7D", "30D"],
      kpis: [
        { label: "Ingresos de hoy", value: "$12,480", delta: "+18.2%" },
        { label: "Pedidos", value: "342", delta: "+12.4%" },
        { label: "Ticket prom.", value: "$36.49", delta: "+4.1%" },
        { label: "Tiempo prep. prom.", value: "11m 20s", delta: "-9.3%" },
      ],
      revenue: "Ingresos",
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
      updatedJustNow: "Actualizado justo ahora",
      orders: [
        { table: "Mesa 12", items: "Pasta trufada x2", state: "Preparando" },
        { table: "Delivery", items: "Hamburguesa wagyu, papas", state: "En camino" },
        { table: "Mesa 04", items: "Margarita, tiramisú", state: "Servido" },
        { table: "Para llevar", items: "Bowl poke x3", state: "Listo" },
      ],
    },
  },
};

export const LOCALE_STORAGE_KEY = "foodflow-lang";
export const DEFAULT_LOCALE = "en";
