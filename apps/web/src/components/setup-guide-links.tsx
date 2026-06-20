"use client";

import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { setupGuideSteps } from "@/components/setup-guide-steps";
import { ArrowRight } from "lucide-react";

export function SetupGuideLinks() {
  return (
    <Card className="mb-6 border-border/80">
      <CardTitle className="mb-1">Guia de configuração</CardTitle>
      <p className="mb-4 text-sm text-muted-foreground">
        Clique em cada item para ir direto à aba correspondente.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {setupGuideSteps.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href + item.title}
              href={item.href}
              className="group flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:border-accent/50 hover:bg-accent/5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-accent/15">
                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{item.text}</p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
