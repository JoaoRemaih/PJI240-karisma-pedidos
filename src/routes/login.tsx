import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Logo } from "@/components/logo";
import { StaffLogin } from "@/components/staff-login";
import { Card } from "@/components/ui/card";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  if (!isPending && user) return <Navigate to="/painel" replace />;
  return (
    <main id="conteudo" className="grid min-h-screen place-items-center bg-mist px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex justify-center" aria-label="Início">
          <Logo />
        </Link>
        <Card className="p-6">
          <StaffLogin />
        </Card>
        <p className="mt-4 text-center text-sm text-muted">
          <Link to="/" className="text-navy underline">
            Voltar ao site
          </Link>
        </p>
      </div>
    </main>
  );
}
