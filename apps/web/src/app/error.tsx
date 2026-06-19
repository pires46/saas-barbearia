"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h2 className="text-xl font-semibold">Erro ao carregar página</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-accent px-4 py-2 text-sm text-white"
      >
        Tentar novamente
      </button>
    </div>
  );
}
