export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1c]">
      <div role="status" className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading… / Cargando…</p>
      </div>
    </div>
  );
}
