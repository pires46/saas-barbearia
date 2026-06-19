import { prisma } from "@saas-barbearia/database";
import { isEvolutionConfigured, sendTextMessage } from "./evolution-api";
import { resolveWhatsappInstance } from "./whatsapp-instances";

export async function queueWhatsappMessage(
  tenantId: string,
  phone: string,
  message: string,
  type: "CONFIRMATION" | "REMINDER_24H" | "REMINDER_2H" | "THANK_YOU" | "MARKETING" | "CUSTOM",
  employeeId?: string,
  appointmentId?: string
) {
  const settings = await prisma.tenantSettings.findUnique({ where: { tenantId } });
  const instanceName = await resolveWhatsappInstance(tenantId, employeeId);

  let status: "PENDING" | "SENT" | "FAILED" = "PENDING";
  let sentAt: Date | null = null;

  const canSend =
    isEvolutionConfigured() &&
    instanceName &&
    (settings?.whatsappMode === "INDIVIDUAL"
      ? Boolean(employeeId)
      : settings?.whatsappEnabled);

  if (canSend) {
    try {
      await sendTextMessage(instanceName, phone, message);
      status = "SENT";
      sentAt = new Date();
    } catch {
      status = "PENDING";
    }
  }

  return prisma.whatsappMessage.create({
    data: { tenantId, phone, message, type, status, sentAt, appointmentId },
  });
}

export async function sendAppointmentConfirmation(
  tenantId: string,
  client: { name: string; phone: string },
  appointment: { id: string; startTime: Date; employee: { id: string; name: string }; service: { name: string } }
) {
  const settings = await prisma.tenantSettings.findUnique({ where: { tenantId } });
  if (!settings?.confirmBooking) return null;

  const date = appointment.startTime.toLocaleDateString("pt-BR");
  const time = appointment.startTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const message = `Olá ${client.name}! Seu agendamento foi confirmado para ${date} às ${time} com ${appointment.employee.name}. Serviço: ${appointment.service.name}.`;

  return queueWhatsappMessage(tenantId, client.phone, message, "CONFIRMATION", appointment.employee.id, appointment.id);
}

function formatAppointmentMessage(
  clientName: string,
  startTime: Date,
  employeeName: string,
  serviceName: string,
  kind: "24h" | "2h" | "thanks"
) {
  const date = startTime.toLocaleDateString("pt-BR");
  const time = startTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  if (kind === "24h") {
    return `Olá ${clientName}! Lembrete: amanhã você tem horário às ${time} com ${employeeName}. Serviço: ${serviceName}.`;
  }
  if (kind === "2h") {
    return `Olá ${clientName}! Seu horário é em 2 horas (${time}) com ${employeeName}. Serviço: ${serviceName}. Te esperamos!`;
  }
  return `Olá ${clientName}! Obrigado pela visita. Esperamos você em breve na barbearia! ⭐`;
}

export async function processWhatsappReminders() {
  const now = new Date();
  const in24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const in24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  const in2hStart = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);
  const in2hEnd = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);
  const thankYouStart = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const thankYouEnd = new Date(now.getTime() - 30 * 60 * 1000);

  let sent24h = 0;
  let sent2h = 0;
  let sentThanks = 0;

  const settingsList = await prisma.tenantSettings.findMany();

  for (const settings of settingsList) {
    if (settings.reminder24h) {
      const appointments = await prisma.appointment.findMany({
        where: {
          tenantId: settings.tenantId,
          reminder24hSent: false,
          status: { in: ["SCHEDULED", "CONFIRMED"] },
          startTime: { gte: in24hStart, lte: in24hEnd },
        },
        include: { client: true, employee: true, service: true },
      });

      for (const apt of appointments) {
        const msg = formatAppointmentMessage(apt.client.name, apt.startTime, apt.employee.name, apt.service.name, "24h");
        await queueWhatsappMessage(settings.tenantId, apt.client.phone, msg, "REMINDER_24H", apt.employeeId, apt.id);
        await prisma.appointment.update({ where: { id: apt.id }, data: { reminder24hSent: true } });
        sent24h++;
      }
    }

    if (settings.reminder2h) {
      const appointments = await prisma.appointment.findMany({
        where: {
          tenantId: settings.tenantId,
          reminder2hSent: false,
          status: { in: ["SCHEDULED", "CONFIRMED"] },
          startTime: { gte: in2hStart, lte: in2hEnd },
        },
        include: { client: true, employee: true, service: true },
      });

      for (const apt of appointments) {
        const msg = formatAppointmentMessage(apt.client.name, apt.startTime, apt.employee.name, apt.service.name, "2h");
        await queueWhatsappMessage(settings.tenantId, apt.client.phone, msg, "REMINDER_2H", apt.employeeId, apt.id);
        await prisma.appointment.update({ where: { id: apt.id }, data: { reminder2hSent: true } });
        sent2h++;
      }
    }

    if (settings.thankYouMessage) {
      const appointments = await prisma.appointment.findMany({
        where: {
          tenantId: settings.tenantId,
          thankYouSent: false,
          status: "COMPLETED",
          endTime: { gte: thankYouStart, lte: thankYouEnd },
        },
        include: { client: true, employee: true, service: true },
      });

      for (const apt of appointments) {
        const msg = formatAppointmentMessage(apt.client.name, apt.startTime, apt.employee.name, apt.service.name, "thanks");
        await queueWhatsappMessage(settings.tenantId, apt.client.phone, msg, "THANK_YOU", apt.employeeId, apt.id);
        await prisma.appointment.update({ where: { id: apt.id }, data: { thankYouSent: true } });
        sentThanks++;
      }
    }
  }

  return { sent24h, sent2h, sentThanks };
}
