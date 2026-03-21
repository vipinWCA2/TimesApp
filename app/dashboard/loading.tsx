export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-800/50" />
        <div className="h-4 w-64 animate-pulse rounded-lg bg-slate-800/50" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-800 bg-slate-900/50" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="h-64 animate-pulse rounded-xl border border-slate-800 bg-slate-900/50 xl:col-span-1" />
        <div className="h-64 animate-pulse rounded-xl border border-slate-800 bg-slate-900/50 xl:col-span-2" />
      </div>
    </div>
  );
}
