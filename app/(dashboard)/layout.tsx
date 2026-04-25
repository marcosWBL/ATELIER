"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, ShoppingCart, Package, Users,
  Receipt, FileText, Settings, LogOut, Lightbulb,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/sales", label: "Vendas", icon: ShoppingCart },
  { href: "/products", label: "Produtos", icon: Package },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/expenses", label: "Despesas", icon: Receipt },
  { href: "/bills", label: "Contas", icon: FileText },
  { href: "/settings", label: "Configurações", icon: Settings },
];

function StorefrontIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="4" y="13" width="24" height="15" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 13L16 5L30 13" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="13" y="20" width="6" height="8" stroke="currentColor" strokeWidth="1.5" />
      <rect x="6.5" y="16" width="5" height="4" stroke="currentColor" strokeWidth="1.5" />
      <rect x="20.5" y="16" width="5" height="4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (["input", "textarea", "select"].includes(tag)) return;
      if (e.key === "d" || e.key === "D") router.push("/");
      else if (e.key === "n" || e.key === "N") router.push("/sales?new=1");
      else if (e.key === "/") { e.preventDefault(); router.push("/products?search=1"); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-60 border-r border-zinc-800/60 bg-zinc-950 shrink-0">
        <div className="px-6 py-6 border-b border-zinc-800/40">
          <div className="flex items-center gap-3">
            <StorefrontIcon className="h-7 w-7 text-zinc-300" />
            <span className="text-lg font-light tracking-widest text-zinc-100" style={{ fontFamily: "Calibri, 'Gill Sans', sans-serif", letterSpacing: "0.15em" }}>
              atelier
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                  active
                    ? "bg-zinc-800 text-white font-medium"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-5 border-t border-zinc-800/60">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-600 hover:bg-zinc-900 hover:text-red-400 transition-all"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 h-14">
        <div className="flex items-center gap-2.5">
          <StorefrontIcon className="h-6 w-6 text-zinc-300" />
          <span className="text-base font-light text-zinc-100 tracking-widest" style={{ fontFamily: "Calibri, 'Gill Sans', sans-serif" }}>atelier</span>
        </div>
        <button onClick={handleLogout} className="text-zinc-500 hover:text-red-400 transition-colors">
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 flex border-t border-zinc-800 bg-zinc-950">
        {NAV.slice(0, 5).map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={`flex flex-1 flex-col items-center gap-1 py-3 text-[10px] transition-colors ${active ? "text-white" : "text-zinc-600 hover:text-zinc-400"}`}>
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 overflow-auto mt-14 md:mt-0 mb-16 md:mb-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
