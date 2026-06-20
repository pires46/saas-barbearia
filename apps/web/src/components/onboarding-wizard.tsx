"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { setupGuideSteps } from "@/components/setup-guide-steps";
import { ArrowRight } from "lucide-react";

export function OnboardingWizard() {
  const router = useRouter();
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

  const goToStep = (href: string) => {
    setStep((s) => Math.min(s + 1, setupGuideSteps.length));
    router.push(href);
  };

  if (!show) return null;

  const current = setupGuideSteps[step - 1];
  const Icon = current.icon;
  const isLast = step >= setupGuideSteps.length;

  return (
    <Card className="mb-6 border-accent/40 bg-accent/5">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15">
          <Icon className="h-4 w-4 text-accent" />
        </div>
        <CardTitle>{current.title}</CardTitle>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{current.text}</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          Passo {step} de {setupGuideSteps.length}
        </span>
        <div className="flex flex-wrap gap-2">
          <Button variant="accent" size="sm" onClick={() => goToStep(current.href)}>
            Ir para {current.action}
            <ArrowRight className="h-4 w-4" />
          </Button>
          {isLast && (
            <Button variant="outline" size="sm" onClick={finish}>
              Concluir guia
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={finish}>
            Pular
          </Button>
        </div>
      </div>
    </Card>
  );
}
