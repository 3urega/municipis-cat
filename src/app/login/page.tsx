import { Suspense } from "react";

import { isCredentialsLoginEnabled } from "@/lib/isCredentialsLoginEnabled";
import { isGitHubOAuthConfigured } from "@/lib/isGitHubOAuthConfigured";

import { LoginForm } from "./LoginForm";

export default function LoginPage(): React.ReactElement {
  const githubConfigured = isGitHubOAuthConfigured();
  const credentialsLoginEnabled = isCredentialsLoginEnabled();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-zinc-600 dark:bg-zinc-950">
          Carregant…
        </div>
      }
    >
      <LoginForm
        githubConfigured={githubConfigured}
        credentialsLoginEnabled={credentialsLoginEnabled}
      />
    </Suspense>
  );
}
