import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";
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
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
