"use client";

import { useEffect, useState } from "react";
import { supabaseConfig } from "@/lib/supabase";

type ConnectionState = "checking" | "connected" | "missing" | "error";

export function SupabaseStatus() {
  const [state, setState] = useState<ConnectionState>("checking");
  const [detail, setDetail] = useState("Checking Kinora's connection...");

  useEffect(() => {
    if (!supabaseConfig.configured) {
      setState("missing");
      setDetail("Supabase environment variables were not available during the Kinora build.");
      return;
    }

    const controller = new AbortController();

    async function testConnection() {
      try {
        const response = await fetch(`${supabaseConfig.url}/rest/v1/`, {
          method: "GET",
          headers: {
            apikey: supabaseConfig.key,
          },
          signal: controller.signal,
        });

        if (response.ok) {
          setState("connected");
          setDetail("Kinora reached your Supabase project successfully.");
        } else {
          setState("error");
          setDetail(`Supabase responded, but the connection returned HTTP ${response.status}.`);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setState("error");
        setDetail("Kinora could not reach Supabase. Check the project URL and publishable key.");
      }
    }

    testConnection();

    return () => controller.abort();
  }, []);

  const styles = {
    checking: "border-white/10 bg-white/[0.035]",
    connected: "border-emerald-300/20 bg-emerald-400/[0.07]",
    missing: "border-amber-300/20 bg-amber-400/[0.07]",
    error: "border-red-300/20 bg-red-400/[0.07]",
  }[state];

  const labels = {
    checking: "Checking",
    connected: "Connected",
    missing: "Configuration missing",
    error: "Needs attention",
  }[state];

  return (
    <section className={`rounded-3xl border p-6 ${styles}`}>
      <div className="flex items-start justify-between gap-5">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-white/40">Supabase</div>
          <h2 className="mt-3 text-2xl font-medium">{labels}</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/50">{detail}</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-black/20 text-lg">
          {state === "connected" ? "✓" : state === "checking" ? "…" : "!"}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <StatusRow label="Project URL" value={supabaseConfig.url ? "Configured" : "Missing"} />
        <StatusRow label="Publishable key" value={supabaseConfig.key ? "Configured" : "Missing"} />
      </div>
    </section>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/30">{label}</div>
      <div className="mt-1 text-sm text-white/70">{value}</div>
    </div>
  );
}
