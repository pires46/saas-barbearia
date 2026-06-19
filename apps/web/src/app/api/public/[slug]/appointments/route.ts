import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const phone = req.nextUrl.searchParams.get("phone");

  if (!phone) {
    return NextResponse.json({ error: "Telefone obrigatório" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.blocked || !tenant.active) {
    return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });
  }

  const client = await prisma.client.findFirst({
    where: { tenantId: tenant.id, phone, active: true },
  });

  if (!client) {
    return NextResponse.json({ client: null, appointments: [] });
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId: tenant.id,
      clientId: client.id,
      startTime: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    include: {
      employee: { select: { name: true } },
      service: { select: { name: true, price: true } },
    },
    orderBy: { startTime: "desc" },
    take: 20,
  });

  return NextResponse.json({ client, appointments });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json();
  const { appointmentId, phone, action } = body;

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });

  const client = await prisma.client.findFirst({
    where: { tenantId: tenant.id, phone, active: true },
  });
  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId: tenant.id, clientId: client.id },
  });
  if (!appointment) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });

  if (action === "cancel") {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "reschedule" && body.date && body.time && body.employeeId) {
    const service = await prisma.service.findUnique({ where: { id: appointment.serviceId } });
    if (!service) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });

    const [h, m] = body.time.split(":").map(Number);
    const start = new Date(body.date);
    start.setHours(h, m, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + service.duration);

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        startTime: start,
        endTime: end,
        employeeId: body.employeeId,
        status: "SCHEDULED",
      },
      include: { employee: true, service: true },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}
