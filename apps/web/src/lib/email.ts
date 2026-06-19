const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || "BarberSaaS <noreply@barbersaas.com.br>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.info("[email:dev]", { to, subject, html: html.slice(0, 120) });
    return { ok: true as const, id: "dev" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[email]", err);
    return { ok: false as const, error: err };
  }

  const data = await res.json();
  return { ok: true as const, id: data.id };
}

export function passwordResetEmail(name: string, token: string) {
  const url = `${APP_URL}/reset-password?token=${token}`;
  return sendEmail(
    "",
    "Redefinir senha — BarberSaaS",
    `<p>Olá ${name},</p><p>Clique para redefinir sua senha:</p><p><a href="${url}">${url}</a></p><p>Link válido por 1 hora.</p>`
  );
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const url = `${APP_URL}/reset-password?token=${token}`;
  return sendEmail(
    to,
    "Redefinir senha — BarberSaaS",
    `<p>Olá ${name},</p><p>Clique para redefinir sua senha:</p><p><a href="${url}">${url}</a></p><p>Link válido por 1 hora.</p>`
  );
}

export async function sendInvoiceEmail(to: string, tenantName: string, amount: number, paymentUrl?: string) {
  return sendEmail(
    to,
    `Fatura BarberSaaS — ${tenantName}`,
    `<p>Sua fatura de R$ ${amount.toFixed(2)} está disponível.</p>${paymentUrl ? `<p><a href="${paymentUrl}">Pagar agora</a></p>` : ""}`
  );
}
