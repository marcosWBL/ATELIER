"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Printer, X, Star, Trash2, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fmtBRL, todayISO, uid } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import Empty from "@/components/Empty";

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = { id: string; name: string; price: number; cost: number; qty: number };
type Customer = { id: string; name: string; vip: boolean };
type SaleItem = { key: string; product_id: string; name: string; price: number; quantity: number };
type Sale = {
  id: string;
  created_at: string;
  date: string;
  customer_id: string | null;
  customer_name?: string;
  payment_method: string;
  subtotal: number;
  discount_type: "R$" | "%";
  discount_value: number;
  total: number;
  refunded: boolean;
  items?: SaleItem[];
};

const PAYMENT_METHODS = ["Dinheiro", "Pix", "Cartão de crédito", "Cartão de débito", "Fiado"];

// ─── Coupon Modal ─────────────────────────────────────────────────────────────

function CouponModal({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const content = ref.current?.innerHTML ?? "";
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return;
    win.document.write(`
      <html><head><title>Cupom</title>
      <style>
        body { font-family: monospace; font-size: 13px; padding: 16px; color: #000; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
      </style></head><body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white text-black shadow-2xl">
        <div ref={ref} className="p-6 font-mono text-sm space-y-1">
          <p className="center bold text-center text-base">ATELIER</p>
          <p className="text-center text-xs text-stone-500">{sale.date}</p>
          <div className="border-t border-dashed border-stone-300 my-2" />
          {sale.items?.map((item) => (
            <div key={item.key} className="flex justify-between">
              <span>{item.quantity}x {item.name}</span>
              <span>{fmtBRL(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-dashed border-stone-300 my-2" />
          <div className="flex justify-between text-xs text-stone-500">
            <span>Subtotal</span><span>{fmtBRL(sale.subtotal)}</span>
          </div>
          {sale.discount_value > 0 && (
            <div className="flex justify-between text-xs text-stone-500">
              <span>Desconto</span>
              <span>
                -{sale.discount_type === "%" ? `${sale.discount_value}%` : fmtBRL(sale.discount_value)}
              </span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base mt-1">
            <span>TOTAL</span><span>{fmtBRL(sale.total)}</span>
          </div>
          <div className="border-t border-dashed border-stone-300 my-2" />
          <p className="text-center text-xs text-stone-500">{sale.payment_method}</p>
          <p className="text-center text-xs text-stone-400">Obrigado pela preferência!</p>
        </div>
        <div className="flex gap-2 px-6 pb-5">
          <button onClick={handlePrint} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-700">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          <button onClick={onClose} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
            <X className="h-4 w-4" /> Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sale Form Modal ───────────────────────────────────────────────────────────

function SaleFormModal({
  products,
  customers,
  onClose,
  onSaved,
}: {
  products: Product[];
  customers: Customer[];
  onClose: () => void;
  onSaved: (sale: Sale) => void;
}) {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [payment, setPayment] = useState(PAYMENT_METHODS[0]);
  const [date, setDate] = useState(todayISO());
  const [discountType, setDiscountType] = useState<"R$" | "%">("R$");
  const [discountValue, setDiscountValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addItem(productId: string) {
    if (!productId) return;
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const existing = items.find((i) => i.product_id === productId);
    if (existing) {
      setItems(items.map((i) => i.product_id === productId ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, { key: uid(), product_id: prod.id, name: prod.name, price: prod.price, quantity: 1 }]);
    }
  }

  function updateQty(key: string, qty: number) {
    if (qty < 1) return removeItem(key);
    setItems(items.map((i) => i.key === key ? { ...i, quantity: qty } : i));
  }

  function removeItem(key: string) {
    setItems(items.filter((i) => i.key !== key));
  }

  const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);
  const discountAmt = discountType === "%" ? subtotal * (discountValue / 100) : discountValue;
  const total = Math.max(0, subtotal - discountAmt);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) { setError("Adicione pelo menos um item."); return; }
    setError("");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const saleId = uid();

    const profit = items.reduce((a, item) => {
      const prod = products.find((p) => p.id === item.product_id);
      const cost = prod?.cost ?? 0;
      return a + (item.price - cost) * item.quantity;
    }, 0);

    const { error: saleErr } = await supabase.from("sales").insert({
      id: saleId,
      user_id: user.id,
      customer_id: customerId || null,
      payment_method: payment,
      date,
      subtotal,
      discount_type: discountType,
      discount_value: discountValue,
      total,
      profit,
      refunded: false,
    });

    if (saleErr) { setError(saleErr.message); setLoading(false); return; }

    const { error: itemsErr } = await supabase.from("sale_items").insert(
      items.map((i) => ({
        sale_id: saleId,
        product_id: i.product_id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      }))
    );

    if (itemsErr) { setError(itemsErr.message); setLoading(false); return; }

    // Decrement stock
    for (const item of items) {
      const prod = products.find((p) => p.id === item.product_id);
      if (prod) {
        await supabase.from("products").update({ qty: Math.max(0, prod.qty - item.quantity) }).eq("id", item.product_id);
      }
    }

    const customerName = customers.find((c) => c.id === customerId)?.name ?? "-";
    const newSale: Sale = {
      id: saleId,
      created_at: new Date().toISOString(),
      date,
      customer_id: customerId || null,
      customer_name: customerName,
      payment_method: payment,
      subtotal,
      discount_type: discountType,
      discount_value: discountValue,
      total,
      refunded: false,
      items,
    };

    setLoading(false);
    onSaved(newSale);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-base font-semibold text-foreground">Nova venda</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-zinc-400 hover:text-white" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Customer */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Cliente</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-foreground"
            >
              <option value="">Sem cliente</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.vip ? "★ " : ""}{c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Pagamento</label>
              <select
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-foreground"
              >
                {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-foreground"
              />
            </div>
          </div>

          {/* Add product */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Adicionar produto</label>
            <select
              defaultValue=""
              onChange={(e) => { addItem(e.target.value); e.target.value = ""; }}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-foreground"
            >
              <option value="" disabled>Selecione um produto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {fmtBRL(p.price)} (estoque: {p.qty})
                </option>
              ))}
            </select>
          </div>

          {/* Items list */}
          {items.length > 0 && (
            <div className="rounded-lg border border-zinc-800 divide-y divide-zinc-800">
              {items.map((item) => (
                <div key={item.key} className="flex items-center justify-between px-3 py-2 gap-2">
                  <span className="text-sm text-zinc-200 flex-1">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateQty(item.key, Number(e.target.value))}
                      className="w-14 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-center text-foreground"
                    />
                    <span className="text-xs text-zinc-400 w-20 text-right">{fmtBRL(item.price * item.quantity)}</span>
                    <button type="button" onClick={() => removeItem(item.key)}>
                      <Trash2 className="h-4 w-4 text-zinc-500 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Discount */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Desconto</label>
            <div className="flex gap-2">
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "R$" | "%")}
                className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-foreground"
              >
                <option>R$</option>
                <option>%</option>
              </select>
              <input
                type="number"
                min={0}
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-foreground"
                placeholder="0"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span><span>{fmtBRL(subtotal)}</span>
            </div>
            {discountValue > 0 && (
              <div className="flex justify-between text-zinc-400">
                <span>Desconto</span>
                <span className="text-red-400">-{discountType === "%" ? `${discountValue}%` : fmtBRL(discountAmt)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base text-foreground border-t border-zinc-800 pt-1.5">
              <span>Total</span><span>{fmtBRL(total)}</span>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-white py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            {loading ? "Registrando..." : "Registrar venda"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [couponSale, setCouponSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: salesData }, { data: itemsData }, { data: prodsData }, { data: custsData }] =
      await Promise.all([
        supabase.from("sales").select("*, customers(name)").eq("user_id", user.id).order("date", { ascending: false }),
        supabase.from("sale_items").select("*"),
        supabase.from("products").select("id, name, price, cost, qty").eq("user_id", user.id),
        supabase.from("customers").select("id, name, vip").eq("user_id", user.id),
      ]);

    const enriched = (salesData ?? []).map((s: any) => ({
      ...s,
      customer_name: s.customers?.name ?? "-",
      items: (itemsData ?? []).filter((i: any) => i.sale_id === s.id).map((i: any) => ({ ...i, key: i.id })),
    }));

    setSales(enriched);
    setProducts((prodsData ?? []) as Product[]);
    setCustomers(custsData ?? []);
    setLoading(false);
  }

  async function handleRefund(sale: Sale) {
    if (!confirm(`Confirmar devolução da venda #${sale.id.slice(-6)}?`)) return;

    await supabase.from("sales").update({ refunded: true }).eq("id", sale.id);

    for (const item of sale.items ?? []) {
      const prod = products.find((p) => p.id === item.product_id);
      if (prod) {
        await supabase.from("products").update({ qty: prod.qty + item.quantity }).eq("id", item.product_id);
      }
    }

    setSales((prev) => prev.map((s) => s.id === sale.id ? { ...s, refunded: true } : s));
    setProducts((prev) =>
      prev.map((p) => {
        const item = sale.items?.find((i) => i.product_id === p.id);
        return item ? { ...p, qty: p.qty + item.quantity } : p;
      })
    );
  }

  function exportCSV() {
    const header = ["ID", "Data", "Cliente", "Pagamento", "Subtotal", "Desconto", "Total", "Devolvida"];
    const rows = sales.map((s) => [
      s.id,
      s.date,
      s.customer_name ?? "-",
      s.payment_method,
      s.subtotal.toFixed(2),
      s.discount_value,
      s.total.toFixed(2),
      s.refunded ? "Sim" : "Não",
    ]);
    const csv = [header, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendas_${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onSaleCreated(sale: Sale) {
    setSales((prev) => [sale, ...prev]);
    setShowForm(false);
    setCouponSale(sale);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Vendas</h1>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nova venda
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : sales.length === 0 ? (
        <Empty message="Nenhuma venda registrada." />
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="px-4 py-3 text-left text-xs text-zinc-400 font-medium">Data</th>
                <th className="px-4 py-3 text-left text-xs text-zinc-400 font-medium">Cliente</th>
                <th className="px-4 py-3 text-left text-xs text-zinc-400 font-medium">Pagamento</th>
                <th className="px-4 py-3 text-right text-xs text-zinc-400 font-medium">Total</th>
                <th className="px-4 py-3 text-center text-xs text-zinc-400 font-medium">Status</th>
                <th className="px-4 py-3 text-right text-xs text-zinc-400 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {sales.map((sale) => (
                <tr key={sale.id} className="bg-zinc-900 hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3 text-zinc-300">{sale.date}</td>
                  <td className="px-4 py-3 text-zinc-300">
                    {customers.find((c) => c.id === sale.customer_id)?.vip && (
                      <Star className="inline h-3 w-3 text-amber-400 mr-1" />
                    )}
                    {sale.customer_name}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{sale.payment_method}</td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">{fmtBRL(sale.total)}</td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={sale.refunded ? "devolvido" : "pago"} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setCouponSale(sale)}
                        className="rounded px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                      {!sale.refunded && (
                        <button
                          onClick={() => handleRefund(sale)}
                          className="rounded px-2 py-1 text-xs text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors"
                        >
                          Devolver
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <SaleFormModal
          products={products}
          customers={customers}
          onClose={() => setShowForm(false)}
          onSaved={onSaleCreated}
        />
      )}

      {couponSale && (
        <CouponModal sale={couponSale} onClose={() => setCouponSale(null)} />
      )}
    </div>
  );
}
