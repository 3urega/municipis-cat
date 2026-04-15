"use client";

import { AdConsentBootstrap } from "@/components/ads/AdConsentBootstrap";
import { VisitSyncListener } from "@/components/offline/VisitSyncListener";
import { AuthProvider } from "@/lib/auth/AuthProvider";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps): React.ReactElement {
  return (
    <AuthProvider>
      <AdConsentBootstrap />
      <VisitSyncListener />
      {children}
    </AuthProvider>
  );
}
