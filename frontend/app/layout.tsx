import type { Metadata } from "next";
import "./globals.css";
import AppShell from "./components/AppShell";
import { AuthProvider } from "./lib/auth";
import { LanguageProvider } from "./lib/i18n";

export const metadata: Metadata = {
  title: "Todo List",
  description: "Application de gestion de tâches - FastAPI + Next.js + PostgreSQL",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-100 text-slate-900">
        <LanguageProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
