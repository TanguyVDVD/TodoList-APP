"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Icône maison (page d'accueil). */
function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path
        d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9.5 21v-6h5v6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Icône graphique (tableau de bord). */
function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path
        d="M4 4v16h16M8 16v-4m4 4V8m4 8v-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const LINKS = [
  { href: "/", label: "Accueil", Icon: HomeIcon },
  { href: "/dashboard", label: "Tableau de bord", Icon: ChartIcon },
] as const;

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-16 shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-2 sm:w-56 sm:p-4">
      <p className="hidden px-2 pb-3 text-sm font-bold tracking-tight sm:block">
        Todo App
      </p>
      <nav className="flex flex-col gap-1">
        {LINKS.map(({ href, label, Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex items-center justify-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition sm:justify-start ${
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
