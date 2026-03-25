"use client";

import { SessionProvider } from "next-auth/react";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps): React.ReactElement {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus>
      {children}
    </SessionProvider>
  );
}
