"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import { Sidebar } from "@/components/Sidebar";

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

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);

      if (!data.session && pathname !== "/login") {
        router.replace("/login");
      }

      if (data.session && pathname === "/login") {
        router.replace("/");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setReady(true);

      if (!nextSession && pathname !== "/login") {
        router.replace("/login");
      }

      if (nextSession && pathname === "/login") {
        router.replace("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  if (!ready) {
    return <LoadingScreen label="Opening your studio..." />;
  }

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (!session) {
    return <LoadingScreen label="Redirecting to sign in..." />;
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
