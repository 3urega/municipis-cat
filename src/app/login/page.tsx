import { Suspense } from "react";

import {
  isCredentialsLoginUiShown,
  isRegistrationUiShown,
} from "@/lib/auth/credentialsLoginAllowed";

import { LoginForm } from "./LoginForm";

export default function LoginPage(): React.ReactElement {
  const credentialsLoginEnabled = isCredentialsLoginUiShown();
  const registrationUiShown = isRegistrationUiShown();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 pt-[calc(3rem+env(safe-area-inset-top,0px))] text-zinc-600 dark:bg-zinc-950">
          Carregant…
        </div>
      }
    >
      <LoginForm
        credentialsLoginEnabled={credentialsLoginEnabled}
        registrationUiShown={registrationUiShown}
      />
    </Suspense>
  );
}
