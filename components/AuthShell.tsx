"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import { Sidebar } from "@/components/Sidebar";
import { AuthPanel } from "@/components/AuthPanel";

const SESSION_CHECK_TIMEOUT_MS = 4000;

export function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      setReady(true);
      return;
    }

    let active = true;
    let settled = false;

    const finish = (nextSession: Session | null) => {
      if (!active) return;
      settled = true;
      setSession(nextSession);
      setReady(true);
    };

    const timeout = window.setTimeout(() => {
      if (!settled) {
        finish(null);
      }
    }, SESSION_CHECK_TIMEOUT_MS);

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          finish(null);
          return;
        }

        finish(data.session);
      })
      .catch(() => finish(null));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      finish(nextSession);
    });

    return () => {
      active = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (ready && session && pathname === "/login") {
      router.replace("/");
    }
  }, [pathname, ready, router, session]);

  if (!ready) {
    return <LoadingScreen label="Opening your studio..." />;
  }

  if (!session) {
    return <AuthPanel />;
  }

  if (pathname === "/login") {
    return <LoadingScreen label="Opening your studio..." />;
  }

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-sm font-black text-black">
          K
        </div>
        <div className="mt-5 text-xs uppercase tracking-[0.28em] text-white/35">KINORA</div>
        <p className="mt-3 text-sm text-white/45">{label}</p>
      </div>
    </div>
  );
}
