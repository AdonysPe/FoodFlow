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
      <p style="margin:0 0 8px;font-size:14px;color:rgba(255,255,255,0.55);">Your login code</p>
      <p style="margin:0 0 24px;font-size:36px;font-weight:800;letter-spacing:0.15em;background:linear-gradient(100deg,#ffc184,#ff7a2f 45%,#ffd9b0);-webkit-background-clip:text;background-clip:text;color:transparent;">${code}</p>
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.4);">Expires in 5 minutes. If you didn't request this, you can ignore this email.</p>
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
  await transport.sendMail({
    from: process.env.SMTP_FROM || "FoodFlow <no-reply@foodflow.app>",
    to: email,
    subject: `${code} is your FoodFlow login code`,
    text: `Your FoodFlow login code is ${code}. It expires in 5 minutes.`,
    html: otpEmailHtml(code),
  });
}
