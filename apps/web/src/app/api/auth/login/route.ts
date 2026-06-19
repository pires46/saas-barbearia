import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@saas-barbearia/database";
import { createToken, COOKIE_NAME } from "@/lib/auth";
import { loginSchema, parseBody } from "@/lib/validators";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limited = rateLimit(`login:${ip}`, 15, 60_000);
    if (!limited.ok) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde." }, { status: 429 });
    }

    const body = await req.json();
    const parsed = parseBody(loginSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    if (user.tenantId) {
      const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
      if (tenant?.blocked) {
        return NextResponse.json({ error: "Conta bloqueada por inadimplência" }, { status: 403 });
      }
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    };

    const token = await createToken(sessionUser);

    const response = NextResponse.json({ user: sessionUser });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    await logAudit({ action: "LOGIN", userId: user.id, tenantId: user.tenantId, ip });

    return response;
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
