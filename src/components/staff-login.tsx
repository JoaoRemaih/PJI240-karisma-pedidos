import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { canActivateAccess, getAuthGate, getMe } from "@/lib/karisma/api";
import { passwordIsStrong } from "@/lib/karisma/access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMAIL_KEY = "karisma.login-email";
const BEARER_KEY = "karisma.bearer-token";
const JUST_IN_KEY = "karisma.just-in";

/** Sobrevive à remontagem do formulário (o que apagava e-mail e senha). */
const draft = {
  email: "",
  password: "",
  name: "",
};

function storeSessionToken(token: string | null | undefined) {
  if (!token || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(BEARER_KEY, token);
  } catch {
    /* ignore */
  }
}

function markJustIn() {
  try {
    window.sessionStorage.setItem(JUST_IN_KEY, "1");
  } catch {
    /* ignore */
  }
}

function captureToken(ctx: { response: Response; data: unknown }) {
  const header = ctx.response.headers.get("set-auth-token");
  if (header) storeSessionToken(header);
  if (!ctx.data || typeof ctx.data !== "object") return;
  const rec = ctx.data as { token?: unknown; session?: { token?: unknown } };
  const raw =
    (typeof rec.token === "string" && rec.token) ||
    (typeof rec.session?.token === "string" && rec.session.token) ||
    "";
  if (raw && !header) storeSessionToken(raw);
}

function readSavedEmail() {
  if (draft.email) return draft.email;
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveEmail(value: string) {
  draft.email = value;
  try {
    window.sessionStorage.setItem(EMAIL_KEY, value.trim());
  } catch {
    /* ignore */
  }
}

function signInErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "E-mail ou senha inválidos.";
  const rec = err as { message?: string; status?: number };
  if (rec.status === 401 || rec.status === 403) return "E-mail ou senha inválidos.";
  const msg = rec.message?.trim();
  if (msg && !/failed to fetch|network|abort/i.test(msg)) return msg;
  return "E-mail ou senha inválidos.";
}

export function StaffLogin({
  title = "Acesso da equipe",
  callbackURL = "/painel",
}: {
  title?: string;
  callbackURL?: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const gate = useQuery({
    queryKey: ["auth-gate"],
    queryFn: () => getAuthGate(),
    staleTime: Infinity,
  });
  const noStaffYet = gate.data?.hasStaff === false;
  const [tab, setTab] = useState<"entrar" | "ativar">("entrar");
  const [email, setEmail] = useState(readSavedEmail);
  const [password, setPassword] = useState(draft.password);
  const [name, setName] = useState(draft.name);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"entrar" | "ativar" | "invite" | null>(
    null,
  );
  const [inviteOk, setInviteOk] = useState(false);

  const showActivate = tab === "ativar" || (noStaffYet && tab !== "entrar");
  const canSetPassword = noStaffYet || inviteOk;

  function setEmailField(value: string) {
    draft.email = value;
    setEmail(value);
    saveEmail(value);
  }

  function setPasswordField(value: string) {
    draft.password = value;
    setPassword(value);
  }

  function goToPanel() {
    markJustIn();
    draft.password = "";
    void queryClient.prefetchQuery({
      queryKey: ["me"],
      queryFn: () => getMe(),
      staleTime: 60_000,
    });
    navigate({ to: callbackURL, replace: true });
  }

  async function onEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    saveEmail(email);
    setPending("entrar");
    try {
      const { data, error: err } = await authClient.signIn.email(
        { email: email.trim(), password, rememberMe: true },
        {
          onSuccess(ctx) {
            captureToken(ctx);
          },
        },
      );
      if (err) throw new Error(signInErrorMessage(err));
      const user = data && typeof data === "object" ? (data as { user?: unknown }).user : null;
      if (!user) throw new Error("E-mail ou senha inválidos.");
      goToPanel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "E-mail ou senha inválidos.");
      setPending(null);
    }
  }

  async function onCheckInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    saveEmail(email);
    setPending("invite");
    try {
      const decision = await canActivateAccess({ data: { email } });
      if (!decision.ok) {
        setInviteOk(false);
        setError(
          decision.reason === "disabled"
            ? "Este acesso foi desativado pela administração."
            : "Este e-mail não foi liberado. Peça à administração para cadastrá-lo em Equipe.",
        );
        return;
      }
      setInviteOk(true);
    } catch {
      setError("Não foi possível verificar o e-mail.");
    } finally {
      setPending(null);
    }
  }

  async function onActivate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    saveEmail(email);
    if (!passwordIsStrong(password)) {
      setError("A senha precisa ter pelo menos 8 caracteres, com letra e número.");
      return;
    }
    setPending("ativar");
    try {
      const decision = await canActivateAccess({ data: { email } });
      if (!decision.ok) {
        setError(
          decision.reason === "disabled"
            ? "Este acesso foi desativado pela administração."
            : "Este e-mail não foi liberado. Peça à administração para cadastrá-lo em Equipe.",
        );
        setPending(null);
        return;
      }
      const { data, error: err } = await authClient.signUp.email(
        { email: email.trim(), password, name: name.trim() || "Equipe" },
        {
          onSuccess(ctx) {
            captureToken(ctx);
          },
        },
      );
      if (err) throw new Error(err.message || "Não foi possível criar o acesso.");
      const user = data && typeof data === "object" ? (data as { user?: unknown }).user : null;
      if (!user) throw new Error("Não foi possível criar o acesso.");
      goToPanel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao ativar.");
      setPending(null);
    }
  }

  if (!authEnabled) {
    return <p className="text-sm text-muted">Acesso temporariamente desligado.</p>;
  }

  return (
    <div className="w-full">
      <h2 className="font-display text-xl text-navy">{title}</h2>
      <p className="mt-1 mb-4 text-sm text-muted">Acesso interno da loja.</p>

      {!showActivate ? (
        <form onSubmit={onEmailSignIn} className="space-y-3" autoComplete="on">
          <div>
            <Label htmlFor="login-email">E-mail</Label>
            <Input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmailField(e.target.value)}
              disabled={pending === "entrar"}
            />
          </div>
          <div>
            <Label htmlFor="login-password">Senha</Label>
            <div className="relative">
              <Input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPasswordField(e.target.value)}
                className="pr-12"
                disabled={pending === "entrar"}
              />
              <button
                type="button"
                className="absolute right-1 top-1 inline-flex min-h-9 min-w-9 items-center justify-center text-navy"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={pending === "entrar"}>
            {pending === "entrar" ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      ) : !canSetPassword ? (
        <form onSubmit={onCheckInvite} className="space-y-3">
          <p className="text-sm text-muted">
            Informe o e-mail cadastrado em Equipe.
          </p>
          <div>
            <Label htmlFor="check-email">E-mail</Label>
            <Input
              id="check-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => {
                setEmailField(e.target.value);
                setInviteOk(false);
              }}
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending === "invite"}>
            {pending === "invite" ? "Verificando…" : "Verificar e-mail"}
          </Button>
        </form>
      ) : (
        <form onSubmit={onActivate} className="space-y-3">
          <p className="text-sm text-muted">
            {noStaffYet
              ? "Primeira pessoa a entrar vira administração da loja."
              : "E-mail liberado. Defina nome e senha."}
          </p>
          <div>
            <Label htmlFor="up-name">Nome</Label>
            <Input
              id="up-name"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => {
                draft.name = e.target.value;
                setName(e.target.value);
              }}
            />
          </div>
          <div>
            <Label htmlFor="up-email">E-mail</Label>
            <Input
              id="up-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => {
                setEmailField(e.target.value);
                if (!noStaffYet) setInviteOk(false);
              }}
            />
          </div>
          <div>
            <Label htmlFor="up-password">Senha</Label>
            <Input
              id="up-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPasswordField(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted">Mínimo 8 caracteres, com letra e número.</p>
          </div>
          <Button type="submit" className="w-full" disabled={pending === "ativar"}>
            {pending === "ativar" ? "Ativando…" : "Ativar acesso"}
          </Button>
        </form>
      )}

      <p className="mt-4 text-sm">
        {showActivate && !noStaffYet ? (
          <button
            type="button"
            className="font-medium text-navy underline"
            onClick={() => {
              setTab("entrar");
              setInviteOk(false);
              setError(null);
            }}
          >
            Voltar ao login
          </button>
        ) : !noStaffYet ? (
          <button
            type="button"
            className="text-muted underline hover:text-navy"
            onClick={() => {
              setTab("ativar");
              setInviteOk(false);
              setError(null);
            }}
          >
            Ativar convite
          </button>
        ) : tab === "ativar" ? (
          <button
            type="button"
            className="text-muted underline hover:text-navy"
            onClick={() => {
              setTab("entrar");
              setError(null);
            }}
          >
            Já tenho senha
          </button>
        ) : (
          <button
            type="button"
            className="text-muted underline hover:text-navy"
            onClick={() => {
              setTab("ativar");
              setError(null);
            }}
          >
            Primeiro acesso
          </button>
        )}
      </p>

      {noStaffYet && tab === "entrar" ? (
        <p className="mt-2 text-xs text-muted">
          Ainda não há equipe. Use “Primeiro acesso” para criar o administrador.
        </p>
      ) : null}

      <div role="alert" aria-live="assertive" className="mt-3 min-h-5 text-sm font-medium text-danger">
        {error}
      </div>
    </div>
  );
}

export { JUST_IN_KEY };
