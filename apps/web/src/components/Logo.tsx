export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 shadow-sm">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 2h8l4 4v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M12 2v4h4" stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-400 ring-2 ring-white" />
      </div>
      <div className="leading-tight">
        <p className="text-lg font-bold tracking-tight text-slate-900">Nearby</p>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">File Share</p>
      </div>
    </div>
  );
}