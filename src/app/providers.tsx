"use client";

import { SessionProvider } from "next-auth/react";

import { VisitSyncListener } from "@/components/offline/VisitSyncListener";
import { getApiBaseUrl } from "@/lib/apiUrl";

type ProvidersProps = {
  children: React.ReactNode;
};

/**
 * En web (mateix origen), next-auth usa `/api/auth` relatiu i funciona.
 * En Capacitor l’origen és `capacitor://localhost` / `https://localhost`; una URL relativa
 * carrega l’HTML estàtic en lloc de JSON → «Unexpected token '<'».
 * Si hi ha NEXT_PUBLIC_API_URL, SessionProvider ha d’apuntar l’Auth a l’API absoluta.
 */
function authClientBasePath(): string | undefined {
  const base = getApiBaseUrl();
  if (base.length === 0) {
    return undefined;
  }
  return `${base}/api/auth`;
}

export function Providers({ children }: ProvidersProps): React.ReactElement {
  const basePath = authClientBasePath();
  return (
    <SessionProvider
      basePath={basePath}
      refetchInterval={0}
      refetchOnWindowFocus
    >
      <VisitSyncListener />
      {children}
    </SessionProvider>
  );
}
