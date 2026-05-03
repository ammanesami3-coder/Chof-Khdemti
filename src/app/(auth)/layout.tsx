export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 p-4 flex flex-col items-center justify-center">

      {/* Ambient blobs — Moroccan flag colours */}
      <div className="pointer-events-none absolute -start-48 -top-48 size-[500px] rounded-full bg-red-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -end-48 size-[500px] rounded-full bg-green-600/20 blur-3xl" />

      {/* Brand mark */}
      <div className="relative mb-8 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-green-600 shadow-lg shadow-red-900/40">
          <span className="text-3xl font-black text-white leading-none">ش</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white">
          شوف خدمتي
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          منصة الحرفيين والخدمات
        </p>
      </div>

      {children}
    </div>
  );
}
