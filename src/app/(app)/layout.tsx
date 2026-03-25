import { auth } from "@/auth";
import { AppHeader } from "@/components/AppHeader";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.ReactElement> {
  const session = await auth();
  if (session?.user?.id === undefined) {
    redirect("/login");
  }

  return (
    <>
      <AppHeader user={session.user} />
      <div className="min-h-screen pt-12">{children}</div>
    </>
  );
}
