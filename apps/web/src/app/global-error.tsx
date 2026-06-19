"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui", padding: 40, background: "#0f0f14", color: "#fff" }}>
        <h2>Algo deu errado</h2>
        <p style={{ color: "#888" }}>{error.message}</p>
        <button type="button" onClick={() => reset()} style={{ marginTop: 16, padding: "8px 16px" }}>
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
