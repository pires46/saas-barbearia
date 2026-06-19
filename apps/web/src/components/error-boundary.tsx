"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = {
  children: ReactNode;
  fallbackTitle?: string;
  autoRetryMs?: number;
};

type State = {
  error: Error | null;
  retryCount: number;
};

export class ErrorBoundary extends Component<Props, State> {
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  state: State = { error: null, retryCount: 0 };

  static getDerivedStateFromError(error: Error): State {
    return { error, retryCount: 0 };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  componentDidUpdate(_: Props, prevState: State) {
    const autoRetryMs = this.props.autoRetryMs ?? 2000;
    if (
      this.state.error &&
      !prevState.error &&
      this.state.retryCount === 0 &&
      autoRetryMs > 0
    ) {
      this.retryTimer = setTimeout(() => {
        this.setState((s) => ({ error: null, retryCount: s.retryCount + 1 }));
      }, autoRetryMs);
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  handleRetry = () => {
    this.setState({ error: null, retryCount: this.state.retryCount + 1 });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-xl border border-red-500/30 bg-red-500/5 p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-red-500" />
          <div>
            <p className="font-semibold text-red-500">
              {this.props.fallbackTitle || "Algo deu errado nesta página"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground max-w-md">
              {this.state.error.message}
            </p>
            {this.state.retryCount > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Tentativa automática {this.state.retryCount}...
              </p>
            )}
          </div>
          <Button variant="accent" onClick={this.handleRetry}>
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
