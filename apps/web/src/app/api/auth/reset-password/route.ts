import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import bcrypt from "bcryptjs";
import { resetPasswordSchema, parseBody } from "@/lib/validators";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = parseBody(resetPasswordSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { token: parsed.data.token },
    include: { user: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(parsed.data.password, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  await logAudit({
    action: "PASSWORD_RESET",
    userId: record.userId,
    tenantId: record.user.tenantId,
    ip: getClientIp(req),
  });

  return NextResponse.json({ message: "Senha alterada com sucesso" });
}
