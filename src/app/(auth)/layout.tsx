export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">معلّم</h1>
        <p className="text-muted-foreground text-sm mt-1">
          منصة الحرفيين والخدمات
        </p>
      </div>
      {children}
    </div>
  );
}
