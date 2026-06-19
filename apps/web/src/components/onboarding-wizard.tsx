"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";

export function OnboardingWizard() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    fetch("/api/billing")
      .then((r) => r.json())
      .then((d) => {
        if (d.tenant && !d.tenant.onboardingDone) setShow(true);
      });
  }, []);

  const finish = async () => {
    await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "complete-onboarding" }),
    });
    setShow(false);
  };

  if (!show) return null;

  const steps = [
    { title: "Bem-vindo ao BarberSaaS!", text: "Configure sua barbearia em poucos passos." },
    { title: "Cadastre serviços", text: "Vá em Serviços e adicione corte, barba e combos." },
    { title: "Adicione barbeiros", text: "Em Funcionários, cadastre sua equipe." },
    { title: "Conecte o WhatsApp", text: "Em WhatsApp, escaneie o QR Code para mensagens automáticas." },
    { title: "Compartilhe seu site", text: "Seu link público está em Configurações. Envie para clientes!" },
  ];

  const current = steps[step - 1];

  return (
    <Card className="mb-6 border-accent/40 bg-accent/5">
      <CardTitle className="mb-2">{current.title}</CardTitle>
      <p className="text-sm text-muted-foreground mb-4">{current.text}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Passo {step} de {steps.length}</span>
        <div className="flex gap-2">
          {step < steps.length ? (
            <Button variant="accent" size="sm" onClick={() => setStep(step + 1)}>Próximo</Button>
          ) : (
            <Button variant="accent" size="sm" onClick={finish}>Concluir</Button>
          )}
          <Button variant="ghost" size="sm" onClick={finish}>Pular</Button>
        </div>
      </div>
    </Card>
  );
}
