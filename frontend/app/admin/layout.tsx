import type { ReactNode } from "react";

import { AdminGuard } from "@/components/admin-guard";
import { AppShell } from "@/components/app-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <AppShell mode="admin">{children}</AppShell>
    </AdminGuard>
  );
}
