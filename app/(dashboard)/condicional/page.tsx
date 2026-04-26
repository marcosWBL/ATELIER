"use client";

import { useEffect, useState } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fmtBRL, fmtDate, todayISO, uid } from "@/lib/utils";
import Empty from "@/components/Empty";

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = { id: string; name: string; price: number; cost: number; qty: number };
type Customer = { id: string; name: string; vip: boolean };

type CondicionalItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  product_price: number;
  product_cost: number;
  quantity: number;
};

type Condicional = {
  id: string;
  customer_id: string | null;
  customer_name?: string;
  status: "ativo" | "finalizado" | "cancelado";
  data_saida: string;
  data_devolucao: string;
  notes: string;
  created_at: string;
  items?: CondicionalItem[];
};

type DraftItem = {
  key: string;
  product_id: string;
  product_name: string;
  product_price: number;
  product_cost: number;
  quantity: number;
};

const PAYMENT_METHODS = ["Dinheiro", "Pix", "Cartão de crédito", "Cartão de débito", "Fiado"];

// ─── Status Badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  ativo: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  finalizado: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelado: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
};

const STATUS_LABELS: Record<string, string> = {
  ativo: "Em condicional",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

function CondicionalBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? ""}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateModal({
  products,
  customers,
  onClose,
  onSaved,
}: {
  products: Product[];
  customers: Customer[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [customerId, setCustomerId] = useState("");
  const [dataSaida, setDataSaida] = useState(todayISO());
  const [dataDevolucao, setDataDevolucao] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addItem(productId: string) {
    if (!productId) return;
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const existing = items.find((i) => i.product_id === productId);
    if (existing) {
      setItems(items.map((i) =>
        i.product_id === productId ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setItems([...items, {
        key: uid(),
        product_id: prod.id,
        product_name: prod.name,
        product_price: prod.price,
        product_cost: prod.cost,
        quantity: 1,
      }]);
    }
  }

  function updateQty(key: string, qty: number) {
    if (qty < 1) return removeItem(key);
    setItems(items.map((i) => i.key === key ? { ...i, quantity: qty } : i));
  }

  function removeItem(key: string) {
    setItems(items.filter((i) => i.key !== key));
  }

  const total = items.reduce((a, i) => a + i.product_price * i.quantity, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) { setError("Selecione um cliente."); return; }
    if (!dataDevolucao) { setError("Informe a data de devolução."); return; }
    if (items.length === 0) { setError("Adicione pelo menos uma peça."); return; }

    for (const item of items) {
      const prod = products.find((p) => p.id === item.product_id);
      if (prod && prod.qty < item.quantity) {
        setError(`Estoque insuficiente para "${prod.name}" (disponível: ${prod.qty}).`);
        return;
      }
    }

    setError("");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const condicionalId = uid();

    const { error: cErr } = await supabase.from("condicionais").insert({
      id: condicionalId,
      user_id: user.id,
      customer_id: customerId,
      status: "ativo",
      data_saida: dataSaida,
      data_devolucao: dataDevolucao,
      notes,
    });

    if (cErr) { setError(cErr.message); setLoading(false); return; }

    const { error: iErr } = await supabase.from("condicional_items").insert(
      items.map((i) => ({
        id: uid(),
        condicional_id: condicionalId,
        product_id: i.product_id,
        product_name: i.product_name,
        product_price: i.product_price,
        product_cost: i.product_cost,
        quantity: i.quantity,
      }))
    );

    if (iErr) { setError(iErr.message); setLoading(false); return; }

    for (const item of items) {
      const prod = products.find((p) => p.id === item.product_id);
      if (prod) {
        await supabase.from("products")
          .update({ qty: prod.qty - item.quantity })
          .eq("id", item.product_id);
      }
    }

    setLoading(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-xl bg-card border border-rim shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-rim">
          <h2 className="text-base font-semibold text-ink">Novo condicional</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-ink-2 hover:text-white" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-ink-2">Cliente *</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink"
            >
              <option value="">Selecione um cliente...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.vip ? "★ " : ""}{c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-ink-2">Data de saída</label>
              <input
                type="date"
                value={dataSaida}
                onChange={(e) => setDataSaida(e.target.value)}
                className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-ink-2">Devolver até *</label>
              <input
                type="date"
                value={dataDevolucao}
                onChange={(e) => setDataDevolucao(e.target.value)}
                className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-ink-2">Adicionar peça</label>
            <select
              defaultValue=""
              onChange={(e) => { addItem(e.target.value); e.target.value = ""; }}
              className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink"
            >
              <option value="" disabled>Selecione uma peça...</option>
              {products.filter((p) => p.qty > 0).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {fmtBRL(p.price)} (estoque: {p.qty})
                </option>
              ))}
            </select>
          </div>

          {items.length > 0 && (
            <div className="rounded-lg border border-rim divide-y divide-rim">
              {items.map((item) => (
                <div key={item.key} className="flex items-center justify-between px-3 py-2 gap-2">
                  <span className="text-sm text-ink flex-1">{item.product_name}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateQty(item.key, Number(e.target.value))}
                      className="w-14 rounded border border-rim-2 bg-card-hover px-2 py-1 text-sm text-center text-ink"
                    />
                    <span className="text-xs text-ink-2 w-20 text-right">
                      {fmtBRL(item.product_price * item.quantity)}
                    </span>
                    <button type="button" onClick={() => removeItem(item.key)}>
                      <Trash2 className="h-4 w-4 text-ink-3 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-ink-2">Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Opcional..."
              className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink resize-none"
            />
          </div>

          {items.length > 0 && (
            <div className="rounded-lg bg-surface border border-rim px-4 py-3 flex justify-between text-sm">
              <span className="text-ink-2">Total das peças</span>
              <span className="font-semibold text-ink">{fmtBRL(total)}</span>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-white py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            {loading ? "Salvando..." : "Criar condicional"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Finalize Modal ───────────────────────────────────────────────────────────

function FinalizeModal({
  condicional,
  onClose,
  onFinalized,
}: {
  condicional: Condicional;
  onClose: () => void;
  onFinalized: () => void;
}) {
  const items = condicional.items ?? [];

  const [payment, setPayment] = useState(PAYMENT_METHODS[0]);
  const [date, setDate] = useState(todayISO());
  const [qtdVendida, setQtdVendida] = useState<Record<string, number>>(
    Object.fromEntries(items.map((i) => [i.id, 0]))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setVendida(itemId: string, val: number) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const clamped = Math.max(0, Math.min(item.quantity, val));
    setQtdVendida((prev) => ({ ...prev, [itemId]: clamped }));
  }

  const soldItems = items.filter((i) => (qtdVendida[i.id] ?? 0) > 0);
  const totalVendido = soldItems.reduce((a, i) => a + i.product_price * (qtdVendida[i.id] ?? 0), 0);
  const hasAnySold = soldItems.length > 0;

  async function handleConfirm() {
    setError("");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Restore stock for returned items
    for (const item of items) {
      const qtdDev = item.quantity - (qtdVendida[item.id] ?? 0);
      if (qtdDev > 0 && item.product_id) {
        const { data: prod } = await supabase
          .from("products").select("qty").eq("id", item.product_id).single();
        if (prod) {
          await supabase.from("products")
            .update({ qty: prod.qty + qtdDev })
            .eq("id", item.product_id);
        }
      }
    }

    // Create sale for purchased items
    if (hasAnySold) {
      const subtotal = soldItems.reduce((a, i) => a + i.product_price * (qtdVendida[i.id] ?? 0), 0);
      const profit = soldItems.reduce(
        (a, i) => a + (i.product_price - i.product_cost) * (qtdVendida[i.id] ?? 0), 0
      );

      const saleId = uid();
      const { error: saleErr } = await supabase.from("sales").insert({
        id: saleId,
        user_id: user.id,
        customer_id: condicional.customer_id,
        payment_method: payment,
        date,
        subtotal,
        discount_type: "R$",
        discount_value: 0,
        total: subtotal,
        profit,
        refunded: false,
      });

      if (saleErr) { setError(saleErr.message); setLoading(false); return; }

      const { error: itemsErr } = await supabase.from("sale_items").insert(
        soldItems.map((i) => ({
          sale_id: saleId,
          product_id: i.product_id,
          name: i.product_name,
          price: i.product_price,
          quantity: qtdVendida[i.id] ?? 0,
        }))
      );

      if (itemsErr) { setError(itemsErr.message); setLoading(false); return; }
    }

    const { error: cErr } = await supabase
      .from("condicionais").update({ status: "finalizado" }).eq("id", condicional.id);

    if (cErr) { setError(cErr.message); setLoading(false); return; }

    setLoading(false);
    onFinalized();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-xl bg-card border border-rim shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-rim">
          <div>
            <h2 className="text-base font-semibold text-ink">Finalizar condicional</h2>
            <p className="text-xs text-ink-3">{condicional.customer_name}</p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-ink-2 hover:text-white" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-ink-2">Forma de pagamento</label>
              <select
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink"
              >
                {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-ink-2">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-rim-2 bg-card-hover px-3 py-2 text-sm text-ink"
              />
            </div>
          </div>

          <div>
            <p className="text-xs text-ink-2 mb-2">
              Informe quantas peças o cliente <span className="font-semibold text-ink">comprou</span> — o restante volta automaticamente ao estoque.
            </p>
            <div className="rounded-lg border border-rim overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-card/50 border-b border-rim">
                    <th className="px-3 py-2 text-left text-xs text-ink-2 font-medium">Peça</th>
                    <th className="px-3 py-2 text-center text-xs text-ink-2 font-medium">Saiu</th>
                    <th className="px-3 py-2 text-center text-xs text-ink-2 font-medium">Comprou</th>
                    <th className="px-3 py-2 text-center text-xs text-ink-2 font-medium">Devolve</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rim">
                  {items.map((item) => {
                    const vendida = qtdVendida[item.id] ?? 0;
                    const devolvida = item.quantity - vendida;
                    return (
                      <tr key={item.id} className="bg-card">
                        <td className="px-3 py-2 text-ink">
                          <div>{item.product_name}</div>
                          <div className="text-xs text-ink-3">{fmtBRL(item.product_price)} /un</div>
                        </td>
                        <td className="px-3 py-2 text-center text-ink-2">{item.quantity}</td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min={0}
                            max={item.quantity}
                            value={vendida}
                            onChange={(e) => setVendida(item.id, Number(e.target.value))}
                            className="w-16 rounded border border-rim-2 bg-card-hover px-2 py-1 text-sm text-center text-ink"
                          />
                        </td>
                        <td className={`px-3 py-2 text-center font-medium ${devolvida > 0 ? "text-amber-500" : "text-ink-3"}`}>
                          {devolvida}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg bg-surface border border-rim px-4 py-3 text-sm">
            {hasAnySold ? (
              <div className="flex justify-between font-bold text-base text-ink">
                <span>Total vendido</span>
                <span>{fmtBRL(totalVendido)}</span>
              </div>
            ) : (
              <p className="text-center text-ink-3">Nenhuma peça comprada — todas voltarão ao estoque</p>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full rounded-md bg-white py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            {loading ? "Processando..." : "Confirmar finalização"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CondicionalPage() {
  const [condicionais, setCondicionais] = useState<Condicional[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [finalizing, setFinalizing] = useState<Condicional | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: condData }, { data: itemsData }, { data: prodsData }, { data: custsData }] =
      await Promise.all([
        supabase
          .from("condicionais")
          .select("*, customers(name)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("condicional_items").select("*"),
        supabase.from("products").select("id, name, price, cost, qty").eq("user_id", user.id),
        supabase.from("customers").select("id, name, vip").eq("user_id", user.id),
      ]);

    const enriched = (condData ?? []).map((c: any) => ({
      ...c,
      customer_name: c.customers?.name ?? "-",
      items: (itemsData ?? []).filter((i: any) => i.condicional_id === c.id),
    }));

    setCondicionais(enriched);
    setProducts((prodsData ?? []) as Product[]);
    setCustomers(custsData ?? []);
    setLoading(false);
  }

  async function handleCancel(c: Condicional) {
    if (!confirm(`Cancelar condicional de ${c.customer_name}? Todas as peças voltarão ao estoque.`)) return;

    for (const item of c.items ?? []) {
      if (!item.product_id) continue;
      const { data: prod } = await supabase
        .from("products").select("qty").eq("id", item.product_id).single();
      if (prod) {
        await supabase.from("products")
          .update({ qty: prod.qty + item.quantity })
          .eq("id", item.product_id);
      }
    }

    await supabase.from("condicionais").update({ status: "cancelado" }).eq("id", c.id);
    await loadAll();
  }

  const today = todayISO();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Condicional</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors"
        >
          <Plus className="h-4 w-4" /> Novo condicional
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-ink-3">Carregando...</p>
      ) : condicionais.length === 0 ? (
        <Empty message="Nenhum condicional registrado." />
      ) : (
        <div className="rounded-xl border border-rim overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rim bg-card/50">
                <th className="px-4 py-3 text-left text-xs text-ink-2 font-medium">Cliente</th>
                <th className="px-4 py-3 text-left text-xs text-ink-2 font-medium">Saída</th>
                <th className="px-4 py-3 text-left text-xs text-ink-2 font-medium">Devolver até</th>
                <th className="px-4 py-3 text-left text-xs text-ink-2 font-medium">Peças</th>
                <th className="px-4 py-3 text-right text-xs text-ink-2 font-medium">Total</th>
                <th className="px-4 py-3 text-center text-xs text-ink-2 font-medium">Status</th>
                <th className="px-4 py-3 text-right text-xs text-ink-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rim">
              {condicionais.map((c) => {
                const qtdPecas = (c.items ?? []).reduce((a, i) => a + i.quantity, 0);
                const totalVal = (c.items ?? []).reduce((a, i) => a + i.product_price * i.quantity, 0);
                const atrasado = c.status === "ativo" && c.data_devolucao < today;
                return (
                  <tr key={c.id} className="bg-card hover:bg-card-hover/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-ink">{c.customer_name}</td>
                    <td className="px-4 py-3 text-ink-2">{fmtDate(c.data_saida)}</td>
                    <td className={`px-4 py-3 font-medium ${atrasado ? "text-red-400" : "text-ink-2"}`}>
                      {fmtDate(c.data_devolucao)}
                      {atrasado && <span className="ml-1 text-xs font-normal">(atrasado)</span>}
                    </td>
                    <td className="px-4 py-3 text-ink-2">
                      {qtdPecas} {qtdPecas === 1 ? "peça" : "peças"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-ink">{fmtBRL(totalVal)}</td>
                    <td className="px-4 py-3 text-center">
                      <CondicionalBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.status === "ativo" && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setFinalizing(c)}
                            className="rounded px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 transition-colors"
                          >
                            Finalizar
                          </button>
                          <button
                            onClick={() => handleCancel(c)}
                            className="rounded px-2 py-1 text-xs text-ink-3 hover:text-red-400 hover:bg-card-hover transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateModal
          products={products}
          customers={customers}
          onClose={() => setShowCreate(false)}
          onSaved={async () => { setShowCreate(false); await loadAll(); }}
        />
      )}

      {finalizing && (
        <FinalizeModal
          condicional={finalizing}
          onClose={() => setFinalizing(null)}
          onFinalized={async () => { setFinalizing(null); await loadAll(); }}
        />
      )}
    </div>
  );
}
