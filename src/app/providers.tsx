"use client";

import { VisitSyncListener } from "@/components/offline/VisitSyncListener";
import { AuthProvider } from "@/lib/auth/AuthProvider";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps): React.ReactElement {
  return (
    <AuthProvider>
      <VisitSyncListener />
      {children}
    </AuthProvider>
  );
}
