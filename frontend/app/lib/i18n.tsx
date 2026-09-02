"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "fr" | "en";

type Params = Record<string, string | number>;
type Entry = string | ((p: Params) => string);
type Dict = Record<string, Entry>;

// --- Dictionnaires ----------------------------------------------------------

const fr: Dict = {
  "nav.brand": "Todo App",
  "nav.home": "Accueil",
  "nav.dashboard": "Tableau de bord",
  "settings.title": "Paramètres",
  "settings.language": "Langue",

  "status.pending": "En cours",
  "status.done": "Terminée",
  "status.failed": "Non réalisée",

  "home.title": "Ma Todo List",
  "home.counts": (p) =>
    `${p.pending} en cours · ${p.done} terminée${Number(p.done) > 1 ? "s" : ""} · ` +
    `${p.failed} non réalisée${Number(p.failed) > 1 ? "s" : ""}`,
  "home.loading": "Chargement…",
  "home.error_load": "Chargement impossible.",
  "home.retry": "Réessayer",

  "form.title_placeholder": "Que faut-il faire ?",
  "form.desc_placeholder": "Description (optionnelle)",
  "form.title_required": "Le titre est obligatoire.",
  "form.submit": "Ajouter la tâche",
  "form.submitting": "Ajout…",
  "form.error_unknown": "Erreur inconnue.",

  "item.mark_done": "Marquer comme terminée",
  "item.mark_not_done": "Marquer comme non réalisée",
  "item.created_on": (p) => `Créée le ${p.date}`,
  "item.delete": "Supprimer",
  "item.action_failed": "Action impossible.",

  "list.empty": "Aucune tâche pour le moment. Ajoutez-en une ci-dessus.",

  "dash.title": "Tableau de bord",
  "dash.subtitle":
    "Suivi des tâches par jour de création et répartition par état.",
  "dash.loading": "Chargement…",
  "dash.error_load": "Chargement impossible.",
  "dash.tasks_per_day": "Tâches par jour",
  "dash.distribution": "Répartition par état",
  "dash.no_data": "Aucune tâche à afficher.",
  "chart.day_label": (p) => `Jour : ${p.date}`,
};

const en: Dict = {
  "nav.brand": "Todo App",
  "nav.home": "Home",
  "nav.dashboard": "Dashboard",
  "settings.title": "Settings",
  "settings.language": "Language",

  "status.pending": "In progress",
  "status.done": "Done",
  "status.failed": "Not done",

  "home.title": "My Todo List",
  "home.counts": (p) =>
    `${p.pending} in progress · ${p.done} done · ${p.failed} not done`,
  "home.loading": "Loading…",
  "home.error_load": "Unable to load.",
  "home.retry": "Retry",

  "form.title_placeholder": "What needs to be done?",
  "form.desc_placeholder": "Description (optional)",
  "form.title_required": "Title is required.",
  "form.submit": "Add task",
  "form.submitting": "Adding…",
  "form.error_unknown": "Unknown error.",

  "item.mark_done": "Mark as done",
  "item.mark_not_done": "Mark as not done",
  "item.created_on": (p) => `Created on ${p.date}`,
  "item.delete": "Delete",
  "item.action_failed": "Action failed.",

  "list.empty": "No tasks yet. Add one above.",

  "dash.title": "Dashboard",
  "dash.subtitle": "Tasks by creation day and distribution by status.",
  "dash.loading": "Loading…",
  "dash.error_load": "Unable to load.",
  "dash.tasks_per_day": "Tasks per day",
  "dash.distribution": "Distribution by status",
  "dash.no_data": "No data to display.",
  "chart.day_label": (p) => `Day: ${p.date}`,
};

const DICTS: Record<Lang, Dict> = { fr, en };
const STORAGE_KEY = "todo-app.lang";

// --- Contexte -------------------------------------------------------------

interface I18nValue {
  lang: Lang;
  /** Locale BCP-47 pour `toLocaleString` (dates, nombres). */
  locale: string;
  setLang: (l: Lang) => void;
  /** Traduit une clé, avec interpolation optionnelle. */
  t: (key: string, params?: Params) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  // Restaure la langue choisie précédemment (côté client uniquement).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "fr" || stored === "en") setLangState(stored);
    } catch {
      /* localStorage indisponible : on garde le défaut */
    }
  }, []);

  // Tient l'attribut <html lang> à jour (accessibilité / SEO).
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, params: Params = {}) => {
      const entry = DICTS[lang][key] ?? DICTS.fr[key] ?? key;
      return typeof entry === "function" ? entry(params) : entry;
    },
    [lang],
  );

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      locale: lang === "fr" ? "fr-FR" : "en-GB",
      setLang,
      t,
    }),
    [lang, setLang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n doit être utilisé dans <LanguageProvider>");
  }
  return ctx;
}
