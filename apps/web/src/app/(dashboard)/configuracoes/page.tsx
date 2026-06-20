"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/sidebar";
import { SetupGuideLinks } from "@/components/setup-guide-links";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DAYS_OF_WEEK } from "@saas-barbearia/shared";
import { getNextSetupStep, getSetupStepIndex, setupGuideSteps } from "@/components/setup-guide-steps";
import { ArrowRight, CheckCircle2, Globe, Save } from "lucide-react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

function SaveFeedback({ status, error }: { status: SaveStatus; error?: string | null }) {
  if (status === "saved") {
    return (
      <p className="flex items-center gap-2 text-sm text-green-500">
        <CheckCircle2 className="h-4 w-4" /> Salvo com sucesso!
      </p>
    );
  }
  if (status === "error" && error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }
  return null;
}

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [data, setData] = useState<{
    tenant: { name: string; email: string; phone: string; description: string; address: string; instagram: string; spotifyUrl: string; slug: string };
    businessHours: { id: string; dayOfWeek: number; openTime: string; closeTime: string; closed: boolean }[];
  } | null>(null);

  const [tenantStatus, setTenantStatus] = useState<SaveStatus>("idle");
  const [hoursStatus, setHoursStatus] = useState<SaveStatus>("idle");
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [hoursError, setHoursError] = useState<string | null>(null);

  const currentStep = getSetupStepIndex("/configuracoes") + 1;
  const nextStep = getNextSetupStep("/configuracoes");

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setData);
  }, []);

  const flashSaved = (setter: (s: SaveStatus) => void) => {
    setter("saved");
    setTimeout(() => setter("idle"), 3000);
  };

  const saveTenant = async (andContinue = false) => {
    if (!data) return;
    setTenantStatus("saving");
    setTenantError(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant: data.tenant }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao salvar");

      flashSaved(setTenantStatus);
      if (andContinue && nextStep) router.push(nextStep.href);
    } catch (err) {
      setTenantStatus("error");
      setTenantError(err instanceof Error ? err.message : "Erro ao salvar");
    }
  };

  const saveHours = async (andContinue = false) => {
    if (!data) return;
    setHoursStatus("saving");
    setHoursError(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "business-hours", hours: data.businessHours }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao salvar horários");

      flashSaved(setHoursStatus);
      if (andContinue && nextStep) router.push(nextStep.href);
    } catch (err) {
      setHoursStatus("error");
      setHoursError(err instanceof Error ? err.message : "Erro ao salvar horários");
    }
  };

  const saveAllAndContinue = async () => {
    if (!data) return;
    setTenantStatus("saving");
    setHoursStatus("saving");
    setTenantError(null);
    setHoursError(null);

    try {
      const [tenantRes, hoursRes] = await Promise.all([
        fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenant: data.tenant }),
        }),
        fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "business-hours", hours: data.businessHours }),
        }),
      ]);

      if (!tenantRes.ok) {
        const result = await tenantRes.json();
        throw new Error(result.error || "Erro ao salvar dados da barbearia");
      }
      if (!hoursRes.ok) {
        const result = await hoursRes.json();
        throw new Error(result.error || "Erro ao salvar horários");
      }

      flashSaved(setTenantStatus);
      flashSaved(setHoursStatus);
      if (nextStep) router.push(nextStep.href);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao salvar";
      setTenantStatus("error");
      setHoursStatus("error");
      setTenantError(message);
      setHoursError(message);
    }
  };

  if (!data) return null;

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Dados da barbearia e horário de funcionamento"
        actions={
          <a href={`/b/${data.tenant.slug}`} target="_blank" rel="noopener">
            <Button variant="outline">
              <Globe className="h-4 w-4" /> Ver site público
            </Button>
          </a>
        }
      />

      <Card className="mb-6 border-accent/30 bg-accent/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Guia de configuração</p>
            <p className="text-xs text-muted-foreground">
              Passo {currentStep} de {setupGuideSteps.length} — {setupGuideSteps[currentStep - 1]?.title}
            </p>
          </div>
          {nextStep && (
            <Button variant="accent" size="sm" onClick={saveAllAndContinue} disabled={tenantStatus === "saving" || hoursStatus === "saving"}>
              {tenantStatus === "saving" || hoursStatus === "saving" ? "Salvando..." : `Salvar tudo e ir para ${nextStep.action}`}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>

      <SetupGuideLinks />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle className="mb-4">Dados da Barbearia</CardTitle>
          <div className="space-y-3">
            <Input placeholder="Nome" value={data.tenant.name} onChange={(e) => setData({ ...data, tenant: { ...data.tenant, name: e.target.value } })} />
            <Input placeholder="E-mail" value={data.tenant.email} onChange={(e) => setData({ ...data, tenant: { ...data.tenant, email: e.target.value } })} />
            <Input placeholder="Telefone" value={data.tenant.phone || ""} onChange={(e) => setData({ ...data, tenant: { ...data.tenant, phone: e.target.value } })} />
            <Input placeholder="Endereço" value={data.tenant.address || ""} onChange={(e) => setData({ ...data, tenant: { ...data.tenant, address: e.target.value } })} />
            <textarea
              className="flex min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Descrição"
              value={data.tenant.description || ""}
              onChange={(e) => setData({ ...data, tenant: { ...data.tenant, description: e.target.value } })}
            />
            <Input placeholder="Instagram" value={data.tenant.instagram || ""} onChange={(e) => setData({ ...data, tenant: { ...data.tenant, instagram: e.target.value } })} />
            <Input placeholder="Spotify URL" value={data.tenant.spotifyUrl || ""} onChange={(e) => setData({ ...data, tenant: { ...data.tenant, spotifyUrl: e.target.value } })} />
            <SaveFeedback status={tenantStatus} error={tenantError} />
            <div className="flex flex-wrap gap-2">
              <Button variant="accent" onClick={() => saveTenant()} disabled={tenantStatus === "saving"}>
                <Save className="h-4 w-4" /> {tenantStatus === "saving" ? "Salvando..." : "Salvar"}
              </Button>
              {nextStep && (
                <Button variant="outline" onClick={() => saveTenant(true)} disabled={tenantStatus === "saving"}>
                  Salvar e continuar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle className="mb-4">Horário de Funcionamento</CardTitle>
          <div className="space-y-2">
            {data.businessHours.map((h, i) => (
              <div key={h.dayOfWeek} className="flex items-center gap-2 text-sm">
                <span className="w-24 font-medium">{DAYS_OF_WEEK[h.dayOfWeek]}</span>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={h.closed}
                    onChange={(e) => {
                      const hours = [...data.businessHours];
                      hours[i] = { ...h, closed: e.target.checked };
                      setData({ ...data, businessHours: hours });
                    }}
                  />
                  Fechado
                </label>
                {!h.closed && (
                  <>
                    <Input
                      type="time"
                      value={h.openTime}
                      onChange={(e) => {
                        const hours = [...data.businessHours];
                        hours[i] = { ...h, openTime: e.target.value };
                        setData({ ...data, businessHours: hours });
                      }}
                      className="w-auto"
                    />
                    <span>às</span>
                    <Input
                      type="time"
                      value={h.closeTime}
                      onChange={(e) => {
                        const hours = [...data.businessHours];
                        hours[i] = { ...h, closeTime: e.target.value };
                        setData({ ...data, businessHours: hours });
                      }}
                      className="w-auto"
                    />
                  </>
                )}
              </div>
            ))}
            <SaveFeedback status={hoursStatus} error={hoursError} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="accent" onClick={() => saveHours()} disabled={hoursStatus === "saving"}>
                <Save className="h-4 w-4" /> {hoursStatus === "saving" ? "Salvando..." : "Salvar Horários"}
              </Button>
              {nextStep && (
                <Button variant="outline" onClick={() => saveHours(true)} disabled={hoursStatus === "saving"}>
                  Salvar e continuar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
