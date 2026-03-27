import { AppAuthenticatedShell } from "@/components/AppAuthenticatedShell";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return <AppAuthenticatedShell>{children}</AppAuthenticatedShell>;
}
