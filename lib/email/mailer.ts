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

function otpEmailHtml(code: string): string {
  return `
  <div style="background:#06070a;padding:40px 24px;font-family:-apple-system,Segoe UI,Inter,sans-serif;">
    <div style="max-width:420px;margin:0 auto;background:#0a0c11;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:36px;text-align:center;">
      <p style="margin:0 0 24px;font-size:15px;font-weight:700;letter-spacing:-0.02em;color:#fff;">FoodFlow</p>
      <p style="margin:0 0 8px;font-size:14px;color:rgba(255,255,255,0.55);">Tu código de acceso</p>
      <p style="margin:0 0 24px;font-size:36px;font-weight:800;letter-spacing:0.15em;background:linear-gradient(100deg,#ffc184,#ff7a2f 45%,#ffd9b0);-webkit-background-clip:text;background-clip:text;color:transparent;">${code}</p>
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.4);">Expira en 5 minutos. Si no lo solicitaste, puedes ignorar este correo.</p>
    </div>
  </div>`;
}

export async function sendOTP(email: string, code: string): Promise<void> {
  if (!isSmtpConfigured()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP is not configured");
    }
    console.log(`[dev] OTP for ${email}: ${code}`);
    return;
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
      subject: `${code} es tu código de acceso a FoodFlow`,
      text: `Tu código de acceso a FoodFlow es ${code}. Expira en 5 minutos.`,
      html: otpEmailHtml(code),
    });
  } catch (err) {
    const response = (err as { response?: string })?.response;
    console.error(
      `[mailer] Resend SMTP rejected the send to ${email}${response ? ` — ${response}` : ""}. ` +
        "Most likely cause: SMTP_FROM isn't on a domain verified in Resend yet."
    );
    throw err;
  }
}
