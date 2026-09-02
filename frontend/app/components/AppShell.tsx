"use client";

import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import AuthScreen from "./AuthScreen";
import Sidebar from "./Sidebar";

/**
 * Contrôle d'accès global : tant que l'utilisateur n'est pas connecté,
 * seule l'écran d'auth est monté (les pages ne se chargent pas).
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-400">
        {t("auth.app_loading")}
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
