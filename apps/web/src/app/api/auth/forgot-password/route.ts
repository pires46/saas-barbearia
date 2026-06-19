import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { forgotPasswordSchema, parseBody } from "@/lib/validators";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limited = rateLimit(`forgot:${ip}`, 5, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde." }, { status: 429 });
  }

  const body = await req.json();
  const parsed = parseBody(forgotPasswordSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Resposta genérica (segurança)
  if (!user) {
    return NextResponse.json({ message: "Se o e-mail existir, enviaremos instruções." });
  }

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  await sendPasswordResetEmail(user.email, user.name, token);

  return NextResponse.json({ message: "Se o e-mail existir, enviaremos instruções." });
}
