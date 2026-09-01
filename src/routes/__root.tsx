import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/provider";
import { A11Y_BOOT_SCRIPT } from "@/lib/a11y";
import { A11yMenu } from "@/components/a11y-bar";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "Karisma Pedidos";
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 8_000, retry: 1 } },
});

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "Sistema interno da Karisma Uniformes em Novo Horizonte/SP: pedidos, produção e estoque.",
      },
      { name: "theme-color", content: "#005A8D" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/brand/logo.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Roboto:wght@400;500;700&display=swap",
      },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="pt-BR" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: A11Y_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-mist text-ink">
        <PreviewHostBridge />
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Outlet />
            <Toaster position="top-right" richColors closeButton />
          </AuthProvider>
        </QueryClientProvider>
        <A11yMenu />
        <Scripts />
      </body>
    </html>
  );
}
