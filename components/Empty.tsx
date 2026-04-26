export default function Empty({ message = "Nenhum item encontrado." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-sm text-ink-3">{message}</p>
    </div>
  );
}
