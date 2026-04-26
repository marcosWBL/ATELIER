"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fmtBRL, todayISO, uid } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import Empty from "@/components/Empty";

// ─── Types ────────────────────────────────────────────────────────────────────

type Recurrence = "Nenhuma" | "Semanal" | "Mensal" | "Anual";

type Bill = {
  id: string;
  user_id?: string;
  description: string;
  supplier: string;
  category: string;
  amount: number;
  due_date: string;
  recurrence: Recurrence;
  notes: string;
  paid: boolean;
};

const RECURRENCE_OPTIONS: Recurrence[] = ["Nenhuma", "Semanal", "Mensal", "Anual"];
const CATEGORY_OPTIONS = ["Aluguel", "Fornecedor", "Salário", "Marketing", "Serviços", "Impostos", "Outros"];

const EMPTY_FORM = (): Omit<Bill, "id" | "user_id" | "paid"> => ({
  description: "",
  supplier: "",
  category: "Outros",
  amount: 0,
  due_date: todayISO(),
  recurrence: "Nenhuma",
  notes: "",
});

// ─── Form Modal ───────────────────────────────────────────────────────────────

function BillModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Bill;
  onClose: () => void;
  onSaved: (bill: Bill) => void;
}) {
  const [form, setForm] = useState(
    initial
      ? { description: initial.description, supplier: initial.supplier, category: initial.category, amount: initial.amount, due_date: initial.due_date, recurrence: initial.recurrence, notes: initial.notes }
      : EMPTY_FORM()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) { setError("Descrição obrigatória."); return; }
    if (form.amount <= 0) { setError("Valor deve ser maior que zero."); return; }
    setError("");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    if (initial) {
      const { error: err } = await supabase.from("bills").update({ ...form }).eq("id", initial.id);
      if (err) { setError(err.message); setLoading(false); return; }
      onSaved({ ...initial, ...form });
    } else {
      const id = uid();
      const { error: err } = await supabase.from("bills").insert({ id, user_id: user.id, paid: false, ...form });
      if (err) { setError(err.message); setLoading(false); return; }
      onSaved({ id, user_id: user.id, paid: false, ...form });
    }

    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-xl bg-card border border-rim shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-rim">
          <h2 className="text-base font-semibold text-ink">
            {initial ? "Editar conta" : "Nova conta"}
          </h2>
          <button onClick={onClose}><X className="h-5 w-5 text-ink-2 hover:text-white" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Descrição */}
          <div className="space-y-1">
            <label className="text-xs text-ink-2">Descrição *</label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              placeholder="Ex: Aluguel do espaço"
            />
          </div>

          {/* Fornecedor */}
          <div className="space-y-1">
            <label className="text-xs text-ink-2">Fornecedor <span className="text-ink-3">(opcional)</span></label>
            <input
              type="text"
              value={form.supplier}
              onChange={(e) => set("supplier", e.target.value)}
              className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              placeholder="Nome do fornecedor"
            />
          </div>

          {/* Categoria + Valor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-ink-2">Categoria</label>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink"
              >
                {CATEGORY_OPTIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-ink-2">Valor *</label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                required
                value={form.amount || ""}
                onChange={(e) => set("amount", Number(e.target.value))}
                className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Vencimento + Recorrência */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-ink-2">Vencimento *</label>
              <input
                type="date"
                required
                value={form.due_date}
                onChange={(e) => set("due_date", e.target.value)}
                className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-ink-2">Recorrência</label>
              <select
                value={form.recurrence}
                onChange={(e) => set("recurrence", e.target.value as Recurrence)}
                className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink"
              >
                {RECURRENCE_OPTIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <label className="text-xs text-ink-2">Observações</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 resize-none"
              placeholder="Informações adicionais..."
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-white py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            {loading ? "Salvando..." : initial ? "Salvar alterações" : "Criar conta"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Bill | undefined>();

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("bills")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true });
    setBills(data ?? []);
    setLoading(false);
  }

  async function togglePaid(bill: Bill) {
    const { error } = await supabase.from("bills").update({ paid: !bill.paid }).eq("id", bill.id);
    if (!error) setBills((prev) => prev.map((b) => b.id === bill.id ? { ...b, paid: !b.paid } : b));
  }

  async function deleteBill(bill: Bill) {
    if (!confirm(`Excluir "${bill.description}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("bills").delete().eq("id", bill.id);
    if (!error) setBills((prev) => prev.filter((b) => b.id !== bill.id));
  }

  function onSaved(bill: Bill) {
    setBills((prev) => {
      const exists = prev.find((b) => b.id === bill.id);
      return exists ? prev.map((b) => b.id === bill.id ? bill : b) : [bill, ...prev];
    });
    setShowModal(false);
    setEditing(undefined);
  }

  function openEdit(bill: Bill) {
    setEditing(bill);
    setShowModal(true);
  }

  function openCreate() {
    setEditing(undefined);
    setShowModal(true);
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  const today = todayISO();
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const pending = bills.filter((b) => !b.paid);
  const totalPending = pending.reduce((a, b) => a + b.amount, 0);
  const next7 = pending.filter((b) => b.due_date >= today && b.due_date <= in7).reduce((a, b) => a + b.amount, 0);
  const next30 = pending.filter((b) => b.due_date >= today && b.due_date <= in30).reduce((a, b) => a + b.amount, 0);

  // ─── Status helper ─────────────────────────────────────────────────────────
  function billStatus(b: Bill): "pago" | "vencido" | "pendente" {
    if (b.paid) return "pago";
    if (b.due_date < today) return "vencido";
    return "pendente";
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-ink">Contas a pagar</h1>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nova conta
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-sm text-ink-3">Carregando...</p>
        ) : bills.length === 0 ? (
          <Empty message="Nenhuma conta cadastrada." />
        ) : (
          <div className="rounded-xl border border-rim overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rim bg-card/50">
                  <th className="px-4 py-3 text-left text-xs text-ink-2 font-medium">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs text-ink-2 font-medium">Categoria</th>
                  <th className="px-4 py-3 text-left text-xs text-ink-2 font-medium">Fornecedor</th>
                  <th className="px-4 py-3 text-left text-xs text-ink-2 font-medium">Vencimento</th>
                  <th className="px-4 py-3 text-left text-xs text-ink-2 font-medium">Recorrência</th>
                  <th className="px-4 py-3 text-right text-xs text-ink-2 font-medium">Valor</th>
                  <th className="px-4 py-3 text-center text-xs text-ink-2 font-medium">Status</th>
                  <th className="px-4 py-3 text-right text-xs text-ink-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rim">
                {bills.map((bill) => (
                  <tr key={bill.id} className="bg-card hover:bg-card-hover/50 transition-colors">
                    <td className="px-4 py-3 text-ink font-medium">
                      {bill.description}
                      {bill.notes && (
                        <p className="text-xs text-ink-3 mt-0.5 truncate max-w-[180px]">{bill.notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-2">{bill.category}</td>
                    <td className="px-4 py-3 text-ink-2">{bill.supplier || "—"}</td>
                    <td className="px-4 py-3 text-ink">{bill.due_date}</td>
                    <td className="px-4 py-3 text-ink-2">{bill.recurrence}</td>
                    <td className="px-4 py-3 text-right font-medium text-ink">{fmtBRL(bill.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={billStatus(bill)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => togglePaid(bill)}
                          title={bill.paid ? "Marcar como pendente" : "Marcar como pago"}
                          className="rounded p-1.5 text-ink-2 hover:text-emerald-400 hover:bg-card-hover transition-colors"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(bill)}
                          className="rounded p-1.5 text-ink-2 hover:text-white hover:bg-card-hover transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteBill(bill)}
                          className="rounded p-1.5 text-ink-2 hover:text-red-400 hover:bg-card-hover transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer summary */}
      <div className="sticky bottom-0 border-t border-rim bg-surface px-6 py-4">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div>
            <span className="text-ink-3">Total pendente</span>
            <p className="font-semibold text-red-400">{fmtBRL(totalPending)}</p>
          </div>
          <div>
            <span className="text-ink-3">Próximos 7 dias</span>
            <p className="font-semibold text-amber-400">{fmtBRL(next7)}</p>
          </div>
          <div>
            <span className="text-ink-3">Próximos 30 dias</span>
            <p className="font-semibold text-ink">{fmtBRL(next30)}</p>
          </div>
        </div>
      </div>

      {showModal && (
        <BillModal
          initial={editing}
          onClose={() => { setShowModal(false); setEditing(undefined); }}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
