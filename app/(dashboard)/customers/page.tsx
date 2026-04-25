"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { uid } from "@/lib/utils";
import Empty from "@/components/Empty";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthday: string;
  vip: boolean;
  notes: string;
};

const EMPTY = (): Omit<Customer, "id"> => ({
  name: "", email: "", phone: "", birthday: "", vip: false, notes: "",
});

function CustomerModal({ initial, onClose, onSaved }: { initial?: Customer; onClose: () => void; onSaved: (c: Customer) => void }) {
  const [form, setForm] = useState(initial ? { name: initial.name, email: initial.email, phone: initial.phone, birthday: initial.birthday, vip: initial.vip, notes: initial.notes } : EMPTY());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Nome obrigatório."); return; }
    setError(""); setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    if (initial) {
      const { error: err } = await supabase.from("customers").update({ ...form }).eq("id", initial.id);
      if (err) { setError(err.message); setLoading(false); return; }
      onSaved({ ...initial, ...form });
    } else {
      const id = uid();
      const { error: err } = await supabase.from("customers").insert({ id, user_id: user.id, ...form });
      if (err) { setError(err.message); setLoading(false); return; }
      onSaved({ id, ...form });
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-base font-semibold text-white">{initial ? "Editar cliente" : "Novo cliente"}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-zinc-400 hover:text-white" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Nome *</label>
            <input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500" placeholder="Nome completo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">E-mail</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500" placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Telefone</label>
              <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500" placeholder="(00) 00000-0000" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Aniversário</label>
            <input type="date" value={form.birthday} onChange={(e) => set("birthday", e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-zinc-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Observações</label>
            <textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 resize-none" placeholder="Preferências, histórico..." />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.vip} onChange={(e) => set("vip", e.target.checked)} className="rounded border-zinc-600 bg-zinc-800" />
            <span className="text-sm text-zinc-300 flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-400" /> Cliente VIP</span>
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-md bg-white py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50 transition-colors">
            {loading ? "Salvando..." : initial ? "Salvar" : "Criar cliente"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Customer | undefined>();

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("customers").select("*").eq("user_id", user.id).order("name");
    setCustomers(data ?? []);
    setLoading(false);
  }

  async function deleteCustomer(c: Customer) {
    if (!confirm(`Excluir "${c.name}"?`)) return;
    await supabase.from("customers").delete().eq("id", c.id);
    setCustomers((prev) => prev.filter((x) => x.id !== c.id));
  }

  function onSaved(c: Customer) {
    setCustomers((prev) => {
      const exists = prev.find((x) => x.id === c.id);
      return exists ? prev.map((x) => x.id === c.id ? c : x) : [c, ...prev];
    });
    setShowModal(false); setEditing(undefined);
  }

  const vipCount = customers.filter((c) => c.vip).length;
  const birthdayMonth = String(new Date().getMonth() + 1).padStart(2, "0");
  const birthdayCount = customers.filter((c) => c.birthday?.slice(5, 7) === birthdayMonth).length;

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Clientes</h1>
          <button onClick={() => { setEditing(undefined); setShowModal(true); }} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors">
            <Plus className="h-4 w-4" /> Novo cliente
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-400">Total</p>
            <p className="text-2xl font-bold text-white mt-1">{customers.length}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-400">VIP</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{vipCount}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-400">Aniversário no mês</p>
            <p className="text-2xl font-bold text-pink-400 mt-1">{birthdayCount}</p>
          </div>
        </div>

        {loading ? <p className="text-sm text-zinc-500">Carregando...</p> : customers.length === 0 ? <Empty message="Nenhum cliente cadastrado." /> : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="px-4 py-3 text-left text-xs text-zinc-400 font-medium">Nome</th>
                  <th className="px-4 py-3 text-left text-xs text-zinc-400 font-medium">Contato</th>
                  <th className="px-4 py-3 text-left text-xs text-zinc-400 font-medium">Aniversário</th>
                  <th className="px-4 py-3 text-center text-xs text-zinc-400 font-medium">VIP</th>
                  <th className="px-4 py-3 text-right text-xs text-zinc-400 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {customers.map((c) => (
                  <tr key={c.id} className="bg-zinc-900 hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3 text-zinc-200 font-medium">
                      {c.vip && <Star className="inline h-3 w-3 text-amber-400 mr-1" />}
                      {c.name}
                      {c.notes && <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-[160px]">{c.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      <p>{c.email || "—"}</p>
                      <p className="text-xs">{c.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{c.birthday || "—"}</td>
                    <td className="px-4 py-3 text-center">{c.vip ? <Star className="inline h-4 w-4 text-amber-400" /> : <span className="text-zinc-600">—</span>}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditing(c); setShowModal(true); }} className="rounded p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => deleteCustomer(c)} className="rounded p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showModal && <CustomerModal initial={editing} onClose={() => { setShowModal(false); setEditing(undefined); }} onSaved={onSaved} />}
    </div>
  );
}
