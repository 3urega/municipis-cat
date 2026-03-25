import { Suspense } from "react";

import { isGitHubOAuthConfigured } from "@/lib/isGitHubOAuthConfigured";

import { LoginForm } from "./LoginForm";

export default function LoginPage(): React.ReactElement {
  const githubConfigured = isGitHubOAuthConfigured();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-zinc-600 dark:bg-zinc-950">
          Carregant…
        </div>
      }
    >
      <LoginForm githubConfigured={githubConfigured} />
    </Suspense>
  );
}
