"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

const nav = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/create", label: "Create", icon: "✦" },
  { href: "/characters", label: "Characters", icon: "◉" },
  { href: "/projects", label: "Projects", icon: "▦" },
  { href: "/generations", label: "Generations", icon: "↺" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState("");

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
    });
  }, []);

  async function signOut() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <aside className="flex border-b border-white/10 bg-black/20 backdrop-blur-xl md:min-h-screen md:w-64 md:flex-col md:border-b-0 md:border-r">
      <div className="flex w-full items-center justify-between px-5 py-5 md:block md:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-sm font-black text-black">K</div>
          <div>
            <div className="text-sm font-semibold tracking-[0.28em]">KINORA</div>
            <div className="text-xs text-white/40">private studio</div>
          </div>
        </Link>
      </div>

      <nav className="flex gap-2 overflow-x-auto px-4 pb-4 md:flex-col md:px-3 md:pb-0">
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex min-w-max items-center gap-3 rounded-xl px-4 py-3 text-sm transition",
                active
                  ? "bg-white text-black"
                  : "text-white/60 hover:bg-white/[0.06] hover:text-white",
              ].join(" ")}
            >
              <span className="w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden p-4 md:block">
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
          <div className="truncate text-xs text-white/40">{email || "Signed in"}</div>
          <button
            type="button"
            onClick={signOut}
            className="mt-3 w-full rounded-xl border border-white/10 px-3 py-2 text-xs text-white/55 transition hover:bg-white/[0.05] hover:text-white"
          >
            Sign out
          </button>
        </div>
        <div className="px-2 pt-5 text-xs leading-5 text-white/25">
          Kinora v0.1
          <br />
          private creative workspace
        </div>
      </div>
    </aside>
  );
}
