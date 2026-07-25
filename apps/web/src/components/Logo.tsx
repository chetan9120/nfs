export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="3" fill="currentColor" className="text-teal-500" />
        <circle
          cx="14"
          cy="14"
          r="8"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-teal-500/50"
        />
        <circle
          cx="14"
          cy="14"
          r="13"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-teal-500/20"
        />
      </svg>
      <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
        Nearby
      </span>
    </div>
  );
}