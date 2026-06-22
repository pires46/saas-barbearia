import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { sendAppointmentConfirmation } from "@/lib/whatsapp-service";
import { publicBookingSchema, parseBody } from "@/lib/validators";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: {
      services: { where: { active: true }, orderBy: { price: "asc" } },
      employees: {
        where: { active: true, role: "BARBER" },
        include: { services: { include: { service: true } } },
        orderBy: { rating: "desc" },
      },
      businessHours: { orderBy: { dayOfWeek: "asc" } },
    },
  });

  if (!tenant || tenant.blocked || !tenant.active) {
    return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    description: tenant.description,
    address: tenant.address,
    phone: tenant.phone,
    instagram: tenant.instagram,
    spotifyUrl: tenant.spotifyUrl,
    logo: tenant.logo,
    coverImage: tenant.coverImage,
    services: tenant.services,
    employees: tenant.employees.map((e) => ({
      id: e.id,
      name: e.name,
      bio: e.bio,
      photo: e.photo,
      rating: e.rating,
      totalReviews: e.totalReviews,
      services: e.services,
    })),
    businessHours: tenant.businessHours,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const ip = getClientIp(req);
  const limited = rateLimit(`booking:${ip}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde." }, { status: 429 });
  }

  const body = await req.json();
  const parsed = parseBody(publicBookingSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const data = parsed.data;
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.blocked) {
    return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });
  }

  let client = await prisma.client.findFirst({
    where: { tenantId: tenant.id, phone: data.phone },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        tenantId: tenant.id,
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        consentLgpd: true,
        consentAt: new Date(),
      },
    });
  } else {
    await prisma.client.update({
      where: { id: client.id },
      data: { consentLgpd: true, consentAt: new Date() },
    });
  }

  const service = await prisma.service.findFirst({
    where: { id: data.serviceId, tenantId: tenant.id, active: true },
  });
  if (!service) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });

  const employee = await prisma.employee.findFirst({
    where: { id: data.employeeId, tenantId: tenant.id, active: true, role: "BARBER" },
  });
  if (!employee) return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 });

  const [h, m] = data.time.split(":").map(Number);
  const start = new Date(data.date);
  start.setHours(h, m, 0, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + service.duration);

  const appointment = await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      clientId: client.id,
      employeeId: data.employeeId,
      serviceId: data.serviceId,
      startTime: start,
      endTime: end,
      qrCode: `QR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    },
    include: { employee: true, service: true, client: true },
  });

  await sendAppointmentConfirmation(tenant.id, client, appointment);

  return NextResponse.json({ appointment, client }, { status: 201 });
}
