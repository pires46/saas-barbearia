"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DAYS_OF_WEEK } from "@saas-barbearia/shared";
import { Save, Globe } from "lucide-react";

export default function ConfiguracoesPage() {
  const [data, setData] = useState<{
    tenant: { name: string; email: string; phone: string; description: string; address: string; instagram: string; spotifyUrl: string; slug: string };
    businessHours: { id: string; dayOfWeek: number; openTime: string; closeTime: string; closed: boolean }[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setData);
  }, []);

  const saveTenant = async () => {
    if (!data) return;
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant: data.tenant }),
    });
  };

  const saveHours = async () => {
    if (!data) return;
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "business-hours", hours: data.businessHours }),
    });
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
            <Button variant="accent" onClick={saveTenant}>
              <Save className="h-4 w-4" /> Salvar
            </Button>
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
            <Button variant="accent" onClick={saveHours} className="mt-3">
              <Save className="h-4 w-4" /> Salvar Horários
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
