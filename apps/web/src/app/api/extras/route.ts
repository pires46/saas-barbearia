import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { requireTenant } from "@/lib/api-auth";
import { getAIPredictions, getAIPromotions } from "@/lib/services";

export async function GET(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const type = req.nextUrl.searchParams.get("type");

  if (type === "waitlist") {
    const waitlist = await prisma.waitlistEntry.findMany({
      where: { tenantId },
      include: { client: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(waitlist);
  }

  const [predictions, promotions] = await Promise.all([
    getAIPredictions(tenantId),
    getAIPromotions(tenantId),
  ]);

  const barberRanking = await prisma.employee.findMany({
    where: { tenantId, active: true, role: "BARBER" },
    orderBy: { rating: "desc" },
    select: { id: true, name: true, rating: true, totalReviews: true },
  });

  return NextResponse.json({ predictions, promotions, barberRanking });
}

export async function POST(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const body = await req.json();

  if (body.type === "blocked-slot") {
    const slot = await prisma.blockedSlot.create({
      data: {
        tenantId,
        employeeId: body.employeeId,
        startTime: new Date(body.startTime),
        endTime: new Date(body.endTime),
        reason: body.reason,
      },
    });
    return NextResponse.json(slot, { status: 201 });
  }

  if (body.type === "waitlist") {
    const entry = await prisma.waitlistEntry.create({
      data: {
        tenantId,
        clientId: body.clientId,
        serviceId: body.serviceId,
        employeeId: body.employeeId,
        preferredDate: body.preferredDate ? new Date(body.preferredDate) : null,
        notes: body.notes,
      },
      include: { client: true },
    });
    return NextResponse.json(entry, { status: 201 });
  }

  if (body.type === "checkin") {
    const appointment = await prisma.appointment.update({
      where: { id: body.appointmentId },
      data: { checkedIn: true, checkedInAt: new Date(), status: "IN_PROGRESS" },
    });
    return NextResponse.json(appointment);
  }

  if (body.type === "review") {
    const review = await prisma.review.create({
      data: {
        tenantId,
        clientId: body.clientId,
        appointmentId: body.appointmentId,
        rating: body.rating,
        comment: body.comment,
      },
    });

    const appointment = await prisma.appointment.findUnique({
      where: { id: body.appointmentId },
    });
    if (appointment) {
      const employee = await prisma.employee.findUnique({
        where: { id: appointment.employeeId },
      });
      if (employee) {
        const newTotal = employee.totalReviews + 1;
        const newRating =
          (employee.rating * employee.totalReviews + body.rating) / newTotal;
        await prisma.employee.update({
          where: { id: employee.id },
          data: { rating: newRating, totalReviews: newTotal },
        });
      }
    }

    return NextResponse.json(review, { status: 201 });
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
}
