"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fmtBRL, todayISO, uid } from "@/lib/utils";
import Empty from "@/components/Empty";

type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  notes: string;
};

const CATEGORIES = ["Fornecedor", "Transporte", "Alimentação", "Marketing", "Equipamentos", "Serviços", "Outros"];
const EMPTY = (): Omit<Expense, "id"> => ({ description: "", amount: 0, category: "Outros", date: todayISO(), notes: "" });

function ExpenseModal({ initial, onClose, onSaved }: { initial?: Expense; onClose: () => void; onSaved: (e: Expense) => void }) {
  const [form, setForm] = useState(initial ? { description: initial.description, amount: initial.amount, category: initial.category, date: initial.date, notes: initial.notes } : EMPTY());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) { setError("Descrição obrigatória."); return; }
    if (form.amount <= 0) { setError("Valor deve ser maior que zero."); return; }
    setError(""); setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    if (initial) {
      const { error: err } = await supabase.from("expenses").update({ ...form }).eq("id", initial.id);
      if (err) { setError(err.message); setLoading(false); return; }
      onSaved({ ...initial, ...form });
    } else {
      const id = uid();
      const { error: err } = await supabase.from("expenses").insert({ id, user_id: user.id, ...form });
      if (err) { setError(err.message); setLoading(false); return; }
      onSaved({ id, ...form });
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-xl bg-card border border-rim shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-rim">
          <h2 className="text-base font-semibold text-ink">{initial ? "Editar despesa" : "Nova despesa"}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-ink-2 hover:text-white" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-ink-2">Descrição *</label>
            <input type="text" required value={form.description} onChange={(e) => set("description", e.target.value)} className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500" placeholder="Ex: Compra de tecidos" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-ink-2">Valor *</label>
              <input type="number" min={0.01} step="0.01" required value={form.amount || ""} onChange={(e) => set("amount", Number(e.target.value))} className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-zinc-500" placeholder="0,00" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-ink-2">Data *</label>
              <input type="date" required value={form.date} onChange={(e) => set("date", e.target.value)} className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-zinc-500" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-ink-2">Categoria</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-ink-2">Observações</label>
            <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 resize-none" placeholder="Detalhes opcionais..." />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-md bg-white py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50 transition-colors">
            {loading ? "Salvando..." : initial ? "Salvar" : "Criar despesa"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Expense | undefined>();

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("expenses").select("*").eq("user_id", user.id).order("date", { ascending: false });
    setExpenses(data ?? []);
    setLoading(false);
  }

  async function deleteExpense(ex: Expense) {
    if (!confirm(`Excluir "${ex.description}"?`)) return;
    await supabase.from("expenses").delete().eq("id", ex.id);
    setExpenses((prev) => prev.filter((x) => x.id !== ex.id));
  }

  function onSaved(ex: Expense) {
    setExpenses((prev) => {
      const exists = prev.find((x) => x.id === ex.id);
      return exists ? prev.map((x) => x.id === ex.id ? ex : x) : [ex, ...prev];
    });
    setShowModal(false); setEditing(undefined);
  }

  function exportCSV() {
    const header = ["Descrição", "Categoria", "Valor", "Data", "Observações"];
    const rows = expenses.map((e) => [e.description, e.category, e.amount.toFixed(2), e.date, e.notes]);
    const csv = [header, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `despesas_${todayISO()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const totalMonth = expenses.filter((e) => e.date >= monthStart).reduce((a, e) => a + e.amount, 0);
  const totalAll = expenses.reduce((a, e) => a + e.amount, 0);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-ink">Despesas</h1>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="flex items-center gap-2 rounded-lg border border-rim-2 px-3 py-2 text-sm text-ink hover:bg-card-hover transition-colors">
              <Download className="h-4 w-4" /> CSV
            </button>
            <button onClick={() => { setEditing(undefined); setShowModal(true); }} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors">
              <Plus className="h-4 w-4" /> Nova despesa
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-rim bg-card p-4">
            <p className="text-xs text-ink-2">Despesas do mês</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{fmtBRL(totalMonth)}</p>
          </div>
          <div className="rounded-xl border border-rim bg-card p-4">
            <p className="text-xs text-ink-2">Total geral</p>
            <p className="text-2xl font-bold text-ink mt-1">{fmtBRL(totalAll)}</p>
          </div>
        </div>

        {loading ? <p className="text-sm text-ink-3">Carregando...</p> : expenses.length === 0 ? <Empty message="Nenhuma despesa registrada." /> : (
          <div className="rounded-xl border border-rim overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rim bg-card/50">
                  <th className="px-4 py-3 text-left text-xs text-ink-2 font-medium">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs text-ink-2 font-medium">Categoria</th>
                  <th className="px-4 py-3 text-left text-xs text-ink-2 font-medium">Data</th>
                  <th className="px-4 py-3 text-right text-xs text-ink-2 font-medium">Valor</th>
                  <th className="px-4 py-3 text-right text-xs text-ink-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rim">
                {expenses.map((ex) => (
                  <tr key={ex.id} className="bg-card hover:bg-card-hover/50 transition-colors">
                    <td className="px-4 py-3 text-ink font-medium">
                      {ex.description}
                      {ex.notes && <p className="text-xs text-ink-3 mt-0.5 truncate max-w-[180px]">{ex.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-ink-2">{ex.category}</td>
                    <td className="px-4 py-3 text-ink-2">{ex.date}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-400">{fmtBRL(ex.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditing(ex); setShowModal(true); }} className="rounded p-1.5 text-ink-2 hover:text-white hover:bg-card-hover transition-colors"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => deleteExpense(ex)} className="rounded p-1.5 text-ink-2 hover:text-red-400 hover:bg-card-hover transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showModal && <ExpenseModal initial={editing} onClose={() => { setShowModal(false); setEditing(undefined); }} onSaved={onSaved} />}
    </div>
  );
}
