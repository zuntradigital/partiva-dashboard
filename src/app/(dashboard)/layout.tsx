import { SessionProvider } from "@/lib/session";
import { AuthGate } from "@/components/layout/AuthGate";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthGate>
        <DashboardShell>{children}</DashboardShell>
      </AuthGate>
    </SessionProvider>
  );
}
