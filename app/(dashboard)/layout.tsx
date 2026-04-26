"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, ShoppingCart, Package, Users,
  Receipt, FileText, Settings, LogOut, Lightbulb, Menu, X, ArrowLeftRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/sales", label: "Vendas", icon: ShoppingCart },
  { href: "/condicional", label: "Condicional", icon: ArrowLeftRight },
  { href: "/products", label: "Produtos", icon: Package },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/expenses", label: "Despesas", icon: Receipt },
  { href: "/bills", label: "Contas a pagar", icon: FileText },
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

function Sidebar({ onClose, mobile }: { onClose?: () => void; mobile?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    onClose?.();
  }

  return (
    <div className="flex flex-col h-full w-64 bg-surface border-r border-rim">
      <div className="flex items-center justify-between px-6 py-6 border-b border-rim">
        <div className="flex items-center gap-3">
          <StorefrontIcon className="h-7 w-7 text-ink-2" />
          <span className="text-lg font-light tracking-widest text-ink"
            style={{ fontFamily: "Calibri, 'Gill Sans', sans-serif", letterSpacing: "0.15em" }}>
            atelier
          </span>
        </div>
        {mobile && (
          <button onClick={onClose} className="text-ink-3 hover:text-ink transition-colors">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                active
                  ? "bg-card-hover text-ink font-medium"
                  : "text-ink-3 hover:bg-card hover:text-ink-2"
              }`}>
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-rim space-y-0.5">
        <ThemeToggle />
        <button onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-3 hover:bg-card hover:text-red-400 transition-all">
          <LogOut className="h-4 w-4 shrink-0" />
          Sair da conta
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="hidden md:flex shrink-0">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)} />
      )}

      <div className={`md:hidden fixed top-0 left-0 h-full z-50 transform transition-transform duration-300 ease-in-out ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <Sidebar mobile onClose={() => setMobileOpen(false)} />
      </div>

      <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between border-b border-rim bg-surface px-4 h-14">
        <button onClick={() => setMobileOpen(true)} className="text-ink-3 hover:text-ink transition-colors p-1">
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2.5 absolute left-1/2 -translate-x-1/2">
          <StorefrontIcon className="h-6 w-6 text-ink-2" />
          <span className="text-base font-light text-ink tracking-widest"
            style={{ fontFamily: "Calibri, 'Gill Sans', sans-serif" }}>
            atelier
          </span>
        </div>
      </div>

      <main className="flex-1 overflow-auto mt-14 md:mt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
