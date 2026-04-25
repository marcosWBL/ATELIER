"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { Cake, AlertCircle, Clock, TrendingUp, TrendingDown, Target, Pencil, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fmtBRL, fmtDate, todayISO } from "@/lib/utils";

type KPI = { label: string; value: string; sub?: string; trend?: "up" | "down" | null };

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [birthdays, setBirthdays] = useState<{ name: string }[]>([]);
  const [overdueBills, setOverdueBills] = useState<{ description: string }[]>([]);
  const [soonBills, setSoonBills] = useState<{ description: string }[]>([]);
  const [lineData, setLineData] = useState<{ day: string; total: number }[]>([]);
  const [pieData, setPieData] = useState<{ name: string; value: number }[]>([]);
  const [productRanking, setProductRanking] = useState<{ name: string; qty: number }[]>([]);
  const [customerRanking, setCustomerRanking] = useState<{ name: string; total: number }[]>([]);
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [currentRevenue, setCurrentRevenue] = useState(0);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("0");
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const today = todayISO();
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
    const in3days = new Date(now.getTime() + 3 * 86400000).toISOString().slice(0, 10);
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

    const [
      { data: sales },
      { data: saleItems },
      { data: products },
      { data: customers },
      { data: expenses },
      { data: bills },
      { data: profile },
    ] = await Promise.all([
      supabase.from("sales").select("*").eq("user_id", user.id),
      supabase.from("sale_items").select("*"),
      supabase.from("products").select("*").eq("user_id", user.id),
      supabase.from("customers").select("*").eq("user_id", user.id),
      supabase.from("expenses").select("*").eq("user_id", user.id),
      supabase.from("bills").select("*").eq("user_id", user.id),
      supabase.from("profiles").select("monthly_goal").eq("id", user.id).single(),
    ]);

    const goal = profile?.monthly_goal ?? 0;
    setMonthlyGoal(goal);
    setGoalInput(String(goal));

    const curSales = (sales ?? []).filter((s) => s.created_at >= monthStart);
    const prevSales = (sales ?? []).filter((s) => s.created_at >= prevMonthStart && s.created_at <= prevMonthEnd);

    const curRevenue = curSales.reduce((a, s) => a + (s.total ?? 0), 0);
    const prevRevenue = prevSales.reduce((a, s) => a + (s.total ?? 0), 0);

    const curExpenses = (expenses ?? []).filter((e) => e.date >= monthStart).reduce((a, e) => a + (e.amount ?? 0), 0);
    const prevExpenses = (expenses ?? []).filter((e) => e.date >= prevMonthStart && e.date <= prevMonthEnd).reduce((a, e) => a + (e.amount ?? 0), 0);

    const curProfit = curRevenue - curExpenses;
    const prevProfit = prevRevenue - prevExpenses;
    const avgTicket = curSales.length > 0 ? curRevenue / curSales.length : 0;
    const prevAvgTicket = prevSales.length > 0 ? prevRevenue / prevSales.length : 0;
    const totalStock = (products ?? []).reduce((a, p) => a + (p.qty ?? 0), 0);
    const growth = prevRevenue > 0 ? ((curRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    setCurrentRevenue(curRevenue);

    setKpis([
      { label: "Receita (mês)", value: fmtBRL(curRevenue), sub: `${curSales.length} pedidos`, trend: curRevenue >= prevRevenue ? "up" : "down" },
      { label: "Lucro (mês)", value: fmtBRL(curProfit), sub: fmtBRL(prevProfit) + " mês ant.", trend: curProfit >= prevProfit ? "up" : "down" },
      { label: "Despesas (mês)", value: fmtBRL(curExpenses), trend: null },
      { label: "Ticket médio", value: fmtBRL(avgTicket), sub: fmtBRL(prevAvgTicket) + " mês ant.", trend: avgTicket >= prevAvgTicket ? "up" : "down" },
      { label: "Clientes", value: String(customers?.length ?? 0), trend: null },
      { label: "Produtos", value: String(products?.length ?? 0), trend: null },
      { label: "Estoque total", value: `${totalStock} un.`, trend: null },
      { label: "Crescimento", value: `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`, trend: growth >= 0 ? "up" : "down" },
    ]);

    setBirthdays((customers ?? []).filter((c) => c.birthday?.slice(5, 7) === currentMonth).map((c) => ({ name: c.name })));
    setOverdueBills((bills ?? []).filter((b) => !b.paid && b.due_date < today).map((b) => ({ description: b.description })));
    setSoonBills((bills ?? []).filter((b) => !b.paid && b.due_date >= today && b.due_date <= in3days).map((b) => ({ description: b.description })));

    // Last 7 days
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getTime() - (6 - i) * 86400000).toISOString().slice(0, 10);
      const total = (sales ?? []).filter((s) => s.created_at?.slice(0, 10) === d).reduce((a, s) => a + (s.total ?? 0), 0);
      return { day: fmtDate(d).slice(0, 5), total };
    });
    setLineData(days);

    setPieData([
      { name: "Receita", value: curRevenue },
      { name: "Despesas", value: curExpenses },
    ]);

    // Full product ranking
    const productQty: Record<string, { name: string; qty: number }> = {};
    (saleItems ?? []).forEach((item: any) => {
      if (!item.product_id) return;
      const prod = (products ?? []).find((p) => p.id === item.product_id);
      const name = prod?.name ?? item.name ?? item.product_id;
      if (!productQty[item.product_id]) productQty[item.product_id] = { name, qty: 0 };
      productQty[item.product_id].qty += item.quantity ?? 1;
    });
    setProductRanking(Object.values(productQty).sort((a, b) => b.qty - a.qty));

    // Full customer ranking
    const customerTotal: Record<string, { name: string; total: number }> = {};
    (sales ?? []).forEach((s) => {
      if (!s.customer_id) return;
      const cust = (customers ?? []).find((c) => c.id === s.customer_id);
      const name = cust?.name ?? s.customer_id;
      if (!customerTotal[s.customer_id]) customerTotal[s.customer_id] = { name, total: 0 };
      customerTotal[s.customer_id].total += s.total ?? 0;
    });
    setCustomerRanking(Object.values(customerTotal).sort((a, b) => b.total - a.total));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveGoal() {
    const val = parseFloat(goalInput) || 0;
    if (!userId) return;
    await supabase.from("profiles").upsert({ id: userId, monthly_goal: val }, { onConflict: "id" });
    setMonthlyGoal(val);
    setGoalInput(String(val));
    setEditingGoal(false);
  }

  const goalPercent = monthlyGoal > 0 ? Math.min((currentRevenue / monthlyGoal) * 100, 100) : 0;
  const PIE_COLORS = ["#10b981", "#ef4444"];

  return (
    <div className="space-y-6 p-6">
      {/* Banners */}
      {birthdays.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-pink-500/10 border border-pink-500/30 px-4 py-3 text-pink-300">
          <Cake className="h-5 w-5 shrink-0" />
          <span className="text-sm">Aniversariantes este mês: <strong>{birthdays.map((b) => b.name).join(", ")}</strong></span>
        </div>
      )}
      {overdueBills.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">{overdueBills.length} conta(s) vencida(s): <strong>{overdueBills.map((b) => b.description).join(", ")}</strong></span>
        </div>
      )}
      {soonBills.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-amber-300">
          <Clock className="h-5 w-5 shrink-0" />
          <span className="text-sm">{soonBills.length} conta(s) vencendo em até 3 dias: <strong>{soonBills.map((b) => b.description).join(", ")}</strong></span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-1">
            <p className="text-xs text-zinc-500">{k.label}</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-white">{k.value}</p>
              {k.trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-400" />}
              {k.trend === "down" && <TrendingDown className="h-4 w-4 text-red-400" />}
            </div>
            {k.sub && <p className="text-xs text-zinc-600">{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* Meta mensal */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-300">Meta mensal</span>
          </div>
          {editingGoal ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">R$</span>
              <input
                type="number"
                min={0}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveGoal()}
                autoFocus
                className="w-32 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
              <button onClick={saveGoal} className="rounded p-1 text-emerald-400 hover:bg-zinc-800">
                <Check className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingGoal(true)} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              <Pencil className="h-3 w-3" />
              {monthlyGoal > 0 ? fmtBRL(monthlyGoal) : "Definir meta"}
            </button>
          )}
        </div>

        {monthlyGoal > 0 ? (
          <>
            <div className="h-2.5 w-full rounded-full bg-zinc-800">
              <div
                className={`h-2.5 rounded-full transition-all ${goalPercent >= 100 ? "bg-emerald-400" : goalPercent >= 70 ? "bg-amber-400" : "bg-zinc-400"}`}
                style={{ width: `${goalPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>{fmtBRL(currentRevenue)} arrecadados</span>
              <span className={goalPercent >= 100 ? "text-emerald-400" : "text-zinc-400"}>{goalPercent.toFixed(1)}% da meta</span>
            </div>
          </>
        ) : (
          <p className="text-xs text-zinc-600">Clique em "Definir meta" para acompanhar seu progresso mensal.</p>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="mb-4 text-sm font-medium text-zinc-300">Vendas — últimos 7 dias</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={lineData}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#71717a" }} />
              <YAxis tick={{ fontSize: 11, fill: "#71717a" }} width={65} tickFormatter={(v) => fmtBRL(v)} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }} />
              <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="mb-4 text-sm font-medium text-zinc-300">Receita vs Despesas (mês)</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % 2]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="mb-3 text-sm font-medium text-zinc-300">Ranking de produtos vendidos</p>
          {productRanking.length === 0 ? (
            <p className="text-sm text-zinc-600 py-4 text-center">Nenhuma venda registrada.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {productRanking.map((p, i) => {
                const max = productRanking[0].qty;
                const pct = (p.qty / max) * 100;
                return (
                  <div key={p.name} className="space-y-0.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400"><span className="text-zinc-600 mr-1.5">{i + 1}.</span>{p.name}</span>
                      <span className="text-zinc-200 font-medium">{p.qty} un.</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-zinc-800">
                      <div className="h-1 rounded-full bg-emerald-500/60" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="mb-3 text-sm font-medium text-zinc-300">Ranking de clientes por valor</p>
          {customerRanking.length === 0 ? (
            <p className="text-sm text-zinc-600 py-4 text-center">Nenhuma venda com cliente.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {customerRanking.map((c, i) => {
                const max = customerRanking[0].total;
                const pct = (c.total / max) * 100;
                return (
                  <div key={c.name} className="space-y-0.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400"><span className="text-zinc-600 mr-1.5">{i + 1}.</span>{c.name}</span>
                      <span className="text-zinc-200 font-medium">{fmtBRL(c.total)}</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-zinc-800">
                      <div className="h-1 rounded-full bg-blue-500/60" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
