"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiErrorBanner } from "@/components/api-error-banner";
import { useSafeApi } from "@/hooks/use-safe-api";
import { fetchApiJson } from "@/lib/fetch-api";
import {
  MessageCircle,
  Send,
  Megaphone,
  QrCode,
  Wifi,
  WifiOff,
  RefreshCw,
  Building2,
  User,
  CheckCircle2,
} from "lucide-react";
import { getInitials } from "@saas-barbearia/shared";

interface WhatsappData {
  messages: { id: string; phone: string; message: string; type: string; status: string; createdAt: string }[];
  campaigns: { id: string; name: string; message: string; status: string; sentCount: number }[];
  settings: {
    confirmBooking: boolean;
    reminder24h: boolean;
    reminder2h: boolean;
    thankYouMessage: boolean;
    whatsappBotEnabled?: boolean;
    whatsappEnabled: boolean;
    whatsappMode?: "SHOP" | "INDIVIDUAL";
  } | null;
  barbers?: BarberWhatsapp[];
  evolution: {
    configured: boolean;
    instance: string | null;
    mode?: "SHOP" | "INDIVIDUAL";
    state: string;
    qrCode?: string | null;
  };
}

interface BarberWhatsapp {
  id: string;
  name: string;
  phone: string | null;
  whatsappEnabled: boolean;
  whatsappInstance: string | null;
  connection: { state: string; qrCode: string | null };
}

type WhatsappMode = "SHOP" | "INDIVIDUAL";

const EMPTY_WHATSAPP: WhatsappData = {
  messages: [],
  campaigns: [],
  settings: null,
  barbers: [],
  evolution: { configured: false, instance: null, state: "unconfigured", mode: "SHOP" },
};

function normalizeWhatsappData(raw: Partial<WhatsappData>): WhatsappData {
  return {
    messages: Array.isArray(raw.messages) ? raw.messages : [],
    campaigns: Array.isArray(raw.campaigns) ? raw.campaigns : [],
    settings: raw.settings ?? null,
    barbers: Array.isArray(raw.barbers) ? raw.barbers : [],
    evolution: {
      configured: raw.evolution?.configured ?? false,
      instance: raw.evolution?.instance ?? null,
      state: raw.evolution?.state ?? "unconfigured",
      mode: raw.evolution?.mode ?? raw.settings?.whatsappMode ?? "SHOP",
      qrCode: raw.evolution?.qrCode ?? null,
    },
  };
}

export default function WhatsappPage() {
  const { data, error, loading, retry, reload } = useSafeApi(
    "/api/whatsapp",
    normalizeWhatsappData,
    EMPTY_WHATSAPP,
    { pollMs: 10000, retries: 2 }
  );

  const [campaignForm, setCampaignForm] = useState({ name: "", message: "" });
  const [shopQrCode, setShopQrCode] = useState<string | null>(null);
  const [barberQrCodes, setBarberQrCodes] = useState<Record<string, string>>({});
  const [connectingShop, setConnectingShop] = useState(false);
  const [connectingBarber, setConnectingBarber] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const barbers = data?.barbers ?? [];
  const mode: WhatsappMode = data?.settings?.whatsappMode || data?.evolution?.mode || "SHOP";

  const processPending = async () => {
    await fetchApiJson("/api/whatsapp", { method: "PATCH" });
    reload();
  };

  const setMode = async (newMode: WhatsappMode) => {
    const result = await fetchApiJson("/api/whatsapp/barbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "mode", mode: newMode }),
    });
    if (!result.ok) setActionError(result.error);
    else setActionError(null);
    reload();
  };

  const connectShop = async () => {
    setConnectingShop(true);
    setActionError(null);
    try {
      const result = await fetchApiJson<{ qrCode?: string }>("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "connect" }),
      });
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      if (result.data.qrCode) setShopQrCode(result.data.qrCode);
      reload();
    } finally {
      setConnectingShop(false);
    }
  };

  const disconnectShop = async () => {
    await fetchApiJson("/api/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "disconnect" }),
    });
    setShopQrCode(null);
    reload();
  };

  const connectBarber = async (employeeId: string) => {
    setConnectingBarber(employeeId);
    setActionError(null);
    try {
      const result = await fetchApiJson<{ qrCode?: string }>("/api/whatsapp/barbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "connect", employeeId }),
      });
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      if (result.data.qrCode) {
        setBarberQrCodes((prev) => ({ ...prev, [employeeId]: result.data.qrCode! }));
      }
      reload();
    } finally {
      setConnectingBarber(null);
    }
  };

  const disconnectBarber = async (employeeId: string) => {
    await fetchApiJson("/api/whatsapp/barbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "disconnect", employeeId }),
    });
    setBarberQrCodes((prev) => {
      const next = { ...prev };
      delete next[employeeId];
      return next;
    });
    reload();
  };

  const sendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await fetchApiJson("/api/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "campaign", ...campaignForm }),
    });
    if (!result.ok) setActionError(result.error);
    else {
      setActionError(null);
      setCampaignForm({ name: "", message: "" });
    }
    reload();
  };

  const toggleSetting = async (key: string, value: boolean) => {
    await fetchApiJson("/api/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "settings", settings: { [key]: value } }),
    });
    reload();
  };

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const pendingCount = data.messages.filter((m) => m.status === "PENDING").length;
  const shopConnected = data.evolution.state === "open" || data.evolution.state === "connected";
  const stateLabel: Record<string, string> = {
    open: "Conectado",
    connected: "Conectado",
    connecting: "Conectando...",
    close: "Desconectado",
    disconnected: "Desconectado",
    unconfigured: "Não configurado",
  };

  const isBarberConnected = (state: string) => state === "open" || state === "connected";

  return (
    <div>
      <ApiErrorBanner
        error={error || actionError}
        onRetry={retry}
        onDismiss={() => { setActionError(null); }}
      />

      <PageHeader
        title="WhatsApp Automático"
        description="Integração via Evolution API — mensagens reais pelo WhatsApp"
        actions={
          pendingCount > 0 && (
            <Button variant="accent" onClick={processPending}>
              <Send className="h-4 w-4" /> Enviar {pendingCount} pendentes
            </Button>
          )
        }
      />

      <Card className="mb-6">
        <CardTitle className="mb-4">WhatsApp dos Barbeiros</CardTitle>
        <p className="text-sm text-muted-foreground mb-4">
          Escolha como as mensagens automáticas serão enviadas aos clientes.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          <button
            type="button"
            onClick={() => setMode("SHOP")}
            className={`rounded-xl border p-4 text-left transition-colors ${
              mode === "SHOP" ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-accent" />
                <span className="font-semibold">WhatsApp da Barbearia</span>
              </div>
              {mode === "SHOP" && <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />}
            </div>
            <Badge variant="success" className="mt-2">Recomendado</Badge>
            <p className="mt-2 text-xs text-muted-foreground">
              Um único número para confirmações, lembretes e campanhas de toda a barbearia.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode("INDIVIDUAL")}
            className={`rounded-xl border p-4 text-left transition-colors ${
              mode === "INDIVIDUAL" ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-accent" />
                <span className="font-semibold">WhatsApp Individual por Barbeiro</span>
              </div>
              {mode === "INDIVIDUAL" && <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Cada barbeiro conecta seu próprio WhatsApp. Confirmações saem do número do profissional.
            </p>
          </button>
        </div>

        {!data.evolution.configured ? (
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-4 text-sm">
            <p className="font-medium text-yellow-500">Evolution API não está rodando</p>
            <p className="text-muted-foreground mt-1">
              Execute <code className="text-xs bg-secondary px-1 rounded">npm run evolution:up</code> na raiz do projeto (requer Docker).
            </p>
          </div>
        ) : mode === "SHOP" ? (
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              {shopConnected ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="font-medium">Conexão da Barbearia</span>
              <Badge variant={shopConnected ? "success" : "warning"}>
                {stateLabel[data.evolution.state] || data.evolution.state}
              </Badge>
            </div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
              <div className="flex-1">
                {data.evolution.instance && (
                  <p className="text-xs text-muted-foreground mb-2">Instância: {data.evolution.instance}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {!shopConnected && (
                    <Button variant="accent" onClick={connectShop} disabled={connectingShop}>
                      <QrCode className="h-4 w-4" />
                      {connectingShop ? "Gerando QR..." : "Conectar WhatsApp"}
                    </Button>
                  )}
                  {shopConnected && (
                    <Button variant="outline" onClick={disconnectShop}>
                      Desconectar
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={reload}>
                    <RefreshCw className="h-4 w-4" /> Atualizar
                  </Button>
                </div>
              </div>
              {shopQrCode && !shopConnected && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Escaneie com o WhatsApp da barbearia</p>
                  <img
                    src={shopQrCode.startsWith("data:") ? shopQrCode : `data:image/png;base64,${shopQrCode}`}
                    alt="QR Code WhatsApp"
                    className="mx-auto h-40 w-40 rounded-lg border border-border"
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {barbers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum barbeiro cadastrado. Adicione barbeiros em Funcionários.
              </p>
            ) : (
              barbers.map((barber) => {
                const connected = isBarberConnected(barber.connection.state);
                const qrCode = barberQrCodes[barber.id];
                return (
                  <div key={barber.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                          {getInitials(barber.name)}
                        </div>
                        <div>
                          <p className="font-medium">{barber.name}</p>
                          {barber.phone && (
                            <p className="text-xs text-muted-foreground">{barber.phone}</p>
                          )}
                        </div>
                        <Badge variant={connected ? "success" : "warning"}>
                          {stateLabel[barber.connection.state] || barber.connection.state}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!connected && (
                          <Button
                            variant="accent"
                            size="sm"
                            onClick={() => connectBarber(barber.id)}
                            disabled={connectingBarber === barber.id}
                          >
                            <QrCode className="h-4 w-4" />
                            {connectingBarber === barber.id ? "Gerando QR..." : "Conectar"}
                          </Button>
                        )}
                        {connected && (
                          <Button variant="outline" size="sm" onClick={() => disconnectBarber(barber.id)}>
                            Desconectar
                          </Button>
                        )}
                      </div>
                      {qrCode && !connected && (
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-2">QR do {barber.name}</p>
                          <img
                            src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                            alt={`QR Code ${barber.name}`}
                            className="mx-auto h-32 w-32 rounded-lg border border-border"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { key: "confirmBooking", label: "Confirmação de agendamento" },
          { key: "reminder24h", label: "Lembrete 24h antes" },
          { key: "reminder2h", label: "Lembrete 2h antes" },
          { key: "thankYouMessage", label: "Agradecimento pós-atendimento" },
          { key: "whatsappBotEnabled", label: "Bot IA no WhatsApp (Gemini)" },
        ].map((s) => (
          <Card key={s.key} className="flex items-center justify-between">
            <span className="text-sm">{s.label}</span>
            <button
              onClick={() => toggleSetting(s.key, !data.settings?.[s.key as keyof typeof data.settings])}
              className={`h-6 w-11 rounded-full transition-colors ${data.settings?.[s.key as keyof typeof data.settings] ? "bg-accent" : "bg-secondary"}`}
            >
              <div className={`h-5 w-5 rounded-full bg-white transition-transform ${data.settings?.[s.key as keyof typeof data.settings] ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle className="mb-4 flex items-center gap-2">
            <Megaphone className="h-5 w-5" /> Nova Campanha
          </CardTitle>
          {mode === "INDIVIDUAL" ? (
            <p className="text-sm text-muted-foreground">
              Campanhas em massa estão disponíveis no modo <strong>WhatsApp da Barbearia</strong>.
            </p>
          ) : (
            <form onSubmit={sendCampaign} className="space-y-3">
              <Input placeholder="Nome da campanha" value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} required />
              <textarea
                className="flex min-h-[100px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="Mensagem para envio em massa..."
                value={campaignForm.message}
                onChange={(e) => setCampaignForm({ ...campaignForm, message: e.target.value })}
                required
              />
              <Button type="submit" variant="accent" className="w-full" disabled={!shopConnected}>
                <Send className="h-4 w-4" /> Enviar Campanha
              </Button>
              {!shopConnected && (
                <p className="text-xs text-muted-foreground text-center">Conecte o WhatsApp da barbearia para enviar campanhas</p>
              )}
            </form>
          )}
        </Card>

        <Card>
          <CardTitle className="mb-4 flex items-center gap-2">
            <MessageCircle className="h-5 w-5" /> Campanhas Enviadas
          </CardTitle>
          <div className="space-y-2">
            {data.campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma campanha enviada</p>
            ) : (
              data.campaigns.map((c) => (
                <div key={c.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.name}</span>
                    <Badge variant="success">{c.sentCount} enviados</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground truncate">{c.message}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardTitle className="mb-4">Histórico de Mensagens</CardTitle>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {data.messages.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              <div>
                <span className="font-medium">{m.phone}</span>
                <p className="text-xs text-muted-foreground truncate max-w-md">{m.message}</p>
              </div>
              <Badge variant={m.status === "SENT" ? "success" : m.status === "PENDING" ? "warning" : "danger"}>
                {m.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
