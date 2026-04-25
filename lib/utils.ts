export const fmtBRL = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const fmtDate = (iso: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};
