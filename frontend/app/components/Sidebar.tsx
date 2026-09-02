"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useI18n, type Lang } from "../lib/i18n";

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

/** Icône étiquette (tags). */
function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path
        d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

/** Icône engrenage (paramètres). */
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.4l-.1.1a2 2 0 1 1-2.8-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.4-1.9l-.1-.1A2 2 0 1 1 6.5 3.9l.1.1a1.7 1.7 0 0 0 1.9.3H8.6a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "en", flag: "🇬🇧", label: "English" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { t, lang, setLang } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const links = [
    { href: "/", label: t("nav.home"), Icon: HomeIcon },
    { href: "/tags", label: t("nav.tags"), Icon: TagIcon },
    { href: "/dashboard", label: t("nav.dashboard"), Icon: ChartIcon },
  ];

  // Ferme le menu au clic à l'extérieur.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  return (
    <aside className="flex w-16 shrink-0 flex-col border-r border-slate-200 bg-white p-2 sm:w-56 sm:p-4">
      <p className="hidden px-2 pb-3 text-sm font-bold tracking-tight sm:block">
        {t("nav.brand")}
      </p>

      <nav className="flex flex-col gap-1">
        {links.map(({ href, label, Icon }) => {
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

      {/* Pousse les paramètres tout en bas de la navbar. */}
      <div ref={settingsRef} className="relative mt-auto pt-3">
        {menuOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            <p className="px-2 py-1 text-xs font-medium text-slate-400">
              {t("settings.language")}
            </p>
            {LANGS.map(({ code, flag, label }) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setLang(code);
                  setMenuOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
                  lang === code
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span aria-hidden="true">{flag}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          title={t("settings.title")}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className={`flex w-full items-center justify-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition sm:justify-start ${
            menuOpen
              ? "bg-slate-100 text-slate-900"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <GearIcon />
          <span className="hidden sm:inline">{t("settings.title")}</span>
          <span className="ml-auto hidden text-xs uppercase text-slate-400 sm:inline">
            {lang}
          </span>
        </button>
      </div>
    </aside>
  );
}
