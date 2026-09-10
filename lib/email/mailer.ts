import nodemailer from "nodemailer";

function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function passwordResetEmailHtml(code: string): string {
  return `
  <div style="background:#06070a;padding:40px 24px;font-family:-apple-system,Segoe UI,Inter,sans-serif;">
    <div style="max-width:420px;margin:0 auto;background:#0a0c11;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:36px;text-align:center;">
      <p style="margin:0 0 24px;font-size:15px;font-weight:700;letter-spacing:-0.02em;color:#fff;">FoodFlow</p>
      <p style="margin:0 0 8px;font-size:14px;color:rgba(255,255,255,0.55);">Código para restablecer tu contraseña</p>
      <p style="margin:0 0 24px;font-size:36px;font-weight:800;letter-spacing:0.15em;background:linear-gradient(100deg,#ffc184,#ff7a2f 45%,#ffd9b0);-webkit-background-clip:text;background-clip:text;color:transparent;">${code}</p>
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.4);">Expira en 10 minutos. Si no lo solicitaste, puedes ignorar este correo.</p>
    </div>
  </div>`;
}

export async function sendPasswordResetOTP(email: string, code: string): Promise<void> {
  if (!isSmtpConfigured()) {
    throw new Error("SMTP is not configured");
  }

  const transport = getTransport();
  // SMTP_FROM must be on a domain verified in Resend (Domains → Verify).
  // Until then, Resend's sandbox mode silently limits delivery to the email
  // address the Resend account itself was signed up with — every other
  // recipient (i.e. every real client) fails here. See README/.env.example.
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || "FoodFlow <no-reply@foodflow.app>",
      to: email,
      subject: `${code} es tu código para restablecer tu contraseña`,
      text: `Tu código para restablecer la contraseña de FoodFlow es ${code}. Expira en 10 minutos.`,
      html: passwordResetEmailHtml(code),
    });
  } catch (err) {
    const response = (err as { response?: string })?.response;
    console.error(
      `[mailer] SMTP rechazó el correo de recuperación${response ? ` — ${response}` : ""}. ` +
        "Most likely cause: SMTP_FROM isn't on a domain verified in Resend yet."
    );
    throw err;
  }
}

// ------------------------------------------------------ comprobante al cliente
//
// El correo con el que un diner recibe su boleta o su factura. FoodFlow lo
// manda en vez de delegarlo al OSE por una razón concreta: así queda escrito en
// `cdrs.emailed_at` cuándo salió y a quién. Un envío que hace otro y del que no
// nos enteramos no se puede responder cuando el cliente dice que no le llegó.
//
// El PDF va como ENLACE, no como adjunto: lo aloja el OSE, pesa, y un adjunto
// que hay que descargar primero convierte cada envío en dos llamadas de red que
// pueden fallar por separado. El XML sí se adjunta cuando lo tenemos guardado —
// es texto, pesa poco, y es la copia que el contador del cliente pide.

export type ComprobanteEmail = {
  to: string;
  /** Nombre comercial del restaurante, tal como lo firma el correo. */
  venueName: string;
  documentLabel: string;
  documentNo: string;
  total: string;
  issuedAt: string;
  pdfUrl: string | null;
  xmlUrl: string | null;
  /** El XML guardado, si lo hay. Se adjunta como <numero>.xml. */
  xmlContent?: string | null;
};

function comprobanteHtml(data: ComprobanteEmail): string {
  const link = (href: string, label: string) =>
    `<a href="${href}" style="display:inline-block;margin:0 6px;padding:11px 18px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#ffc184;font-size:13px;font-weight:600;text-decoration:none;">${label}</a>`;

  return `
  <div style="background:#06070a;padding:40px 24px;font-family:-apple-system,Segoe UI,Inter,sans-serif;">
    <div style="max-width:460px;margin:0 auto;background:#0a0c11;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:36px;">
      <p style="margin:0 0 6px;font-size:13px;color:rgba(255,255,255,0.45);">${data.venueName}</p>
      <p style="margin:0 0 24px;font-size:19px;font-weight:700;letter-spacing:-0.02em;color:#fff;">Tu ${data.documentLabel} electrónica</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:rgba(255,255,255,0.75);">
        <tr><td style="padding:6px 0;color:rgba(255,255,255,0.45);">Documento</td><td style="padding:6px 0;text-align:right;font-family:ui-monospace,SFMono-Regular,monospace;color:#fff;">${data.documentNo}</td></tr>
        <tr><td style="padding:6px 0;color:rgba(255,255,255,0.45);">Fecha</td><td style="padding:6px 0;text-align:right;">${data.issuedAt}</td></tr>
        <tr><td style="padding:6px 0;color:rgba(255,255,255,0.45);">Total</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#fff;">${data.total}</td></tr>
      </table>
      <div style="margin-top:26px;text-align:center;">
        ${data.pdfUrl ? link(data.pdfUrl, "Ver PDF") : ""}
        ${data.xmlUrl ? link(data.xmlUrl, "Descargar XML") : ""}
      </div>
      <p style="margin:26px 0 0;font-size:12px;line-height:1.6;color:rgba(255,255,255,0.35);">
        Este comprobante fue declarado a SUNAT por ${data.venueName}. Consérvalo para tus registros.
      </p>
    </div>
  </div>`;
}

export async function sendComprobante(data: ComprobanteEmail): Promise<void> {
  if (!isSmtpConfigured()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP is not configured");
    }
    console.log(`[dev] comprobante ${data.documentNo} para ${data.to} (SMTP sin configurar)`);
    return;
  }

  const attachments = data.xmlContent
    ? [
        {
          filename: `${data.documentNo}.xml`,
          content: data.xmlContent,
          contentType: "application/xml",
        },
      ]
    : undefined;

  await getTransport().sendMail({
    from: process.env.SMTP_FROM || "FoodFlow <no-reply@foodflow.app>",
    to: data.to,
    subject: `${data.documentLabel} ${data.documentNo} — ${data.venueName}`,
    text: [
      `${data.documentLabel} electrónica ${data.documentNo}`,
      `${data.venueName} · ${data.issuedAt} · ${data.total}`,
      data.pdfUrl ? `PDF: ${data.pdfUrl}` : "",
      data.xmlUrl ? `XML: ${data.xmlUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    html: comprobanteHtml(data),
    attachments,
  });
}
