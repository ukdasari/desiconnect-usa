export default function Loading() {
  return (
    <div className="container-page py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="h-9 w-64 animate-pulse rounded-xl bg-surface-2" />
      <div className="mt-3 h-5 w-96 max-w-full animate-pulse rounded-lg bg-surface-2" />
      <div className="mt-10 space-y-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="size-11 animate-pulse rounded-xl bg-surface-2" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-2/3 animate-pulse rounded-lg bg-surface-2" />
              <div className="h-4 w-1/2 animate-pulse rounded-lg bg-surface-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
