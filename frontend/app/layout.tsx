import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
