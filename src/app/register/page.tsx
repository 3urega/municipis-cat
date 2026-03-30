import { Suspense } from "react";

import { isRegistrationUiShown } from "@/lib/auth/credentialsLoginAllowed";

import { RegisterForm } from "./RegisterForm";

export default function RegisterPage(): React.ReactElement {
  const registrationUiShown = isRegistrationUiShown();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 pt-[calc(3rem+env(safe-area-inset-top,0px))] text-zinc-600 dark:bg-zinc-950">
          Carregant…
        </div>
      }
    >
      <RegisterForm registrationUiShown={registrationUiShown} />
    </Suspense>
  );
}
