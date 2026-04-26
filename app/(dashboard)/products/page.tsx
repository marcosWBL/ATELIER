"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fmtBRL, uid } from "@/lib/utils";
import Empty from "@/components/Empty";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  qty: number;
  category: string;
};

const EMPTY = (): Omit<Product, "id"> => ({
  name: "", description: "", price: 0, cost: 0, qty: 0, category: "Geral",
});

const CATEGORIES = ["Geral", "Roupas", "Acessórios", "Tecidos", "Aviamentos", "Outros"];

function ProductModal({ initial, onClose, onSaved }: { initial?: Product; onClose: () => void; onSaved: (p: Product) => void }) {
  const [form, setForm] = useState(initial ? { name: initial.name, description: initial.description, price: initial.price, cost: initial.cost, qty: initial.qty, category: initial.category } : EMPTY());
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
      const { error: err } = await supabase.from("products").update({ ...form }).eq("id", initial.id);
      if (err) { setError(err.message); setLoading(false); return; }
      onSaved({ ...initial, ...form });
    } else {
      const id = uid();
      const { error: err } = await supabase.from("products").insert({ id, user_id: user.id, ...form });
      if (err) { setError(err.message); setLoading(false); return; }
      onSaved({ id, ...form });
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-xl bg-card border border-rim shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-rim">
          <h2 className="text-base font-semibold text-ink">{initial ? "Editar produto" : "Novo produto"}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-ink-2 hover:text-white" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-ink-2">Nome *</label>
            <input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500" placeholder="Nome do produto" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-ink-2">Descrição</label>
            <input type="text" value={form.description} onChange={(e) => set("description", e.target.value)} className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500" placeholder="Descrição opcional" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-ink-2">Preço venda *</label>
              <input type="number" min={0} step="0.01" value={form.price || ""} onChange={(e) => set("price", Number(e.target.value))} className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-zinc-500" placeholder="0,00" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-ink-2">Custo</label>
              <input type="number" min={0} step="0.01" value={form.cost || ""} onChange={(e) => set("cost", Number(e.target.value))} className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-zinc-500" placeholder="0,00" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-ink-2">Estoque</label>
              <input type="number" min={0} value={form.qty || ""} onChange={(e) => set("qty", Number(e.target.value))} className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-zinc-500" placeholder="0" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-ink-2">Categoria</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-md bg-white py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50 transition-colors">
            {loading ? "Salvando..." : initial ? "Salvar" : "Criar produto"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>();

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("products").select("*").eq("user_id", user.id).order("name");
    setProducts(data ?? []);
    setLoading(false);
  }

  async function deleteProduct(p: Product) {
    if (!confirm(`Excluir "${p.name}"?`)) return;
    await supabase.from("products").delete().eq("id", p.id);
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
  }

  function onSaved(p: Product) {
    setProducts((prev) => {
      const exists = prev.find((x) => x.id === p.id);
      return exists ? prev.map((x) => x.id === p.id ? p : x) : [p, ...prev];
    });
    setShowModal(false); setEditing(undefined);
  }

  const totalStock = products.reduce((a, p) => a + p.qty, 0);
  const totalValue = products.reduce((a, p) => a + p.price * p.qty, 0);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-ink">Produtos</h1>
          <button onClick={() => { setEditing(undefined); setShowModal(true); }} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors">
            <Plus className="h-4 w-4" /> Novo produto
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-rim bg-card p-4">
            <p className="text-xs text-ink-2">Total em estoque</p>
            <p className="text-2xl font-bold text-ink mt-1">{totalStock} <span className="text-sm font-normal text-ink-2">unidades</span></p>
          </div>
          <div className="rounded-xl border border-rim bg-card p-4">
            <p className="text-xs text-ink-2">Valor do estoque</p>
            <p className="text-2xl font-bold text-ink mt-1">{fmtBRL(totalValue)}</p>
          </div>
        </div>

        {loading ? <p className="text-sm text-ink-3">Carregando...</p> : products.length === 0 ? <Empty message="Nenhum produto cadastrado." /> : (
          <div className="rounded-xl border border-rim overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rim bg-card/50">
                  <th className="px-4 py-3 text-left text-xs text-ink-2 font-medium">Nome</th>
                  <th className="px-4 py-3 text-left text-xs text-ink-2 font-medium">Categoria</th>
                  <th className="px-4 py-3 text-right text-xs text-ink-2 font-medium">Custo</th>
                  <th className="px-4 py-3 text-right text-xs text-ink-2 font-medium">Preço</th>
                  <th className="px-4 py-3 text-right text-xs text-ink-2 font-medium">Margem</th>
                  <th className="px-4 py-3 text-right text-xs text-ink-2 font-medium">Estoque</th>
                  <th className="px-4 py-3 text-right text-xs text-ink-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rim">
                {products.map((p) => {
                  const margin = p.price > 0 ? ((p.price - p.cost) / p.price * 100).toFixed(0) : "—";
                  return (
                    <tr key={p.id} className="bg-card hover:bg-card-hover/50 transition-colors">
                      <td className="px-4 py-3 text-ink font-medium">
                        {p.name}
                        {p.description && <p className="text-xs text-ink-3 mt-0.5">{p.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-ink-2">{p.category}</td>
                      <td className="px-4 py-3 text-right text-ink-2">{fmtBRL(p.cost)}</td>
                      <td className="px-4 py-3 text-right font-medium text-ink">{fmtBRL(p.price)}</td>
                      <td className="px-4 py-3 text-right text-emerald-400">{margin}%</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${p.qty === 0 ? "text-red-400" : p.qty < 5 ? "text-amber-400" : "text-white"}`}>{p.qty}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditing(p); setShowModal(true); }} className="rounded p-1.5 text-ink-2 hover:text-white hover:bg-card-hover transition-colors"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => deleteProduct(p)} className="rounded p-1.5 text-ink-2 hover:text-red-400 hover:bg-card-hover transition-colors"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showModal && <ProductModal initial={editing} onClose={() => { setShowModal(false); setEditing(undefined); }} onSaved={onSaved} />}
    </div>
  );
}
