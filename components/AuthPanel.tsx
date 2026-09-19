"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

type Mode = "signin" | "signup";

export function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function openStudio() {
    router.replace("/");
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage("Supabase is not configured for this build.");
      return;
    }

    setBusy(true);

    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        if (!data.session) {
          setMessage("Signed in, but Kinora could not open a session. Try again.");
          return;
        }

        setMessage("Signed in. Opening Kinora...");
        openStudio();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName.trim() || undefined,
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          setMessage("Account created. Opening Kinora...");
          openStudio();
        } else {
          setMessage("Account created. Check your email to confirm your address, then sign in.");
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-5 py-10 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(158,125,255,0.16),transparent_34rem)]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <div className="w-full rounded-[2rem] border border-white/10 bg-black/25 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-sm font-black text-black">
              K
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[0.28em]">KINORA</div>
              <div className="text-xs text-white/35">private creative studio</div>
            </div>
          </div>

          <div className="mt-10">
            <div className="text-xs uppercase tracking-[0.2em] text-violet-300/60">
              {mode === "signin" ? "WELCOME BACK" : "CREATE YOUR ACCESS"}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              {mode === "signin" ? "Enter your studio." : "Create your Kinora account."}
            </h1>
          </div>

          <div className="mt-7 grid grid-cols-2 rounded-2xl border border-white/10 bg-black/20 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setMessage("");
              }}
              className={`rounded-xl px-4 py-2.5 text-sm transition ${
                mode === "signin" ? "bg-white text-black" : "text-white/45 hover:text-white"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setMessage("");
              }}
              className={`rounded-xl px-4 py-2.5 text-sm transition ${
                mode === "signup" ? "bg-white text-black" : "text-white/45 hover:text-white"
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <Field
                label="Display name"
                type="text"
                value={displayName}
                onChange={setDisplayName}
                placeholder="Roo"
                autoComplete="name"
              />
            )}

            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />

            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={6}
              required
            />

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-black transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Working..." : mode === "signin" ? "Enter Kinora" : "Create account"}
            </button>
          </form>

          {message && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm leading-6 text-white/60">
              {message}
            </div>
          )}

          <p className="mt-7 text-xs leading-5 text-white/30">
            Kinora uses Supabase Auth. Your studio data is protected by per-user Row Level Security.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  minLength,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-white/35">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/20 focus:border-violet-300/35"
      />
    </label>
  );
}
