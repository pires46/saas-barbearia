import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { requireTenant } from "@/lib/api-auth";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const employees = await prisma.employee.findMany({
    where: { tenantId, active: true },
    include: {
      schedules: true,
      absences: true,
      services: { include: { service: true } },
      _count: { select: { appointments: true } },
    },
    orderBy: { name: "asc" },
  });

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const withStats = await Promise.all(
    employees.map(async (emp) => {
      const [appointments, sales] = await Promise.all([
        prisma.appointment.count({
          where: {
            employeeId: emp.id,
            startTime: { gte: monthStart, lte: monthEnd },
            status: "COMPLETED",
          },
        }),
        prisma.saleItem.aggregate({
          where: {
            employeeId: emp.id,
            sale: { createdAt: { gte: monthStart, lte: monthEnd }, status: "COMPLETED" },
          },
          _sum: { total: true, commission: true },
        }),
      ]);
      return {
        ...emp,
        monthAppointments: appointments,
        monthRevenue: sales._sum.total || 0,
        monthCommission: sales._sum.commission || 0,
      };
    })
  );

  return NextResponse.json(withStats);
}

export async function POST(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const body = await req.json();
  const { serviceIds, schedules, ...data } = body;

  const employee = await prisma.employee.create({
    data: { tenantId, ...data },
  });

  if (serviceIds?.length) {
    await prisma.employeeService.createMany({
      data: serviceIds.map((sid: string) => ({ employeeId: employee.id, serviceId: sid })),
    });
  }

  if (schedules?.length) {
    await prisma.employeeSchedule.createMany({
      data: schedules.map((s: { dayOfWeek: number; startTime: string; endTime: string }) => ({
        employeeId: employee.id,
        ...s,
      })),
    });
  }

  return NextResponse.json(employee, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireTenant();
  if (error) return error;

  const body = await req.json();
  const { id, type, ...data } = body;

  if (type === "absence") {
    const absence = await prisma.employeeAbsence.create({
      data: {
        employeeId: id,
        type: data.absenceType || "DAY_OFF",
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason,
      },
    });
    return NextResponse.json(absence);
  }

  const employee = await prisma.employee.update({ where: { id }, data });
  return NextResponse.json(employee);
}
