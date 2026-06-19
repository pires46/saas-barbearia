import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { requireTenant } from "@/lib/api-auth";
import { checkinSchema, reviewSchema, parseBody } from "@/lib/validators";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const { error, tenantId, session } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const body = await req.json();

  if (body.type === "checkin") {
    const parsed = parseBody(checkinSchema, body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const appointment = await prisma.appointment.findFirst({
      where: { tenantId, qrCode: parsed.data.qrCode, status: { in: ["SCHEDULED", "CONFIRMED"] } },
      include: { client: true, employee: true, service: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { checkedIn: true, checkedInAt: new Date(), status: "IN_PROGRESS" },
    });

    await logAudit({
      action: "APPOINTMENT_CHECKIN",
      userId: session?.id,
      tenantId,
      entity: "Appointment",
      entityId: appointment.id,
    });

    return NextResponse.json({ appointment: updated, client: appointment.client });
  }

  if (body.type === "review") {
    const parsed = parseBody(reviewSchema, body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const appointment = await prisma.appointment.findFirst({
      where: { id: parsed.data.appointmentId, tenantId, status: "COMPLETED" },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Agendamento inválido para avaliação" }, { status: 400 });
    }

    const existing = await prisma.review.findUnique({ where: { appointmentId: appointment.id } });
    if (existing) return NextResponse.json({ error: "Já avaliado" }, { status: 400 });

    const review = await prisma.review.create({
      data: {
        tenantId,
        clientId: appointment.clientId,
        appointmentId: appointment.id,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
      },
    });

    const stats = await prisma.review.aggregate({
      where: { tenantId, appointment: { employeeId: appointment.employeeId } },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.employee.update({
      where: { id: appointment.employeeId },
      data: {
        rating: stats._avg.rating || 0,
        totalReviews: stats._count,
      },
    });

    return NextResponse.json(review, { status: 201 });
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
}
