"use client";

import { SessionProvider } from "next-auth/react";

import { VisitSyncListener } from "@/components/offline/VisitSyncListener";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps): React.ReactElement {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus>
      <VisitSyncListener />
      {children}
    </SessionProvider>
  );
}
