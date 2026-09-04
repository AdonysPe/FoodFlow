import {
  money,
  receiptDateLabel,
  PAPER_PRINTABLE_MM,
  type ReceiptDTO,
} from "@/lib/receipt";

/**
 * The paper itself: black on white, monospace, sized in millimetres so the
 * browser hands the thermal printer the same width the roll actually is.
 *
 * Deliberately plain. A ticketera prints one colour at ~203 dpi with no
 * greys and no hairlines, so every rule here is a solid 1px dashed border and
 * every weight is either normal or bold — anything subtler comes out as mush.
 */
export default function ReceiptDoc({ receipt }: { receipt: ReceiptDTO }) {
  const roll = receipt.paperWidth;
  const pad = (roll - PAPER_PRINTABLE_MM[roll]) / 2;
  const narrow = roll === 58;

  // The legend only appears over a document that earned it: one SUNAT accepted,
  // or the till's preview of the one it is about to send.
  const pending = receipt.reservedFor;
  const sunatLegend = receipt.electronic
    ? `REPRESENTACIÓN IMPRESA DE LA ${
        receipt.title.startsWith("FACTURA") ? "FACTURA" : "BOLETA DE VENTA"
      } ELECTRÓNICA`
    : pending
      ? `REPRESENTACIÓN IMPRESA DE LA ${
          pending === "factura" ? "FACTURA" : "BOLETA DE VENTA"
        } ELECTRÓNICA`
      : null;

  const rule = (
    <div
      aria-hidden
      style={{ borderTop: "1px dashed #000", opacity: 0.75, margin: "6px 0" }}
    />
  );

  return (
    <div
      id="receipt-paper"
      style={{
        width: `${roll}mm`,
        padding: `4mm ${pad}mm 6mm`,
        background: "#fff",
        color: "#000",
        fontFamily: '"Courier New", Consolas, ui-monospace, monospace',
        fontSize: narrow ? "10px" : "11.5px",
        lineHeight: 1.35,
        // Dish names are long and the roll is not; wrapping beats clipping.
        wordBreak: "break-word",
      }}
    >
      {/* ------------------------------------------------------- the venue */}
      <div style={{ textAlign: "center" }}>
        {receipt.logoDataUrl && (
          // The owner's own file, already downscaled to printer size before it
          // was stored; next/image would only put a loader in front of bytes
          // this component already holds.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={receipt.logoDataUrl}
            alt=""
            style={{
              display: "block",
              margin: "0 auto 3px",
              maxWidth: narrow ? "34mm" : "50mm",
              maxHeight: "18mm",
              // Thermal heads print one colour: raising the contrast keeps a
              // mid-grey logo from coming out as mush.
              filter: "grayscale(1) contrast(1.35)",
            }}
          />
        )}
        <div
          style={{
            fontSize: narrow ? "13px" : "15px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {receipt.venueName}
        </div>
        {receipt.legalName && receipt.legalName !== receipt.venueName && (
          <div>{receipt.legalName}</div>
        )}
        {receipt.ruc && <div>RUC {receipt.ruc}</div>}
        {receipt.address && <div>{receipt.address}</div>}
        {receipt.phone && <div>Tel. {receipt.phone}</div>}
      </div>

      {rule}

      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 700, letterSpacing: "0.12em" }}>{receipt.title}</div>
        {receipt.documentNo ? (
          <div style={{ fontWeight: 700, fontSize: narrow ? "12px" : "13px" }}>
            {receipt.documentNo}
          </div>
        ) : (
          // Two documents land here: a pre-bill the table asked to check, and
          // a sale charged before this venue started numbering. Neither may
          // pass for the numbered document that settles an account.
          <div>
            {receipt.kind === "precuenta" ? "Cuenta abierta · aún no pagada" : "Sin numerar"}
          </div>
        )}
      </div>

      {rule}

      {/* --------------------------------------------------- who and where */}
      <Field label="Fecha" value={receiptDateLabel(receipt.issuedAt)} />
      <Field label="Atención" value={receipt.where} />
      {receipt.namedFor && <Field label="A nombre de" value={receipt.namedFor} />}
      {receipt.customer ? (
        <>
          <Field
            label={receipt.customer.docLabel}
            value={receipt.customer.docId || "—"}
          />
          {receipt.customer.name && <Field label="Cliente" value={receipt.customer.name} />}
          {receipt.customer.address && (
            <Field label="Dirección" value={receipt.customer.address} />
          )}
        </>
      ) : (
        receipt.kind === "boleta" && <Field label="Cliente" value="CONSUMIDOR FINAL" />
      )}
      {receipt.serverName && <Field label="Atendió" value={receipt.serverName} />}
      {receipt.rounds > 1 && <Field label="Rondas" value={String(receipt.rounds)} />}

      {rule}

      {/* ------------------------------------------------------- the lines */}
      <div style={{ display: "flex", fontWeight: 700 }}>
        <span style={{ width: "9mm", flexShrink: 0, paddingRight: "1mm" }}>CANT</span>
        <span style={{ flex: 1 }}>DESCRIPCIÓN</span>
        <span style={{ textAlign: "right" }}>S/</span>
      </div>
      <div style={{ marginTop: "3px" }}>
        {receipt.lines.map((line, i) => (
          <div key={i} style={{ marginBottom: "3px" }}>
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <span
                style={{
                  width: "9mm",
                  flexShrink: 0,
                  paddingRight: "1mm",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {line.quantity}
              </span>
              <span style={{ flex: 1, paddingRight: "2mm" }}>{line.name}</span>
              <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {money(line.price * line.quantity)}
              </span>
            </div>
            {line.note && (
              <div style={{ paddingLeft: "9mm", fontStyle: "italic" }}>* {line.note}</div>
            )}
            {line.quantity > 1 && (
              <div style={{ paddingLeft: "9mm", opacity: 0.8 }}>
                {money(line.price)} c/u
              </div>
            )}
          </div>
        ))}
      </div>

      {rule}

      {/* ------------------------------------------------------ the totals */}
      {receipt.tax && (
        <>
          <Amount label="Op. gravada" value={receipt.tax.taxable} />
          <Amount
            label={`IGV (${Math.round(receipt.tax.rate * 100)}%)`}
            value={receipt.tax.igv}
          />
        </>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 700,
          fontSize: narrow ? "13px" : "15px",
          marginTop: "3px",
        }}
      >
        <span>TOTAL</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>S/ {money(receipt.total)}</span>
      </div>
      <div style={{ opacity: 0.8 }}>
        {receipt.dishCount} {receipt.dishCount === 1 ? "producto" : "productos"}
      </div>

      {receipt.payment && (
        <>
          {rule}
          <Field label="Pago" value={receipt.payment.label} />
          {receipt.payment.amountReceived != null && (
            <Amount label="Recibido" value={receipt.payment.amountReceived} />
          )}
          {receipt.payment.change != null && (
            <Amount label="Vuelto" value={receipt.payment.change} />
          )}
        </>
      )}

      {rule}

      {/* ------------------------------------------------------- the close */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 700 }}>
          {receipt.kind === "boleta"
            ? "¡Gracias por su visita!"
            : "Revise su cuenta antes de pagar"}
        </div>
        {receipt.footerNote && (
          <div style={{ marginTop: "2px", whiteSpace: "pre-line" }}>{receipt.footerNote}</div>
        )}

        {/* --------------------------------------------------- the SUNAT block */}
        {sunatLegend ? (
          <div style={{ marginTop: "6px" }}>
            <div style={{ fontSize: narrow ? "8px" : "9px", fontWeight: 700, lineHeight: 1.3 }}>
              {sunatLegend}
            </div>

            {receipt.showQr && (
              <div style={{ marginTop: "4px", display: "flex", justifyContent: "center" }}>
                {receipt.qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={receipt.qrDataUrl}
                    alt="Código QR del comprobante"
                    style={{ width: "22mm", height: "22mm" }}
                  />
                ) : (
                  <span
                    style={{
                      width: "22mm",
                      height: "22mm",
                      border: "1px dashed #000",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "7px",
                      opacity: 0.6,
                      textAlign: "center",
                      lineHeight: 1.2,
                    }}
                  >
                    QR de SUNAT
                  </span>
                )}
              </div>
            )}

            <div
              style={{
                marginTop: "3px",
                fontSize: narrow ? "7.5px" : "8.5px",
                wordBreak: "break-all",
                opacity: receipt.hash ? 1 : 0.6,
              }}
            >
              Hash: {receipt.hash ?? "— se llena al emitir —"}
            </div>
          </div>
        ) : (
          /* Non-negotiable: this document is not a SUNAT comprobante, and a
             diner who needs one has to be told where to ask for it. */
          <div style={{ marginTop: "6px", fontSize: narrow ? "8px" : "9px", lineHeight: 1.3 }}>
            Documento interno de control. No es comprobante de pago electrónico
            autorizado por SUNAT. Solicite su boleta o factura en caja.
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "2mm" }}>
      <span style={{ minWidth: "18mm", flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function Amount({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span>{label}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{money(value)}</span>
    </div>
  );
}
