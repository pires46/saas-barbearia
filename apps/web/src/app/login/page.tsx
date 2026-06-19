import { Suspense } from "react";
import LoginForm from "./login-form";
import { AuthProvider } from "@/contexts/auth-context";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <AuthProvider>
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Carregando...</div>}>
        <LoginForm />
      </Suspense>
    </AuthProvider>
  );
}
