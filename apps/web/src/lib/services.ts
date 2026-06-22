import { prisma } from "@saas-barbearia/database";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, subMonths } from "date-fns";
import { generateGeminiJson, generateGeminiText, isGeminiConfigured } from "./gemini";

export async function getTenantId(user: { role: string; tenantId?: string | null }) {
  if (user.role === "SUPER_ADMIN") return null;
  return user.tenantId;
}

export async function getDashboardStats(tenantId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const thirtyDaysAgo = subDays(now, 30);

  const [
    todayAppointments,
    todaySales,
    monthSales,
    newClients,
    recurringClients,
    monthAppointments,
    hourlyData,
  ] = await Promise.all([
    prisma.appointment.count({
      where: {
        tenantId,
        startTime: { gte: todayStart, lte: todayEnd },
        status: { not: "CANCELLED" },
      },
    }),
    prisma.sale.aggregate({
      where: { tenantId, createdAt: { gte: todayStart, lte: todayEnd }, status: "COMPLETED" },
      _sum: { total: true },
    }),
    prisma.sale.aggregate({
      where: { tenantId, createdAt: { gte: monthStart, lte: monthEnd }, status: "COMPLETED" },
      _sum: { total: true },
    }),
    prisma.client.count({
      where: { tenantId, createdAt: { gte: monthStart } },
    }),
    prisma.client.count({
      where: { tenantId, visitCount: { gte: 2 }, lastVisit: { gte: thirtyDaysAgo } },
    }),
    prisma.appointment.findMany({
      where: { tenantId, startTime: { gte: monthStart, lte: monthEnd }, status: "COMPLETED" },
      include: { service: true },
    }),
    prisma.appointment.findMany({
      where: { tenantId, startTime: { gte: subMonths(now, 1) }, status: { not: "CANCELLED" } },
      select: { startTime: true },
    }),
  ]);

  const serviceCounts: Record<string, number> = {};
  monthAppointments.forEach((apt) => {
    const name = apt.service.name;
    serviceCounts[name] = (serviceCounts[name] || 0) + 1;
  });

  const topServicesList = Object.entries(serviceCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const hourCounts: Record<number, number> = {};
  hourlyData.forEach((apt) => {
    const hour = apt.startTime.getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const peakHours = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: `${hour}h`, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const monthlyRevenue = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const mStart = startOfMonth(monthDate);
    const mEnd = endOfMonth(monthDate);
    const revenue = await prisma.sale.aggregate({
      where: { tenantId, createdAt: { gte: mStart, lte: mEnd }, status: "COMPLETED" },
      _sum: { total: true },
    });
    monthlyRevenue.push({
      month: monthDate.toLocaleDateString("pt-BR", { month: "short" }),
      revenue: revenue._sum.total || 0,
    });
  }

  return {
    todayAppointments,
    todayRevenue: todaySales._sum.total || 0,
    monthRevenue: monthSales._sum.total || 0,
    newClients,
    recurringClients,
    topServices: topServicesList,
    peakHours,
    monthlyRevenue,
  };
}

export async function getAvailableSlots(
  tenantId: string,
  date: Date,
  serviceId: string,
  employeeId?: string
) {
  const service = await prisma.service.findFirst({ where: { id: serviceId, tenantId } });
  if (!service) return [];

  const dayOfWeek = date.getDay();
  const businessHour = await prisma.businessHour.findFirst({
    where: { tenantId, dayOfWeek },
  });

  if (!businessHour || businessHour.closed) return [];

  const employees = employeeId
    ? await prisma.employee.findMany({
        where: { id: employeeId, tenantId, active: true },
        include: { schedules: true, absences: true },
      })
    : await prisma.employee.findMany({
        where: { tenantId, active: true, services: { some: { serviceId } } },
        include: { schedules: true, absences: true },
      });

  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      startTime: { gte: dayStart, lte: dayEnd },
      status: { notIn: ["CANCELLED"] },
      ...(employeeId ? { employeeId } : {}),
    },
  });

  const blockedSlots = await prisma.blockedSlot.findMany({
    where: {
      tenantId,
      startTime: { lte: dayEnd },
      endTime: { gte: dayStart },
      ...(employeeId ? { employeeId } : {}),
    },
  });

  const slots: { time: string; employeeId: string; employeeName: string }[] = [];

  for (const emp of employees) {
    const schedule = emp.schedules.find((s) => s.dayOfWeek === dayOfWeek);
    if (!schedule || schedule.off) continue;

    const isAbsent = emp.absences.some((a) => {
      const day = startOfDay(date).getTime();
      return day >= startOfDay(a.startDate).getTime() && day <= startOfDay(a.endDate).getTime();
    });
    if (isAbsent) continue;

    const empAppointments = appointments.filter((a) => a.employeeId === emp.id);
    const empBlocked = blockedSlots.filter(
      (b) => !b.employeeId || b.employeeId === emp.id
    );

    const [startH, startM] = schedule.startTime.split(":").map(Number);
    const [endH, endM] = schedule.endTime.split(":").map(Number);
    let current = startH * 60 + startM;
    const end = endH * 60 + endM;

    while (current + service.duration <= end) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      const slotStart = new Date(date);
      slotStart.setHours(h, m, 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + service.duration);

      if (slotStart <= new Date()) {
        current += service.duration;
        continue;
      }

      const isBooked = empAppointments.some(
        (apt) => slotStart < apt.endTime && slotEnd > apt.startTime
      );
      const isBlocked = empBlocked.some(
        (b) => slotStart < b.endTime && slotEnd > b.startTime
      );

      if (!isBooked && !isBlocked) {
        slots.push({
          time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
          employeeId: emp.id,
          employeeName: emp.name,
        });
      }
      current += service.duration;
    }
  }

  return slots.sort((a, b) => a.time.localeCompare(b.time));
}

export async function getAIPredictions(tenantId: string) {
  const now = new Date();
  const lastMonth = subMonths(now, 1);

  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      startTime: { gte: lastMonth },
      status: { not: "CANCELLED" },
    },
    select: { startTime: true, serviceId: true },
  });

  const dayCounts: Record<number, number> = {};
  const hourCounts: Record<number, number> = {};

  appointments.forEach((apt) => {
    const day = apt.startTime.getDay();
    const hour = apt.startTime.getHours();
    dayCounts[day] = (dayCounts[day] || 0) + 1;
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const busiestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
  const busiestHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];

  const dayLabel = busiestDay ? days[Number(busiestDay[0])] : "Sábado";
  const hourLabel = busiestHour ? `${busiestHour[0]}h - ${Number(busiestHour[0]) + 1}h` : "10h - 11h";

  let suggestion = "Considere promoção de terça-feira para aumentar movimento nos horários ociosos.";
  if (isGeminiConfigured() && appointments.length > 0) {
    try {
      suggestion = await generateGeminiText({
        system: "Você é consultor de barbearias no Brasil. Respostas curtas e práticas.",
        prompt: `Barbearia com ${appointments.length} agendamentos no último mês. Dia mais movimentado: ${dayLabel}. Horário de pico: ${hourLabel}. Dê UMA sugestão objetiva para aumentar faturamento ou ocupação.`,
        temperature: 0.6,
      });
    } catch {
      /* fallback */
    }
  }

  return {
    busiestDay: dayLabel,
    busiestHour: hourLabel,
    totalAnalyzed: appointments.length,
    suggestion,
  };
}

export async function getAIPromotions(tenantId: string) {
  const inactiveClients = await prisma.client.count({
    where: {
      tenantId,
      OR: [
        { lastVisit: { lt: subDays(new Date(), 60) } },
        { lastVisit: null, createdAt: { lt: subDays(new Date(), 30) } },
      ],
    },
  });

  const allProducts = await prisma.product.findMany({ where: { tenantId } });
  const lowStock = allProducts.filter((p) => p.stock <= p.minStock).length;

  const fallback = [
    {
      title: "Recuperar clientes inativos",
      description: `${inactiveClients} clientes sem visita há mais de 60 dias. Envie promoção de 15% off.`,
      impact: "Alto",
      type: "whatsapp",
    },
    {
      title: "Combo Corte + Barba",
      description: "Horários de terça e quarta têm baixa ocupação. Ofereça combo com 10% desconto.",
      impact: "Médio",
      type: "promotion",
    },
    {
      title: "Reposição de estoque",
      description: `${lowStock} produtos abaixo do estoque mínimo. Considere promoção para girar estoque.`,
      impact: "Médio",
      type: "inventory",
    },
  ];

  if (isGeminiConfigured()) {
    try {
      const aiPromos = await generateGeminiJson<
        { title: string; description: string; impact: string; type: string }[]
      >({
        system: "Você é especialista em marketing para barbearias no Brasil.",
        prompt: `Gere 3 sugestões de promoção com base em: ${inactiveClients} clientes inativos (+60 dias), ${lowStock} produtos com estoque baixo. JSON array: [{title, description, impact: Alto|Médio|Baixo, type: whatsapp|promotion|inventory}]`,
      });
      if (Array.isArray(aiPromos) && aiPromos.length > 0) return aiPromos.slice(0, 5);
    } catch {
      /* fallback */
    }
  }

  return fallback;
}
