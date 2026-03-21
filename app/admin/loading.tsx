export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-800" />
        <div className="h-4 w-64 animate-pulse rounded-lg bg-slate-800" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-800" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-lg bg-slate-800" />
    </div>
  );
}
