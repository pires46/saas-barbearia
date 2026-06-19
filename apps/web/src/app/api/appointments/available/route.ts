import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { requireTenant } from "@/lib/api-auth";
import { getAvailableSlots } from "@/lib/services";

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId");
  const date = req.nextUrl.searchParams.get("date");
  const serviceId = req.nextUrl.searchParams.get("serviceId");
  const employeeId = req.nextUrl.searchParams.get("employeeId") || undefined;

  if (!tenantId || !date || !serviceId) {
    return NextResponse.json({ error: "Parâmetros obrigatórios" }, { status: 400 });
  }

  const slots = await getAvailableSlots(tenantId, new Date(date), serviceId, employeeId);
  return NextResponse.json(slots);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tenantId, clientId, employeeId, serviceId, date, time, notes } = body;

  if (!tenantId || !clientId || !employeeId || !serviceId || !date || !time) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });

  const [h, m] = time.split(":").map(Number);
  const start = new Date(date);
  start.setHours(h, m, 0, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + service.duration);

  const appointment = await prisma.appointment.create({
    data: {
      tenantId,
      clientId,
      employeeId,
      serviceId,
      startTime: start,
      endTime: end,
      notes,
      qrCode: `QR-${Date.now()}`,
    },
    include: { client: true, employee: true, service: true },
  });

  return NextResponse.json(appointment, { status: 201 });
}
