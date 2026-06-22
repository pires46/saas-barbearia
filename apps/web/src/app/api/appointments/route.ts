import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { requireTenant } from "@/lib/api-auth";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { sendAppointmentConfirmation } from "@/lib/whatsapp-service";

export async function GET(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const view = req.nextUrl.searchParams.get("view") || "day";
  const dateStr = req.nextUrl.searchParams.get("date") || new Date().toISOString();
  const date = new Date(dateStr);

  let start: Date, end: Date;
  switch (view) {
    case "week":
      start = startOfWeek(date, { weekStartsOn: 0 });
      end = endOfWeek(date, { weekStartsOn: 0 });
      break;
    case "month":
      start = startOfMonth(date);
      end = endOfMonth(date);
      break;
    default:
      start = startOfDay(date);
      end = endOfDay(date);
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      startTime: { gte: start, lte: end },
    },
    include: {
      client: { select: { id: true, name: true, phone: true } },
      employee: { select: { id: true, name: true } },
      service: { select: { id: true, name: true, duration: true, price: true } },
    },
    orderBy: { startTime: "asc" },
  });

  const blockedSlots = await prisma.blockedSlot.findMany({
    where: {
      tenantId,
      startTime: { lte: end },
      endTime: { gte: start },
    },
    include: { employee: { select: { name: true } } },
  });

  return NextResponse.json({ appointments, blockedSlots });
}

export async function POST(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const body = await req.json();
  const { clientId, employeeId, serviceId, startTime, notes } = body;

  const service = await prisma.service.findFirst({ where: { id: serviceId, tenantId } });
  if (!service) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });

  const client = await prisma.client.findFirst({ where: { id: clientId, tenantId } });
  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, tenantId, active: true },
  });
  if (!employee) return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 });

  const start = new Date(startTime);
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
      status: "SCHEDULED",
    },
    include: {
      client: true,
      employee: true,
      service: true,
    },
  });

  await sendAppointmentConfirmation(tenantId, appointment.client, appointment);

  return NextResponse.json(appointment, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const body = await req.json();
  const { id, status, startTime, employeeId, serviceId } = body;

  const existing = await prisma.appointment.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;
  if (employeeId) {
    const emp = await prisma.employee.findFirst({ where: { id: employeeId, tenantId } });
    if (!emp) return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 });
    updateData.employeeId = employeeId;
  }

  if (startTime || serviceId) {
    const svc = await prisma.service.findFirst({
      where: { id: serviceId || existing.serviceId, tenantId },
    });
    if (svc) {
      const start = new Date(startTime || existing.startTime);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + svc.duration);
      updateData.startTime = start;
      updateData.endTime = end;
      if (serviceId) updateData.serviceId = serviceId;
    }
  }

  if (status === "COMPLETED") {
    updateData.checkedIn = true;
    updateData.checkedInAt = new Date();
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: updateData,
    include: { client: true, employee: true, service: true },
  });

  if (status === "COMPLETED") {
    await prisma.client.update({
      where: { id: appointment.clientId },
      data: {
        visitCount: { increment: 1 },
        lastVisit: new Date(),
        totalSpent: { increment: appointment.service.price },
        loyaltyPoints: { increment: Math.floor(appointment.service.price) },
      },
    });
  }

  return NextResponse.json(appointment);
}

export async function DELETE(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const existing = await prisma.appointment.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });

  await prisma.appointment.update({
    where: { id: existing.id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ success: true });
}
