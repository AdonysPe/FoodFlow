// El IGV, calculado una sola vez y en un solo sitio.
//
// LA TRAMPA PERUANA. Una carta peruana publica precios CON IGV incluido: el
// lomo saltado que dice S/ 45.00 se cobra 45.00, no 53.10. SUNAT, en cambio,
// recibe la base imponible y el impuesto por separado. Así que casi todo lo que
// hace este módulo es *sacar* el IGV de un precio que ya lo trae dentro, no
// sumárselo — que es el error que produce comprobantes por un 18% de más.
//
// La otra trampa es el redondeo. La base y el IGV se redondean a 2 decimales
// cada uno, y su suma tiene que dar exactamente el total que el diner pagó: si
// difiere en un céntimo, el OSE rechaza el documento. Por eso el IGV se deriva
// como `total - base` en vez de calcularse por su cuenta.
//
// Puro: ni Prisma ni red. Lo importan el emisor, el ticket y los tests.

export const DEFAULT_IGV_RATE = 0.18;

/** Redondeo a céntimos, media al alza, sin el sesgo binario de `toFixed`. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * El IGV contenido en un importe que YA lo incluye.
 *
 * `calculateIGV(45)` → 6.86, porque 45 = 38.14 + 6.86.
 */
export function calculateIGV(amountWithIgv: number, rate: number = DEFAULT_IGV_RATE): number {
  if (!Number.isFinite(amountWithIgv) || amountWithIgv <= 0) return 0;
  const base = round2(amountWithIgv / (1 + rate));
  return round2(amountWithIgv - base);
}

/** La base imponible de un importe que ya incluye IGV. */
export function getTaxableBase(amountWithIgv: number, rate: number = DEFAULT_IGV_RATE): number {
  if (!Number.isFinite(amountWithIgv) || amountWithIgv <= 0) return 0;
  return round2(amountWithIgv / (1 + rate));
}

/**
 * El camino contrario: un importe SIN IGV al que hay que sumárselo.
 *
 * Casi ningún flujo de FoodFlow pasa por aquí — la carta ya viene con IGV —
 * pero un proveedor que cotiza en neto sí, y tenerlo escrito evita que alguien
 * lo improvise en el sitio equivocado.
 */
export function getTotalWithIGV(amountWithoutIgv: number, rate: number = DEFAULT_IGV_RATE): number {
  if (!Number.isFinite(amountWithoutIgv) || amountWithoutIgv <= 0) return 0;
  return round2(amountWithoutIgv * (1 + rate));
}

export type IgvBreakdown = {
  /** Base imponible de las operaciones gravadas. */
  gravada: number;
  igv: number;
  /** Lo que no paga IGV. Hoy siempre 0; existe para el día que haya exonerados. */
  exonerada: number;
  inafecta: number;
  /** Igual al importe de entrada, siempre. Nunca se recalcula sumando. */
  total: number;
  rate: number;
  /** false = el local está en Nuevo RUS y no desagrega impuesto alguno. */
  taxed: boolean;
};

/**
 * El desglose completo de una venta, listo para el cuerpo del comprobante.
 *
 * `taxed: false` (Nuevo RUS) devuelve el total como inafecto y el IGV en cero:
 * un local que no está afecto no puede declarar un impuesto que no cobra.
 */
export function breakdownFromTotal(
  totalWithIgv: number,
  { rate = DEFAULT_IGV_RATE, taxed = true }: { rate?: number; taxed?: boolean } = {}
): IgvBreakdown {
  const total = round2(Math.max(0, totalWithIgv));
  if (!taxed) {
    return { gravada: 0, igv: 0, exonerada: 0, inafecta: total, total, rate: 0, taxed: false };
  }
  const gravada = getTaxableBase(total, rate);
  return {
    gravada,
    // Derivado, no calculado: gravada + igv tiene que dar `total` al céntimo.
    igv: round2(total - gravada),
    exonerada: 0,
    inafecta: 0,
    total,
    rate,
    taxed: true,
  };
}

export type LineBreakdown = {
  description: string;
  quantity: number;
  /** Precio unitario tal como aparece en la carta: con IGV. */
  unitPriceWithIgv: number;
  /** Valor unitario sin IGV. Es el `valor_unitario` que pide el OSE. */
  unitValue: number;
  /** Base imponible de la línea (cantidad × valor unitario). */
  subtotal: number;
  igv: number;
  /** Importe de la línea con IGV. */
  total: number;
};

/**
 * Una línea del comprobante a partir del precio de carta.
 *
 * Se calcula por línea y no repartiendo el IGV del total, porque el OSE valida
 * cada línea por separado y la suma de las líneas contra la cabecera.
 */
export function breakdownLine(
  line: { description: string; quantity: number; unitPrice: number },
  { rate = DEFAULT_IGV_RATE, taxed = true }: { rate?: number; taxed?: boolean } = {}
): LineBreakdown {
  const quantity = Math.max(0, line.quantity);
  const unitPriceWithIgv = round2(Math.max(0, line.unitPrice));
  const lineTotal = round2(unitPriceWithIgv * quantity);

  if (!taxed) {
    return {
      description: line.description,
      quantity,
      unitPriceWithIgv,
      unitValue: unitPriceWithIgv,
      subtotal: lineTotal,
      igv: 0,
      total: lineTotal,
    };
  }

  const subtotal = getTaxableBase(lineTotal, rate);
  return {
    description: line.description,
    quantity,
    unitPriceWithIgv,
    // 4 decimales: el valor unitario es el único campo donde SUNAT los admite,
    // y truncarlo a 2 desalinea la suma de líneas contra la cabecera.
    unitValue: quantity > 0 ? Math.round((subtotal / quantity) * 10000) / 10000 : 0,
    subtotal,
    igv: round2(lineTotal - subtotal),
    total: lineTotal,
  };
}

/**
 * Ajusta el desglose de la cabecera al de las líneas.
 *
 * Redondear once líneas y redondear su total no siempre coincide: la diferencia
 * es de un céntimo y siempre cae en el IGV, que es donde el OSE la tolera (el
 * total tiene que ser el que el diner pagó, eso no se toca).
 */
export function reconcile(lines: LineBreakdown[], total: number): IgvBreakdown {
  const gravada = round2(lines.reduce((acc, l) => acc + l.subtotal, 0));
  const declaredTotal = round2(total);
  return {
    gravada,
    igv: round2(declaredTotal - gravada),
    exonerada: 0,
    inafecta: 0,
    total: declaredTotal,
    rate: DEFAULT_IGV_RATE,
    taxed: true,
  };
}
