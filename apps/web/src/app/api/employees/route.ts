import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { requireTenant } from "@/lib/api-auth";
import { startOfMonth, endOfMonth } from "date-fns";
import {
  buildDefaultSchedules,
  createEmployeeAbsences,
  generateDatesInRange,
  saveEmployeeSchedules,
} from "@/lib/employee-schedules";

async function getEmployeeForTenant(id: string, tenantId: string) {
  return prisma.employee.findFirst({ where: { id, tenantId, active: true } });
}

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
  const { serviceIds, schedules, ...raw } = body;

  const employee = await prisma.employee.create({
    data: {
      tenantId,
      name: raw.name,
      phone: raw.phone,
      cpf: raw.cpf,
      email: raw.email,
      role: raw.role || "BARBER",
      bio: raw.bio,
      photo: raw.photo,
      serviceCommission: raw.serviceCommission ?? 50,
      productCommission: raw.productCommission ?? 10,
    },
  });

  if (serviceIds?.length) {
    const validServices = await prisma.service.findMany({
      where: { tenantId, id: { in: serviceIds }, active: true },
      select: { id: true },
    });
    if (validServices.length > 0) {
      await prisma.employeeService.createMany({
        data: validServices.map((s) => ({ employeeId: employee.id, serviceId: s.id })),
      });
    }
  }

  if (schedules?.length) {
    await saveEmployeeSchedules(employee.id, schedules);
  } else {
    await saveEmployeeSchedules(employee.id, buildDefaultSchedules());
  }

  return NextResponse.json(employee, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const body = await req.json();
  const { id, type, ...data } = body;
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const employee = await getEmployeeForTenant(id, tenantId);
  if (!employee) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });

  if (type === "schedules") {
    const saved = await saveEmployeeSchedules(id, data.schedules || []);
    return NextResponse.json({ schedules: saved });
  }

  if (type === "absence") {
    const dates: string[] = [];

    if (data.dates?.length) {
      dates.push(...data.dates);
    } else if (data.startDate && data.endDate && data.weekdays?.length) {
      dates.push(...generateDatesInRange(data.startDate, data.endDate, data.weekdays));
    } else if (data.startDate && data.endDate) {
      dates.push(...generateDatesInRange(data.startDate, data.endDate, [0, 1, 2, 3, 4, 5, 6]));
    } else if (data.startDate) {
      dates.push(data.startDate);
    }

    if (dates.length === 0) {
      return NextResponse.json({ error: "Selecione ao menos um dia" }, { status: 400 });
    }

    const absences = await createEmployeeAbsences(id, dates, data.absenceType || "DAY_OFF", data.reason);
    return NextResponse.json({ absences, created: dates.length });
  }

  if (type === "absence-delete") {
    const absence = await prisma.employeeAbsence.findFirst({
      where: { id: data.absenceId, employeeId: id },
    });
    if (!absence) return NextResponse.json({ error: "Folga não encontrada" }, { status: 404 });

    await prisma.employeeAbsence.delete({ where: { id: data.absenceId } });
    return NextResponse.json({ success: true });
  }

  const updated = await prisma.employee.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { error, tenantId } = await requireTenant();
  if (error) return error;
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const employee = await getEmployeeForTenant(id, tenantId);
  if (!employee) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });

  await prisma.employee.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ success: true });
}
