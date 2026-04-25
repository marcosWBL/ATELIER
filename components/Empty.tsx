export default function Empty({ message = "Nenhum item encontrado." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-sm text-stone-400 dark:text-stone-500">{message}</p>
    </div>
  );
}
