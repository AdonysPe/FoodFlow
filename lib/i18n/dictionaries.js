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
      menu: "Menú",
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
      // Rendered as the h2 under the headline: the plain-language category, the
      // city, and nothing else. It is the one line on the home page that says
      // what FoodFlow *is* in the words a restaurant owner would search.
      tagline:
        "El sistema de pedidos y carta digital con QR para restaurantes de Lima.",
      subheadline:
        "Nosotros cargamos tu carta, conectamos tus canales de pedido y dejamos la cocina y los números en un solo panel. Tú solo abres el turno y miras cómo entra todo ordenado.",
      ctaPrimary: "Reservar mi plaza",
      ctaSecondary: "Ver demo",
      demoVideo: {
        title: "Demo de FoodFlow",
        close: "Cerrar video",
        duration: "22 segundos",
        explore: "Explorar el panel",
        fallback: "Tu navegador no puede reproducir este video.",
        openVideo: "Abrir video",
      },
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
        priceTitle: "Planes desde S/69/mes + IGV",
        priceCopy:
          "La prueba disponible y su duración se muestran al iniciar el checkout. Luego pagas una cuota sin comisión por pedido.",
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
        browserUrl: "fogonlimeno.foodflow.site",
        brand: "Fogón Limeño",
        rating: "Abierto hasta las 23:30",
        tagline: "Clásicos peruanos, hechos al momento",
        ctaMenu: "Ver carta",
        ctaReserve: "Reservar mesa",
        menuLabel: "Carta",
        items: [
          { name: "Lomo saltado", price: "S/ 32.90" },
          { name: "Ceviche clásico", price: "S/ 29.90" },
          { name: "Causa limeña", price: "S/ 20.50" },
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
      bullets: ["Montaje en 48 horas", "Prueba según elegibilidad", "Sin contratos ni permanencia: lo dejas cuando quieras."],
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
      eyebrow: "Calculadora de comisiones",
      // Rappi and PedidosYa are named outright, here and in the body: they are
      // how the question is actually typed into Google, and until now the two
      // brands appeared exactly once on the whole site, in a field hint.
      title: "¿Cuánto te cobran Rappi y PedidosYa al mes?",
      description:
        "Pon las ventas de tu local y mira lo que se va en comisiones de delivery. No hay que registrarse: el resultado aparece mientras escribes.",
      salesLabel: "Ventas al mes por apps de delivery",
      salesHint: "Solo lo que vendes por Rappi, PedidosYa y similares.",
      commissionLabel: "Comisión que te cobran",
      commissionHint: "Normalmente entre 20% y 35% de cada pedido.",
      ordersLabel: "Pedidos al mes",
      ordersOptional: "opcional",
      ordersHint: "Si lo tienes a mano, te decimos cuánto se lleva cada pedido.",
      resultLabel: "Lo que dejas en comisiones de Rappi y PedidosYa",
      perMonth: "al mes",
      perYear: "al año",
      perOrder: "Son {amount} de comisión en cada pedido.",
      foodflow: "Con tu web FoodFlow: S/ 0 por pedido.",
      cta: "Quiero recuperarlo",
      ctaNote: "Te escribimos por WhatsApp al número que dejes. Sin llamadas.",
      guideLink: "¿De dónde sale ese porcentaje? Mira el desglose de Rappi y PedidosYa",
      empty: "Escribe cuánto vendes al mes y verás el número.",
      disclaimer:
        "Es una estimación con tus propios números: multiplicamos tus ventas por la comisión que indicas. La cifra exacta está en la liquidación que te manda Rappi, PedidosYa o la app que uses.",
    },
    commissions: {
      eyebrow: "Comisiones de delivery",
      title: "¿Cuánto cobran Rappi y PedidosYa a un restaurante en Perú?",
      description:
        "La respuesta corta: entre el 20% y el 35% de cada pedido, más cobros que no salen en ese porcentaje. Acá está el desglose y cómo comprobarlo con tu propia liquidación.",
      // Ranges, never a single figure presented as fact: the rate is per
      // contract, changes with the plan and gets renegotiated. The page keeps
      // sending the reader back to their own liquidación, which is the only
      // number that is actually theirs.
      ratesTitle: "Lo que se lleva cada app",
      ratesNote:
        "No hay una tarifa pública y única: cada local firma la suya, y cambia según el plan, la antigüedad y lo que negocies. Estos son los rangos que se manejan en Lima.",
      rates: [
        {
          app: "Rappi",
          range: "20% – 30%",
          label: "por pedido",
          detail:
            "El tramo alto es cuando reparte su flota. Si entregas tú, suele bajar, pero pierdes la visibilidad que te dio entrar.",
        },
        {
          app: "PedidosYa",
          range: "20% – 30%",
          label: "por pedido",
          detail:
            "Mismo esquema: una tarifa si usas sus repartidores y otra si haces el delivery con tu gente.",
        },
        {
          app: "Tu web con FoodFlow",
          range: "0%",
          label: "por pedido",
          detail:
            "Pagas el plan mensual y nada más. El pedido entra a tu panel y el dinero va directo a tu cuenta.",
          highlight: true,
        },
      ],
      hiddenTitle: "Los cobros que no están en ese porcentaje",
      hiddenIntro:
        "El porcentaje es la parte visible. Al cerrar el mes, la liquidación suele traer además:",
      hidden: [
        {
          title: "El IGV sobre la comisión",
          body: "La comisión es un servicio que te facturan, así que lleva su 18% encima. Un 28% pactado no se siente como 28% cuando llega la factura.",
        },
        {
          title: "Las promociones que cofinancias",
          body: "El 2x1 o el descuento de la portada rara vez lo paga la app entero. Revisa qué porcentaje pusiste tú en cada campaña.",
        },
        {
          title: "La publicidad dentro de la app",
          body: "Aparecer arriba en tu categoría es un cobro aparte. Es opcional, pero sin él el volumen cae, y por eso casi nadie lo quita.",
        },
        {
          title: "El costo de cobrar",
          body: "La pasarela de pago y la transferencia de la liquidación también descuentan. Son céntimos por pedido que al mes se notan.",
        },
      ],
      exampleTitle: "Un ejemplo con números de Lima",
      exampleIntro:
        "Un local que vende S/ 20,000 al mes por apps, con una comisión del 28%:",
      exampleRows: [
        { label: "Ventas por apps al mes", value: "S/ 20,000" },
        { label: "Comisión del 28%", value: "− S/ 5,600" },
        { label: "Te queda", value: "S/ 14,400" },
      ],
      exampleFooter: "Al año son S/ 67,200 en comisiones.",
      exampleAside:
        "Con esa misma cifra pagas dieciséis años del plan Negocio de FoodFlow (S/ 339 al mes, S/ 4,068 al año). La diferencia no es el software: es de quién es el pedido.",
      optionsTitle: "Qué puedes hacer, de verdad",
      optionsIntro:
        "Salir de las apps de un día para otro es mal consejo: te traen clientes que no te conocen. Lo que funciona es dejar de depender solo de ellas.",
      options: [
        {
          title: "Quédate en las apps, pero mide",
          body: "Mira cuánto de tu venta viene de ahí y a qué costo. Si no lo tienes separado del resto, estás decidiendo a ciegas.",
        },
        {
          title: "Abre tu propio canal en paralelo",
          body: "Tu web de pedidos con tu nombre, tu carta y tu WhatsApp. El cliente que ya te conoce no necesita un intermediario para repetir.",
        },
        {
          title: "Dale una razón para pedirte directo",
          body: "Un precio algo mejor, un extra, o simplemente que llegue más rápido. Con lo que te ahorras en comisión hay margen de sobra.",
        },
        {
          title: "Pon el QR en la mesa y en la bolsa",
          body: "Quien ya comió en tu local es el más fácil de mover a tu canal. Un sticker en la bolsa del delivery hace más que una campaña.",
        },
      ],
      optionsLinkLabel: "Guía completa: cómo vender sin pagar comisión",
      faqTitle: "Preguntas frecuentes",
      faq: [
        {
          q: "¿Cuál es la comisión exacta que me cobran?",
          a: "Está en el contrato que firmaste y en la liquidación mensual que te manda la app. Es el único número real, porque la tarifa se negocia local por local. Si no la encuentras, pídesela a tu ejecutivo de cuenta por escrito.",
        },
        {
          q: "¿Es legal que cobren 30%?",
          a: "Sí. Es un acuerdo comercial entre dos empresas y no hay un tope legal en Perú. Lo que sí puedes hacer es negociarlo, sobre todo si tienes volumen o si haces tú el reparto.",
        },
        {
          q: "¿Puedo tener mi propia web de pedidos y seguir en Rappi?",
          a: "Sí, y es lo que hace la mayoría. Son canales distintos: las apps te traen gente nueva y tu web se queda con los que ya vuelven. Revisa solo que tu contrato no tenga cláusula de exclusividad.",
        },
        {
          q: "¿Cuánto cuesta tener mi propio canal de pedidos?",
          a: "Con FoodFlow, desde S/ 69 al mes el plan Carta, y S/ 339 el plan Negocio, que incluye tu web de pedidos con 0% de comisión. Es una cuota fija: vendas S/ 5,000 o S/ 50,000, pagas lo mismo.",
        },
      ],
      ctaTitle: "Haz la cuenta con tus números",
      ctaBody:
        "La calculadora usa tus ventas y tu comisión. No hay que registrarse y el resultado aparece mientras escribes.",
      ctaButton: "Abrir la calculadora",
      disclaimer:
        "Los porcentajes de esta página son rangos de mercado, no tarifas oficiales: cada contrato es distinto y cambian con el tiempo. Tu cifra exacta está en tu liquidación.",
    },
    sellDirect: {
      eyebrow: "Vender directo",
      costLabel: "Costo",
      payHeadMethod: "Forma de cobro",
      payHeadFee: "Te cuesta",
      payHeadNote: "A tener en cuenta",
      title: "Cómo vender delivery sin pagar comisión",
      description:
        "Los canales que puedes abrir tú, cuánto cuesta cada uno de verdad y en qué casos sigue conviniéndote estar en las apps. Sin recetas mágicas.",
      costTitle: "De dónde sale el problema",
      costBody:
        "Cada pedido que entra por una app deja entre el 20% y el 30% en el camino, y el cliente que lo hizo no es tuyo: es de la app. Vender directo no significa apagar Rappi mañana. Significa tener un canal propio al que ese cliente pueda volver.",
      costLinkLabel: "Ver el desglose de comisiones",
      channelsTitle: "Los cuatro canales propios",
      channelsIntro:
        "En orden de esfuerzo. Los dos primeros los puedes tener funcionando esta semana; los otros dos rinden más pero piden algo de montaje.",
      // Every channel carries a `catch`: the page is only useful if it says
      // what each option costs you, not just what it saves.
      channels: [
        {
          step: "1",
          title: "WhatsApp",
          body: "Ya lo tienes y tus clientes ya lo usan. Un número, un catálogo y el pedido llega directo.",
          cost: "S/ 0",
          catch:
            "El cuello de botella es humano: alguien tiene que leer, apuntar y confirmar cada pedido. A partir de unos 20 al día se convierte en errores y en comandas perdidas.",
        },
        {
          step: "2",
          title: "El QR en la mesa y en la bolsa",
          body: "Quien ya comió en tu local es el más fácil de traer a tu canal. Un sticker en la bolsa del delivery hace más que una campaña pagada.",
          cost: "Lo que cuesten los stickers",
          catch:
            "Solo alcanza a quien ya te conoce. No trae clientes nuevos, fideliza a los que tienes.",
        },
        {
          step: "3",
          title: "Tu propia web de pedidos",
          body: "Tu nombre, tu carta, tus precios. El pedido entra ordenado al panel y el cobro va a tu cuenta, sin intermediario.",
          cost: "Desde S/ 339 al mes con FoodFlow",
          catch:
            "Nadie la encuentra sola. Hay que llevarla tú: en el QR, en el perfil de Instagram, en el ticket y en el empaque.",
        },
        {
          step: "4",
          title: "Redes con enlace directo",
          body: "El enlace a tu carta en la bio de Instagram y en el perfil de Google. Es gratis y es donde te buscan cuando ya escucharon de ti.",
          cost: "S/ 0",
          catch:
            "Pide constancia. Un perfil con la última foto de hace seis meses transmite lo contrario de lo que quieres.",
        },
      ],
      payTitle: "Cómo cobras sin que te descuenten 30%",
      payIntro:
        "Cobrar directo tampoco es gratis del todo, pero la diferencia es de otro orden de magnitud. Los rangos dependen de tu banco y de tu proveedor: confírmalos antes de decidir.",
      payRows: [
        {
          method: "Yape o Plin",
          fee: "Sin costo por operación",
          note: "Lo más usado en Lima. Revisa con tu banco los límites diarios y si tu cuenta es de negocio.",
        },
        {
          method: "Transferencia",
          fee: "Sin costo o casi",
          note: "Cómodo para pedidos grandes y para empresas. Lento para un delivery de S/ 40.",
        },
        {
          method: "Efectivo contra entrega",
          fee: "Sin costo",
          note: "Cero fricción para el cliente. El costo es tuyo: manejar vuelto y cuadrar caja cada noche.",
        },
        {
          method: "Pasarela con tarjeta",
          fee: "≈ 3% – 5% + IGV",
          note: "Sí cobra, pero es una décima parte de una comisión de delivery. Compara Culqi, Izipay y Niubiz antes de firmar.",
        },
      ],
      deliveryTitle: "¿Y quién reparte?",
      deliveryIntro:
        "Es la pregunta que hace que la mayoría no dé el paso, y tiene tres respuestas razonables.",
      delivery: [
        {
          title: "Tu propio motorizado",
          body: "Sale a cuenta desde unos 15 o 20 pedidos al día en una zona chica. Por debajo de eso, el sueldo se come el ahorro.",
        },
        {
          title: "Un servicio de solo reparto",
          body: "Pagas por entrega, no un porcentaje de la venta. El cliente sigue siendo tuyo y el costo no crece si sube el ticket.",
        },
        {
          title: "Recojo en local",
          body: "El más ignorado y el más rentable: sin reparto, sin empaque extra y el cliente entra a tu local. Ofrécelo con algo a cambio.",
        },
      ],
      keepTitle: "Cuándo sí conviene seguir en las apps",
      keepIntro:
        "Esto no es una página para convencerte de salir. Hay casos claros en los que las apps siguen valiendo lo que cobran:",
      keep: [
        "Acabas de abrir y nadie sabe que existes. Estás pagando por descubrimiento, no por reparto.",
        "Tienes horas muertas que de otro modo no llenarías con nada.",
        "No tienes cómo repartir ni a quién pedirle que lo haga.",
        "Tu zona es de mucho tránsito y la app te pone delante de gente que pasa por ahí.",
      ],
      keepClose:
        "Lo sano es tener los dos: que la app te traiga gente nueva y que tu canal se quede con los que vuelven.",
      planTitle: "Un plan de cuatro semanas",
      planIntro:
        "Sin dejar las apps y sin parar el servicio. Una cosa por semana.",
      plan: [
        {
          week: "Semana 1",
          title: "Mide dónde estás",
          body: "Separa cuánto vendes por apps y cuánto directo, y cuánto pagaste de comisión el mes pasado. Sin ese número no sabrás si funcionó.",
        },
        {
          week: "Semana 2",
          title: "Abre el canal",
          body: "Deja tu carta en línea y el enlace publicado: bio de Instagram, perfil de Google, estado de WhatsApp.",
        },
        {
          week: "Semana 3",
          title: "Llévalo a la calle",
          body: "QR en cada mesa, sticker en cada bolsa de delivery, una línea en el ticket. Que el enlace esté donde ya está el cliente.",
        },
        {
          week: "Semana 4",
          title: "Dale una razón para repetir",
          body: "Algo que solo exista en tu canal: un extra, un precio algo mejor, entrega más rápida. Con lo que ahorras en comisión, hay margen.",
        },
      ],
      faqTitle: "Preguntas frecuentes",
      faq: [
        {
          q: "¿Puedo salirme de Rappi y PedidosYa de un día para otro?",
          a: "Puedes, pero rara vez es buena idea. Esas apps te traen clientes que no te conocen, y ese tráfico no se reemplaza en una semana. Lo que funciona es abrir tu canal en paralelo y mover poco a poco a los que ya repiten.",
        },
        {
          q: "¿Mi contrato me deja tener mi propia web de pedidos?",
          a: "Casi siempre sí, pero revísalo: algunos acuerdos incluyen cláusulas de exclusividad o de paridad de precios, que te obligan a no vender más barato por tu cuenta. Si tienes dudas, pídele a tu ejecutivo de cuenta que te lo confirme por escrito.",
        },
        {
          q: "¿Puedo poner precios más bajos en mi web que en la app?",
          a: "Depende de esa cláusula de paridad. Si tu contrato no la tiene, es la palanca más efectiva que existe: el cliente ve la diferencia y cambia de canal solo. Si la tiene, usa un extra o el delivery gratis en lugar del precio.",
        },
        {
          q: "¿Cuánto tarda en notarse?",
          a: "Los primeros pedidos directos suelen llegar en la primera semana, de clientes que ya te conocían y no sabían que podían pedirte sin la app. El cambio real, cuando tu canal pesa de verdad, se mide en meses y depende de cuánto lo empujes.",
        },
      ],
      ctaTitle: "Primero mira cuánto estás pagando",
      ctaBody:
        "La calculadora usa tus ventas y tu comisión. Sin registrarte, y el resultado aparece mientras escribes.",
      ctaButton: "Abrir la calculadora",
      disclaimer:
        "Las comisiones de pasarela y las condiciones de cobro cambian por proveedor y por acuerdo: confirma las tuyas antes de decidir. Las cláusulas de exclusividad están en el contrato que firmaste con cada app.",
    },
    customSiteSummary: {
      eyebrow: "Web propia",
      title: "Tu canal de pedidos, con tu nombre",
      description:
        "Una web breve no tiene que contarlo todo. Mira cómo tu carta, tus precios y tus pedidos pueden vivir en un canal propio conectado a la misma cocina.",
      button: "Ver la web de pedidos",
    },
    qrMenu: {
      eyebrow: "Carta digital QR",
      title: "Carta digital con QR para restaurantes en Lima",
      description:
        "Cambia precios o platos sin reimprimir, no obliga al comensal a descargar una app y funciona directamente en el navegador de su celular.",
      steps: [
        { number: "Paso 1", title: "Cargamos tu carta", body: "Pasamos tus categorías, platos, fotos, precios y disponibilidad al sistema." },
        { number: "Paso 2", title: "Generas los QR", body: "Creas el código de cada mesa y lo imprimes en el formato que ya usas en el local." },
        { number: "Paso 3", title: "El comensal escanea y pide", body: "Abre la carta en su navegador, elige y envía el pedido sin instalar nada." },
      ],
      demoTitle: "Una carta pública de verdad",
      demoBody: "La demo usa la misma ruta pública que recibe cada restaurante. Puedes abrirla, recorrer categorías y comprobar cómo se ve en el celular.",
      demoButton: "Abrir carta demo",
      planTitle: "Qué incluye el plan Carta",
      includes: [
        "Carta pública con enlace y QR propios.",
        "Cambios de precio y disponibilidad sin reimprimir.",
        "Pedidos desde la mesa en el navegador.",
        "Carga inicial y soporte en español e inglés.",
      ],
      notForTitle: "Cuándo no te hace falta",
      notForBody: "Si tu POS ya ofrece una carta QR que el equipo usa bien, sumar otra herramienta puede complicar la operación. Tampoco compensa si tu carta casi nunca cambia y una carta impresa cumple mejor la experiencia que quieres dar.",
      faqTitle: "Preguntas frecuentes",
      faq: [
        { q: "¿El cliente tiene que instalar una app?", a: "No. Escanea el QR y la carta abre en el navegador de su celular. No necesita una cuenta ni una descarga." },
        { q: "¿Puedo cambiar un precio durante el servicio?", a: "Sí. El cambio se publica en la carta digital sin imprimir códigos nuevos, porque el QR sigue apuntando a la misma dirección." },
        { q: "¿Necesito un QR distinto para cada mesa?", a: "Puedes usar uno general para consultar la carta o uno por mesa si quieres identificar de dónde llega el pedido." },
        { q: "¿Funciona fuera de Lima?", a: "La carta funciona por internet en cualquier lugar. El piloto y el acompañamiento de implementación están enfocados hoy en restaurantes de Lima." },
      ],
      ctaTitle: "Elige el plan que encaja con tu operación",
      ctaBody: "Compara qué incluye Carta y cómo puedes crecer después sin cambiar de sistema.",
      ctaButton: "Ver precios",
      pricingLink: "Ver precios y planes",
      orderingLink: "Conocer la web de pedidos",
    },
    rappiAlternative: {
      eyebrow: "Alternativa a Rappi",
      title: "Una alternativa a Rappi para tu restaurante",
      description: "Compara lo que realmente cambia al abrir un canal propio: comisión, relación con el cliente, reparto, alcance y costo mensual.",
      truthTitle: "No estás comparando dos cosas iguales",
      truthBody: "Rappi es un canal de descubrimiento con una audiencia y una flota. FoodFlow es el software para operar tu propio canal. Uno puede traer a quien no te conoce; el otro te permite atender y conservar a quien ya decidió comprarte.",
      compareTitle: "Rappi y un canal propio, lado a lado",
      compareHead: "Qué comparas",
      rows: [
        { label: "Comisión", rappi: "Rango habitual de 20% – 30%; confirma el porcentaje en tu contrato o liquidación.", foodflow: "0% por pedido." },
        { label: "De quién es el cliente", rappi: "La relación y los datos viven en la plataforma.", foodflow: "La relación directa es de tu restaurante." },
        { label: "Quién reparte", rappi: "La app o tu propia flota, según el acuerdo.", foodflow: "Tu equipo o un servicio de reparto por envío." },
        { label: "Quién trae gente nueva", rappi: "La app te expone a personas que todavía no te conocen.", foodflow: "Tú llevas el tráfico desde QR, redes, Google, tickets y empaques." },
        { label: "Costo mensual", rappi: "Variable: depende de ventas, comisión y cargos del contrato.", foodflow: "{price}" },
      ],
      loseTitle: "Lo que pierdes si sales de la app",
      loseIntro: "Cerrar el canal de golpe tiene un costo real. Antes de hacerlo, mide cuánto valor te entrega cada una de estas tres cosas:",
      losses: ["Visibilidad ante personas que no conocen tu restaurante.", "Una flota disponible sin contratar repartidores propios.", "Pedidos adicionales durante las horas de menor movimiento."],
      bothTitle: "La salida realista es usar los dos",
      bothBody: "Mantén la app para descubrir clientes nuevos y abre tu web para que quienes ya te conocen vuelvan directo. Mide ventas, costo y recurrencia por canal; reduce dependencia solo cuando los números de tu restaurante lo sostengan.",
      faqTitle: "Preguntas frecuentes",
      faq: [
        { q: "¿FoodFlow reemplaza a los repartidores de Rappi?", a: "No. FoodFlow recibe y organiza el pedido; el reparto lo hace tu equipo o un servicio que cobras por envío. Esa diferencia debe entrar en tu cálculo." },
        { q: "¿Tengo que salir de Rappi para usar FoodFlow?", a: "No. Los canales pueden funcionar al mismo tiempo y esa suele ser la transición más segura: descubrimiento en la app y recurrencia en tu canal propio." },
        { q: "¿Cuánto cobra Rappi exactamente?", a: "No existe una tarifa única para todos los locales. Los acuerdos varían; revisa tu contrato y tu liquidación para conocer tu porcentaje y los cargos adicionales." },
        { q: "¿Una web propia trae clientes nuevos?", a: "No por sí sola. Debes llevar personas desde tus mesas, empaques, redes, ficha de Google y clientes actuales. La web convierte ese interés en pedidos directos." },
      ],
      ctaTitle: "Compara con tus propios números",
      ctaBody: "Pon tus ventas y el porcentaje de tu liquidación. La calculadora muestra cuánto se va cada mes, sin registro.",
      ctaButton: "Abrir la calculadora",
      commissionsLink: "Ver el desglose de comisiones",
      directLink: "Leer la guía para vender directo",
    },
    orderingSite: {
      eyebrow: "Web de pedidos",
      title: "Página web de pedidos para tu restaurante en Perú",
      description: "Tu dominio, tu carta y tus precios en un canal propio, con 0% de comisión por pedido. Cada venta entra al mismo panel que los demás canales.",
      flowTitle: "Un pedido, una sola cola de trabajo",
      flowIntro: "El cliente compra en tu web, pero el equipo no tiene que vigilar otra pantalla. FoodFlow reúne el pedido con el resto de la operación.",
      flow: [
        { title: "Entra por tu web", body: "El cliente elige desde tu carta y envía el pedido con sus datos y forma de pago." },
        { title: "Llega al mismo panel", body: "El pedido aparece junto con los demás canales, con origen y estado visibles." },
        { title: "Cocina trabaja una cola", body: "La comanda usa la misma pantalla de cocina; no hay que volver a copiar el pedido." },
      ],
      payTitle: "Cómo cobras los pedidos",
      payIntro: "Puedes empezar con métodos directos o conectar una pasarela. Las condiciones cambian por banco y proveedor: confirma siempre las tuyas antes de decidir.",
      payHeadMethod: "Forma de cobro",
      payHeadCost: "Rango de costo",
      payHeadNote: "Qué considerar",
      payRows: [
        { method: "Yape o Plin", cost: "Sin comisión por transacción", note: "Revisa límites diarios y las condiciones de tu cuenta bancaria o empresarial." },
        { method: "Transferencia", cost: "Gratis o casi gratis", note: "Útil para pedidos grandes; requiere verificar el abono antes de preparar." },
        { method: "Efectivo", cost: "Sin comisión", note: "Necesita sencillo, control de caja y conciliación al cierre." },
        { method: "Pasarela de tarjeta", cost: "≈ 3% – 5% + IGV", note: "El rango depende del proveedor y del acuerdo. Compara tu propia cotización antes de contratar." },
      ],
      honestTitle: "Una web propia no trae tráfico sola",
      honestBody: "Publicarla es el inicio, no la adquisición. Funciona cuando la dirección aparece donde tus clientes ya interactúan contigo:",
      traffic: ["QR en mesas y mostrador.", "Enlace en redes y ficha de Google.", "Dirección impresa en tickets.", "Sticker o mensaje en cada empaque."],
      planTitle: "Incluida en el plan Negocio",
      planBody: "La web se conecta con pedidos, carta y cocina. El precio mensual sale del mismo catálogo que ves en la página de planes.",
      faqTitle: "Preguntas frecuentes",
      faq: [
        { q: "¿Puedo usar mi propio dominio?", a: "Sí. La web puede publicarse con la identidad y el dominio de tu restaurante, manteniendo tu carta y tus precios." },
        { q: "¿FoodFlow cobra comisión por cada pedido?", a: "No. Pagas el plan mensual y FoodFlow no descuenta un porcentaje de la venta. Tu banco o pasarela sí puede cobrar según su contrato." },
        { q: "¿Dónde aparece el pedido?", a: "En el mismo panel y la misma pantalla de cocina que usa el resto de tus canales, identificado por su origen y dentro de una sola cola." },
        { q: "¿Quién lleva clientes a la web?", a: "Tu restaurante. El canal debe promocionarse con QR, redes, Google, tickets y empaques. Una web publicada sin distribución no genera demanda por sí sola." },
      ],
      ctaTitle: "Revisa qué incluye cada plan",
      ctaBody: "Compara Carta, Operación y Negocio desde la fuente única de precios del sitio.",
      ctaButton: "Ver precios",
      directLink: "Cómo vender sin pagar comisión",
      qrLink: "Ver la carta digital con QR",
      pricingLink: "Comparar todos los planes",
    },
    footer: {
      description:
        "Pedidos, cocina, carta y números en un solo panel. Hecho en Lima para restaurantes de Lima.",
      emailCta: "Escríbenos",
      followUs: "Síguenos",
      copyrightSuffix: "FoodFlow. Todos los derechos reservados.",
      signaturePrefix: "Hecho por",
    },
    pricing: {
      eyebrow: "Precios",
      title: "Precios claros, sin comisión por pedido",
      description:
        "Los tres incluyen carta digital, soporte en español e inglés y actualizaciones. Sin permanencia: cambias o cancelas de un mes a otro.",
      popular: "Más elegido",
      cta: "Elegir plan",
      founder: {
        label: "Oferta Fundador",
        headline: "Solo 5 plazas este mes.",
        perks: [
          "Precio congelado de por vida (–10%)",
          "Acompañamiento en vivo en tu primer viernes",
          "Migración de carta gratis: Nosotros digitamos y montamos tu menú completo en < 24h. Tú no haces nada.",
        ],
      },
      keyNotes: [
        "Funciona en cualquier celular, tablet o computadora que ya tengas. No vendemos hardware.",
        "Optimizado para que tus clientes paguen con Yape, Plin o efectivo.",
      ],
      taxNote:
        "Precios en soles + IGV (18%). Emitimos boleta o factura electrónica a tu RUC.",
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
          copy: "Migración de carta gratis: Nosotros digitamos y montamos tu menú completo en < 24h. Tú no haces nada.",
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
          a: "Nos pasas la exportación de tu sistema actual, el PDF de la carta o incluso una foto, y nosotros digitamos y montamos tu menú completo en menos de 24 horas. No hay una conexión automática con esos sistemas: la migración la hacemos a mano, revisando precios y categorías contigo antes de abrir tu primer turno.",
        },
        {
          q: "¿Los precios incluyen IGV?",
          a: "No. El IGV (18%) se suma a los precios publicados. Emitimos boleta o factura electrónica a tu RUC, y la factura te sirve como gasto deducible.",
        },
        {
          q: "¿Hay permanencia o penalidad si me quiero ir?",
          a: "Ninguna. Cambias de plan o cancelas de un mes a otro desde el mismo panel, y si te vas te exportamos la carta, los pedidos y los clientes en un archivo listo para usar donde quieras.",
        },
        {
          q: "¿Quién carga mi carta y cuánto demora?",
          a: "Digitamos y montamos tu menú completo en menos de 24 horas. Después la editas tú en dos clics y el cambio se ve al instante en todas las mesas.",
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
      photoNote: "Sí, ese soy yo. La foto es de antes de que FoodFlow me quitara el sueño.",
      photoAlt: "Retrato de Adonys Pereda al aire libre, con cielo y césped de fondo.",
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
            "Tu plaza incluye la migración completa de la carta, acompañamiento en tu primer viernes por la noche, una auditoría de lo que se llevan hoy las apps de delivery y el análisis de qué platos te dejan margen. Si tienes una prueba disponible, verás su duración al iniciar el checkout.",
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
            price: "S/ 69",
            period: "/mes",
            tagline: "Para tener tu carta digital lista hoy",
            features: [
              "Carta digital y un QR para cada mesa",
              "Cambias precios y horarios al instante, sin llamarnos",
              "1 local · 1 usuario",
            ],
          },
          {
            name: "Servicio",
            price: "S/ 169",
            period: "/mes",
            tagline: "El que usan la mayoría",
            badge: "Más elegido",
            features: [
              "Todo lo de Carta",
              "Comanda con cobro inteligente para tus mozos",
              "Cocina: pendiente, en preparación y listo",
              "Plano de mesas, reservas y QR para pedir desde la mesa",
              "Integración nativa con facturación electrónica SUNAT",
              "Hasta 10 usuarios, dueño incluido",
            ],
          },
          {
            name: "Negocio",
            price: "S/ 339",
            period: "/mes",
            tagline: "Ideal para dark kitchens o cadenas",
            features: [
              "Todo lo de Servicio",
              "Tu web de pedidos propia, 0% de comisión",
              "Control de food cost y recetas estandarizadas para maximizar tu margen",
              "Integración nativa con facturación electrónica SUNAT",
              "Varios locales en un solo panel",
              "Soporte prioritario",
            ],
          },
        ],
      note: "La duración de cualquier prueba disponible se confirma al iniciar el checkout. Ningún plan cobra comisión por pedido ni exige permanencia.",
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
      periods: { "1d": "Hoy", "7d": "Últimos 7 días", "30d": "Últimos 30 días" },
      demoSuffix: "datos de demostración",
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
      kpiLabels: {
        sales: { "1d": "Ventas de hoy", "7d": "Ventas · 7 días", "30d": "Ventas · 30 días" },
        orders: "Pedidos",
        avgTicket: "Ticket promedio",
        kitchen: "Tiempo de cocina",
      },
      revenue: "Ventas",
      legendCurrent: "Actual",
      comparedTo: {
        "1d": "vs. ayer a esta hora",
        "7d": "vs. 7 días anteriores",
        "30d": "vs. 30 días anteriores",
      },
      before: "antes",
      weekdays: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Hoy"],
      dayWord: "Día",
      ordersByChannel: "Pedidos por canal",
      ordersWord: "pedidos",
      channels: [
        { label: "Salón", count: 35 },
        { label: "Delivery", count: 28 },
        { label: "Para llevar", count: 20 },
        { label: "Web y QR", count: 13 },
      ],
      liveOrders: "Pedidos en vivo",
      tapHint: "Toca un pedido para avanzarlo",
      newBadge: "Nuevo",
      liveStates: { pending: "En cola", preparing: "Preparando", ready: "Listo", served: "Servido" },
      // Where the simulated service starts. `state` and `minutes` are data,
      // the rest is copy; the panel advances them on its own while in view.
      orders: [
        { table: "Mesa 12", items: "Lomo saltado x2", total: 96, state: "preparing", minutes: 9, channel: 0 },
        { table: "Delivery", items: "Hamburguesa, papas", total: 68, state: "ready", minutes: 14, channel: 1 },
        { table: "Mesa 04", items: "Ceviche, causa", total: 84.5, state: "served", minutes: 22, channel: 0 },
        { table: "Para llevar", items: "Pollo a la brasa x1", total: 45, state: "ready", minutes: 6, channel: 2 },
        { table: "Mesa 09", items: "Ají de gallina, limonada", total: 52, state: "pending", minutes: 2, channel: 0 },
      ],
      // What walks in next, in order, while the visitor watches.
      incoming: [
        { table: "Mesa 07", items: "Tiradito nikkei, chicha", total: 74, channel: 0 },
        { table: "Delivery", items: "Chaufa de pollo x2", total: 58, channel: 1 },
        { table: "Mesa 02", items: "Anticuchos, papa a la huancaína", total: 66, channel: 0 },
        { table: "Para llevar", items: "Menú del día x3", total: 45, channel: 2 },
        { table: "Mesa 11", items: "Causa limeña, pisco sour x2", total: 89, channel: 0 },
        { table: "Delivery", items: "Arroz con mariscos", total: 62, channel: 1 },
        { table: "Web · Recojo", items: "Lomo saltado, inca kola", total: 48, channel: 3 },
      ],
      kitchenCard: {
        active: "en marcha",
        segments: ["En cola", "Preparando", "Listos"],
        readyOne: "pedido listo esperando salir",
        readyMany: "pedidos listos esperando salir",
      },
    },
  },

  en: {
    nav: {
      links: ["What is included", "The dashboard", "Calculator", "Pricing", "Questions", "About us"],
      signIn: "Sign in",
      startFree: "Book my spot",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      menu: "Menu",
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
      tagline: "The order system and QR menu for restaurants in Lima.",
      subheadline:
        "We load your menu, connect your order channels and put your kitchen and your numbers on one dashboard. You just open service and watch everything arrive in order.",
      ctaPrimary: "Book my spot",
      ctaSecondary: "Watch demo",
      demoVideo: {
        title: "FoodFlow demo",
        close: "Close video",
        duration: "22 seconds · Spanish",
        explore: "Explore the dashboard",
        fallback: "Your browser cannot play this video.",
        openVideo: "Open video",
      },
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
        priceTitle: "Plans from S/69/month + IGV",
        priceCopy:
          "Any available trial and its duration are shown when you start checkout. After that, pay one flat fee with no commission per order.",
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
        browserUrl: "fogonlimeno.foodflow.site",
        brand: "Fogón Limeño",
        rating: "Open until 11:30 pm",
        tagline: "Peruvian classics, cooked to order",
        ctaMenu: "View menu",
        ctaReserve: "Book a table",
        menuLabel: "Menu",
        items: [
          { name: "Lomo saltado", price: "S/ 32.90" },
          { name: "Classic ceviche", price: "S/ 29.90" },
          { name: "Lima-style causa", price: "S/ 20.50" },
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
      bullets: ["Set up in 48 hours", "Trial based on eligibility", "No contracts, no lock-in: leave whenever you want."],
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
      eyebrow: "Commission calculator",
      title: "What do Rappi and PedidosYa cost you each month?",
      description:
        "Put in your venue's sales and watch what delivery commissions take. No sign-up: the result appears as you type.",
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
      guideLink: "Where does that percentage come from? See the Rappi and PedidosYa breakdown",
      empty: "Type how much you sell a month and the number appears.",
      disclaimer:
        "An estimate from your own numbers: we multiply your sales by the commission you enter. The exact figure is on the statement the app sends you.",
    },
    commissions: {
      eyebrow: "Delivery commissions",
      title: "What do Rappi and PedidosYa charge a restaurant in Peru?",
      description:
        "The short answer: 20% to 35% of every order, plus costs that are not in that percentage. Here is the breakdown, and how to check it against your own statement.",
      ratesTitle: "What each app takes",
      ratesNote:
        "There is no single public rate: every venue signs its own, and it changes with the plan, how long you have been on it and what you negotiate. These are the ranges seen in Lima.",
      rates: [
        {
          app: "Rappi",
          range: "20% – 30%",
          label: "per order",
          detail:
            "The high end is when their couriers deliver. Doing it yourself usually lowers it, but costs you the visibility you joined for.",
        },
        {
          app: "PedidosYa",
          range: "20% – 30%",
          label: "per order",
          detail:
            "Same structure: one rate when you use their riders, another when your own staff delivers.",
        },
        {
          app: "Your own site with FoodFlow",
          range: "0%",
          label: "per order",
          detail:
            "You pay the monthly plan and nothing else. The order lands in your dashboard and the money goes straight to your account.",
          highlight: true,
        },
      ],
      hiddenTitle: "The charges that percentage leaves out",
      hiddenIntro:
        "The rate is the visible part. At month end the statement usually also carries:",
      hidden: [
        {
          title: "VAT on the commission",
          body: "The commission is a service they invoice you, so it carries 18% on top. An agreed 28% does not feel like 28% once the invoice lands.",
        },
        {
          title: "Promotions you co-fund",
          body: "The 2-for-1 or the front-page discount is rarely paid by the app alone. Check what share you put in on each campaign.",
        },
        {
          title: "Advertising inside the app",
          body: "Ranking at the top of your category is billed separately. It is optional, but volume drops without it, which is why almost nobody drops it.",
        },
        {
          title: "The cost of getting paid",
          body: "The payment gateway and the payout transfer take their cut too. Cents per order that add up over a month.",
        },
      ],
      exampleTitle: "A worked example, in soles",
      exampleIntro:
        "A venue selling S/ 20,000 a month through apps, at a 28% commission:",
      exampleRows: [
        { label: "Monthly sales through apps", value: "S/ 20,000" },
        { label: "Commission at 28%", value: "− S/ 5,600" },
        { label: "You keep", value: "S/ 14,400" },
      ],
      exampleFooter: "That is S/ 67,200 a year in commissions.",
      exampleAside:
        "That same figure pays for sixteen years of FoodFlow's Negocio plan (S/ 339 a month, S/ 4,068 a year). The difference is not the software: it is who the order belongs to.",
      optionsTitle: "What you can actually do",
      optionsIntro:
        "Walking out of the apps overnight is bad advice: they bring you people who have never heard of you. What works is no longer depending on them alone.",
      options: [
        {
          title: "Stay on the apps, but measure",
          body: "Know how much of your revenue comes from there and at what cost. If it is not separated from the rest, you are deciding blind.",
        },
        {
          title: "Open your own channel alongside",
          body: "Your ordering site, with your name, your menu and your WhatsApp. A customer who already knows you does not need a middleman to order again.",
        },
        {
          title: "Give them a reason to order direct",
          body: "A slightly better price, an extra, or simply arriving faster. What you save on commission leaves plenty of room.",
        },
        {
          title: "Put the QR on the table and in the bag",
          body: "Whoever already ate at your place is the easiest to move to your own channel. A sticker on the delivery bag beats a campaign.",
        },
      ],
      optionsLinkLabel: "Full guide: how to sell without paying commission",
      faqTitle: "Frequently asked questions",
      faq: [
        {
          q: "What exactly am I being charged?",
          a: "It is in the contract you signed and in the monthly statement the app sends you. That is the only real number, because the rate is negotiated venue by venue. If you cannot find it, ask your account manager for it in writing.",
        },
        {
          q: "Is a 30% commission even legal?",
          a: "Yes. It is a commercial agreement between two companies and there is no legal cap in Peru. What you can do is negotiate it, especially with volume or if you handle delivery yourself.",
        },
        {
          q: "Can I run my own ordering site and stay on Rappi?",
          a: "Yes, and most venues do. They are different channels: the apps bring new people, your own site keeps the ones who already come back. Just check your contract for an exclusivity clause.",
        },
        {
          q: "What does my own ordering channel cost?",
          a: "With FoodFlow, from S/ 69 a month for the Carta plan, and S/ 339 for Negocio, which includes your ordering site at 0% commission. It is a flat fee: sell S/ 5,000 or S/ 50,000 and you pay the same.",
        },
      ],
      ctaTitle: "Run the numbers with your own figures",
      ctaBody:
        "The calculator uses your sales and your commission. No sign-up, and the result appears as you type.",
      ctaButton: "Open the calculator",
      disclaimer:
        "The percentages on this page are market ranges, not official rates: every contract differs and they change over time. Your exact figure is on your statement.",
    },
    sellDirect: {
      eyebrow: "Sell direct",
      costLabel: "Cost",
      payHeadMethod: "Payment method",
      payHeadFee: "It costs you",
      payHeadNote: "Worth knowing",
      title: "How to sell delivery without paying commission",
      description:
        "The channels you can open yourself, what each really costs, and when staying on the apps still makes sense. No magic recipes.",
      costTitle: "Where the problem comes from",
      costBody:
        "Every order through an app leaves 20% to 30% behind, and the customer who placed it is not yours: they belong to the app. Selling direct does not mean switching Rappi off tomorrow. It means having a channel of your own that customer can come back to.",
      costLinkLabel: "See the commission breakdown",
      channelsTitle: "The four channels of your own",
      channelsIntro:
        "In order of effort. The first two can be running this week; the other two pay off more but need some setup.",
      channels: [
        {
          step: "1",
          title: "WhatsApp",
          body: "You already have it and your customers already use it. One number, a catalogue, and the order arrives directly.",
          cost: "S/ 0",
          catch:
            "The bottleneck is human: someone has to read, write down and confirm every order. Past roughly 20 a day it turns into mistakes and lost tickets.",
        },
        {
          step: "2",
          title: "The QR on the table and in the bag",
          body: "Whoever already ate at your place is the easiest to bring to your own channel. A sticker on the delivery bag beats a paid campaign.",
          cost: "The price of stickers",
          catch:
            "It only reaches people who already know you. It builds loyalty; it does not bring new customers.",
        },
        {
          step: "3",
          title: "Your own ordering site",
          body: "Your name, your menu, your prices. The order lands neatly in the dashboard and the payment goes to your account, with no middleman.",
          cost: "From S/ 339 a month with FoodFlow",
          catch:
            "Nobody finds it on their own. You have to carry it there: on the QR, the Instagram profile, the receipt and the packaging.",
        },
        {
          step: "4",
          title: "Social profiles with a direct link",
          body: "The link to your menu in the Instagram bio and the Google profile. It is free, and it is where people look once they have heard of you.",
          cost: "S/ 0",
          catch:
            "It needs consistency. A profile whose last photo is six months old says the opposite of what you want.",
        },
      ],
      payTitle: "Getting paid without losing 30%",
      payIntro:
        "Taking payment directly is not entirely free either, but the difference is an order of magnitude. The ranges depend on your bank and provider: confirm yours before deciding.",
      payRows: [
        {
          method: "Yape or Plin",
          fee: "No per-transaction fee",
          note: "The most used in Lima. Check daily limits with your bank, and whether your account is a business one.",
        },
        {
          method: "Bank transfer",
          fee: "Free or close to it",
          note: "Convenient for large orders and for companies. Slow for an S/ 40 delivery.",
        },
        {
          method: "Cash on delivery",
          fee: "No fee",
          note: "Zero friction for the customer. The cost is yours: handling change and balancing the till every night.",
        },
        {
          method: "Card gateway",
          fee: "≈ 3% – 5% + VAT",
          note: "It does charge, but it is a tenth of a delivery commission. Compare Culqi, Izipay and Niubiz before signing.",
        },
      ],
      deliveryTitle: "So who delivers?",
      deliveryIntro:
        "This is the question that stops most venues, and it has three reasonable answers.",
      delivery: [
        {
          title: "Your own rider",
          body: "Worth it from around 15 to 20 orders a day in a small area. Below that, the wage eats the saving.",
        },
        {
          title: "A delivery-only service",
          body: "You pay per drop, not a share of the sale. The customer stays yours and the cost does not grow with the ticket.",
        },
        {
          title: "Pickup",
          body: "The most ignored and the most profitable: no delivery, no extra packaging, and the customer walks into your place. Offer something for it.",
        },
      ],
      keepTitle: "When staying on the apps is the right call",
      keepIntro:
        "This is not a page about walking out. There are clear cases where the apps still earn what they charge:",
      keep: [
        "You have just opened and nobody knows you exist. You are paying for discovery, not for delivery.",
        "You have dead hours you would not fill with anything else.",
        "You have no way to deliver and nobody to ask.",
        "Your area has heavy footfall and the app puts you in front of people passing through.",
      ],
      keepClose:
        "The healthy setup is both: the app brings new people, your own channel keeps the ones who come back.",
      planTitle: "A four-week plan",
      planIntro: "Without leaving the apps and without pausing service. One thing a week.",
      plan: [
        {
          week: "Week 1",
          title: "Measure where you are",
          body: "Split how much you sell through apps and how much direct, and what you paid in commission last month. Without that number you will not know whether it worked.",
        },
        {
          week: "Week 2",
          title: "Open the channel",
          body: "Get your menu online and the link published: Instagram bio, Google profile, WhatsApp status.",
        },
        {
          week: "Week 3",
          title: "Take it to the street",
          body: "A QR on every table, a sticker on every delivery bag, a line on the receipt. Put the link where the customer already is.",
        },
        {
          week: "Week 4",
          title: "Give them a reason to repeat",
          body: "Something that only exists in your channel: an extra, a slightly better price, faster delivery. What you save on commission leaves room.",
        },
      ],
      faqTitle: "Frequently asked questions",
      faq: [
        {
          q: "Can I leave Rappi and PedidosYa overnight?",
          a: "You can, but it is rarely a good idea. Those apps bring you customers who do not know you, and that traffic is not replaced in a week. What works is opening your own channel alongside and moving your repeat customers over gradually.",
        },
        {
          q: "Does my contract allow me to run my own ordering site?",
          a: "Almost always yes, but check: some agreements include exclusivity or price-parity clauses that stop you selling cheaper on your own. If in doubt, ask your account manager to confirm it in writing.",
        },
        {
          q: "Can I price lower on my site than in the app?",
          a: "It depends on that parity clause. If your contract does not have one, it is the most effective lever there is: the customer sees the difference and switches on their own. If it does, use an extra or free delivery instead of price.",
        },
        {
          q: "How long until it shows?",
          a: "The first direct orders usually arrive in the first week, from customers who already knew you and did not realise they could order without the app. The real shift, when your channel carries real weight, is measured in months and depends on how hard you push it.",
        },
      ],
      ctaTitle: "First, see what you are paying",
      ctaBody:
        "The calculator uses your sales and your commission. No sign-up, and the result appears as you type.",
      ctaButton: "Open the calculator",
      disclaimer:
        "Gateway fees and payment terms vary by provider and by agreement: confirm yours before deciding. Exclusivity clauses are in the contract you signed with each app.",
    },
    customSiteSummary: {
      eyebrow: "Your own site",
      title: "Your ordering channel, under your name",
      description: "A short home section does not need to tell the whole story. See how your menu, prices and orders can live in a channel of your own, connected to the same kitchen.",
      button: "See the ordering site",
    },
    qrMenu: {
      eyebrow: "QR digital menu",
      title: "A QR digital menu for restaurants in Lima",
      description: "Change prices or dishes without reprinting, require no app download, and open directly in the guest's mobile browser.",
      steps: [
        { number: "Step 1", title: "We load your menu", body: "We move your categories, dishes, photos, prices and availability into the system." },
        { number: "Step 2", title: "You generate the QR codes", body: "Create a code for each table and print it in the format you already use at the venue." },
        { number: "Step 3", title: "The guest scans and orders", body: "They open the menu in their browser, choose and send the order without installing anything." },
      ],
      demoTitle: "A real public menu",
      demoBody: "The demo uses the same public route every restaurant receives. Open it, browse its categories and see how it works on a phone.",
      demoButton: "Open the menu demo",
      planTitle: "What the Carta plan includes",
      includes: ["A public menu with its own link and QR code.", "Price and availability changes without reprinting.", "Table orders from the browser.", "Initial menu loading and support in Spanish and English."],
      notForTitle: "When you do not need it",
      notForBody: "If your POS already provides a QR menu your team uses well, another tool may complicate the operation. It may not pay off either when your menu almost never changes and print better fits the experience you want.",
      faqTitle: "Frequently asked questions",
      faq: [
        { q: "Does the customer need to install an app?", a: "No. They scan the QR and the menu opens in their mobile browser. They need no account or download." },
        { q: "Can I change a price during service?", a: "Yes. The change goes live without printing new codes because the QR keeps pointing to the same address." },
        { q: "Do I need a different QR for every table?", a: "You can use one general code for browsing or one per table when you want to identify where an order came from." },
        { q: "Does it work outside Lima?", a: "The menu works online from anywhere. The current pilot and implementation support focus on restaurants in Lima." },
      ],
      ctaTitle: "Choose the plan that fits your operation",
      ctaBody: "Compare what Carta includes and how you can grow later without changing systems.",
      ctaButton: "See prices",
      pricingLink: "See prices and plans",
      orderingLink: "Learn about the ordering site",
    },
    rappiAlternative: {
      eyebrow: "Rappi alternative",
      title: "A Rappi alternative for your restaurant",
      description: "Compare what actually changes with your own channel: commission, customer relationship, delivery, reach and monthly cost.",
      truthTitle: "You are not comparing like for like",
      truthBody: "Rappi is a discovery channel with an audience and a fleet. FoodFlow is software for operating your own channel. One can bring people who do not know you; the other helps you serve and retain people who already chose you.",
      compareTitle: "Rappi and your own channel, side by side",
      compareHead: "What you compare",
      rows: [
        { label: "Commission", rappi: "A common range is 20% – 30%; confirm yours in your contract or statement.", foodflow: "0% per order." },
        { label: "Who owns the customer", rappi: "The relationship and data live on the platform.", foodflow: "Your restaurant owns the direct relationship." },
        { label: "Who delivers", rappi: "The app or your own fleet, depending on the agreement.", foodflow: "Your team or a per-drop delivery service." },
        { label: "Who brings new people", rappi: "The app puts you in front of people who do not know you yet.", foodflow: "You bring traffic from QR codes, social media, Google, receipts and packaging." },
        { label: "Monthly cost", rappi: "Variable: it depends on sales, commission and contract charges.", foodflow: "{price}" },
      ],
      loseTitle: "What you lose when you leave the app",
      loseIntro: "Closing the channel overnight has a real cost. First measure the value each of these provides:",
      losses: ["Visibility among people who do not know your restaurant.", "A fleet available without hiring your own riders.", "Extra orders during quieter hours."],
      bothTitle: "The realistic route is to use both",
      bothBody: "Keep the app for discovery and open your site for people who already know you. Measure sales, cost and repeat orders by channel; reduce dependence only when your restaurant's numbers support it.",
      faqTitle: "Frequently asked questions",
      faq: [
        { q: "Does FoodFlow replace Rappi's riders?", a: "No. FoodFlow receives and organises the order; your team or a per-drop service handles delivery. Include that difference in your calculation." },
        { q: "Must I leave Rappi to use FoodFlow?", a: "No. Both channels can run together, and that is usually the safest transition: discovery in the app and repeat orders through your own channel." },
        { q: "Exactly how much does Rappi charge?", a: "There is no single rate for every venue. Agreements vary; check your contract and statement for your percentage and additional charges." },
        { q: "Does an ordering site bring new customers?", a: "Not by itself. Bring people from tables, packaging, social profiles, Google and current customers. The site turns that interest into direct orders." },
      ],
      ctaTitle: "Compare with your own numbers",
      ctaBody: "Enter your sales and the percentage on your statement. The calculator shows what leaves each month, with no sign-up.",
      ctaButton: "Open the calculator",
      commissionsLink: "See the commission breakdown",
      directLink: "Read the direct-sales guide",
    },
    orderingSite: {
      eyebrow: "Ordering site",
      title: "An ordering website for your restaurant in Peru",
      description: "Your domain, menu and prices in a channel of your own, with 0% commission per order. Every sale enters the same dashboard as your other channels.",
      flowTitle: "One order, one work queue",
      flowIntro: "The customer buys on your site, but the team does not need to watch another screen. FoodFlow brings the order into the rest of the operation.",
      flow: [
        { title: "It enters through your site", body: "The customer chooses from your menu and sends the order with their details and payment method." },
        { title: "It reaches the same dashboard", body: "The order appears beside every other channel, with its source and status visible." },
        { title: "Kitchen works one queue", body: "The ticket uses the same kitchen screen; nobody has to copy the order again." },
      ],
      payTitle: "How customers pay",
      payIntro: "Start with direct methods or connect a gateway. Terms vary by bank and provider, so always confirm yours before deciding.",
      payHeadMethod: "Payment method",
      payHeadCost: "Cost range",
      payHeadNote: "What to consider",
      payRows: [
        { method: "Yape or Plin", cost: "No per-transaction fee", note: "Check daily limits and the terms of your bank or business account." },
        { method: "Bank transfer", cost: "Free or close to it", note: "Useful for larger orders; the payment must be checked before preparation." },
        { method: "Cash", cost: "No fee", note: "Requires change, till controls and end-of-day reconciliation." },
        { method: "Card gateway", cost: "≈ 3% – 5% + VAT", note: "The range depends on the provider and agreement. Compare your own quotes before signing." },
      ],
      honestTitle: "Your own site does not create traffic by itself",
      honestBody: "Publishing it is the start, not acquisition. It works when the address appears where customers already interact with you:",
      traffic: ["QR codes on tables and at the counter.", "A link on social profiles and Google.", "The address printed on receipts.", "A sticker or message on every package."],
      planTitle: "Included in the Negocio plan",
      planBody: "The site connects orders, menu and kitchen. The monthly price comes from the same catalogue shown on the pricing page.",
      faqTitle: "Frequently asked questions",
      faq: [
        { q: "Can I use my own domain?", a: "Yes. The site can use your restaurant's identity and domain while keeping your menu and prices." },
        { q: "Does FoodFlow charge commission on every order?", a: "No. You pay the monthly plan and FoodFlow takes no percentage of the sale. Your bank or gateway may charge under its own agreement." },
        { q: "Where does the order appear?", a: "In the same dashboard and kitchen screen as your other channels, identified by source and placed in a single queue." },
        { q: "Who brings customers to the site?", a: "Your restaurant does. Promote it through QR codes, social media, Google, receipts and packaging. A published site does not create demand by itself." },
      ],
      ctaTitle: "See what each plan includes",
      ctaBody: "Compare Carta, Operación and Negocio from the site's single pricing source.",
      ctaButton: "See prices",
      directLink: "How to sell without commission",
      qrLink: "See the QR digital menu",
      pricingLink: "Compare all plans",
    },
    footer: {
      description:
        "Orders, kitchen, menu and numbers on one dashboard. Built in Lima for Lima restaurants.",
      emailCta: "Write to us",
      followUs: "Follow us",
      copyrightSuffix: "FoodFlow. All rights reserved.",
      signaturePrefix: "Built by",
    },
    pricing: {
      eyebrow: "Pricing",
      title: "Clear pricing, no commission per order",
      description:
        "All three include the digital menu, support in Spanish and English, and every update. No lock-in: change or cancel from one month to the next.",
      popular: "Most chosen",
      cta: "Choose plan",
      founder: {
        label: "Founder offer",
        headline: "Only 5 spots this month.",
        perks: [
          "Founder price frozen for life (–10%)",
          "Live support through your first Friday",
          "Free menu migration: we digitize and set up your full menu in < 24h. You do nothing.",
        ],
      },
      keyNotes: [
        "It runs on any phone, tablet or computer you already have. We do not sell hardware.",
        "Set up so your customers can pay with Yape, Plin or cash.",
      ],
      taxNote:
        "Prices in Peruvian soles + IGV (18% VAT). We issue an electronic boleta or factura against your RUC.",
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
          copy: "Free menu migration: we digitize and set up your full menu in < 24h. You do nothing.",
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
          a: "You send us the export from your current system, your menu PDF or even a photo, and we digitize and set up your full menu in under 24 hours. There is no automatic connector to those systems: we migrate it by hand, checking prices and categories with you before your first shift.",
        },
        {
          q: "Do the prices include IGV?",
          a: "No. IGV (18% VAT) is added to the prices shown. We issue an electronic boleta or factura against your RUC, and the factura counts as a deductible expense.",
        },
        {
          q: "Is there a lock-in or a penalty if I leave?",
          a: "None. You change plan or cancel from one month to the next in the dashboard itself, and if you leave we export your menu, orders and customers in a file ready to use anywhere.",
        },
        {
          q: "Who loads my menu, and how long does it take?",
          a: "We digitize and set up your full menu in under 24 hours. After that you edit it yourself in two clicks and the change shows on every table instantly.",
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
      photoNote: "Yes, that's me. Taken before FoodFlow started keeping me up at night.",
      photoAlt: "Outdoor portrait of Adonys Pereda, sky and grass in the background.",
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
            "Your spot includes full menu migration, live support through your first Friday night, an audit of what the delivery apps take from you today, and the analysis of which dishes carry a margin. If a trial is available, you will see its duration when you start checkout.",
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
            price: "S/ 69",
            period: "/month",
            tagline: "Get your digital menu live today",
            features: [
              "Digital menu and a QR for every table",
              "Change prices and hours instantly, no calls needed",
              "1 venue · 1 user",
            ],
          },
          {
            name: "Servicio",
            price: "S/ 169",
            period: "/month",
            tagline: "What most venues use",
            badge: "Most chosen",
            features: [
              "Everything in Carta",
              "Waiter comanda with smart billing",
              "Kitchen board: pending, cooking, ready",
              "Table floor plan, reservations and QR ordering at the table",
              "Native integration with SUNAT electronic invoicing",
              "Up to 10 users, owner included",
            ],
          },
          {
            name: "Negocio",
            price: "S/ 339",
            period: "/month",
            tagline: "Ideal for dark kitchens or chains",
            features: [
              "Everything in Servicio",
              "Your own ordering site, 0% commission",
              "Food cost control and standardized recipes to maximize your margin",
              "Native integration with SUNAT electronic invoicing",
              "Several venues on one dashboard",
              "Priority support",
            ],
          },
        ],
      note: "Any available trial and its duration are shown when you start checkout. None of the plans charges a commission per order or requires a lock-in.",
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
      periods: { "1d": "Today", "7d": "Last 7 days", "30d": "Last 30 days" },
      demoSuffix: "demo data",
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
      kpiLabels: {
        sales: { "1d": "Sales today", "7d": "Sales · 7 days", "30d": "Sales · 30 days" },
        orders: "Orders",
        avgTicket: "Avg ticket",
        kitchen: "Kitchen time",
      },
      revenue: "Sales",
      legendCurrent: "Current",
      comparedTo: {
        "1d": "vs. yesterday at this hour",
        "7d": "vs. previous 7 days",
        "30d": "vs. previous 30 days",
      },
      before: "before",
      weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"],
      dayWord: "Day",
      ordersByChannel: "Orders by channel",
      ordersWord: "orders",
      channels: [
        { label: "Dine-in", count: 35 },
        { label: "Delivery", count: 28 },
        { label: "Pickup", count: 20 },
        { label: "Web & QR", count: 13 },
      ],
      liveOrders: "Live orders",
      tapHint: "Tap an order to move it along",
      newBadge: "New",
      liveStates: { pending: "Queued", preparing: "Preparing", ready: "Ready", served: "Served" },
      orders: [
        { table: "Table 12", items: "Lomo saltado x2", total: 96, state: "preparing", minutes: 9, channel: 0 },
        { table: "Delivery", items: "Burger, fries", total: 68, state: "ready", minutes: 14, channel: 1 },
        { table: "Table 04", items: "Ceviche, causa", total: 84.5, state: "served", minutes: 22, channel: 0 },
        { table: "Pickup", items: "Rotisserie chicken x1", total: 45, state: "ready", minutes: 6, channel: 2 },
        { table: "Table 09", items: "Ají de gallina, lemonade", total: 52, state: "pending", minutes: 2, channel: 0 },
      ],
      incoming: [
        { table: "Table 07", items: "Nikkei tiradito, chicha", total: 74, channel: 0 },
        { table: "Delivery", items: "Chicken chaufa x2", total: 58, channel: 1 },
        { table: "Table 02", items: "Anticuchos, huancaína potatoes", total: 66, channel: 0 },
        { table: "Pickup", items: "Set menu x3", total: 45, channel: 2 },
        { table: "Table 11", items: "Causa limeña, pisco sour x2", total: 89, channel: 0 },
        { table: "Delivery", items: "Seafood rice", total: 62, channel: 1 },
        { table: "Web · Pickup", items: "Lomo saltado, inca kola", total: 48, channel: 3 },
      ],
      kitchenCard: {
        active: "in progress",
        segments: ["Queued", "Preparing", "Ready"],
        readyOne: "order ready to go out",
        readyMany: "orders ready to go out",
      },
    },
  },
};

export const LOCALE_STORAGE_KEY = "foodflow-lang";
export const DEFAULT_LOCALE = "es";
