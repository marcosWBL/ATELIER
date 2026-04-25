"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Keyboard } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Profile = { store_name: string; email: string };

const SHORTCUTS = [
  { key: "N", description: "Nova venda" },
  { key: "D", description: "Dashboard" },
  { key: "/", description: "Buscar produtos" },
];

const USER_TABLES = [
  "sale_items",
  "sales",
  "products",
  "customers",
  "expenses",
  "bills",
  "profiles",
];

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("store_name, email")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data);
    }
    load();
  }, []);

  async function handleDeleteAll() {
    const first = confirm("Tem certeza? TODOS os seus dados serão apagados permanentemente.");
    if (!first) return;
    const second = confirm("Esta ação é irreversível. Confirma a exclusão de todos os dados?");
    if (!second) return;

    setDeleting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setDeleting(false); return; }

    for (const table of USER_TABLES) {
      await supabase.from(table).delete().eq(table === "profiles" ? "id" : "user_id", user.id);
    }

    setDeleting(false);
    setDeleted(true);
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 p-6 space-y-8 max-w-2xl">
        <h1 className="text-xl font-bold text-foreground">Configurações</h1>

        {/* Atalhos de teclado */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-300">Atalhos de teclado</h2>
          </div>
          <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
            {SHORTCUTS.map(({ key, description }) => (
              <div key={key} className="flex items-center justify-between bg-zinc-900 px-4 py-3">
                <span className="text-sm text-zinc-300">{description}</span>
                <kbd className="inline-flex items-center rounded border border-zinc-600 bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-300 shadow-sm">
                  {key}
                </kbd>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            Os atalhos funcionam quando nenhum campo de texto está em foco.
          </p>
        </section>

        {/* Zona de perigo */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <h2 className="text-sm font-semibold text-red-400">Zona de perigo</h2>
          </div>
          <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-5 space-y-3">
            <div>
              <p className="text-sm font-medium text-red-300">Apagar todos os dados</p>
              <p className="text-xs text-red-400/70 mt-0.5">
                Remove permanentemente todas as vendas, produtos, clientes, despesas, contas e perfil. Esta ação não pode ser desfeita.
              </p>
            </div>
            {deleted ? (
              <p className="text-sm text-emerald-400">Todos os dados foram apagados.</p>
            ) : (
              <button
                onClick={handleDeleteAll}
                disabled={deleting}
                className="rounded-lg border border-red-700 bg-red-900/30 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-900/60 disabled:opacity-50 transition-colors"
              >
                {deleting ? "Apagando..." : "Apagar todos os dados"}
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Rodapé */}
      <footer className="border-t border-zinc-800 px-6 py-4">
        <p className="text-xs text-zinc-500">
          atelier. v2.0{profile && (
            <> — Logado como <span className="text-zinc-400">{profile.store_name}</span> ({profile.email})</>
          )}
        </p>
      </footer>
    </div>
  );
}
