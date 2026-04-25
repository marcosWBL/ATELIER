"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Star, Package, Users, ShoppingBag } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fmtBRL, fmtDate } from "@/lib/utils";

type Insight = { type: "tip" | "alert" | "good"; title: string; body: string };

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [productRanking, setProductRanking] = useState<{ name: string; qty: number; revenue: number }[]>([]);
  const [customerRanking, setCustomerRanking] = useState<{ name: string; total: number; orders: number; vip: boolean }[]>([]);
  const [lowStock, setLowStock] = useState<{ name: string; qty: number }[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<{ method: string; count: number; total: number }[]>([]);
  const [salesByDay, setSalesByDay] = useState<{ day: string; total: number; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const [
      { data: sales },
      { data: saleItems },
      { data: products },
      { data: customers },
      { data: expenses },
    ] = await Promise.all([
      supabase.from("sales").select("*").eq("user_id", user.id),
      supabase.from("sale_items").select("*"),
      supabase.from("products").select("*").eq("user_id", user.id),
      supabase.from("customers").select("*").eq("user_id", user.id),
      supabase.from("expenses").select("*").eq("user_id", user.id),
    ]);

    const allSales = sales ?? [];
    const allItems = saleItems ?? [];
    const allProducts = products ?? [];
    const allCustomers = customers ?? [];

    // Product ranking with revenue
    const prodMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    allItems.forEach((item: any) => {
      const prod = allProducts.find((p) => p.id === item.product_id);
      const name = prod?.name ?? item.name ?? "Produto";
      if (!prodMap[name]) prodMap[name] = { name, qty: 0, revenue: 0 };
      prodMap[name].qty += item.quantity ?? 1;
      prodMap[name].revenue += (item.price ?? 0) * (item.quantity ?? 1);
    });
    const sortedProducts = Object.values(prodMap).sort((a, b) => b.qty - a.qty);
    setProductRanking(sortedProducts);

    // Customer ranking
    const custMap: Record<string, { name: string; total: number; orders: number; vip: boolean }> = {};
    allSales.forEach((s) => {
      if (!s.customer_id) return;
      const cust = allCustomers.find((c) => c.id === s.customer_id);
      const name = cust?.name ?? "Cliente";
      if (!custMap[s.customer_id]) custMap[s.customer_id] = { name, total: 0, orders: 0, vip: cust?.vip ?? false };
      custMap[s.customer_id].total += s.total ?? 0;
      custMap[s.customer_id].orders += 1;
    });
    const sortedCustomers = Object.values(custMap).sort((a, b) => b.total - a.total);
    setCustomerRanking(sortedCustomers);

    // Low stock
    setLowStock(allProducts.filter((p) => p.qty <= 3).sort((a, b) => a.qty - b.qty).map((p) => ({ name: p.name, qty: p.qty })));

    // Payment breakdown
    const pmMap: Record<string, { count: number; total: number }> = {};
    allSales.forEach((s) => {
      const m = s.payment_method ?? "Outros";
      if (!pmMap[m]) pmMap[m] = { count: 0, total: 0 };
      pmMap[m].count += 1;
      pmMap[m].total += s.total ?? 0;
    });
    setPaymentBreakdown(
      Object.entries(pmMap).map(([method, v]) => ({ method, ...v })).sort((a, b) => b.total - a.total)
    );

    // Sales by day of week
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const dayMap: Record<number, { total: number; count: number }> = {};
    allSales.forEach((s) => {
      const d = new Date(s.created_at ?? s.date).getDay();
      if (!dayMap[d]) dayMap[d] = { total: 0, count: 0 };
      dayMap[d].total += s.total ?? 0;
      dayMap[d].count += 1;
    });
    setSalesByDay(days.map((day, i) => ({ day, total: dayMap[i]?.total ?? 0, count: dayMap[i]?.count ?? 0 })));

    // Generate insights
    const generated: Insight[] = [];

    const curRevenue = allSales.filter((s) => s.date >= monthStart).reduce((a, s) => a + (s.total ?? 0), 0);
    const curExpenses = (expenses ?? []).filter((e) => e.date >= monthStart).reduce((a, e) => a + (e.amount ?? 0), 0);
    const ratio = curExpenses > 0 ? curRevenue / curExpenses : 0;

    if (ratio > 0 && ratio < 1.5) generated.push({ type: "alert", title: "Margem apertada", body: `Suas despesas representam ${((curExpenses / (curRevenue || 1)) * 100).toFixed(0)}% da receita este mês. Considere revisar custos fixos ou aumentar o volume de vendas.` });
    if (ratio >= 2) generated.push({ type: "good", title: "Boa saúde financeira", body: `Receita ${ratio.toFixed(1)}x maior que despesas neste mês. Ótimo momento para investir em estoque ou marketing.` });

    if (lowStock.length > 0) generated.push({ type: "alert", title: `${lowStock.length} produto(s) com estoque crítico`, body: `${lowStock.slice(0, 3).map((p) => `${p.name} (${p.qty} un.)`).join(", ")} — reabasteça antes de fazer campanhas.` });

    if (sortedProducts.length > 0) {
      const top = sortedProducts[0];
      generated.push({ type: "tip", title: `Capitalize no campeão de vendas`, body: `"${top.name}" é seu produto mais vendido. Destaque-o nas redes sociais, crie combos com ele ou ofereça variações para aumentar o ticket médio.` });
    }

    if (sortedProducts.length > 1) {
      const last = sortedProducts[sortedProducts.length - 1];
      generated.push({ type: "tip", title: `Produto parado: "${last.name}"`, body: `Considere fazer uma promoção relâmpago, incluir em kit com produto popular ou revisar o preço para girar o estoque.` });
    }

    const vipCustomers = sortedCustomers.filter((c) => c.vip);
    if (vipCustomers.length > 0) generated.push({ type: "tip", title: "Fidelize seus VIPs", body: `Você tem ${vipCustomers.length} cliente(s) VIP. Envie ofertas exclusivas, avise primeiro sobre novidades e ofereça brindes — clientes VIP gastam em média 3x mais.` });

    const birthMonth = String(now.getMonth() + 1).padStart(2, "0");
    const birthdayCustomers = allCustomers.filter((c) => c.birthday?.slice(5, 7) === birthMonth);
    if (birthdayCustomers.length > 0) generated.push({ type: "tip", title: `${birthdayCustomers.length} aniversariante(s) este mês`, body: `Surpreenda: ${birthdayCustomers.map((c) => c.name).join(", ")}. Um desconto personalizado ou brinde pode gerar uma venda e fortalecer o relacionamento.` });

    const bestDay = [...salesByDay].sort((a, b) => b.total - a.total)[0];
    if (bestDay?.count > 0) generated.push({ type: "tip", title: `Seu melhor dia é ${bestDay.day}`, body: `Concentre lançamentos, stories e promoções às ${bestDay.day === "Sáb" || bestDay.day === "Dom" ? "fins de semana" : bestDay.day + "eiras"} para aproveitar o pico de atenção das suas clientes.` });

    const pixSales = allSales.filter((s) => s.payment_method === "Pix");
    if (pixSales.length > allSales.length * 0.5 && allSales.length > 0) generated.push({ type: "good", title: "Pix dominante", body: `Mais de 50% das suas vendas são no Pix — sem taxa e liquidez imediata. Continue incentivando e considere oferecer desconto exclusivo para pagamento via Pix.` });

    const noCustomerSales = allSales.filter((s) => !s.customer_id).length;
    if (noCustomerSales > allSales.length * 0.4 && allSales.length > 5) generated.push({ type: "tip", title: "Cadastre mais clientes", body: `${noCustomerSales} vendas sem cliente associado. Cada cliente cadastrado permite acompanhar histórico, aniversário e preferências — dado valioso para vender mais.` });

    setInsights(generated);
    setLoading(false);
  }

  const iconMap = { tip: <Lightbulb className="h-4 w-4" />, alert: <AlertTriangle className="h-4 w-4" />, good: <TrendingUp className="h-4 w-4" /> };
  const colorMap = { tip: "border-blue-800/50 bg-blue-950/20 text-blue-300", alert: "border-amber-800/50 bg-amber-950/20 text-amber-300", good: "border-emerald-800/50 bg-emerald-950/20 text-emerald-300" };
  const maxDay = Math.max(...salesByDay.map((d) => d.total), 1);

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white">Insights</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Análise do seu negócio com recomendações personalizadas.</p>
      </div>

      {loading ? <p className="text-sm text-zinc-500">Analisando dados...</p> : (
        <>
          {/* Insights cards */}
          {insights.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-zinc-400">Recomendações</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {insights.map((ins, i) => (
                  <div key={i} className={`rounded-xl border p-4 space-y-1.5 ${colorMap[ins.type]}`}>
                    <div className="flex items-center gap-2 font-medium text-sm">
                      {iconMap[ins.type]}
                      {ins.title}
                    </div>
                    <p className="text-xs opacity-80 leading-relaxed">{ins.body}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Vendas por dia da semana */}
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-zinc-400">Vendas por dia da semana</h2>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-end gap-2 h-28">
                {salesByDay.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-zinc-500">{d.count > 0 ? d.count : ""}</span>
                    <div className="w-full rounded-t bg-zinc-700 transition-all" style={{ height: `${(d.total / maxDay) * 80}px`, minHeight: d.total > 0 ? 4 : 0, backgroundColor: d.total === Math.max(...salesByDay.map((x) => x.total)) ? "#10b981" : undefined }} />
                    <span className="text-[10px] text-zinc-500">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pagamentos */}
          {paymentBreakdown.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-zinc-400">Formas de pagamento</h2>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800 overflow-hidden">
                {paymentBreakdown.map((pm) => (
                  <div key={pm.method} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-3.5 w-3.5 text-zinc-500" />
                      <span className="text-zinc-300">{pm.method}</span>
                      <span className="text-zinc-600 text-xs">{pm.count} venda(s)</span>
                    </div>
                    <span className="font-medium text-white">{fmtBRL(pm.total)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Estoque crítico */}
          {lowStock.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-zinc-400 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-400" /> Estoque crítico (≤ 3 un.)</h2>
              <div className="rounded-xl border border-amber-800/30 bg-amber-950/10 divide-y divide-zinc-800 overflow-hidden">
                {lowStock.map((p) => (
                  <div key={p.name} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-zinc-300">{p.name}</span>
                    </div>
                    <span className={`font-medium ${p.qty === 0 ? "text-red-400" : "text-amber-400"}`}>{p.qty} un.</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Produto ranking */}
          {productRanking.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-zinc-400">Todos os produtos — ranking de vendas</h2>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800 overflow-hidden">
                {productRanking.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-600 w-5 text-right">{i + 1}</span>
                      <span className="text-zinc-300">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-zinc-500 text-xs">{p.qty} un.</span>
                      <span className="font-medium text-white">{fmtBRL(p.revenue)}</span>
                      {i === 0 && <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
                      {i === productRanking.length - 1 && productRanking.length > 1 && <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Customer ranking */}
          {customerRanking.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-zinc-400">Todos os clientes — ranking por valor</h2>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800 overflow-hidden">
                {customerRanking.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-600 w-5 text-right">{i + 1}</span>
                      <Users className="h-3.5 w-3.5 text-zinc-500" />
                      <span className="text-zinc-300">
                        {c.vip && <Star className="inline h-3 w-3 text-amber-400 mr-1" />}
                        {c.name}
                      </span>
                      <span className="text-zinc-600 text-xs">{c.orders} pedido(s)</span>
                    </div>
                    <span className="font-medium text-white">{fmtBRL(c.total)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
