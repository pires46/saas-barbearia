import { prisma } from "@saas-barbearia/database";

export type ScheduleInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  off?: boolean;
};

export const DEFAULT_SCHEDULE: ScheduleInput[] = [
  { dayOfWeek: 0, startTime: "09:00", endTime: "18:00", off: true },
  { dayOfWeek: 1, startTime: "09:00", endTime: "19:00", off: false },
  { dayOfWeek: 2, startTime: "09:00", endTime: "19:00", off: false },
  { dayOfWeek: 3, startTime: "09:00", endTime: "19:00", off: false },
  { dayOfWeek: 4, startTime: "09:00", endTime: "19:00", off: false },
  { dayOfWeek: 5, startTime: "09:00", endTime: "19:00", off: false },
  { dayOfWeek: 6, startTime: "09:00", endTime: "18:00", off: false },
];

export function buildDefaultSchedules(): ScheduleInput[] {
  return DEFAULT_SCHEDULE.map((s) => ({ ...s }));
}

export async function ensureBusinessHours(tenantId: string) {
  const existing = await prisma.businessHour.findMany({ where: { tenantId } });
  const existingDays = new Set(existing.map((h) => h.dayOfWeek));

  for (let day = 0; day < 7; day++) {
    if (!existingDays.has(day)) {
      await prisma.businessHour.create({
        data: {
          id: `${tenantId}-${day}`,
          tenantId,
          dayOfWeek: day,
          openTime: "09:00",
          closeTime: day === 6 ? "18:00" : "19:00",
          closed: day === 0,
        },
      });
    }
  }

  return prisma.businessHour.findMany({
    where: { tenantId },
    orderBy: { dayOfWeek: "asc" },
  });
}

export async function saveEmployeeSchedules(employeeId: string, schedules: ScheduleInput[]) {
  await prisma.employeeSchedule.deleteMany({ where: { employeeId } });
  const active = schedules.filter((s) => !s.off);
  if (active.length === 0) return [];

  await prisma.employeeSchedule.createMany({
    data: active.map((s) => ({
      employeeId,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      off: false,
    })),
  });

  return prisma.employeeSchedule.findMany({ where: { employeeId }, orderBy: { dayOfWeek: "asc" } });
}

export function schedulesToForm(schedules: { dayOfWeek: number; startTime: string; endTime: string; off?: boolean }[]) {
  const defaults = buildDefaultSchedules();
  return defaults.map((d) => {
    const found = schedules.find((s) => s.dayOfWeek === d.dayOfWeek);
    if (!found) return d;
    return {
      dayOfWeek: d.dayOfWeek,
      startTime: found.startTime,
      endTime: found.endTime,
      off: found.off ?? false,
    };
  });
}

export function generateDatesInRange(startDate: string, endDate: string, weekdays: number[]): string[] {
  if (!startDate || !endDate || weekdays.length === 0) return [];

  const dates: string[] = [];
  const current = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  while (current <= end) {
    if (weekdays.includes(current.getDay())) {
      dates.push(current.toISOString().slice(0, 10));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export async function createEmployeeAbsences(
  employeeId: string,
  dates: string[],
  absenceType: string,
  reason?: string
) {
  const uniqueDates = [...new Set(dates)].sort();
  if (uniqueDates.length === 0) return [];

  await prisma.employeeAbsence.createMany({
    data: uniqueDates.map((date) => {
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(`${date}T23:59:59`);
      return {
        employeeId,
        type: absenceType as "DAY_OFF" | "VACATION" | "SICK",
        startDate: start,
        endDate: end,
        reason: reason || null,
      };
    }),
  });

  return prisma.employeeAbsence.findMany({
    where: { employeeId },
    orderBy: { startDate: "desc" },
  });
}
