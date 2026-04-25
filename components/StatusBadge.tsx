type Status = "pendente" | "devolvido" | "comprado" | "pago" | "vencido";

const styles: Record<Status, string> = {
  pendente: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  devolvido: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  comprado: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  pago: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  vencido: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const labels: Record<Status, string> = {
  pendente: "Pendente",
  devolvido: "Devolvido",
  comprado: "Comprado",
  pago: "Pago",
  vencido: "Vencido",
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
