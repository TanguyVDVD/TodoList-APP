"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useI18n, type Lang } from "../lib/i18n";

const LANGS: { code: Lang; label: string }[] = [
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
];

export default function AuthScreen() {
  const { t, lang, setLang } = useI18n();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === "register";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const e = email.trim();
    const p = password;
    const n = name.trim();
    if (!e || !p || (isRegister && !n)) {
      setError(t("auth.required"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (isRegister) await register(e, p, n);
      else await login(e, p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="absolute right-4 top-4 flex gap-1">
        {LANGS.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            className={`rounded-md px-2 py-1 text-xs font-medium transition ${
              lang === code
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-bold tracking-tight">
          {isRegister ? t("auth.register_title") : t("auth.login_title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t("auth.subtitle")}</p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          {isRegister && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-600">{t("auth.name")}</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                autoComplete="name"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-600">{t("auth.email")}</span>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
              autoComplete="email"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-600">
              {t("auth.password")}
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={128}
              autoComplete={isRegister ? "new-password" : "current-password"}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? t("auth.submitting")
              : isRegister
                ? t("auth.register_cta")
                : t("auth.login_cta")}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(isRegister ? "login" : "register");
            setError(null);
          }}
          className="mt-4 w-full text-center text-sm text-slate-500 underline hover:text-slate-800"
        >
          {isRegister ? t("auth.to_login") : t("auth.to_register")}
        </button>
      </div>
    </div>
  );
}
