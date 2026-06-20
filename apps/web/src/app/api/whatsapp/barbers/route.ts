import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saas-barbearia/database";
import { requireTenant } from "@/lib/api-auth";
import {
  isEvolutionConfigured,
  ensureInstance,
  connectInstance,
  extractQrCode,
  logoutInstance,
  setInstanceWebhook,
} from "@/lib/evolution-api";
import { buildEmployeeInstanceName, getTenantSlug } from "@/lib/whatsapp-instances";
import { getBarbersWhatsappStatus, upsertTenantSettings } from "@/lib/whatsapp-barbers";

export async function GET() {
  try {
    const { error, tenantId } = await requireTenant();
    if (error) return error;
    if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

    const [settings, barbers] = await Promise.all([
      prisma.tenantSettings.findUnique({ where: { tenantId } }),
      getBarbersWhatsappStatus(tenantId),
    ]);

    return NextResponse.json({
      mode: settings?.whatsappMode || "SHOP",
      configured: isEvolutionConfigured(),
      barbers,
    });
  } catch (err) {
    console.error("[whatsapp/barbers GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao carregar barbeiros", barbers: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error, tenantId } = await requireTenant();
    if (error) return error;
    if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

    const body = await req.json();

    if (body.type === "mode") {
      const mode = body.mode === "INDIVIDUAL" ? "INDIVIDUAL" : "SHOP";
      const settings = await upsertTenantSettings(tenantId, { whatsappMode: mode });
      return NextResponse.json(settings);
    }

    if (!isEvolutionConfigured()) {
      return NextResponse.json({ error: "Evolution API não configurada no servidor" }, { status: 503 });
    }

    const employeeId = body.employeeId as string;
    if (!employeeId) {
      return NextResponse.json({ error: "Barbeiro não informado" }, { status: 400 });
    }

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId, role: "BARBER", active: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Barbeiro não encontrado" }, { status: 404 });
    }

    const slug = await getTenantSlug(tenantId);
    const instanceName = buildEmployeeInstanceName(slug, employee.id);

    if (body.type === "connect") {
      await ensureInstance(instanceName);
      const connectData = await connectInstance(instanceName);
      const qrCode = extractQrCode(connectData);

      await prisma.employee.update({
        where: { id: employee.id },
        data: { whatsappInstance: instanceName, whatsappEnabled: true },
      });

      try {
        await setInstanceWebhook(instanceName);
      } catch (err) {
        console.warn("[whatsapp/barbers connect] webhook setup failed:", err);
      }

      return NextResponse.json({ instance: instanceName, qrCode, state: "connecting" });
    }

    if (body.type === "disconnect") {
      if (employee.whatsappInstance) {
        try {
          await logoutInstance(employee.whatsappInstance);
        } catch {
          /* instance may not exist */
        }
      }

      await prisma.employee.update({
        where: { id: employee.id },
        data: { whatsappEnabled: false },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  } catch (err) {
    console.error("[whatsapp/barbers POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao processar requisição" },
      { status: 500 }
    );
  }
}
