"use client";

import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  error: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
};

export function ApiErrorBanner({ error, onRetry, onDismiss }: Props) {
  if (!error) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm">
      <AlertTriangle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-red-500">Erro ao carregar dados</p>
        <p className="text-muted-foreground mt-0.5 break-words">{error}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-3 w-3" /> Retry
          </Button>
        )}
        {onDismiss && (
          <button onClick={onDismiss} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
